import Foundation
import FamilyControls
import ManagedSettings

/// Single place that translates persisted state into ManagedSettings shields.
/// Called from the main app (launch/foreground/changes) and from the
/// DeviceActivityMonitor extension (temporary-access expiry), so enforcement
/// never depends on the UI being open.
enum ShieldApplier {

    static let storeName = ManagedSettingsStore.Name("impulseblock.shield")

    static var store: ManagedSettingsStore {
        ManagedSettingsStore(named: storeName)
    }

    /// Re-reads all persisted state and applies (or clears) shields.
    static func applyAll(using sharedStore: SharedStore = .shared) {
        let settings = sharedStore.settings
        let selection = sharedStore.selection
        let grant = sharedStore.pruneExpiredGrant()

        let store = self.store

        guard settings.isEnabled else {
            clearAll()
            return
        }

        // Applications ------------------------------------------------------
        var appTokens = selection.applicationTokens
        if let grant { appTokens.subtract(grant.applicationTokens) }
        store.shield.applications = appTokens.isEmpty ? nil : appTokens

        // Categories ----------------------------------------------------------
        var categoryTokens = selection.categoryTokens
        if let grant { categoryTokens.subtract(grant.categoryTokens) }
        if categoryTokens.isEmpty {
            store.shield.applicationCategories = nil
            store.shield.webDomainCategories = nil
        } else {
            store.shield.applicationCategories = .specific(categoryTokens, except: grant?.applicationTokens ?? [])
            store.shield.webDomainCategories = .specific(categoryTokens, except: grant?.webDomainTokens ?? [])
        }

        // Web domains ---------------------------------------------------------
        // Picker-selected web domains (opaque tokens) + manually entered
        // hostnames converted to WebDomain tokens on-device.
        var webTokens = selection.webDomainTokens
        let manualDomains = activeManualDomains(settings: settings, grant: grant)
        for domain in manualDomains.prefix(BlockSettings.webDomainLimit) {
            if let token = WebDomain(domain: domain).token {
                webTokens.insert(token)
            }
        }
        if let grant { webTokens.subtract(grant.webDomainTokens) }
        store.shield.webDomains = webTokens.isEmpty ? nil : webTokens

        // Web content filter ---------------------------------------------------
        // .auto() enables Apple's on-device adult-content classifier; manual
        // domains are added so they are also blocked inside WebKit content.
        if settings.adultFilterEnabled {
            let always = Set(manualDomains.prefix(BlockSettings.webDomainLimit).map { WebDomain(domain: $0) })
            store.webContent.blockedByFilter = .auto(always, except: [])
        } else {
            store.webContent.blockedByFilter = nil
        }
    }

    /// Manual domains minus temporarily allowed hostnames.
    static func activeManualDomains(settings: BlockSettings, grant: TemporaryAccessGrant?) -> [String] {
        guard let grant, grant.isActive, !grant.hostnames.isEmpty else { return settings.blockedDomains }
        return settings.blockedDomains.filter { blocked in
            !grant.hostnames.contains { allowed in
                DomainNormalizer.matches(host: allowed, blockedEntry: blocked) || allowed == blocked
            }
        }
    }

    static func clearAll() {
        let store = self.store
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        store.shield.webDomains = nil
        store.shield.webDomainCategories = nil
        store.webContent.blockedByFilter = nil
    }
}
