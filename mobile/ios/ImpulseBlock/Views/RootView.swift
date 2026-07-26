import SwiftUI

struct RootView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        if model.settings.onboardingComplete {
            MainTabView()
        } else {
            OnboardingView()
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject var model: AppModel

    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Home", systemImage: "circle.dashed") }
            AppsView()
                .tabItem { Label("Apps", systemImage: "square.grid.2x2") }
            WebsitesView()
                .tabItem { Label("Websites", systemImage: "globe") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
        .tint(Theme.indigo)
    }
}

/// Shared visual constants matching the extension's minimal indigo look.
enum Theme {
    static let indigo = Color(red: 0.35, green: 0.34, blue: 0.84)   // #5957D6
    static let deepIndigo = Color(red: 0.12, green: 0.11, blue: 0.35)
    static let calmBackground = Color(red: 0.96, green: 0.96, blue: 0.99)
}
