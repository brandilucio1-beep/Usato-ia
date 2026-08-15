package com.aicreator.app.network

import android.content.Context
import com.aicreator.app.R
import java.io.File
import java.io.IOException
import java.net.SocketTimeoutException
import kotlin.random.Random
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request

/**
 * Client per l'API gratuita di Pollinations.ai: nessuna chiave richiesta,
 * l'immagine viene restituita direttamente come byte nel body.
 */
class PollinationsClient(
    private val client: OkHttpClient,
    private val context: Context,
) {

    suspend fun generateImage(
        prompt: String,
        width: Int,
        height: Int,
        model: String,
        seed: Int,
    ): GenResult = withContext(Dispatchers.IO) {
        var lastError = GenResult.Error(ErrorKind.UNKNOWN, context.getString(R.string.error_unexpected))
        var currentSeed = seed

        // Un retry automatico (con nuovo seed) su timeout / errore server.
        repeat(2) {
            try {
                val url = HttpUrl.Builder()
                    .scheme("https")
                    .host("image.pollinations.ai")
                    .addPathSegment("prompt")
                    .addPathSegment(prompt)
                    .addQueryParameter("width", width.toString())
                    .addQueryParameter("height", height.toString())
                    .addQueryParameter("model", model)
                    .addQueryParameter("seed", currentSeed.toString())
                    .addQueryParameter("nologo", "true")
                    .addQueryParameter("safe", "true")
                    .build()

                val request = Request.Builder().url(url).build()
                client.newCall(request).execute().use { response ->
                    val contentType = response.header("Content-Type").orEmpty()
                    if (response.isSuccessful && contentType.startsWith("image/")) {
                        val body = response.body
                            ?: return@use
                        val dir = File(context.cacheDir, "previews").apply { mkdirs() }
                        val file = File(dir, "img_${System.currentTimeMillis()}.jpg")
                        body.byteStream().use { input ->
                            file.outputStream().use { output -> input.copyTo(output) }
                        }
                        return@withContext GenResult.Success(file)
                    }
                    lastError = GenResult.Error(
                        ErrorKind.SERVER,
                        context.getString(R.string.error_server)
                    )
                }
            } catch (e: SocketTimeoutException) {
                lastError = GenResult.Error(ErrorKind.TIMEOUT, context.getString(R.string.error_timeout))
            } catch (e: IOException) {
                return@withContext GenResult.Error(ErrorKind.NETWORK, context.getString(R.string.error_network))
            }
            currentSeed = Random.nextInt(0, Int.MAX_VALUE)
        }
        lastError
    }
}
