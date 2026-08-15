package com.aicreator.app.ui.image

import android.net.Uri
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
import com.aicreator.app.network.GenResult
import com.aicreator.app.network.PollinationsClient
import com.aicreator.app.ui.components.aspectOptions
import com.aicreator.app.ui.components.stylePresets
import java.io.File
import kotlin.random.Random
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface ImageUiState {
    data object Idle : ImageUiState
    data object Loading : ImageUiState
    data class Ready(val file: File, val savedUri: Uri?) : ImageUiState
    data class Failed(val message: String?) : ImageUiState
}

class ImageViewModel(
    private val client: PollinationsClient,
    private val mediaRepository: MediaRepository,
) : ViewModel() {

    var prompt by mutableStateOf("")
    var selectedStyle by mutableStateOf<Int?>(null)
    var selectedAspect by mutableStateOf(0)
    var fastModel by mutableStateOf(false)

    private val _uiState = MutableStateFlow<ImageUiState>(ImageUiState.Idle)
    val uiState: StateFlow<ImageUiState> = _uiState.asStateFlow()

    /** Eventi snackbar come id di risorsa stringa. */
    private val _snackbar = MutableSharedFlow<Int>()
    val snackbar: SharedFlow<Int> = _snackbar.asSharedFlow()

    private var seed = Random.nextInt(0, Int.MAX_VALUE)

    fun generate(newSeed: Boolean = false) {
        val base = prompt.trim()
        if (base.isEmpty() || _uiState.value is ImageUiState.Loading) return
        if (newSeed) seed = Random.nextInt(0, Int.MAX_VALUE)

        val fullPrompt = base + (selectedStyle?.let { stylePresets[it].suffix } ?: "")
        val aspect = aspectOptions[selectedAspect.coerceIn(aspectOptions.indices)]
        val model = if (fastModel) "turbo" else "flux"

        _uiState.value = ImageUiState.Loading
        viewModelScope.launch {
            when (val result = client.generateImage(fullPrompt, aspect.width, aspect.height, model, seed)) {
                is GenResult.Success -> _uiState.value = ImageUiState.Ready(result.file, savedUri = null)
                is GenResult.Error -> _uiState.value = ImageUiState.Failed(result.message)
                is GenResult.Queued -> _uiState.value = ImageUiState.Failed(null)
            }
        }
    }

    fun save() {
        val state = _uiState.value as? ImageUiState.Ready ?: return
        if (state.savedUri != null) return
        viewModelScope.launch {
            val uri = mediaRepository.saveImage(state.file)
            if (uri != null) {
                _uiState.value = state.copy(savedUri = uri)
                _snackbar.emit(R.string.saved_to_gallery_image)
            } else {
                _snackbar.emit(R.string.save_failed)
            }
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as App
                ImageViewModel(app.container.pollinationsClient, app.container.mediaRepository)
            }
        }
    }
}
