package com.aicreator.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.aicreator.app.ui.AppScaffold
import com.aicreator.app.ui.theme.AICreatorTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            AICreatorTheme {
                AppScaffold()
            }
        }
    }
}
