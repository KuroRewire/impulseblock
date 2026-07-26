package com.impulseblock.mobile.domain

import java.net.IDN

/**
 * Normalizes user-entered website strings into a canonical registrable
 * hostname, mirroring the ImpulseBlock browser extension's `blockedHosts`
 * semantics (bare lowercase hostnames; matching = exact or dot-suffix).
 *
 * Pure JVM code — unit-tested without an emulator.
 */
object DomainNormalizer {

    sealed class Outcome {
        data class Valid(val host: String) : Outcome()
        data class Invalid(val reason: Reason) : Outcome()
    }

    enum class Reason { EMPTY, MALFORMED, LOCAL_OR_RESERVED, IP_UNSUPPORTED, TOO_LONG }

    private val reservedHosts = setOf("localhost")
    private val reservedSuffixes = listOf(".local", ".localhost", ".internal", ".home.arpa")
    private val labelRegex = Regex("^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?$")

    fun normalize(raw: String): Outcome {
        var s = raw.trim()
        if (s.isEmpty()) return Outcome.Invalid(Reason.EMPTY)

        s = s.lowercase()

        // Strip scheme or protocol-relative prefix.
        val schemeIdx = s.indexOf("://")
        if (schemeIdx >= 0) s = s.substring(schemeIdx + 3)
        else if (s.startsWith("//")) s = s.substring(2)

        // Cut authority at first path/query/fragment delimiter.
        val cut = s.indexOfFirst { it == '/' || it == '?' || it == '#' }
        if (cut >= 0) s = s.substring(0, cut)

        // Strip userinfo.
        val at = s.lastIndexOf('@')
        if (at >= 0) s = s.substring(at + 1)

        // Bracketed IPv6 literals unsupported.
        if (s.startsWith("[")) return Outcome.Invalid(Reason.IP_UNSUPPORTED)

        // Strip trailing :port (digits only).
        val colon = s.lastIndexOf(':')
        if (colon >= 0) {
            val port = s.substring(colon + 1)
            if (port.isNotEmpty() && port.all { it.isDigit() }) {
                s = s.substring(0, colon)
            } else {
                return Outcome.Invalid(Reason.MALFORMED)
            }
        }

        // Trailing dots (FQDN form).
        s = s.trimEnd('.')

        // Single leading "www.".
        if (s.startsWith("www.") && s.length > 4) s = s.substring(4)

        if (s.isEmpty()) return Outcome.Invalid(Reason.EMPTY)
        if (s.any { it.isWhitespace() }) return Outcome.Invalid(Reason.MALFORMED)

        // IDN conversion (no-op for ASCII).
        s = try {
            IDN.toASCII(s, IDN.ALLOW_UNASSIGNED).lowercase()
        } catch (e: IllegalArgumentException) {
            return Outcome.Invalid(Reason.MALFORMED)
        }

        if (s in reservedHosts) return Outcome.Invalid(Reason.LOCAL_OR_RESERVED)
        for (suffix in reservedSuffixes) {
            if (s.endsWith(suffix) || s == suffix.removePrefix(".")) {
                return Outcome.Invalid(Reason.LOCAL_OR_RESERVED)
            }
        }

        val labels = s.split('.')

        // IPv4 literal.
        if (labels.size == 4 && labels.all { it.isNotEmpty() && it.all(Char::isDigit) }) {
            return Outcome.Invalid(Reason.IP_UNSUPPORTED)
        }

        // Single-label hosts are local-style.
        if (labels.size < 2) return Outcome.Invalid(Reason.LOCAL_OR_RESERVED)

        if (s.toByteArray(Charsets.UTF_8).size > 253) return Outcome.Invalid(Reason.TOO_LONG)

        for (label in labels) {
            if (label.isEmpty() || label.length > 63) return Outcome.Invalid(Reason.MALFORMED)
            if (!labelRegex.matches(label)) return Outcome.Invalid(Reason.MALFORMED)
        }

        // TLD must not be all digits.
        if (labels.last().all(Char::isDigit)) return Outcome.Invalid(Reason.MALFORMED)

        return Outcome.Valid(s)
    }

    /** Root-domain + subdomain matching, identical to the extension's hostMatches. */
    fun matches(host: String, blockedEntry: String): Boolean =
        host == blockedEntry || host.endsWith(".$blockedEntry")

    fun isBlocked(host: String, blockedEntries: Collection<String>): Boolean =
        blockedEntries.any { matches(host, it) }
}
