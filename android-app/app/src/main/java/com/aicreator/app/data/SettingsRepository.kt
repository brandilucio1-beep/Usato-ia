package com.aicreator.app.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "settings")

data class AppSettings(
    val hfToken: String = "",
    val videoModelId: String = DEFAULT_VIDEO_MODEL,
    val videoEndpointOverride: String = "",
) {
    companion object {
        const val DEFAULT_VIDEO_MODEL = "Lightricks/LTX-Video"
    }
}

/**
 * Persistenza impostazioni in DataStore. Il token è un token gratuito di sola
 * lettura: la memorizzazione in chiaro on-device è un compromesso accettato
 * per semplicità.
 */
class SettingsRepository(private val context: Context) {

    private object Keys {
        val HF_TOKEN = stringPreferencesKey("hf_token")
        val VIDEO_MODEL = stringPreferencesKey("video_model")
        val VIDEO_ENDPOINT_OVERRIDE = stringPreferencesKey("video_endpoint_override")
    }

    val settings: Flow<AppSettings> = context.dataStore.data.map { prefs ->
        AppSettings(
            hfToken = prefs[Keys.HF_TOKEN].orEmpty(),
            videoModelId = prefs[Keys.VIDEO_MODEL]?.takeIf { it.isNotBlank() }
                ?: AppSettings.DEFAULT_VIDEO_MODEL,
            videoEndpointOverride = prefs[Keys.VIDEO_ENDPOINT_OVERRIDE].orEmpty(),
        )
    }

    suspend fun update(settings: AppSettings) {
        context.dataStore.edit { prefs ->
            prefs[Keys.HF_TOKEN] = settings.hfToken
            prefs[Keys.VIDEO_MODEL] = settings.videoModelId
            prefs[Keys.VIDEO_ENDPOINT_OVERRIDE] = settings.videoEndpointOverride
        }
    }
}
