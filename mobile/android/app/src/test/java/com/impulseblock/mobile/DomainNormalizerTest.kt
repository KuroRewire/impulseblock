package com.impulseblock.mobile

import com.impulseblock.mobile.domain.DomainNormalizer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DomainNormalizerTest {

    private fun valid(input: String): String? =
        (DomainNormalizer.normalize(input) as? DomainNormalizer.Outcome.Valid)?.host

    private fun invalidReason(input: String): DomainNormalizer.Reason? =
        (DomainNormalizer.normalize(input) as? DomainNormalizer.Outcome.Invalid)?.reason

    @Test fun plainDomain() {
        assertEquals("youtube.com", valid("youtube.com"))
    }

    @Test fun stripsSchemePathQueryFragmentPortCaseWww() {
        assertEquals("youtube.com", valid("HTTPS://WWW.YouTube.COM:443/watch?v=abc#t=1"))
        assertEquals("instagram.com", valid("http://instagram.com/reels/"))
        assertEquals("tiktok.com", valid("//tiktok.com/foo"))
        assertEquals("facebook.com", valid("  facebook.com  "))
        assertEquals("twitter.com", valid("user:pass@twitter.com/home"))
        assertEquals("news.ycombinator.com", valid("news.ycombinator.com."))
    }

    @Test fun wwwStrippedOnlyOnce() {
        assertEquals("example.com", valid("www.example.com"))
        assertEquals("www.example.com", valid("www.www.example.com"))
    }

    @Test fun subdomainPreserved() {
        assertEquals("m.youtube.com", valid("m.youtube.com"))
    }

    @Test fun internationalizedDomains() {
        assertEquals("xn--bcher-kva.example", valid("bücher.example"))
        assertEquals("xn--r8jz45g.xn--zckzah", valid("例え.テスト"))
    }

    @Test fun rejectsMalformed() {
        assertEquals(DomainNormalizer.Reason.EMPTY, invalidReason(""))
        assertEquals(DomainNormalizer.Reason.EMPTY, invalidReason("   "))
        assertEquals(DomainNormalizer.Reason.EMPTY, invalidReason("https://"))
        assertEquals(DomainNormalizer.Reason.MALFORMED, invalidReason("not a domain"))
        assertEquals(DomainNormalizer.Reason.MALFORMED, invalidReason("-bad.com"))
        assertEquals(DomainNormalizer.Reason.MALFORMED, invalidReason("bad-.com"))
        assertEquals(DomainNormalizer.Reason.MALFORMED, invalidReason("example.com:notaport"))
    }

    @Test fun rejectsLocalAndReserved() {
        assertEquals(DomainNormalizer.Reason.LOCAL_OR_RESERVED, invalidReason("localhost"))
        assertEquals(DomainNormalizer.Reason.LOCAL_OR_RESERVED, invalidReason("myprinter.local"))
        assertEquals(DomainNormalizer.Reason.LOCAL_OR_RESERVED, invalidReason("single-label"))
        assertEquals(DomainNormalizer.Reason.LOCAL_OR_RESERVED, invalidReason("router.internal"))
    }

    @Test fun rejectsIpAddresses() {
        assertEquals(DomainNormalizer.Reason.IP_UNSUPPORTED, invalidReason("192.168.1.1"))
        assertEquals(DomainNormalizer.Reason.IP_UNSUPPORTED, invalidReason("[2001:db8::1]"))
        assertEquals(DomainNormalizer.Reason.IP_UNSUPPORTED, invalidReason("http://127.0.0.1:8080/admin"))
    }

    @Test fun rootAndSubdomainMatching() {
        assertTrue(DomainNormalizer.matches("youtube.com", "youtube.com"))
        assertTrue(DomainNormalizer.matches("m.youtube.com", "youtube.com"))
        assertTrue(DomainNormalizer.matches("music.m.youtube.com", "youtube.com"))
        assertFalse(DomainNormalizer.matches("notyoutube.com", "youtube.com"))
        assertFalse(DomainNormalizer.matches("youtube.com.evil.example", "youtube.com"))
    }

    @Test fun isBlockedAgainstList() {
        val list = listOf("youtube.com", "tiktok.com")
        assertTrue(DomainNormalizer.isBlocked("m.tiktok.com", list))
        assertFalse(DomainNormalizer.isBlocked("vimeo.com", list))
    }
}
