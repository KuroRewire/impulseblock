package com.impulseblock.mobile.domain

/**
 * Packages the pause overlay must never cover, regardless of user selection:
 * system UI, settings (including accessibility management), telephony and
 * emergency surfaces, launchers, and input methods. Prevents overlay loops
 * and guarantees the user can always call, reach settings, and go home.
 */
object SystemAllowlist {

    private val exactPackages = setOf(
        "android",
        "com.android.systemui",
        "com.android.settings",
        "com.android.launcher",
        "com.android.launcher3",
        "com.google.android.apps.nexuslauncher",
        "com.android.phone",
        "com.android.dialer",
        "com.google.android.dialer",
        "com.android.server.telecom",
        "com.android.emergency",
        "com.google.android.apps.safetyhub",
        "com.android.incallui",
        "com.android.contacts",
        "com.google.android.contacts",
        "com.android.deskclock",
        "com.google.android.deskclock",
        "com.android.packageinstaller",
        "com.google.android.packageinstaller",
        "com.android.permissioncontroller",
        "com.google.android.permissioncontroller",
        "com.android.intentresolver",
        "com.samsung.android.dialer",
        "com.samsung.android.incallui",
        "com.samsung.android.app.telephonyui",
        "com.sec.android.app.launcher",
        "com.miui.home",
        "com.android.cellbroadcastreceiver",
        "com.google.android.cellbroadcastreceiver",
    )

    private val prefixAllowlist = listOf(
        "com.android.inputmethod",
        "com.google.android.inputmethod",
        "com.samsung.android.honeyboard",
        "com.android.emergency",
    )

    private val inputMethodPrefixes = listOf(
        "com.android.inputmethod",
        "com.google.android.inputmethod",
        "com.samsung.android.honeyboard",
        "com.touchtype.swiftkey",
        "com.baidu.simeji",
    )

    fun isCritical(packageName: String, launcherPackages: Set<String> = emptySet()): Boolean {
        if (packageName in exactPackages) return true
        if (packageName in launcherPackages) return true
        return prefixAllowlist.any { packageName.startsWith(it) }
    }

    /**
     * Keyboards overlay the current app without replacing it; their events
     * must not be treated as an app switch.
     */
    fun isInputMethod(packageName: String): Boolean =
        inputMethodPrefixes.any { packageName.startsWith(it) }
}
