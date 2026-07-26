# ImpulseBlock Mobile — Implementation Report

Run date: 2026-07-26. Autonomous end-to-end implementation run, completed.

## 1. What exists now

Native mobile implementations of ImpulseBlock ("Pause before the click.") for
iOS and Android under `mobile/`, with docs under `docs/mobile/`, scripts under
`scripts/`, and this report. Canonical product name **ImpulseBlock** (from
`_locales/en/messages.json` / README). The browser extension is untouched and
still passes its checks; ExtPay/Stripe work untouched.

## 2. Architecture selected

Native on both platforms (full rationale + API research: [docs/mobile/TECH_DECISION.md](docs/mobile/TECH_DECISION.md)):

- **iOS**: Swift + SwiftUI; FamilyControls (individual authorization,
  FamilyActivityPicker), ManagedSettings (app/category/web-domain shields,
  optional `.auto()` adult filter), ManagedSettingsUI (custom shield),
  DeviceActivity (temp-access restore), App Group storage. Four targets:
  app + ShieldConfiguration + ShieldAction + DeviceActivityMonitor
  extensions. Deployment target iOS 16.0. Bundle prefix / team configurable
  via `mobile/ios/Config/*.xcconfig` (no personal IDs committed).
- **Android**: Kotlin + Jetpack Compose (Material 3); AccessibilityService +
  `TYPE_ACCESSIBILITY_OVERLAY` full-screen pause; Chrome (all channels)
  address-bar domain matching; DataStore Preferences persistence;
  PackageManager launcher-app picker (no `QUERY_ALL_PACKAGES`);
  **no INTERNET permission**. minSdk 26, target/compile SDK 35.
- Cross-platform frameworks rejected: all the hard work is native OS
  enforcement (3 iOS app extensions + an Android accessibility service);
  a bridge adds cost and removes nothing.
- Optional Android VPN layer: **evaluated, intentionally not shipped**
  (DoH/DoT bypass + connectivity risk unresolvable without hardware —
  see KNOWN_LIMITATIONS.md).

## 3. Major files created

```
mobile/ios/                     project.yml (XcodeGen) + committed ImpulseBlock.xcodeproj
  Shared/                       DomainNormalizer, Punycode (RFC 3492), Models,
                                SharedStore (App Group), ShieldApplier, ImportExport
  ImpulseBlock/                 App entry, AppModel, AuthorizationManager,
                                TempAccessManager, Onboarding/Home/Apps/Websites/Settings views
  ShieldConfigurationExtension/ Calm shield UI (+ enso.png resource)
  ShieldActionExtension/        Not now / Continue intentionally handling
  DeviceActivityMonitorExtension/ Temp-access shield restoration
  Tests/                        26 XCTest cases (normalizer, punycode, import/export, grants)
  Config/                       Shared.xcconfig + Local.xcconfig.example (+4 entitlements files)
mobile/android/                 Gradle 8.10.2 wrapper, AGP 8.7.3, Kotlin 2.0.21
  app/src/main/java/com/impulseblock/mobile/
    domain/                     DomainNormalizer, UrlBarParser, BlockDecision,
                                SystemAllowlist, SupportedBrowsers, ImportExport
    data/BlockStateRepository.kt (DataStore)
    service/                    ImpulseBlockAccessibilityService, OverlayController
    ui/                         MainActivity, MainViewModel, Screens (Compose), InstalledApps
  app/src/test/                 43 JUnit tests
scripts/mobile-doctor.sh · mobile-build.sh · mobile-test.sh
docs/mobile/ TECH_DECISION, IOS_SETUP, ANDROID_SETUP, ANDROID_PLAY_DISCLOSURE,
             HUMAN_ONLY_STEPS, PHYSICAL_TEST_IOS, PHYSICAL_TEST_ANDROID,
             PRIVACY_ARCHITECTURE, KNOWN_LIMITATIONS
mobile/README.md · root README mobile section
```

## 4. Build & test results (this machine)

