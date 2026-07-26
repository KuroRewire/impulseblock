package com.impulseblock.mobile.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color

private val Indigo = Color(0xFF5957D6)
private val IndigoDeep = Color(0xFF1A184D)

private val LightColors = lightColorScheme(
    primary = Indigo,
    secondary = IndigoDeep,
    surfaceTint = Indigo,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF9D9BFF),
    secondary = Indigo,
)

@Composable
fun ImpulseBlockTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        content = content,
    )
}

class MainActivity : ComponentActivity() {

    private val viewModel: MainViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ImpulseBlockTheme {
                Root(viewModel)
            }
        }
    }
}

@Composable
private fun Root(viewModel: MainViewModel) {
    val state by viewModel.state.collectAsState()

    if (!state.disclosureAccepted || !state.onboardingComplete) {
        OnboardingScreen(viewModel)
        return
    }

    var tab by remember { mutableIntStateOf(0) }
    val items = listOf(
        "Home" to Icons.Filled.Home,
        "Apps" to Icons.AutoMirrored.Filled.List,
        "Websites" to Icons.Filled.Lock,
        "Settings" to Icons.Filled.Settings,
    )

    Scaffold(
        bottomBar = {
            NavigationBar {
                items.forEachIndexed { index, (label, icon) ->
                    NavigationBarItem(
                        selected = tab == index,
                        onClick = { tab = index },
                        icon = { Icon(icon, contentDescription = label) },
                        label = { Text(label) },
                    )
                }
            }
        },
    ) { padding ->
        val modifier = Modifier.padding(padding)
        when (tab) {
            0 -> HomeScreen(viewModel, modifier)
            1 -> AppsScreen(viewModel, modifier)
            2 -> WebsitesScreen(viewModel, modifier)
            else -> SettingsScreen(viewModel, modifier)
        }
    }
}
