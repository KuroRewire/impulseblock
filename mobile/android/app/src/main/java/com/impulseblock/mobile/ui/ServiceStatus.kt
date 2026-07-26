package com.impulseblock.mobile.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver

/**
 * Accessibility-service status that refreshes on every ON_RESUME, so the UI
 * updates immediately when the user returns from Android's accessibility
 * settings (Settings.Secure reads are not otherwise observable).
 */
@Composable
fun rememberServiceEnabled(viewModel: MainViewModel): State<Boolean> {
    val enabled = remember { mutableStateOf(viewModel.isAccessibilityServiceEnabled()) }
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                enabled.value = viewModel.isAccessibilityServiceEnabled()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
    return enabled
}
