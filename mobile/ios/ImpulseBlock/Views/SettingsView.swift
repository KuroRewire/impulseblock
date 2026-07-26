import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var model: AppModel
    @State private var confirmReset = false

    private var version: String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
        return "\(v) (\(b))"
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Temporary access") {
                    Picker("Default duration", selection: $model.settings.defaultTempMinutes) {
                        Text("5 minutes").tag(5)
                        Text("15 minutes").tag(15)
                    }
                    Text("Because Apple's DeviceActivity scheduling has a 15-minute minimum interval, 5-minute access is restored via an early-warning callback; if iOS delays it, the app re-blocks at the latest on its next open.")
                        .font(.footnote).foregroundStyle(.secondary)
                }

                Section("Privacy") {
                    NavigationLink {
                        PrivacyView()
                    } label: {
                        Label("How ImpulseBlock protects your privacy", systemImage: "lock.shield")
                    }
                }

                Section("Permissions") {
                    switch model.authorization.state {
                    case .authorized:
                        Label("Screen Time: granted", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                    default:
                        Label("Screen Time: not granted", systemImage: "exclamationmark.triangle")
                            .foregroundStyle(.orange)
                        Button("Request Screen Time access") {
                            Task { await model.authorization.requestAuthorization() }
                        }
                    }
                }

                Section("Data") {
                    Button(role: .destructive) {
                        confirmReset = true
                    } label: {
                        Label("Reset all data", systemImage: "trash")
                    }
                }

                Section("About") {
                    LabeledContent("Version", value: version)
                    Text("ImpulseBlock mobile uses only Apple system frameworks — no third-party SDKs, no analytics, no network calls.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .confirmationDialog(
                "Remove every selection, blocked domain and setting? This cannot be undone.",
                isPresented: $confirmReset, titleVisibility: .visible
            ) {
                Button("Reset everything", role: .destructive) {
                    model.resetAllData()
                }
            }
        }
    }
}

struct PrivacyView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Private by design").font(.title2.bold())
                bullet("Everything stays on this device. There is no server, no account, no sync.")
                bullet("No browsing history is collected. ImpulseBlock stores only the domains you explicitly add.")
                bullet("App selections are opaque: iOS gives ImpulseBlock unreadable tokens for the apps you pick, so even we can't see what you selected.")
                bullet("No analytics or advertising SDKs. The app makes no network requests at all.")
                bullet("Deleting the app (or Settings → Reset all data) removes everything.")
                Text("This matches the ImpulseBlock browser extension's privacy policy: observation over punishment, and your data stays yours.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            .padding(24)
        }
        .navigationTitle("Privacy")
    }

    private func bullet(_ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•").foregroundStyle(Theme.indigo)
            Text(text)
        }
    }
}
