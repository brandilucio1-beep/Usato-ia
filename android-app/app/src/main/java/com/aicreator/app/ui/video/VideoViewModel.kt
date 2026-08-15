package com.aicreator.app.ui.video

import android.net.Uri
import androidx.annotation.StringRes
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.lifecycle.viewModelScope
import com.aicreator.app.App
import com.aicreator.app.R
import com.aicreator.app.data.MediaRepository
import com.aicreator.app.data.SettingsRepository
import com.aicreator.app.network.GenResult
import com.aicreator.app.network.HfVideoClient
import com.aicreator.app.ui.components.stylePresets
import java.io.File
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

sealed interface VideoUiState {
    data object Idle : VideoUiState
    data object NoToken : VideoUiState
    data class Loading(val attempt: Int) : VideoUiState
    data class Queued(val secondsLeft: Int, val attempt: Int) : VideoUiState
    data class Ready(val file: File, val savedUri: Uri?) : VideoUiState
    data class Failed(val message: String?, @StringRes val messageRes: Int? = null) : VideoUiState
}

class VideoViewModel(
    private val client: HfVideoClient,
    private val mediaRepository: MediaRepository,
    private val settingsRepository: SettingsRepository,
) : ViewModel() {

    var prompt by mutableStateOf("")
    var selectedStyle by mutableStateOf<Int?>(null)

    private val _uiState = MutableStateFlow<VideoUiState>(VideoUiState.Idle)
    val uiState: StateFlow<VideoUiState> = _uiState.asStateFlow()

    private val _snackbar = MutableSharedFlow<Int>()
    val snackbar: SharedFlow<Int> = _snackbar.asSharedFlow()

    private var job: Job? = null

    private val isBusy: Boolean
        get() = _uiState.value is VideoUiState.Loading || _uiState.value is VideoUiState.Queued

    fun generate() {
        val base = prompt.trim()
        if (base.isEmpty() || isBusy) return

        job?.cancel()
        job = viewModelScope.launch {
            val settings = settingsRepository.settings.first()
            if (settings.hfToken.isBlank()) {
                _uiState.value = VideoUiState.NoToken
                return@launch
            }
            val fullPrompt = base + (selectedStyle?.let { stylePresets[it].suffix } ?: "")
            val startTime = System.currentTimeMillis()
            var attempt = 1

            // Il modello gratuito può essere "in coda": ritenta finché non risponde,
            // con un tetto massimo di attesa complessiva.
            while (true) {
                _uiState.value = VideoUiState.Loading(attempt)
                val result = client.generateVideo(
                    prompt = fullPrompt,
                    token = settings.hfToken,
                    modelId = settings.videoModelId,
                    endpointOverride = settings.videoEndpointOverride,
                )
                when (result) {
                    is GenResult.Success -> {
                        _uiState.value = VideoUiState.Ready(result.file, savedUri = null)
                        return@launch
                    }
                    is GenResult.Error -> {
                        _uiState.value = VideoUiState.Failed(result.message)
                        return@launch
                    }
                    is GenResult.Queued -> {
                        if (System.currentTimeMillis() - startTime > MAX_WAIT_MS) {
                            _uiState.value =
                                VideoUiState.Failed(null, R.string.error_video_give_up)
                            return@launch
                        }
                        val waitSeconds = result.etaSeconds.coerceIn(5, 30)
                        for (secondsLeft in waitSeconds downTo 1) {
                            _uiState.value = VideoUiState.Queued(secondsLeft, attempt)
                            delay(1000)
                        }
                        attempt++
                    }
                }
            }
        }
    }

    fun cancel() {
        job?.cancel()
        _uiState.value = VideoUiState.Idle
    }

    fun save() {
        val state = _uiState.value as? VideoUiState.Ready ?: return
        if (state.savedUri != null) return
        viewModelScope.launch {
            val uri = mediaRepository.saveVideo(state.file)
            if (uri != null) {
                _uiState.value = state.copy(savedUri = uri)
                _snackbar.emit(R.string.saved_to_gallery_video)
            } else {
                _snackbar.emit(R.string.save_failed)
            }
        }
    }

    companion object {
        private const val MAX_WAIT_MS = 6 * 60 * 1000L

        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as App
                VideoViewModel(
                    app.container.hfVideoClient,
                    app.container.mediaRepository,
                    app.container.settingsRepository,
                )
            }
        }
    }
}
