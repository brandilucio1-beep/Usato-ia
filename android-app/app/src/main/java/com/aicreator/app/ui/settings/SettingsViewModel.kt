package com.aicreator.app.ui.settings

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
import com.aicreator.app.data.AppSettings
import com.aicreator.app.data.SettingsRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class SettingsViewModel(
    private val repository: SettingsRepository,
) : ViewModel() {

    var hfToken by mutableStateOf("")
    var videoModel by mutableStateOf(AppSettings.DEFAULT_VIDEO_MODEL)
    var endpointOverride by mutableStateOf("")
    var loaded by mutableStateOf(false)
        private set

    private val _snackbar = MutableSharedFlow<Int>()
    val snackbar: SharedFlow<Int> = _snackbar.asSharedFlow()

    init {
        viewModelScope.launch {
            val settings = repository.settings.first()
            hfToken = settings.hfToken
            videoModel = settings.videoModelId
            endpointOverride = settings.videoEndpointOverride
            loaded = true
        }
    }

    fun save() {
        viewModelScope.launch {
            repository.update(
                AppSettings(
                    hfToken = hfToken.trim(),
                    videoModelId = videoModel.trim().ifBlank { AppSettings.DEFAULT_VIDEO_MODEL },
                    videoEndpointOverride = endpointOverride.trim(),
                )
            )
            _snackbar.emit(R.string.settings_saved)
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as App
                SettingsViewModel(app.container.settingsRepository)
            }
        }
    }
}
