package com.impulseblock.mobile.domain

/**
 * Browsers whose address bar ImpulseBlock can read to match user-configured
 * domains. Google Chrome (all channels) is the P0 target; each channel uses
 * the same `url_bar` view id under its own package name.
 *
 * Only the visible address-bar node is ever inspected — never page content.
 */
object SupportedBrowsers {

    data class Browser(val packageName: String, val urlBarViewIds: List<String>)

    val browsers: List<Browser> = listOf(
        chrome("com.android.chrome"),
        chrome("com.chrome.beta"),
        chrome("com.chrome.dev"),
        chrome("com.chrome.canary"),
    )

    private fun chrome(pkg: String) = Browser(
        packageName = pkg,
        urlBarViewIds = listOf(
            "$pkg:id/url_bar",          // Standard Chrome omnibox (stable for years).
            "$pkg:id/location_bar_status", // Conservative fallback used by some variants.
        ),
    )

    private val byPackage = browsers.associateBy { it.packageName }

    fun isBrowser(packageName: String?): Boolean = packageName != null && packageName in byPackage

    fun urlBarIds(packageName: String): List<String> =
        byPackage[packageName]?.urlBarViewIds ?: emptyList()
}
