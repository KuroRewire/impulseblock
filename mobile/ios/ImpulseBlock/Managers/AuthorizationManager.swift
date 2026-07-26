import Foundation
import FamilyControls

/// Wraps FamilyControls individual authorization with explicit, user-visible
/// states (including entitlement/signing misconfiguration, which surfaces as a
/// request failure rather than a crash).
@MainActor
final class AuthorizationManager: ObservableObject {

    enum State: Equatable {
        case notRequested
        case authorized
        case denied
        case requesting
        /// requestAuthorization threw — typically a missing Family Controls
        /// entitlement, unsigned build, or the feature being unavailable.
        case unavailable(String)
    }

    @Published private(set) var state: State = .notRequested

    func refresh() {
        switch AuthorizationCenter.shared.authorizationStatus {
        case .approved:
            state = .authorized
        case .denied:
            state = .denied
        case .notDetermined:
            if case .unavailable = state { return } // keep the error visible
            state = .notRequested
        @unknown default:
            state = .notRequested
        }
    }

    func requestAuthorization() async {
        state = .requesting
        do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            state = .authorized
        } catch {
            // FamilyControlsError covers restricted/unavailable/entitlement cases.
            let description = (error as? FamilyControlsError).map(String.init(describing:))
                ?? error.localizedDescription
            switch AuthorizationCenter.shared.authorizationStatus {
            case .denied:
                state = .denied
            default:
                state = .unavailable(description)
            }
        }
    }
}
