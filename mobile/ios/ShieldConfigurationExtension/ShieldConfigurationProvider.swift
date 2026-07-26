import ManagedSettings
import ManagedSettingsUI
import UIKit

/// Renders the calm ImpulseBlock pause screen over shielded apps/websites.
/// Copy mirrors the browser extension's stop screen.
class ShieldConfigurationProvider: ShieldConfigurationDataSource {

    private var calmShield: ShieldConfiguration {
        ShieldConfiguration(
            backgroundBlurStyle: .systemUltraThinMaterialDark,
            backgroundColor: UIColor(red: 0.10, green: 0.09, blue: 0.30, alpha: 1.0),
            icon: UIImage(named: "enso"),
            title: ShieldConfiguration.Label(
                text: "Pause before the click.",
                color: .white
            ),
            subtitle: ShieldConfiguration.Label(
                text: "Take one breath. The urge passes either way.",
                color: UIColor(white: 1.0, alpha: 0.75)
            ),
            primaryButtonLabel: ShieldConfiguration.Label(
                text: "Not now",
                color: .white
            ),
            primaryButtonBackgroundColor: UIColor(red: 0.35, green: 0.34, blue: 0.84, alpha: 1.0),
            secondaryButtonLabel: ShieldConfiguration.Label(
                text: "Continue intentionally",
                color: UIColor(white: 1.0, alpha: 0.85)
            )
        )
    }

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        calmShield
    }

    override func configuration(shielding application: Application,
                                in category: ActivityCategory) -> ShieldConfiguration {
        calmShield
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        calmShield
    }

    override func configuration(shielding webDomain: WebDomain,
                                in category: ActivityCategory) -> ShieldConfiguration {
        calmShield
    }
}
