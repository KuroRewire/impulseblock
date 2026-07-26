package com.impulseblock.mobile.service

import android.accessibilityservice.AccessibilityService
import android.graphics.PixelFormat
import android.view.ContextThemeWrapper
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.TextView
import com.impulseblock.mobile.R

/**
 * Full-screen calm pause overlay drawn with TYPE_ACCESSIBILITY_OVERLAY —
 * available to enabled accessibility services without the separate
 * "draw over other apps" permission. Blocks interaction with the app or page
 * behind it until the user chooses "Not now" or "Continue intentionally".
 */
class OverlayController(private val service: AccessibilityService) {

    sealed class Mode {
        data class App(val packageName: String) : Mode()
        data class Site(val host: String) : Mode()
    }

    private val windowManager =
        service.getSystemService(AccessibilityService.WINDOW_SERVICE) as WindowManager

    private var view: View? = null
    private var currentKey: String? = null

    fun show(mode: Mode, onNotNow: () -> Unit, onAllow: (minutes: Int) -> Unit) {
        val key = when (mode) {
            is Mode.App -> "app:${mode.packageName}"
            is Mode.Site -> "site:${mode.host}"
        }
        // Already showing for the same target — don't rebuild (avoids flicker).
        if (view != null && currentKey == key) return
        hide()
        currentKey = key

        val themed = ContextThemeWrapper(service, R.style.Theme_ImpulseBlock_Overlay)
        val content = LayoutInflater.from(themed).inflate(R.layout.overlay_block, null)

        val subtitle = content.findViewById<TextView>(R.id.overlay_subtitle)
        subtitle.text = service.getString(R.string.overlay_supporting)

        val target = content.findViewById<TextView>(R.id.overlay_target)
        target.text = when (mode) {
            is Mode.App -> appLabel(mode.packageName)
            is Mode.Site -> mode.host
        }

        val durationRow = content.findViewById<View>(R.id.overlay_duration_row)
        durationRow.visibility = View.GONE

        content.findViewById<View>(R.id.overlay_not_now).setOnClickListener { onNotNow() }
        content.findViewById<View>(R.id.overlay_continue).setOnClickListener {
            durationRow.visibility = View.VISIBLE
        }
        content.findViewById<View>(R.id.overlay_allow_5).setOnClickListener { onAllow(5) }
        content.findViewById<View>(R.id.overlay_allow_15).setOnClickListener { onAllow(15) }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT,
        )

        try {
            windowManager.addView(content, params)
            view = content
        } catch (e: Exception) {
            // If the window cannot be added (rare — service being torn down),
            // fail open rather than crash the service.
            view = null
            currentKey = null
        }
    }

    fun hide() {
        val v = view ?: return
        view = null
        currentKey = null
        try {
            windowManager.removeView(v)
        } catch (e: Exception) {
            // View already detached — nothing to do.
        }
    }

    private fun appLabel(packageName: String): String = try {
        val info = service.packageManager.getApplicationInfo(packageName, 0)
        service.packageManager.getApplicationLabel(info).toString()
    } catch (e: Exception) {
        packageName
    }
}
