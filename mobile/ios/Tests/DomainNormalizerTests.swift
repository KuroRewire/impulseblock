import XCTest
@testable import ImpulseBlock

final class DomainNormalizerTests: XCTestCase {

    private func normalized(_ input: String) -> String? {
        if case .success(let host) = DomainNormalizer.normalize(input) { return host }
        return nil
    }

    private func failure(_ input: String) -> DomainNormalizer.Failure? {
        if case .failure(let f) = DomainNormalizer.normalize(input) { return f }
        return nil
    }

    func testPlainDomain() {
        XCTAssertEqual(normalized("youtube.com"), "youtube.com")
    }

    func testSchemePathQueryFragmentPortCaseWww() {
        XCTAssertEqual(normalized("HTTPS://WWW.YouTube.COM:443/watch?v=abc#t=1"), "youtube.com")
        XCTAssertEqual(normalized("http://instagram.com/reels/"), "instagram.com")
        XCTAssertEqual(normalized("//tiktok.com/foo"), "tiktok.com")
        XCTAssertEqual(normalized("  facebook.com  "), "facebook.com")
        XCTAssertEqual(normalized("user:pass@twitter.com/home"), "twitter.com")
        XCTAssertEqual(normalized("news.ycombinator.com."), "news.ycombinator.com")
    }

    func testWwwOnlyStrippedOnce() {
        XCTAssertEqual(normalized("www.example.com"), "example.com")
        XCTAssertEqual(normalized("www.www.example.com"), "www.example.com")
    }

    func testSubdomainPreserved() {
        XCTAssertEqual(normalized("m.youtube.com"), "m.youtube.com")
    }

    func testInternationalizedDomains() {
        XCTAssertEqual(normalized("bücher.example"), "xn--bcher-kva.example")
        XCTAssertEqual(normalized("例え.テスト"), "xn--r8jz45g.xn--zckzah")
    }

    func testRejectsMalformed() {
        XCTAssertEqual(failure(""), .empty)
        XCTAssertEqual(failure("   "), .empty)
        XCTAssertEqual(failure("https://"), .empty)
        XCTAssertEqual(failure("not a domain"), .malformed)
        XCTAssertEqual(failure("exa mple.com"), .malformed)
        XCTAssertEqual(failure("-bad.com"), .malformed)
        XCTAssertEqual(failure("bad-.com"), .malformed)
        XCTAssertEqual(failure("example.com:notaport"), .malformed)
    }

    func testRejectsLocalAndReserved() {
        XCTAssertEqual(failure("localhost"), .localOrReserved)
        XCTAssertEqual(failure("myprinter.local"), .localOrReserved)
        XCTAssertEqual(failure("single-label"), .localOrReserved)
        XCTAssertEqual(failure("router.internal"), .localOrReserved)
    }

    func testRejectsIPAddresses() {
        XCTAssertEqual(failure("192.168.1.1"), .ipAddressUnsupported)
        XCTAssertEqual(failure("[2001:db8::1]"), .ipAddressUnsupported)
        XCTAssertEqual(failure("http://127.0.0.1:8080/admin"), .ipAddressUnsupported)
    }

    func testRootAndSubdomainMatching() {
        XCTAssertTrue(DomainNormalizer.matches(host: "youtube.com", blockedEntry: "youtube.com"))
        XCTAssertTrue(DomainNormalizer.matches(host: "m.youtube.com", blockedEntry: "youtube.com"))
        XCTAssertTrue(DomainNormalizer.matches(host: "music.m.youtube.com", blockedEntry: "youtube.com"))
        XCTAssertFalse(DomainNormalizer.matches(host: "notyoutube.com", blockedEntry: "youtube.com"))
        XCTAssertFalse(DomainNormalizer.matches(host: "youtube.com.evil.example", blockedEntry: "youtube.com"))
    }

    func testIsBlockedAgainstList() {
        let list = ["youtube.com", "tiktok.com"]
        XCTAssertTrue(DomainNormalizer.isBlocked(host: "m.tiktok.com", in: list))
        XCTAssertFalse(DomainNormalizer.isBlocked(host: "vimeo.com", in: list))
    }
}
