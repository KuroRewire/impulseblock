import ManagedSettings
import Foundation

/// Handles taps on the shield buttons.
///
/// "Not now" (primary)  → .close: the strongest supported response; iOS exits
///                        the blocked app/browser context.
/// "Continue intentionally" (secondary) → records a PendingShieldRequest in
///                        the App Group and responds .close. The current SDK
///                        offers NO supported way to open the parent app from
///                        a ShieldAction extension, so the user opens
///                        ImpulseBlock and immediately sees the 5/15-minute
///                        choice (see docs/mobile/KNOWN_LIMITATIONS.md).
class ShieldActionProvider: ShieldActionDelegate {

    override func handle(action: ShieldAction,
                         for application: ApplicationToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        switch action {
        case .primaryButtonPressed:
            completionHandler(.close)
        case .secondaryButtonPressed:
            SharedStore.shared.pendingRequest = PendingShieldRequest(
                kind: .application,
                applicationToken: application,
                webDomainToken: nil,
                categoryToken: nil,
                requestedAt: Date()
            )
            completionHandler(.close)
        @unknown default:
            completionHandler(.close)
        }
    }

    override func handle(action: ShieldAction,
                         for webDomain: WebDomainToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        switch action {
        case .primaryButtonPressed:
            completionHandler(.close)
        case .secondaryButtonPressed:
            SharedStore.shared.pendingRequest = PendingShieldRequest(
                kind: .webDomain,
                applicationToken: nil,
                webDomainToken: webDomain,
                categoryToken: nil,
                requestedAt: Date()
            )
            completionHandler(.close)
        @unknown default:
            completionHandler(.close)
        }
    }

    override func handle(action: ShieldAction,
                         for category: ActivityCategoryToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        switch action {
        case .primaryButtonPressed:
            completionHandler(.close)
        case .secondaryButtonPressed:
            SharedStore.shared.pendingRequest = PendingShieldRequest(
                kind: .category,
                applicationToken: nil,
                webDomainToken: nil,
                categoryToken: category,
                requestedAt: Date()
            )
            completionHandler(.close)
        @unknown default:
            completionHandler(.close)
        }
    }
}
