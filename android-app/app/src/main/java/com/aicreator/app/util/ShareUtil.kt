package com.aicreator.app.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import com.aicreator.app.R
import java.io.File

object ShareUtil {

    /** Condivide un file di anteprima non ancora salvato (dalla cache, via FileProvider). */
    fun shareFile(context: Context, file: File, mimeType: String) {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        shareUri(context, uri, mimeType)
    }

    /** Condivide un media già salvato in MediaStore. */
    fun shareUri(context: Context, uri: Uri, mimeType: String) {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(
            Intent.createChooser(intent, context.getString(R.string.share_with))
        )
    }
}
