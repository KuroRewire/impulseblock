import XCTest
@testable import ImpulseBlock

final class PunycodeTests: XCTestCase {

    func testAsciiPassThrough() {
        XCTAssertEqual(Punycode.toASCII("example.com"), "example.com")
    }

    func testKnownVectors() {
        XCTAssertEqual(Punycode.encode("bücher"), "bcher-kva")
        XCTAssertEqual(Punycode.toASCII("bücher.de"), "xn--bcher-kva.de")
        XCTAssertEqual(Punycode.toASCII("münchen.de"), "xn--mnchen-3ya.de")
        XCTAssertEqual(Punycode.toASCII("テスト"), "xn--zckzah")
        XCTAssertEqual(Punycode.toASCII("例え.テスト"), "xn--r8jz45g.xn--zckzah")
    }

    func testMixedLabels() {
        XCTAssertEqual(Punycode.toASCII("shop.bücher.de"), "shop.xn--bcher-kva.de")
    }

    func testEmptyLabelFails() {
        XCTAssertNil(Punycode.toASCII("a..b"))
    }
}
