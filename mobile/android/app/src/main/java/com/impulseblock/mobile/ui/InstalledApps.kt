package com.impulseblock.mobile.ui

import android.content.Context
import android.content.Intent
import android.graphics.drawable.Drawable

/**
 * Lists user-visible launcher applications via PackageManager. Relies on the
 * manifest's <queries> declaration for MAIN/LAUNCHER visibility — no
 * QUERY_ALL_PACKAGES permission.
 */
object InstalledApps {

    data class AppEntry(
        val packageName: String,
        val label: String,
        val icon: Drawable?,
    )

    /** Popular pause targets surfaced as quick suggestions when installed. */
    val suggestedPackages = listOf(
        "com.instagram.android",
        "com.zhiliaoapp.musically",   // TikTok
        "com.ss.android.ugc.trill",   // TikTok (some regions)
        "com.google.android.youtube",
        "com.twitter.android",
        "com.facebook.katana",
        "com.reddit.frontpage",
    )

    fun loadLauncherApps(context: Context): List<AppEntry> {
        val pm = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        return pm.queryIntentActivities(intent, 0)
            .asSequence()
            .mapNotNull { it.activityInfo }
            .filter { it.packageName != context.packageName }
            .distinctBy { it.packageName }
            .map { info ->
                AppEntry(
                    packageName = info.packageName,
                    label = info.loadLabel(pm).toString(),
                    icon = runCatching { info.loadIcon(pm) }.getOrNull(),
                )
            }
            .sortedBy { it.label.lowercase() }
            .toList()
    }
}
