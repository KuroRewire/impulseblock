package com.impulseblock.mobile

import com.impulseblock.mobile.domain.SystemAllowlist
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SystemAllowlistTest {

    @Test fun criticalSystemPackagesAllowed() {
        listOf(
            "android",
            "com.android.systemui",
            "com.android.settings",
            "com.android.phone",
            "com.android.server.telecom",
            "com.android.emergency",
            "com.google.android.dialer",
            "com.android.permissioncontroller",
        ).forEach { assertTrue("$it must be critical", SystemAllowlist.isCritical(it)) }
    }

    @Test fun launcherPackagesFromRuntimeSetAllowed() {
        assertTrue(SystemAllowlist.isCritical("com.oem.launcher", setOf("com.oem.launcher")))
        assertFalse(SystemAllowlist.isCritical("com.oem.launcher"))
    }

    @Test fun inputMethodsDetected() {
        assertTrue(SystemAllowlist.isInputMethod("com.google.android.inputmethod.latin"))
        assertTrue(SystemAllowlist.isInputMethod("com.samsung.android.honeyboard"))
        assertFalse(SystemAllowlist.isInputMethod("com.instagram.android"))
    }

    @Test fun normalAppsAreNotCritical() {
        assertFalse(SystemAllowlist.isCritical("com.instagram.android"))
        assertFalse(SystemAllowlist.isCritical("com.zhiliaoapp.musically"))
        assertFalse(SystemAllowlist.isCritical("com.google.android.youtube"))
    }
}
