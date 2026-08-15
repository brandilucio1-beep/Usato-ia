package com.aicreator.app.ui.video

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.aicreator.app.R
import com.aicreator.app.ui.components.ErrorCard
import com.aicreator.app.ui.components.InfoBanner
import com.aicreator.app.ui.components.LoadingCard
import com.aicreator.app.ui.components.PromptField
import com.aicreator.app.ui.components.SectionLabel
import com.aicreator.app.ui.components.StyleChips
import com.aicreator.app.ui.components.VideoPlayer
import com.aicreator.app.util.ShareUtil

@Composable
fun VideoScreen(
    onOpenSettings: () -> Unit,
    viewModel: VideoViewModel = viewModel(factory = VideoViewModel.Factory),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) viewModel.save()
    }

    fun requestSave() {
        val needsPermission = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q &&
            ContextCompat.checkSelfPermission(
                context, Manifest.permission.WRITE_EXTERNAL_STORAGE
            ) != PackageManager.PERMISSION_GRANTED
        if (needsPermission) {
            permissionLauncher.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE)
        } else {
            viewModel.save()
        }
    }

    LaunchedEffect(Unit) {
        viewModel.snackbar.collect { resId ->
            snackbarHostState.showSnackbar(context.getString(resId))
        }
    }

    Box(Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            InfoBanner(stringResource(R.string.video_info_banner))

            PromptField(
                value = viewModel.prompt,
                onValueChange = { viewModel.prompt = it },
                placeholder = stringResource(R.string.prompt_placeholder_video),
            )

            SectionLabel(R.string.style_section)
            StyleChips(viewModel.selectedStyle) { viewModel.selectedStyle = it }

            val busy = uiState is VideoUiState.Loading || uiState is VideoUiState.Queued
            Button(
                onClick = { viewModel.generate() },
                enabled = viewModel.prompt.isNotBlank() && !busy,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Filled.AutoAwesome, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.generate))
            }

            when (val state = uiState) {
                VideoUiState.Idle -> Unit

                VideoUiState.NoToken ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(
                            Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                stringResource(R.string.video_no_token_title),
                                style = MaterialTheme.typography.titleMedium,
                            )
                            Text(
                                stringResource(R.string.video_no_token_text),
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            FilledTonalButton(onClick = onOpenSettings) {
                                Icon(Icons.Filled.Key, contentDescription = null)
                                Spacer(Modifier.width(4.dp))
                                Text(stringResource(R.string.video_configure_token))
                            }
                        }
                    }

                is VideoUiState.Loading -> {
                    LoadingCard(stringResource(R.string.generating_video, state.attempt))
                    TextButton(onClick = { viewModel.cancel() }) {
                        Text(stringResource(R.string.cancel))
                    }
                }

                is VideoUiState.Queued -> {
                    LoadingCard(
                        stringResource(R.string.video_queued, state.secondsLeft, state.attempt)
                    )
                    TextButton(onClick = { viewModel.cancel() }) {
                        Text(stringResource(R.string.cancel))
                    }
                }

                is VideoUiState.Failed ->
                    ErrorCard(
                        message = state.message
                            ?: stringResource(state.messageRes ?: R.string.error_unexpected),
                        onRetry = { viewModel.generate() },
                    )

                is VideoUiState.Ready -> {
                    key(state.file.absolutePath) {
                        VideoPlayer(
                            uri = Uri.fromFile(state.file),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(240.dp),
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilledTonalButton(
                            onClick = ::requestSave,
                            enabled = state.savedUri == null,
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(
                                if (state.savedUri != null) Icons.Filled.Check else Icons.Filled.Save,
                                contentDescription = null,
                            )
                            Spacer(Modifier.width(4.dp))
                            Text(
                                stringResource(
                                    if (state.savedUri != null) R.string.saved else R.string.save
                                )
                            )
                        }
                        FilledTonalButton(
                            onClick = { ShareUtil.shareFile(context, state.file, "video/mp4") },
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(Icons.Filled.Share, contentDescription = null)
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.share))
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))
        }

        SnackbarHost(snackbarHostState, Modifier.align(Alignment.BottomCenter))
    }
}
