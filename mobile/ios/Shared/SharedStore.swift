import Foundation
import FamilyControls

/// App Group-backed persistence shared between the main app and the
/// ShieldConfiguration / ShieldAction / DeviceActivityMonitor extensions.
/// Everything is stored locally; nothing ever leaves the device.
final class SharedStore {

    static let shared = SharedStore()

    /// The App Group identifier is injected via the ImpulseBlockAppGroup
    /// Info.plist key (substituted from Config/*.xcconfig at build time).
    static var appGroupID: String {
        (Bundle.main.object(forInfoDictionaryKey: "ImpulseBlockAppGroup") as? String)
            ?? "group.com.example.impulseblock"
    }

    private enum Key {
        static let settings = "impulseblock.settings.v1"
        static let selection = "impulseblock.selection.v1"
        static let tempGrant = "impulseblock.tempgrant.v1"
        static let pendingRequest = "impulseblock.pendingrequest.v1"
    }

    let defaults: UserDefaults

    init(defaults: UserDefaults? = nil) {
        self.defaults = defaults
            ?? UserDefaults(suiteName: SharedStore.appGroupID)
            ?? .standard
    }

    // MARK: - Codable helpers

    private func read<T: Decodable>(_ key: String, as type: T.Type) -> T? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    private func write<T: Encodable>(_ value: T?, key: String) {
        guard let value else {
            defaults.removeObject(forKey: key)
            return
        }
        if let data = try? JSONEncoder().encode(value) {
            defaults.set(data, forKey: key)
        }
    }

    // MARK: - Typed accessors

    var settings: BlockSettings {
        get { read(Key.settings, as: BlockSettings.self) ?? BlockSettings() }
        set { write(newValue, key: Key.settings) }
    }

    var selection: FamilyActivitySelection {
        get { read(Key.selection, as: FamilyActivitySelection.self) ?? FamilyActivitySelection() }
        set { write(newValue, key: Key.selection) }
    }

    var tempGrant: TemporaryAccessGrant? {
        get { read(Key.tempGrant, as: TemporaryAccessGrant.self) }
        set { write(newValue, key: Key.tempGrant) }
    }

    var pendingRequest: PendingShieldRequest? {
        get { read(Key.pendingRequest, as: PendingShieldRequest.self) }
        set { write(newValue, key: Key.pendingRequest) }
    }

    /// Drops the grant if it has expired. Returns the still-active grant, if any.
    @discardableResult
    func pruneExpiredGrant() -> TemporaryAccessGrant? {
        guard let grant = tempGrant else { return nil }
        if grant.isActive { return grant }
        tempGrant = nil
        return nil
    }

    /// Removes every stored value (Settings → Reset all data).
    func resetAll() {
        [Key.settings, Key.selection, Key.tempGrant, Key.pendingRequest]
            .forEach { defaults.removeObject(forKey: $0) }
    }
}
