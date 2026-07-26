package com.impulseblock.mobile

import com.impulseblock.mobile.domain.UrlBarParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class UrlBarParserTest {

    @Test fun fullUrl() {
        assertEquals("m.youtube.com", UrlBarParser.extractHost("https://m.youtube.com/watch?v=x"))
    }

    @Test fun bareHostAsChromeShowsWhenUnfocused() {
        assertEquals("youtube.com", UrlBarParser.extractHost("youtube.com"))
        assertEquals("youtube.com", UrlBarParser.extractHost("youtube.com/feed"))
    }

    @Test fun searchQueriesNeverMatch() {
        assertNull(UrlBarParser.extractHost("how to stop doomscrolling"))
        assertNull(UrlBarParser.extractHost("youtube"))
        assertNull(UrlBarParser.extractHost("Search or type web address"))
    }

    @Test fun emptyAndNullSafe() {
        assertNull(UrlBarParser.extractHost(null))
        assertNull(UrlBarParser.extractHost(""))
        assertNull(UrlBarParser.extractHost("   "))
    }

    @Test fun nonHttpSchemesIgnored() {
        assertNull(UrlBarParser.extractHost("chrome://flags"))
        assertNull(UrlBarParser.extractHost("about:blank"))
        assertNull(UrlBarParser.extractHost("file:///sdcard/x.html"))
        assertNull(UrlBarParser.extractHost("javascript:alert(1)"))
        assertNull(UrlBarParser.extractHost("data:text/html,hi"))
    }

    @Test fun internationalizedHostname() {
        assertEquals("xn--bcher-kva.de", UrlBarParser.extractHost("bücher.de"))
    }

    @Test fun ipAddressesIgnored() {
        assertNull(UrlBarParser.extractHost("192.168.1.1"))
    }

    @Test fun stripsWwwLikeTheExtension() {
        assertEquals("reddit.com", UrlBarParser.extractHost("www.reddit.com"))
    }
}
