import SwiftUI
import FamilyControls

struct OnboardingView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(spacing: 8) {
                    Image(systemName: "circle.dashed")
                        .font(.system(size: 56, weight: .thin))
                        .foregroundStyle(Theme.indigo)
                        .padding(.top, 40)
                    Text("ImpulseBlock")
                        .font(.largeTitle.bold())
                    Text("Pause before the click.")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)

                explainer(
                    icon: "pause.circle",
                    title: "A pause, not a punishment",
                    text: "ImpulseBlock puts a calm pause in front of apps and websites you choose. You can always continue intentionally."
                )
                explainer(
                    icon: "hourglass",
                    title: "Why Screen Time permission?",
                    text: "Apple's Screen Time (Family Controls) is the only supported way for an app to shield other apps and websites on iOS. ImpulseBlock requests it for you alone — no family setup needed."
                )
                explainer(
                    icon: "lock.shield",
                    title: "Private by design",
                    text: "Your app and website selections stay on this device. ImpulseBlock collects no browsing history, has no account, and uploads nothing. Apple hands apps like ImpulseBlock only opaque tokens for your selections — we technically cannot see which apps you pick."
                )

                authorizationSection

                Spacer(minLength: 24)
            }
            .padding(.horizontal, 24)
        }
        .background(Theme.calmBackground.ignoresSafeArea())
    }

    private func explainer(icon: String, title: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(Theme.indigo)
                .frame(width: 32)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline)
                Text(text).font(.subheadline).foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private var authorizationSection: some View {
        VStack(spacing: 12) {
            switch model.authorization.state {
            case .notRequested, .requesting:
                Button {
                    Task {
                        await model.authorization.requestAuthorization()
                        if model.authorization.state == .authorized {
                            model.settings.onboardingComplete = true
                        }
                    }
                } label: {
                    if model.authorization.state == .requesting {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Allow Screen Time access")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.indigo)
                .disabled(model.authorization.state == .requesting)

            case .authorized:
                Label("Screen Time access granted", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                Button("Continue") {
                    model.settings.onboardingComplete = true
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.indigo)

            case .denied:
                Label("Screen Time access was declined", systemImage: "xmark.circle")
                    .foregroundStyle(.orange)
                Text("You can grant it later in Settings → Screen Time, or try again.")
                    .font(.footnote).foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                Button("Try again") {
                    Task { await model.authorization.requestAuthorization() }
                }
                Button("Continue without blocking") {
                    model.settings.onboardingComplete = true
                }
                .font(.footnote)

            case .unavailable(let reason):
                Label("Screen Time is currently unavailable", systemImage: "exclamationmark.triangle")
                    .foregroundStyle(.orange)
                Text("This usually means the build is missing the Family Controls entitlement or signing is misconfigured. Details: \(reason)")
                    .font(.footnote).foregroundStyle(.secondary)
                Button("Try again") {
                    Task { await model.authorization.requestAuthorization() }
                }
                Button("Continue without blocking") {
                    model.settings.onboardingComplete = true
                }
                .font(.footnote)
            }
        }
        .padding(.top, 8)
    }
}
