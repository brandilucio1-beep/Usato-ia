package com.aicreator.app.ui.components

import android.net.Uri
import android.widget.VideoView
import androidx.annotation.StringRes
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.aicreator.app.R

data class StylePreset(@StringRes val labelRes: Int, val suffix: String)

val stylePresets = listOf(
    StylePreset(R.string.style_photo, ", ultra realistic photo, high detail"),
    StylePreset(R.string.style_digital, ", digital art, vibrant colors"),
    StylePreset(R.string.style_watercolor, ", watercolor painting, soft colors"),
    StylePreset(R.string.style_anime, ", anime style, detailed illustration"),
    StylePreset(R.string.style_cyberpunk, ", cyberpunk style, neon lights"),
    StylePreset(R.string.style_fantasy, ", fantasy art, epic, detailed"),
    StylePreset(R.string.style_minimal, ", minimalist, clean, simple shapes"),
)

data class AspectOption(@StringRes val labelRes: Int, val width: Int, val height: Int)

val aspectOptions = listOf(
    AspectOption(R.string.aspect_square, 1024, 1024),
    AspectOption(R.string.aspect_landscape, 1280, 720),
    AspectOption(R.string.aspect_portrait, 720, 1280),
)

@Composable
fun PromptField(value: String, onValueChange: (String) -> Unit, placeholder: String) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(stringResource(R.string.prompt_label)) },
        placeholder = { Text(placeholder) },
        minLines = 3,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
fun SectionLabel(@StringRes labelRes: Int) {
    Text(stringResource(labelRes), style = MaterialTheme.typography.titleSmall)
}

@Composable
fun StyleChips(selected: Int?, onSelect: (Int?) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        itemsIndexed(stylePresets) { index, preset ->
            FilterChip(
                selected = selected == index,
                onClick = { onSelect(if (selected == index) null else index) },
                label = { Text(stringResource(preset.labelRes)) },
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AspectSelector(selected: Int, onSelect: (Int) -> Unit) {
    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
        aspectOptions.forEachIndexed { index, option ->
            SegmentedButton(
                selected = selected == index,
                onClick = { onSelect(index) },
                shape = SegmentedButtonDefaults.itemShape(index = index, count = aspectOptions.size),
            ) {
                Text(stringResource(option.labelRes))
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ModelToggle(fast: Boolean, onChange: (Boolean) -> Unit) {
    SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
        SegmentedButton(
            selected = !fast,
            onClick = { onChange(false) },
            shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
        ) { Text(stringResource(R.string.model_quality)) }
        SegmentedButton(
            selected = fast,
            onClick = { onChange(true) },
            shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
        ) { Text(stringResource(R.string.model_fast)) }
    }
}

@Composable
fun LoadingCard(text: String) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            LinearProgressIndicator(Modifier.fillMaxWidth())
            Text(text, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
fun ErrorCard(message: String, onRetry: (() -> Unit)? = null) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                message,
                color = MaterialTheme.colorScheme.onErrorContainer,
                style = MaterialTheme.typography.bodyMedium,
            )
            if (onRetry != null) {
                TextButton(onClick = onRetry) { Text(stringResource(R.string.retry)) }
            }
        }
    }
}

@Composable
fun InfoBanner(text: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
    ) {
        Row(
            Modifier.padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Filled.Info, contentDescription = null)
            Text(text, style = MaterialTheme.typography.bodySmall)
        }
    }
}

/** Anteprima video con VideoView classico: zero dipendenze extra. */
@Composable
fun VideoPlayer(uri: Uri, modifier: Modifier = Modifier) {
    AndroidView(
        factory = { ctx ->
            VideoView(ctx).apply {
                setVideoURI(uri)
                setOnPreparedListener { player ->
                    player.isLooping = true
                    start()
                }
            }
        },
        modifier = modifier,
    )
}