| Check | Result |
|---|---|
| Android `./gradlew test` | ✅ BUILD SUCCESSFUL — **43/43 unit tests pass** (5 suites: BlockDecision 14, DomainNormalizer 10, UrlBarParser 8, ImportExport 7, SystemAllowlist 4) |
| Android `./gradlew lint` | ✅ clean (`abortOnError=true`) |
| Android `./gradlew assembleDebug` | ✅ `app-debug.apk` (9.7 MB) produced |
| iOS project generation (`xcodegen generate`) | ✅ 5 targets, valid plists (`plutil -lint` OK) |
| iOS compilation | ❌ **BLOCKED — Xcode not installed on this machine.** Exact output: `xcodebuild -version` → `xcode-select: error: tool 'xcodebuild' requires Xcode, but active developer directory '/Library/Developer/CommandLineTools' is a command line tools instance`; no `/Applications/Xcode*.app`. Sources are written against documented SDK APIs; `scripts/mobile-build.sh ios` runs the signing-disabled simulator build once Xcode is installed. |
| iOS unit tests | ❌ blocked by the same missing Xcode (26 test cases ready in `mobile/ios/Tests/`) |
| Existing extension regression | ✅ `node --check` passes on all 9 JS files; no extension file modified (only README gained a mobile section) |

Environment installed during the run: OpenJDK 17.0.20 (brew), Android
cmdline-tools + platform-35 + build-tools 35.0.0 (`~/Library/Android/sdk`),
Gradle 8.10.2 wrapper, XcodeGen 2.46.0.

## 5. Feature completeness vs. spec

Implemented on both platforms: master toggle, app selection (OS-native:
FamilyActivityPicker / PackageManager picker with Instagram/TikTok/YouTube
quick picks), manual domain management (normalize scheme/path/query/port/
case/`www`, IDN→punycode, malformed/local/IP rejection), root+subdomain
matching identical to the extension, calm pause UI with the required copy
("Pause before the click." / "Take one breath. The urge passes either way." /
"Not now" / "Continue intentionally"), 5/15-minute temporary access with
automatic re-block, local-only persistence, versioned JSON import/export
compatible with the extension's `blockedHosts`, permission-health UI,
privacy pages, reset-all. iOS adds the optional OS adult-content filter
toggle; Android ships without INTERNET permission. No analytics, no backend,
no accounts, no Stripe in mobile.

## 6. Not verified yet (requires hardware / human steps — no false claims)

- **All Screen Time enforcement on iOS** (simulator can't enforce):
  [PHYSICAL_TEST_IOS.md](docs/mobile/PHYSICAL_TEST_IOS.md) — nothing checked off.
  Especially: Chrome-on-iOS web blocking (expected via WebKit, gate C4) and
  DeviceActivity re-shield timing (E4/E5/E8).
- **All Android on-device behavior**:
  [PHYSICAL_TEST_ANDROID.md](docs/mobile/PHYSICAL_TEST_ANDROID.md) — nothing
  checked off. Especially Chrome URL detection across versions, incognito,
  custom tabs, reboot, OEM battery managers.
- iOS "Continue intentionally" cannot open the parent app (SDK limitation —
  pending-request flow implemented instead; documented).

## 7. Human-only steps (summarized; full detail in [HUMAN_ONLY_STEPS.md](docs/mobile/HUMAN_ONLY_STEPS.md))

**Apple**: install Xcode on this machine; Developer Program; create 4 app IDs
+ App Group with Family Controls capability; fill `Config/Local.xcconfig`;
automatic signing; request the **Family Controls distribution entitlement**
for TestFlight/App Store; physical-device run; App Store privacy labels
("Data Not Collected") + review notes (individual self-control use case).

**Google**: Play Console account; upload keystore / Play App Signing;
enable the accessibility service on device; paste the prepared
**Accessibility API declaration**, data-safety answers and review notes from
[ANDROID_PLAY_DISCLOSURE.md](docs/mobile/ANDROID_PLAY_DISCLOSURE.md);
physical-device run. (No VPN declaration needed — VPN not shipped.)

## 8. Commands to run next

```bash
scripts/mobile-doctor.sh                 # environment status
scripts/mobile-test.sh android           # 43 tests + lint (green today)
scripts/mobile-build.sh android          # rebuild the debug APK
adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk

# after installing Xcode:
scripts/mobile-build.sh ios              # signing-disabled simulator compile
scripts/mobile-test.sh ios               # 26 XCTest cases
open mobile/ios/ImpulseBlock.xcodeproj   # then follow docs/mobile/IOS_SETUP.md
```
