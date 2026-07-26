import DeviceActivity
import Foundation

/// Restores shields when a temporary-access window ends, without requiring
/// the main app to be running.
///
/// Scheduling (see TempAccessManager):
///  - 15-minute access → `intervalDidEnd` fires at +15m.
///  - 5-minute access  → the schedule still spans 15m (DeviceActivity
///    minimum), but `intervalWillEndWarning` fires at +5m via warningTime.
///
/// Both callbacks call the same idempotent re-apply: expired grants are
/// pruned and shields rebuilt from persisted state.
class ActivityMonitor: DeviceActivityMonitor {

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
    }

    override func intervalWillEndWarning(for activity: DeviceActivityName) {
        super.intervalWillEndWarning(for: activity)
        reapplyIfGrantExpired()
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        reapplyIfGrantExpired()
    }

    private func reapplyIfGrantExpired() {
        let store = SharedStore()
        store.pruneExpiredGrant()
        ShieldApplier.applyAll(using: store)
    }
}
