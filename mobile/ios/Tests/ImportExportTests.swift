import XCTest
@testable import ImpulseBlock

final class ImportExportTests: XCTestCase {

    func testExportImportRoundTrip() throws {
        var settings = BlockSettings()
        settings.blockedDomains = ["tiktok.com", "youtube.com"]
        settings.adultFilterEnabled = true
        settings.defaultTempMinutes = 15

        let data = try ImportExport.exportJSON(settings: settings)
        guard case .success(let result) = ImportExport.importJSON(data) else {
            return XCTFail("round-trip import failed")
        }
        XCTAssertEqual(result.domains, ["tiktok.com", "youtube.com"])
        XCTAssertEqual(result.settings?.adultFilterEnabled, true)
        XCTAssertEqual(result.settings?.defaultTempMinutes, 15)
    }

    func testImportsExtensionStorageDump() {
        // Shape of the browser extension's chrome.storage.local export.
        let json = #"{"blockedHosts":["youtube.com","WWW.Reddit.com","bad entry"]}"#
        guard case .success(let result) = ImportExport.importJSON(Data(json.utf8)) else {
            return XCTFail("extension dump import failed")
        }
        XCTAssertEqual(result.domains, ["youtube.com", "reddit.com"])
        XCTAssertEqual(result.rejected, ["bad entry"])
    }

    func testImportsBareArray() {
        let json = #"["instagram.com","https://x.com/home"]"#
        guard case .success(let result) = ImportExport.importJSON(Data(json.utf8)) else {
            return XCTFail("bare array import failed")
        }
        XCTAssertEqual(result.domains, ["instagram.com", "x.com"])
    }

    func testRejectsGarbage() {
        if case .success = ImportExport.importJSON(Data("not json".utf8)) {
            XCTFail("garbage should not import")
        }
    }

    func testRejectsNewerVersion() {
        let json = #"{"schema":"impulseblock.settings","version":99,"exportedAt":"x","platform":"ios","blockedHosts":["a.com"]}"#
        guard case .failure(let error) = ImportExport.importJSON(Data(json.utf8)) else {
            return XCTFail("newer version must be rejected")
        }
        XCTAssertEqual(error, .unsupportedVersion(99))
    }

    func testAllInvalidDomainsFails() {
        let json = #"["localhost","192.168.0.1"]"#
        guard case .failure(let error) = ImportExport.importJSON(Data(json.utf8)) else {
            return XCTFail("all-invalid import must fail")
        }
        XCTAssertEqual(error, .noValidDomains)
    }
}
