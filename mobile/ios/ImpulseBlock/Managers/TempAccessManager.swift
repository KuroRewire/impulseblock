import Foundation
import DeviceActivity

/// Schedules automatic shield restoration after temporary access using
/// DeviceActivity — the only supported mechanism that runs without the app.
///
/// DeviceActivity enforces a minimum monitoring interval of 15 minutes, so:
///  - 15-minute access: interval [now, now+15m]; `intervalDidEnd` re-shields.
///  - 5-minute access: interval [now, now+15m] with a 10-minute
///    `warningTime`; `intervalWillEndWarning` fires at now+5m and re-shields.
///    `intervalDidEnd` still fires later and re-applies idempotently.
///
/// Defense in depth: the grant carries its own `expiresAt`, and the app
/// re-applies shields on every launch/foreground, so a missed extension
/// callback can delay re-shielding only until the next system callback or
/// app open — it can never leave an app permanently unblocked.
final class TempAccessManager {

    static let activityName = DeviceActivityName("impulseblock.tempaccess")

    private let center = DeviceActivityCenter()

    func scheduleRestore(minutes: Int, now: Date = Date()) {
        cancelScheduledRestore()

        let calendar = Calendar.current
        // DeviceActivity minimum interval is 15 minutes.
        let intervalMinutes = max(minutes, 15)
        let start = now
        let end = now.addingTimeInterval(TimeInterval(intervalMinutes * 60))

        let components: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
        var warningTime: DateComponents? = nil
        if minutes < intervalMinutes {
            // Warning fires (intervalEnd - warningTime) → at `minutes` after start.
            warningTime = DateComponents(minute: intervalMinutes - minutes)
        }

        let schedule = DeviceActivitySchedule(
            intervalStart: calendar.dateComponents(components, from: start),
            intervalEnd: calendar.dateComponents(components, from: end),
            repeats: false,
            warningTime: warningTime
        )

        do {
            try center.startMonitoring(Self.activityName, during: schedule)
        } catch {
            // Monitoring can fail (e.g. exceeding the schedule budget). The
            // grant's expiresAt + foreground re-apply still guarantee
            // restoration. Debug-only diagnostic (no URLs / user data); compiled
            // out of release builds.
            #if DEBUG
            NSLog("ImpulseBlock: startMonitoring failed: \(String(describing: error))")
            #endif
        }
    }

    func cancelScheduledRestore() {
        center.stopMonitoring([Self.activityName])
    }
}
