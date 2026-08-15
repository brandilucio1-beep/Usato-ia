package com.aicreator.app.ui.image

import android.Manifest
import android.content.pm.PackageManager
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
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.aicreator.app.R
import com.aicreator.app.ui.components.AspectSelector
import com.aicreator.app.ui.components.ErrorCard
import com.aicreator.app.ui.components.LoadingCard
import com.aicreator.app.ui.components.ModelToggle
import com.aicreator.app.ui.components.PromptField
import com.aicreator.app.ui.components.SectionLabel
import com.aicreator.app.ui.components.StyleChips
import com.aicreator.app.util.ShareUtil

@Composable
fun ImageScreen(viewModel: ImageViewModel = viewModel(factory = ImageViewModel.Factory)) {
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
            PromptField(
                value = viewModel.prompt,
                onValueChange = { viewModel.prompt = it },
                placeholder = stringResource(R.string.prompt_placeholder_image),
            )

            SectionLabel(R.string.style_section)
            StyleChips(viewModel.selectedStyle) { viewModel.selectedStyle = it }

            SectionLabel(R.string.format_section)
            AspectSelector(viewModel.selectedAspect) { viewModel.selectedAspect = it }

            SectionLabel(R.string.model_section)
            ModelToggle(viewModel.fastModel) { viewModel.fastModel = it }

            Button(
                onClick = { viewModel.generate() },
                enabled = viewModel.prompt.isNotBlank() && uiState !is ImageUiState.Loading,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Filled.AutoAwesome, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.generate))
            }

            when (val state = uiState) {
                ImageUiState.Idle -> Unit

                ImageUiState.Loading ->
                    LoadingCard(stringResource(R.string.generating_image))

                is ImageUiState.Failed ->
                    ErrorCard(
                        message = state.message ?: stringResource(R.string.error_unexpected),
                        onRetry = { viewModel.generate(newSeed = true) },
                    )

                is ImageUiState.Ready -> {
                    Card(Modifier.fillMaxWidth()) {
                        AsyncImage(
                            model = state.file,
                            contentDescription = viewModel.prompt,
                            contentScale = ContentScale.FillWidth,
                            modifier = Modifier.fillMaxWidth(),
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
                            onClick = { ShareUtil.shareFile(context, state.file, "image/jpeg") },
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(Icons.Filled.Share, contentDescription = null)
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.share))
                        }
                        FilledTonalButton(
                            onClick = { viewModel.generate(newSeed = true) },
                            modifier = Modifier.weight(1f),
                        ) {
                            Icon(Icons.Filled.Refresh, contentDescription = null)
                            Spacer(Modifier.width(4.dp))
                            Text(stringResource(R.string.regenerate))
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))
        }

        SnackbarHost(snackbarHostState, Modifier.align(Alignment.BottomCenter))
    }
}
