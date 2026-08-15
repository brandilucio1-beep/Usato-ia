package com.aicreator.app.network

import android.content.Context
import android.util.Base64
import com.aicreator.app.R
import java.io.File
import java.io.IOException
import java.net.SocketTimeoutException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject

/**
 * Client per la generazione video tramite Hugging Face Inference API (token gratuito).
 *
 * NOTA: l'inferenza serverless gratuita per i modelli text-to-video è instabile e la
 * route/schema di risposta può cambiare nel tempo. Per questo il client:
 *  - prova più endpoint in sequenza (override utente, router, route legacy);
 *  - accetta risposte in più formati (byte video, JSON con URL, JSON con base64);
 *  - traduce ogni fallimento in un messaggio chiaro invece di andare in crash.
 */
class HfVideoClient(
    private val client: OkHttpClient,
    private val context: Context,
) {

    suspend fun generateVideo(
        prompt: String,
        token: String,
        modelId: String,
        endpointOverride: String?,
    ): GenResult = withContext(Dispatchers.IO) {
        val endpoints = buildList {
            if (!endpointOverride.isNullOrBlank()) add(endpointOverride.trim())
            add("https://router.huggingface.co/hf-inference/models/$modelId")
            add("https://api-inference.huggingface.co/models/$modelId")
        }

        // Il token è input libero dell'utente: caratteri fuori dall'ASCII visibile
        // non sono ammessi in un header HTTP e farebbero lanciare OkHttp.
        val safeToken = token.filter { it.code in 0x21..0x7e }

        var notFound = GenResult.Error(ErrorKind.NOT_FOUND, context.getString(R.string.error_model_not_found))
        for (endpoint in endpoints) {
            val result = try {
                callEndpoint(endpoint, prompt, safeToken)
            } catch (e: SocketTimeoutException) {
                GenResult.Error(ErrorKind.TIMEOUT, context.getString(R.string.error_timeout))
            } catch (e: IOException) {
                GenResult.Error(ErrorKind.NETWORK, context.getString(R.string.error_network))
            } catch (e: IllegalArgumentException) {
                // URL o header non costruibili (es. endpoint personalizzato malformato)
                GenResult.Error(ErrorKind.UNKNOWN, context.getString(R.string.error_unexpected))
            }
            when {
                result is GenResult.Error && result.kind == ErrorKind.NOT_FOUND -> {
                    // Modello non servito su questa route: prova la successiva.
                    notFound = result
                }
                else -> return@withContext result
            }
        }
        notFound
    }

    private fun callEndpoint(endpoint: String, prompt: String, token: String): GenResult {
        // L'endpoint può arrivare dal campo libero nelle Impostazioni: se non è un
        // URL http(s) valido, trattalo come "non disponibile" invece di lanciare.
        val httpUrl = endpoint.toHttpUrlOrNull()
            ?: return GenResult.Error(ErrorKind.NOT_FOUND, context.getString(R.string.error_model_not_found))
        val body = JSONObject().put("inputs", prompt).toString()
            .toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url(httpUrl)
            .header("Authorization", "Bearer $token")
            .header("x-wait-for-model", "true")
            .header("x-use-cache", "false")
            .post(body)
            .build()

        client.newCall(request).execute().use { response ->
            val contentType = response.header("Content-Type").orEmpty()
            val bytes = response.body?.bytes() ?: ByteArray(0)

            if (response.isSuccessful) {
                if (contentType.startsWith("video/") || isMp4(bytes)) {
                    return saveVideo(bytes)
                }
                if (contentType.contains("json") || bytes.firstOrNull()?.toInt()?.toChar() in listOf('{', '[')) {
                    return parseJsonResult(bytes)
                }
                return GenResult.Error(ErrorKind.UNKNOWN, context.getString(R.string.error_unexpected))
            }

            return when (response.code) {
                401, 403 -> GenResult.Error(ErrorKind.AUTH, context.getString(R.string.error_auth))
                404, 410 -> GenResult.Error(ErrorKind.NOT_FOUND, context.getString(R.string.error_model_not_found))
                503 -> parseQueued(bytes)
                else -> GenResult.Error(ErrorKind.SERVER, context.getString(R.string.error_server))
            }
        }
    }

    /** 503 con {"error": ..., "estimated_time": N} = modello in caricamento, riprovare. */
    private fun parseQueued(bytes: ByteArray): GenResult = try {
        val json = JSONObject(bytes.decodeToString())
        if (json.has("estimated_time")) {
            GenResult.Queued(json.optDouble("estimated_time", 30.0).toInt().coerceAtLeast(1))
        } else {
            GenResult.Queued(20)
        }
    } catch (e: Exception) {
        GenResult.Error(ErrorKind.SERVER, context.getString(R.string.error_server))
    }

    /** Parser volutamente permissivo: URL .mp4 o campo base64, ovunque si trovino. */
    private fun parseJsonResult(bytes: ByteArray): GenResult {
        try {
            val text = bytes.decodeToString()
            val root: JSONObject? = when {
                text.trimStart().startsWith("{") -> JSONObject(text)
                text.trimStart().startsWith("[") -> JSONArray(text).optJSONObject(0)
                else -> null
            }
            if (root != null) {
                findVideoUrl(root)?.let { return downloadVideo(it) }
                findBase64Video(root)?.let { return saveVideo(it) }
            }
        } catch (e: Exception) {
            // ricade nell'errore generico sotto
        }
        return GenResult.Error(ErrorKind.UNKNOWN, context.getString(R.string.error_unexpected))
    }

    private fun findVideoUrl(json: JSONObject): String? {
        json.optJSONObject("video")?.optString("url")?.takeIf { it.startsWith("http") }?.let { return it }
        json.optJSONObject("output")?.optString("url")?.takeIf { it.startsWith("http") }?.let { return it }
        for (key in json.keys()) {
            val value = json.opt(key)
            if (value is String && value.startsWith("http") && value.contains(".mp4")) return value
        }
        return null
    }

    private fun findBase64Video(json: JSONObject): ByteArray? {
        for (key in listOf("video", "data", "output")) {
            val value = json.opt(key)
            if (value is String && value.length > 1000 && !value.startsWith("http")) {
                try {
                    val decoded = Base64.decode(value.substringAfter("base64,"), Base64.DEFAULT)
                    if (decoded.isNotEmpty()) return decoded
                } catch (e: IllegalArgumentException) {
                    // non era base64: prova la chiave successiva
                }
            }
        }
        return null
    }

    private fun downloadVideo(url: String): GenResult {
        // URL fornito dal server: validalo prima di costruire la richiesta.
        val httpUrl = url.toHttpUrlOrNull()
            ?: return GenResult.Error(ErrorKind.UNKNOWN, context.getString(R.string.error_unexpected))
        // Nessun header di autenticazione: l'URL può puntare a host di terze parti.
        val request = Request.Builder().url(httpUrl).build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                return GenResult.Error(ErrorKind.SERVER, context.getString(R.string.error_server))
            }
            return saveVideo(response.body?.bytes() ?: ByteArray(0))
        }
    }

    private fun saveVideo(bytes: ByteArray): GenResult {
        if (bytes.isEmpty()) {
            return GenResult.Error(ErrorKind.UNKNOWN, context.getString(R.string.error_unexpected))
        }
        val dir = File(context.cacheDir, "previews").apply { mkdirs() }
        val file = File(dir, "vid_${System.currentTimeMillis()}.mp4")
        file.writeBytes(bytes)
        return GenResult.Success(file)
    }

    private fun isMp4(bytes: ByteArray): Boolean =
        bytes.size > 12 &&
            bytes[4].toInt().toChar() == 'f' &&
            bytes[5].toInt().toChar() == 't' &&
            bytes[6].toInt().toChar() == 'y' &&
            bytes[7].toInt().toChar() == 'p'
}
