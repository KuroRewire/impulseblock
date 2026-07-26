import Foundation
import FamilyControls
import ManagedSettings

/// Portable, user-editable settings. Never contains opaque Screen Time tokens.
struct BlockSettings: Codable, Equatable {
    var schemaVersion: Int = 1
    var isEnabled: Bool = true
    var blockedDomains: [String] = []
    var adultFilterEnabled: Bool = false
    var defaultTempMinutes: Int = 5
    var onboardingComplete: Bool = false

    /// Documented ManagedSettings limit on shielded web domains.
    static let webDomainLimit = 50
}

/// One active temporary-access window. A single window keeps re-shielding
/// simple and predictable: everything in the grant is re-shielded together
/// when `expiresAt` passes.
struct TemporaryAccessGrant: Codable, Equatable {
    var applicationTokens: Set<ApplicationToken> = []
    var categoryTokens: Set<ActivityCategoryToken> = []
    var webDomainTokens: Set<WebDomainToken> = []
    /// Manually-entered hostnames temporarily allowed (matched against blockedDomains).
    var hostnames: [String] = []
    var expiresAt: Date

    var isActive: Bool { Date() < expiresAt }
}

/// Written by the ShieldAction extension when the user taps
/// "Continue intentionally" on a shield. The main app reads it and offers
/// 5/15-minute access. (The current SDK provides no supported way for a
/// ShieldAction extension to open the parent app directly.)
struct PendingShieldRequest: Codable, Equatable {
    enum Kind: String, Codable { case application, webDomain, category }
    var kind: Kind
    var applicationToken: ApplicationToken?
    var webDomainToken: WebDomainToken?
    var categoryToken: ActivityCategoryToken?
    var requestedAt: Date
}
