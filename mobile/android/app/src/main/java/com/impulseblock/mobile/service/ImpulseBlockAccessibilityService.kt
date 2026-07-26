package com.impulseblock.mobile.service

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import com.impulseblock.mobile.BuildConfig
import android.view.accessibility.AccessibilityNodeInfo
import com.impulseblock.mobile.data.BlockStateRepository
import com.impulseblock.mobile.domain.BlockDecision
import com.impulseblock.mobile.domain.SupportedBrowsers
import com.impulseblock.mobile.domain.SystemAllowlist
import com.impulseblock.mobile.domain.UrlBarParser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Enforcement core. Observes the foreground app (and, in supported browsers,
 * only the visible address-bar text) and shows a calm full-screen pause
 * overlay when the user opens something they chose to block.
 *
 * Privacy invariants, enforced by construction:
 *  - URL-bar text is processed in memory and immediately discarded.
 *  - Nothing observed here is ever written to disk or the network
 *    (the app does not even hold the INTERNET permission).
 *  - Page content is never read; only the address-bar node is queried.
 */
class ImpulseBlockAccessibilityService : AccessibilityService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val handler = Handler(Looper.getMainLooper())

    private lateinit var repository: BlockStateRepository
    private var overlay: OverlayController? = null

    @Volatile
    private var currentState: BlockStateRepository.State = BlockStateRepository.State()

    private var launcherPackages: Set<String> = emptySet()
    private var currentPackage: String? = null
    private var lastUrlCheckMs: Long = 0
    private var lastDetectedHost: String? = null

    private val reevaluateRunnable = Runnable { evaluate() }

    companion object {
        private const val TAG = "ImpulseBlockSvc"
        private const val URL_CHECK_THROTTLE_MS = 250L

        /**
         * Debug-only trace. Never logs URLs, hostnames, or page content —
         * only package names and coarse booleans — and is compiled out of
         * release builds. Keeps enforcement debuggable without touching the
         * privacy guarantee (no browsing data is logged or persisted).
         */
        private fun trace(message: () -> String) {
            if (BuildConfig.DEBUG) Log.d(TAG, message())
        }

        /** Exposed so the app UI can show accurate permission health. */
        @Volatile
        var isRunning: Boolean = false
            private set
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        isRunning = true
        repository = BlockStateRepository.get(this)
        overlay = OverlayController(this)
        launcherPackages = resolveLauncherPackages()

        scope.launch {
            repository.state.collect { state ->
                currentState = state
                scheduleExpiryReevaluation(state)
                // Seed the foreground package from the active window so a
                // freshly (re)started service re-blocks whatever is already on
                // screen, without waiting for the next window-state event.
                // This closes the gap where an allowance expires (or the
                // process is recreated) while a blocked app is already open.
                if (currentPackage == null) seedForegroundPackage()
                evaluate()
            }
        }
    }

    /** Reads the current foreground package from the active window, if any. */
    private fun seedForegroundPackage() {
        val pkg = try {
            rootInActiveWindow?.packageName?.toString()
        } catch (e: Exception) {
            null
        }
        if (pkg != null && pkg != packageName && !SystemAllowlist.isInputMethod(pkg)) {
            currentPackage = pkg
            lastDetectedHost = null
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return
        val pkg = event.packageName?.toString() ?: return

        // Our own overlay windows generate events; never treat them as an app
        // switch, or showing the overlay would immediately hide it again.
        if (pkg == packageName) return

        // Keyboards pop over the current app without changing it.
        if (SystemAllowlist.isInputMethod(pkg)) return

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                trace { "windowState pkg=$pkg" }
                if (pkg != currentPackage) {
                    currentPackage = pkg
                    lastDetectedHost = null
                }
                evaluate()
            }

            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> {
                if (SupportedBrowsers.isBrowser(pkg) && pkg == currentPackage) {
                    val now = System.currentTimeMillis()
                    if (now - lastUrlCheckMs >= URL_CHECK_THROTTLE_MS) {
                        lastUrlCheckMs = now
                        evaluate()
                    }
                }
            }
        }
    }

    private fun evaluate() {
        val state = currentState
        val pkg = currentPackage
        val host = if (SupportedBrowsers.isBrowser(pkg)) detectBrowserHost(pkg!!) else null
        lastDetectedHost = host

        val decision = BlockDecision.decide(
            foregroundPackage = pkg,
            detectedHost = host,
            nowMs = System.currentTimeMillis(),
            snapshot = state.toSnapshot(packageName, launcherPackages),
        )
        // Coarse trace only: never logs the detected hostname or any URL.
        trace {
            "evaluate pkg=$pkg hostDetected=${host != null} " +
                "blockedPkgs=${state.blockedPackages.size} enabled=${state.enabled} " +
                "decision=${decision::class.simpleName}"
        }

        when (decision) {
            is BlockDecision.Decision.None -> overlay?.hide()
            is BlockDecision.Decision.BlockApp ->
                overlay?.show(
                    OverlayController.Mode.App(decision.packageName),
                    onNotNow = ::leaveBlockedContext,
                    onAllow = { minutes -> allowPackage(decision.packageName, minutes) },
                )
            is BlockDecision.Decision.BlockSite ->
                overlay?.show(
                    OverlayController.Mode.Site(decision.host),
                    onNotNow = ::leaveBlockedContext,
                    onAllow = { minutes -> allowHost(decision.host, minutes) },
                )
        }
    }

    /**
     * Reads only the address-bar node of the supported browser in the active
     * window. Returns null (never blocks) when the URL cannot be determined
     * confidently — new tab, search query, custom tab without a bar, etc.
     */
    private fun detectBrowserHost(browserPackage: String): String? {
        val root: AccessibilityNodeInfo = rootInActiveWindow ?: return lastDetectedHost
        if (root.packageName?.toString() != browserPackage) return lastDetectedHost
        try {
            for (viewId in SupportedBrowsers.urlBarIds(browserPackage)) {
                val nodes = root.findAccessibilityNodeInfosByViewId(viewId) ?: continue
                for (node in nodes) {
                    val host = UrlBarParser.extractHost(node.text)
                    if (host != null) return host
                }
            }
        } catch (e: Exception) {
            // Stale nodes can throw; failing open (no block) is the safe direction.
            return null
        }
        return null
    }

    private fun leaveBlockedContext() {
        overlay?.hide()
        performGlobalAction(GLOBAL_ACTION_HOME)
    }

    private fun allowPackage(pkg: String, minutes: Int) {
        overlay?.hide()
        val until = System.currentTimeMillis() + minutes * 60_000L
        scope.launch { repository.addTempAllowPackage(pkg, until) }
    }

    private fun allowHost(host: String, minutes: Int) {
        overlay?.hide()
        val until = System.currentTimeMillis() + minutes * 60_000L
        scope.launch { repository.addTempAllowHost(host, until) }
    }

    /** Re-evaluate exactly when the earliest temporary allowance expires. */
    private fun scheduleExpiryReevaluation(state: BlockStateRepository.State) {
        handler.removeCallbacks(reevaluateRunnable)
        val now = System.currentTimeMillis()
        val next = BlockDecision.nextExpiryMs(
            now,
            state.toSnapshot(packageName, launcherPackages),
        ) ?: return
        handler.postDelayed(reevaluateRunnable, (next - now).coerceAtLeast(250L))
    }

    private fun resolveLauncherPackages(): Set<String> {
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        return packageManager.queryIntentActivities(intent, 0)
            .mapNotNull { it.activityInfo?.packageName }
            .toSet()
    }

    override fun onInterrupt() {
        overlay?.hide()
    }

    override fun onUnbind(intent: Intent?): Boolean {
        isRunning = false
        overlay?.hide()
        return super.onUnbind(intent)
    }

    override fun onDestroy() {
        isRunning = false
        handler.removeCallbacks(reevaluateRunnable)
        overlay?.hide()
        scope.cancel()
        super.onDestroy()
    }
}
