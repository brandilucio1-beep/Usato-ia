package com.aicreator.app.ui.gallery

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.aicreator.app.R
import com.aicreator.app.data.MediaItem
import com.aicreator.app.ui.components.VideoPlayer
import com.aicreator.app.util.ShareUtil

@Composable
fun GalleryScreen(viewModel: GalleryViewModel = viewModel(factory = GalleryViewModel.Factory)) {
    val items by viewModel.items.collectAsState()
    val context = LocalContext.current
    var selected by remember { mutableStateOf<MediaItem?>(null) }

    LaunchedEffect(Unit) { viewModel.refresh() }

    if (items.isEmpty()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Icon(
                Icons.Filled.PhotoLibrary,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.outline,
                modifier = Modifier.size(64.dp),
            )
            Text(
                stringResource(R.string.gallery_empty_title),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(top = 16.dp),
            )
            Text(
                stringResource(R.string.gallery_empty_text),
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
    } else {
        LazyVerticalGrid(
            columns = GridCells.Adaptive(110.dp),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            items(items, key = { it.uri.toString() }) { item ->
                Box(
                    modifier = Modifier
                        .aspectRatio(1f)
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { selected = item },
                ) {
                    AsyncImage(
                        model = item.uri,
                        contentDescription = item.displayName,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                    if (item.isVideo) {
                        Icon(
                            Icons.Filled.PlayCircle,
                            contentDescription = stringResource(R.string.play_video),
                            tint = Color.White,
                            modifier = Modifier
                                .align(Alignment.Center)
                                .size(36.dp),
                        )
                    }
                }
            }
        }
    }

    selected?.let { item ->
        Dialog(
            onDismissRequest = { selected = null },
            properties = DialogProperties(usePlatformDefaultWidth = false),
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(16.dp),
            ) {
                Column(
                    Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (item.isVideo) {
                        key(item.uri.toString()) {
                            VideoPlayer(
                                uri = item.uri,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(280.dp),
                            )
                        }
                    } else {
                        AsyncImage(
                            model = item.uri,
                            contentDescription = item.displayName,
                            contentScale = ContentScale.FillWidth,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilledTonalButton(
                            onClick = {
                                ShareUtil.shareUri(
                                    context,
                                    item.uri,
                                    if (item.isVideo) "video/mp4" else "image/jpeg",
                                )
                            },
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(Icons.Filled.Share, contentDescription = null)
                            Text(
                                stringResource(R.string.share),
                                modifier = Modifier.padding(start = 4.dp),
                            )
                        }
                        FilledTonalButton(
                            onClick = {
                                viewModel.delete(item)
                                selected = null
                            },
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(Icons.Filled.Delete, contentDescription = null)
                            Text(
                                stringResource(R.string.delete),
                                modifier = Modifier.padding(start = 4.dp),
                            )
                        }
                        TextButton(onClick = { selected = null }) {
                            Text(stringResource(R.string.close))
                        }
                    }
                }
            }
        }
    }
}
