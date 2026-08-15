package com.aicreator.app.ui.gallery

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.lifecycle.viewModelScope
import com.aicreator.app.App
import com.aicreator.app.data.MediaItem
import com.aicreator.app.data.MediaRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class GalleryViewModel(
    private val mediaRepository: MediaRepository,
) : ViewModel() {

    private val _items = MutableStateFlow<List<MediaItem>>(emptyList())
    val items: StateFlow<List<MediaItem>> = _items.asStateFlow()

    fun refresh() {
        viewModelScope.launch {
            _items.value = mediaRepository.queryMedia()
        }
    }

    fun delete(item: MediaItem) {
        viewModelScope.launch {
            mediaRepository.delete(item.uri)
            _items.value = mediaRepository.queryMedia()
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                val app = this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as App
                GalleryViewModel(app.container.mediaRepository)
            }
        }
    }
}
