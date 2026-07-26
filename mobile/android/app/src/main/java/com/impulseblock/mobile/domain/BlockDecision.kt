package com.impulseblock.mobile.domain

/**
 * Pure decision core used by the accessibility service. Given the current
 * foreground package, an optionally detected browser hostname and a state
 * snapshot, decides whether to show the pause overlay. No Android types, so
 * every branch is unit-testable.
 */
object BlockDecision {

    data class Snapshot(
        val enabled: Boolean,
        val blockedPackages: Set<String>,
        val blockedDomains: List<String>,
        /** packageName -> epoch millis when the temporary allowance expires */
        val tempAllowedPackages: Map<String, Long>,
        /** hostname -> epoch millis when the temporary allowance expires */
        val tempAllowedHosts: Map<String, Long>,
        val selfPackage: String,
        val launcherPackages: Set<String> = emptySet(),
    )

    sealed class Decision {
        object None : Decision()
        data class BlockApp(val packageName: String) : Decision()
        data class BlockSite(val host: String, val browserPackage: String) : Decision()
    }

    fun decide(
        foregroundPackage: String?,
        detectedHost: String?,
        nowMs: Long,
        snapshot: Snapshot,
    ): Decision {
        if (!snapshot.enabled) return Decision.None
        val pkg = foregroundPackage ?: return Decision.None

        // Never interfere with ImpulseBlock itself or critical system surfaces.
        if (pkg == snapshot.selfPackage) return Decision.None
        if (SystemAllowlist.isCritical(pkg, snapshot.launcherPackages)) return Decision.None

        // Browser + matched domain → site pause.
        if (detectedHost != null && DomainNormalizer.isBlocked(detectedHost, snapshot.blockedDomains)) {
            if (!isTempAllowedHost(detectedHost, nowMs, snapshot.tempAllowedHosts)) {
                return Decision.BlockSite(detectedHost, pkg)
            }
            return Decision.None
        }

        // Selected app → app pause.
        if (pkg in snapshot.blockedPackages) {
            val expiry = snapshot.tempAllowedPackages[pkg]
            if (expiry == null || expiry <= nowMs) {
                return Decision.BlockApp(pkg)
            }
        }

        return Decision.None
    }

    /** A host is allowed if it, or any parent domain of it, holds an active allowance. */
    fun isTempAllowedHost(host: String, nowMs: Long, allowances: Map<String, Long>): Boolean =
        allowances.any { (allowedHost, expiry) ->
            expiry > nowMs && DomainNormalizer.matches(host, allowedHost)
        }

    /** Earliest future expiry, used to schedule a re-evaluation. Null if none. */
    fun nextExpiryMs(nowMs: Long, snapshot: Snapshot): Long? =
        (snapshot.tempAllowedPackages.values + snapshot.tempAllowedHosts.values)
            .filter { it > nowMs }
            .minOrNull()
}
