import XCTest
@testable import ImpulseBlock

final class TemporaryAccessTests: XCTestCase {

    private func makeStore() -> SharedStore {
        let suite = "test.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return SharedStore(defaults: defaults)
    }

    func testActiveGrantSurvivesPrune() {
        let store = makeStore()
        let grant = TemporaryAccessGrant(hostnames: ["youtube.com"],
                                         expiresAt: Date().addingTimeInterval(300))
        store.tempGrant = grant
        XCTAssertEqual(store.pruneExpiredGrant()?.hostnames, ["youtube.com"])
        XCTAssertNotNil(store.tempGrant)
    }

    func testExpiredGrantIsPruned() {
        let store = makeStore()
        store.tempGrant = TemporaryAccessGrant(hostnames: ["youtube.com"],
                                               expiresAt: Date().addingTimeInterval(-1))
        XCTAssertNil(store.pruneExpiredGrant())
        XCTAssertNil(store.tempGrant)
    }

    func testActiveManualDomainsExcludesGrantedHosts() {
        var settings = BlockSettings()
        settings.blockedDomains = ["youtube.com", "tiktok.com"]
        let grant = TemporaryAccessGrant(hostnames: ["youtube.com"],
                                         expiresAt: Date().addingTimeInterval(300))
        let active = ShieldApplier.activeManualDomains(settings: settings, grant: grant)
        XCTAssertEqual(active, ["tiktok.com"])
    }

    func testActiveManualDomainsFullWhenNoGrant() {
        var settings = BlockSettings()
        settings.blockedDomains = ["youtube.com"]
        XCTAssertEqual(ShieldApplier.activeManualDomains(settings: settings, grant: nil),
                       ["youtube.com"])
    }

    func testResetAllClearsEverything() {
        let store = makeStore()
        var settings = store.settings
        settings.blockedDomains = ["youtube.com"]
        store.settings = settings
        store.tempGrant = TemporaryAccessGrant(expiresAt: Date().addingTimeInterval(60))
        store.resetAll()
        XCTAssertTrue(store.settings.blockedDomains.isEmpty)
        XCTAssertNil(store.tempGrant)
    }
}
