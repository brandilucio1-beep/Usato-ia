package com.aicreator.app.ui

import androidx.annotation.StringRes
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.aicreator.app.R
import com.aicreator.app.ui.gallery.GalleryScreen
import com.aicreator.app.ui.image.ImageScreen
import com.aicreator.app.ui.settings.SettingsScreen
import com.aicreator.app.ui.video.VideoScreen

object Routes {
    const val IMAGES = "immagini"
    const val VIDEO = "video"
    const val GALLERY = "galleria"
    const val SETTINGS = "impostazioni"
}

private data class TabItem(
    val route: String,
    @StringRes val labelRes: Int,
    val icon: ImageVector,
)

private val tabs = listOf(
    TabItem(Routes.IMAGES, R.string.tab_images, Icons.Filled.Image),
    TabItem(Routes.VIDEO, R.string.tab_video, Icons.Filled.Videocam),
    TabItem(Routes.GALLERY, R.string.tab_gallery, Icons.Filled.PhotoLibrary),
)

@StringRes
private fun titleFor(route: String?): Int = when (route) {
    Routes.IMAGES -> R.string.tab_images
    Routes.VIDEO -> R.string.tab_video
    Routes.GALLERY -> R.string.tab_gallery
    Routes.SETTINGS -> R.string.settings_title
    else -> R.string.app_name
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppScaffold() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val isSettings = currentRoute == Routes.SETTINGS

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(stringResource(titleFor(currentRoute))) },
                navigationIcon = {
                    if (isSettings) {
                        IconButton(onClick = { navController.popBackStack() }) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = stringResource(R.string.back),
                            )
                        }
                    }
                },
                actions = {
                    if (!isSettings) {
                        IconButton(
                            onClick = {
                                navController.navigate(Routes.SETTINGS) { launchSingleTop = true }
                            }
                        ) {
                            Icon(
                                Icons.Filled.Settings,
                                contentDescription = stringResource(R.string.open_settings),
                            )
                        }
                    }
                },
            )
        },
        bottomBar = {
            if (!isSettings) {
                NavigationBar {
                    tabs.forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = null) },
                            label = { Text(stringResource(tab.labelRes)) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Routes.IMAGES,
            modifier = Modifier.padding(padding),
        ) {
            composable(Routes.IMAGES) { ImageScreen() }
            composable(Routes.VIDEO) {
                VideoScreen(
                    onOpenSettings = {
                        navController.navigate(Routes.SETTINGS) { launchSingleTop = true }
                    }
                )
            }
            composable(Routes.GALLERY) { GalleryScreen() }
            composable(Routes.SETTINGS) { SettingsScreen() }
        }
    }
}
