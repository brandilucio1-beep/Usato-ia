package com.aicreator.app

import android.content.Context
import com.aicreator.app.data.MediaRepository
import com.aicreator.app.data.SettingsRepository
import com.aicreator.app.network.HfVideoClient
import com.aicreator.app.network.PollinationsClient
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient

class AppContainer(context: Context) {

    private val appContext = context.applicationContext

    // La generazione avviene on-request lato server: i tempi di risposta possono
    // superare il minuto, da cui il readTimeout lungo.
    val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(300, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    val settingsRepository = SettingsRepository(appContext)
    val mediaRepository = MediaRepository(appContext)
    val pollinationsClient = PollinationsClient(okHttpClient, appContext)
    val hfVideoClient = HfVideoClient(okHttpClient, appContext)
}
