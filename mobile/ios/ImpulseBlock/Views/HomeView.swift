import SwiftUI
import FamilyControls

struct HomeView: View {
    @EnvironmentObject var model: AppModel
    @State private var now = Date()

    private let timer = Timer.publish(every: 30, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            List {
                if model.pendingRequest != nil {
                    pendingRequestSection
                }

                Section {
                    Toggle(isOn: $model.settings.isEnabled) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Blocking").font(.headline)
                            Text(model.settings.isEnabled ? "Pauses are active" : "Everything is allowed")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    .tint(Theme.indigo)
                    .accessibilityLabel("Master blocking toggle")
                }

                Section("Status") {
                    LabeledContent("Selected apps",
                                   value: "\(model.selection.applicationTokens.count)")
                    LabeledContent("Selected categories",
                                   value: "\(model.selection.categoryTokens.count)")
                    LabeledContent("Blocked websites",
                                   value: "\(model.settings.blockedDomains.count + model.selection.webDomainTokens.count)")
                    if let grant = model.activeGrant, grant.isActive {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Temporary access active")
                                .foregroundStyle(.orange)
                            Text("Re-blocks \(grant.expiresAt.formatted(date: .omitted, time: .shortened))")
                                .font(.footnote).foregroundStyle(.secondary)
                            Button("End access now", role: .destructive) {
                                model.endTemporaryAccessNow()
                            }
                            .font(.footnote)
                        }
                    }
                }

                permissionHealthSection
            }
            .navigationTitle("ImpulseBlock")
            .onReceive(timer) { date in
                now = date
                if let grant = model.activeGrant, !grant.isActive {
                    model.refreshOnForeground()
                }
            }
        }
    }

    private var pendingRequestSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 10) {
                Text("Continue intentionally?")
                    .font(.headline)
                Text("You tapped “Continue intentionally” on a pause screen. Choose how long to allow it — it re-blocks automatically.")
                    .font(.footnote).foregroundStyle(.secondary)
                HStack {
                    Button("5 minutes") {
                        model.grantTemporaryAccess(minutes: 5, for: model.pendingRequest)
                    }
                    .buttonStyle(.borderedProminent).tint(Theme.indigo)
                    Button("15 minutes") {
                        model.grantTemporaryAccess(minutes: 15, for: model.pendingRequest)
                    }
                    .buttonStyle(.bordered)
                    Spacer()
                    Button("Not now", role: .cancel) {
                        model.dismissPendingRequest()
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }

    @ViewBuilder
    private var permissionHealthSection: some View {
        Section("Permission health") {
            switch model.authorization.state {
            case .authorized:
                Label("Screen Time access OK", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            case .denied:
                Label("Screen Time access denied", systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
                Text("Blocking cannot work without it. Re-request below or enable it in iOS Settings.")
                    .font(.footnote).foregroundStyle(.secondary)
                Button("Request Screen Time access") {
                    Task { await model.authorization.requestAuthorization() }
                }
            case .notRequested, .requesting:
                Label("Screen Time access not granted yet", systemImage: "hourglass")
                    .foregroundStyle(.orange)
                Button("Request Screen Time access") {
                    Task { await model.authorization.requestAuthorization() }
                }
            case .unavailable(let reason):
                Label("Screen Time unavailable", systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(.red)
                Text(reason).font(.footnote).foregroundStyle(.secondary)
                Button("Try again") {
                    Task { await model.authorization.requestAuthorization() }
                }
            }
        }
    }
}
