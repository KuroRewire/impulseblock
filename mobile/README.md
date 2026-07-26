# ImpulseBlock Mobile

Native iOS and Android apps that bring the ImpulseBlock pause to phones:
a calm breath before Instagram, TikTok, YouTube — or any app or website you
choose. Same philosophy as the extension: observation over punishment,
local-first privacy, no account, no data collection.

> **Pause before the click.**

```
mobile/
  ios/        SwiftUI + FamilyControls/ManagedSettings/DeviceActivity
              (app + ShieldConfiguration + ShieldAction + ActivityMonitor targets)
  android/    Kotlin + Jetpack Compose + AccessibilityService overlay
```

## Quick start

```bash
scripts/mobile-doctor.sh          # what's installed, what's missing
scripts/mobile-test.sh android    # 43 unit tests + lint
scripts/mobile-build.sh android   # → app-debug.apk
scripts/mobile-build.sh ios       # requires Xcode (see docs)
```

## Docs

| Doc | What |
|---|---|
| [TECH_DECISION.md](../docs/mobile/TECH_DECISION.md) | Architecture, API research, why native, VPN/URL-Filter decisions |
| [IOS_SETUP.md](../docs/mobile/IOS_SETUP.md) / [ANDROID_SETUP.md](../docs/mobile/ANDROID_SETUP.md) | Build & run |
| [HUMAN_ONLY_STEPS.md](../docs/mobile/HUMAN_ONLY_STEPS.md) | Apple/Google accounts, entitlements, signing — cannot be automated |
| [PHYSICAL_TEST_IOS.md](../docs/mobile/PHYSICAL_TEST_IOS.md) / [PHYSICAL_TEST_ANDROID.md](../docs/mobile/PHYSICAL_TEST_ANDROID.md) | Device validation checklists (nothing pre-checked) |
| [PRIVACY_ARCHITECTURE.md](../docs/mobile/PRIVACY_ARCHITECTURE.md) | What's stored, what never is, and how that's enforced |
| [ANDROID_PLAY_DISCLOSURE.md](../docs/mobile/ANDROID_PLAY_DISCLOSURE.md) | Paste-ready Play accessibility declarations |
| [KNOWN_LIMITATIONS.md](../docs/mobile/KNOWN_LIMITATIONS.md) | Honest list of platform constraints |

Implementation status: [MOBILE_IMPLEMENTATION_REPORT.md](../MOBILE_IMPLEMENTATION_REPORT.md).

## Privacy in one line

Android ships **without the INTERNET permission**; iOS receives only opaque
tokens for your app picks and makes zero network calls — neither app can see
or send your browsing history.
