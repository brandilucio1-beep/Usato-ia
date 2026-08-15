package com.aicreator.app.data

import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.BaseColumns
import android.provider.MediaStore
import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class MediaItem(
    val uri: Uri,
    val isVideo: Boolean,
    val dateAdded: Long,
    val displayName: String,
)

/**
 * Salvataggio, elenco ed eliminazione dei media generati, tramite MediaStore.
 * Le cartelle usate sono Pictures/AICreator e Movies/AICreator.
 */
class MediaRepository(private val context: Context) {

    suspend fun saveImage(file: File): Uri? = save(file, isVideo = false)

    suspend fun saveVideo(file: File): Uri? = save(file, isVideo = true)

    private suspend fun save(file: File, isVideo: Boolean): Uri? = withContext(Dispatchers.IO) {
        val resolver = context.contentResolver
        val extension = if (isVideo) "mp4" else "jpg"
        val name = "AICreator_${System.currentTimeMillis()}.$extension"
        val mime = if (isVideo) "video/mp4" else "image/jpeg"
        val collection =
            if (isVideo) MediaStore.Video.Media.EXTERNAL_CONTENT_URI
            else MediaStore.Images.Media.EXTERNAL_CONTENT_URI

        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, name)
            put(MediaStore.MediaColumns.MIME_TYPE, mime)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(
                    MediaStore.MediaColumns.RELATIVE_PATH,
                    if (isVideo) "${Environment.DIRECTORY_MOVIES}/AICreator"
                    else "${Environment.DIRECTORY_PICTURES}/AICreator"
                )
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            } else {
                // API 26-28: serve il percorso file esplicito (e il permesso WRITE_EXTERNAL_STORAGE)
                val baseDir = Environment.getExternalStoragePublicDirectory(
                    if (isVideo) Environment.DIRECTORY_MOVIES else Environment.DIRECTORY_PICTURES
                )
                val dir = File(baseDir, "AICreator").apply { mkdirs() }
                @Suppress("DEPRECATION")
                put(MediaStore.MediaColumns.DATA, File(dir, name).absolutePath)
            }
        }

        val uri = resolver.insert(collection, values) ?: return@withContext null
        try {
            resolver.openOutputStream(uri)?.use { output ->
                file.inputStream().use { input -> input.copyTo(output) }
            } ?: throw IllegalStateException("openOutputStream null")

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val pending = ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) }
                resolver.update(uri, pending, null, null)
            }
            uri
        } catch (e: Exception) {
            resolver.delete(uri, null, null)
            null
        }
    }

    suspend fun queryMedia(): List<MediaItem> = withContext(Dispatchers.IO) {
        val items = mutableListOf<MediaItem>()
        queryCollection(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, isVideo = false, out = items)
        queryCollection(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, isVideo = true, out = items)
        items.sortedByDescending { it.dateAdded }
    }

    private fun queryCollection(collection: Uri, isVideo: Boolean, out: MutableList<MediaItem>) {
        val projection = arrayOf(
            BaseColumns._ID,
            MediaStore.MediaColumns.DATE_ADDED,
            MediaStore.MediaColumns.DISPLAY_NAME,
        )
        val (selection, args) = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            "${MediaStore.MediaColumns.OWNER_PACKAGE_NAME} = ?" to arrayOf(context.packageName)
        } else {
            @Suppress("DEPRECATION")
            "${MediaStore.MediaColumns.DATA} LIKE ?" to arrayOf("%/AICreator/%")
        }
        try {
            context.contentResolver.query(collection, projection, selection, args, null)?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(BaseColumns._ID)
                val dateCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_ADDED)
                val nameCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME)
                while (cursor.moveToNext()) {
                    out += MediaItem(
                        uri = ContentUris.withAppendedId(collection, cursor.getLong(idCol)),
                        isVideo = isVideo,
                        dateAdded = cursor.getLong(dateCol),
                        displayName = cursor.getString(nameCol) ?: "",
                    )
                }
            }
        } catch (e: SecurityException) {
            // Senza permesso su API 26-28 la galleria resta semplicemente vuota.
        }
    }

    suspend fun delete(uri: Uri): Boolean = withContext(Dispatchers.IO) {
        try {
            context.contentResolver.delete(uri, null, null) > 0
        } catch (e: SecurityException) {
            false
        }
    }
}
