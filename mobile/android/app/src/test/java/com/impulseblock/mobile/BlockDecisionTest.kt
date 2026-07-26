package com.impulseblock.mobile

import com.impulseblock.mobile.domain.BlockDecision
import com.impulseblock.mobile.domain.BlockDecision.Decision
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BlockDecisionTest {

    private val now = 1_000_000L

    private fun snapshot(
        enabled: Boolean = true,
        blockedPackages: Set<String> = setOf("com.instagram.android", "com.google.android.youtube"),
        blockedDomains: List<String> = listOf("youtube.com", "tiktok.com"),
        tempPkgs: Map<String, Long> = emptyMap(),
        tempHosts: Map<String, Long> = emptyMap(),
    ) = BlockDecision.Snapshot(
        enabled = enabled,
        blockedPackages = blockedPackages,
        blockedDomains = blockedDomains,
        tempAllowedPackages = tempPkgs,
        tempAllowedHosts = tempHosts,
        selfPackage = "com.impulseblock.mobile",
        launcherPackages = setOf("com.launcher.custom"),
    )

    @Test fun blocksSelectedApp() {
        val d = BlockDecision.decide("com.instagram.android", null, now, snapshot())
        assertEquals(Decision.BlockApp("com.instagram.android"), d)
    }

    @Test fun allowsUnselectedApp() {
        assertEquals(Decision.None, BlockDecision.decide("com.spotify.music", null, now, snapshot()))
    }

    @Test fun masterToggleOffAllowsEverything() {
        assertEquals(
            Decision.None,
            BlockDecision.decide("com.instagram.android", null, now, snapshot(enabled = false)),
        )
    }

    @Test fun neverBlocksSelf() {
        assertEquals(
            Decision.None,
            BlockDecision.decide("com.impulseblock.mobile", null, now, snapshot()),
        )
    }

    @Test fun neverBlocksCriticalSystemPackages() {
        for (pkg in listOf(
            "com.android.systemui", "com.android.settings", "com.android.phone",
            "com.android.emergency", "com.google.android.dialer", "com.launcher.custom",
        )) {
            assertEquals("must not block $pkg", Decision.None,
                BlockDecision.decide(pkg, null, now, snapshot(blockedPackages = setOf(pkg))))
        }
    }

    @Test fun blocksMatchedSiteInBrowser() {
        val d = BlockDecision.decide("com.android.chrome", "m.youtube.com", now, snapshot())
        assertEquals(Decision.BlockSite("m.youtube.com", "com.android.chrome"), d)
    }

    @Test fun allowsUnmatchedSite() {
        assertEquals(
            Decision.None,
            BlockDecision.decide("com.android.chrome", "wikipedia.org", now, snapshot()),
        )
    }

    @Test fun tempAllowedPackagePasses() {
        val snap = snapshot(tempPkgs = mapOf("com.instagram.android" to now + 60_000))
        assertEquals(Decision.None, BlockDecision.decide("com.instagram.android", null, now, snap))
    }

    @Test fun expiredPackageAllowanceBlocksAgain() {
        val snap = snapshot(tempPkgs = mapOf("com.instagram.android" to now - 1))
        assertEquals(
            Decision.BlockApp("com.instagram.android"),
            BlockDecision.decide("com.instagram.android", null, now, snap),
        )
    }

    @Test fun tempAllowedHostCoversSubdomains() {
        val snap = snapshot(tempHosts = mapOf("youtube.com" to now + 60_000))
        assertEquals(
            Decision.None,
            BlockDecision.decide("com.android.chrome", "m.youtube.com", now, snap),
        )
    }

    @Test fun expiredHostAllowanceBlocksAgain() {
        val snap = snapshot(tempHosts = mapOf("youtube.com" to now - 1))
        assertEquals(
            Decision.BlockSite("youtube.com", "com.android.chrome"),
            BlockDecision.decide("com.android.chrome", "youtube.com", now, snap),
        )
    }

    @Test fun nextExpiryPicksEarliestFuture() {
        val snap = snapshot(
            tempPkgs = mapOf("a" to now + 5_000, "b" to now - 100),
            tempHosts = mapOf("c.com" to now + 2_000),
        )
        assertEquals(now + 2_000, BlockDecision.nextExpiryMs(now, snap))
    }

    @Test fun nextExpiryNullWhenNothingActive() {
        assertNull(BlockDecision.nextExpiryMs(now, snapshot()))
    }

    @Test fun blockedAppInsideBrowserHostCheckStillSiteFirst() {
        // Chrome itself selected as a blocked app AND a matched site: site
        // decision wins only when a host is detected; without a host the app
        // rule applies.
        val snap = snapshot(blockedPackages = setOf("com.android.chrome"))
        assertTrue(
            BlockDecision.decide("com.android.chrome", null, now, snap) is Decision.BlockApp,
        )
    }
}
