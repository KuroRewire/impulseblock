# ImpulseBlock Android — Setup

## Prerequisites

- JDK 17 (`brew install openjdk@17` on macOS).
- Android SDK with platform 35 + build-tools 35.0.0. If you don't have
  Android Studio, the command-line SDK is enough:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
# cmdline-tools installed at $ANDROID_HOME/cmdline-tools/latest
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

- `mobile/android/local.properties` must point at the SDK
  (`sdk.dir=/Users/you/Library/Android/sdk`). This file is gitignored; it was
  generated during setup and Android Studio recreates it automatically.

## Build & test

```bash
cd mobile/android
export JAVA_HOME=$(brew --prefix openjdk@17)/libexec/openjdk.jdk/Contents/Home

./gradlew test           # 43 unit tests (domain logic, matching, import/export)
./gradlew lint           # abortOnError=true — must stay clean
./gradlew assembleDebug  # → app/build/outputs/apk/debug/app-debug.apk
```

Or from the repo root: `scripts/mobile-test.sh android` / `scripts/mobile-build.sh android`.

## Install on a device

```bash
adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Then in the app: accept the prominent disclosure → **Open Accessibility
settings** → enable **ImpulseBlock pause service** → back to the app.
Full validation checklist: docs/mobile/PHYSICAL_TEST_ANDROID.md.

## Project layout

```
app/src/main/java/com/impulseblock/mobile/
  domain/     DomainNormalizer, UrlBarParser, BlockDecision,
              SystemAllowlist, SupportedBrowsers, ImportExport  ← pure, unit-tested
  data/       BlockStateRepository (DataStore Preferences)
  service/    ImpulseBlockAccessibilityService + OverlayController
  ui/         MainActivity, MainViewModel, Compose screens, InstalledApps
```

## Design constraints baked in

- **No INTERNET permission** — the app cannot upload anything, by construction.
- No `QUERY_ALL_PACKAGES`; the app picker uses a `<queries>` MAIN/LAUNCHER
  intent declaration.
- The overlay uses `TYPE_ACCESSIBILITY_OVERLAY` (no "draw over other apps"
  permission needed).
- Chrome (all channels) is the supported browser for domain blocking;
  detection reads only the address-bar node (`<pkg>:id/url_bar`).
- Critical system packages (settings, dialer, emergency, launcher, system UI,
  keyboards) can never be blocked — see `SystemAllowlist.kt`.
