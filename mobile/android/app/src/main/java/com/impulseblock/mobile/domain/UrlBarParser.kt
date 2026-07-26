package com.impulseblock.mobile.domain

/**
 * Conservatively extracts a hostname from raw browser address-bar text.
 *
 * The address bar can contain a full URL, a bare host, a search query, or a
 * placeholder hint. ImpulseBlock must never block based on a guess, so this
 * returns null unless the text confidently parses as a hostname. Processing
 * happens entirely in memory; the input is never persisted or transmitted.
 */
object UrlBarParser {

    /** Non-web schemes that must never produce a match. */
    private val ignoredSchemePrefixes = listOf(
        "about:", "chrome:", "chrome-native:", "file:", "ftp:", "data:",
        "javascript:", "blob:", "content:", "intent:", "view-source:"
    )

    fun extractHost(rawText: CharSequence?): String? {
        val text = rawText?.toString()?.trim() ?: return null
        if (text.isEmpty()) return null

        // Search queries and hints contain spaces; URLs never do.
        if (text.any { it.isWhitespace() }) return null

        val lower = text.lowercase()
        for (prefix in ignoredSchemePrefixes) {
            if (lower.startsWith(prefix)) return null
        }

        // Chrome shows either "host", "host/path", or a full URL. Require at
        // least one dot so single words (typed searches) never match.
        val beforePath = lower
            .removePrefix("https://").removePrefix("http://")
            .substringBefore('/').substringBefore('?').substringBefore('#')
        if (!beforePath.contains('.')) return null

        return when (val outcome = DomainNormalizer.normalize(text)) {
            is DomainNormalizer.Outcome.Valid -> outcome.host
            is DomainNormalizer.Outcome.Invalid -> null
        }
    }
}
