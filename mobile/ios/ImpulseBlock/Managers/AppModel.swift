import Foundation
import SwiftUI
import Combine
import FamilyControls
import ManagedSettings

/// Central observable state for the app. Wraps SharedStore (App Group
/// persistence) and re-applies shields whenever enforcement-relevant state
/// changes. All data stays on-device.
@MainActor
final class AppModel: ObservableObject {

    let store: SharedStore
    let authorization = AuthorizationManager()
    let tempAccess = TempAccessManager()

    @Published var settings: BlockSettings {
        didSet {
            store.settings = settings
            ShieldApplier.applyAll(using: store)
        }
    }

    @Published var selection: FamilyActivitySelection {
        didSet {
            store.selection = selection
            ShieldApplier.applyAll(using: store)
        }
    }

    @Published private(set) var activeGrant: TemporaryAccessGrant?
    @Published var pendingRequest: PendingShieldRequest?

    init(store: SharedStore = .shared) {
        self.store = store
        self.settings = store.settings
        self.selection = store.selection
        self.activeGrant = store.pruneExpiredGrant()
        self.pendingRequest = store.pendingRequest
        authorization.refresh()
    }

    // MARK: - Lifecycle

    func refreshOnForeground() {
        authorization.refresh()
        activeGrant = store.pruneExpiredGrant()
        pendingRequest = store.pendingRequest
        ShieldApplier.applyAll(using: store)
    }

    // MARK: - Domains

    enum AddDomainOutcome: Equatable {
        case added(String)
        case already(String)
        case limitReached
        case invalid(DomainNormalizer.Failure)
    }

    func addDomain(_ raw: String) -> AddDomainOutcome {
        switch DomainNormalizer.normalize(raw) {
        case .failure(let reason):
            return .invalid(reason)
        case .success(let host):
            if settings.blockedDomains.contains(host) { return .already(host) }
            if settings.blockedDomains.count >= BlockSettings.webDomainLimit { return .limitReached }
            settings.blockedDomains.append(host)
            settings.blockedDomains.sort()
            return .added(host)
        }
    }

    func removeDomain(_ host: String) {
        settings.blockedDomains.removeAll { $0 == host }
    }

    // MARK: - Temporary access

    func grantTemporaryAccess(minutes: Int, for request: PendingShieldRequest?) {
        var grant = TemporaryAccessGrant(expiresAt: Date().addingTimeInterval(TimeInterval(minutes * 60)))
        if let request {
            if let token = request.applicationToken { grant.applicationTokens.insert(token) }
            if let token = request.webDomainToken { grant.webDomainTokens.insert(token) }
            if let token = request.categoryToken { grant.categoryTokens.insert(token) }
        }
        store.tempGrant = grant
        store.pendingRequest = nil
        pendingRequest = nil
        activeGrant = grant
        ShieldApplier.applyAll(using: store)
        tempAccess.scheduleRestore(minutes: minutes)
    }

    func dismissPendingRequest() {
        store.pendingRequest = nil
        pendingRequest = nil
    }

    func endTemporaryAccessNow() {
        store.tempGrant = nil
        activeGrant = nil
        ShieldApplier.applyAll(using: store)
        tempAccess.cancelScheduledRestore()
    }

    // MARK: - Bulk operations

    func clearAllSelections() {
        selection = FamilyActivitySelection()
    }

    func resetAllData() {
        tempAccess.cancelScheduledRestore()
        ShieldApplier.clearAll()
        store.resetAll()
        settings = store.settings
        selection = store.selection
        activeGrant = nil
        pendingRequest = nil
    }

    // MARK: - Import / export

    func applyImport(_ result: ImportExport.ImportResult) {
        var merged = settings.blockedDomains
        for host in result.domains where !merged.contains(host) {
            if merged.count >= BlockSettings.webDomainLimit { break }
            merged.append(host)
        }
        merged.sort()
        settings.blockedDomains = merged
        if let imported = result.settings {
            if let enabled = imported.isEnabled { settings.isEnabled = enabled }
            if let adult = imported.adultFilterEnabled { settings.adultFilterEnabled = adult }
            if let minutes = imported.defaultTempMinutes, [5, 15].contains(minutes) {
                settings.defaultTempMinutes = minutes
            }
        }
    }
}
