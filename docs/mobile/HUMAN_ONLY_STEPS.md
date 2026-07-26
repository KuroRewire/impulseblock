# Human-only steps

Everything below requires accounts, approvals, or physical hardware that
cannot be automated from this repository. Nothing here has been done
automatically — each item is pending until you complete it.

## 0. This machine — toolchain status

1. ✅ **Xcode 26.3 is installed and selected** (`xcode-select -p` →
   `/Applications/Xcode.app/Contents/Developer`). iOS now compiles and unit-tests
   here: app + all 3 extensions build unsigned and 25/25 tests pass on the iOS
   26.3 simulator (`review/mobile/ios/build-verification.md`). No action needed.
2. ✅ XcodeGen 2.46.0, OpenJDK 17, Android SDK 35 + Gradle wrapper are all
   present; both platforms build locally.

The remaining items in this file are genuinely human-only — Apple/Google
accounts, entitlements, signing, and physical-device validation — and are
**not** satisfied by the local compile above.

## Apple

1. **Apple Developer Program** enrollment (paid, developer.apple.com) —
   required for on-device Screen Time work beyond 7-day free provisioning and
   for any distribution.
2. **Identifiers** (Certificates, Identifiers & Profiles → Identifiers), using
   your prefix from `mobile/ios/Config/Local.xcconfig`:
   - `<prefix>.impulseblock`
   - `<prefix>.impulseblock.shieldconfig`
   - `<prefix>.impulseblock.shieldaction`
   - `<prefix>.impulseblock.activitymonitor`
   Enable **App Groups** + **Family Controls** on all four.
3. **App Group**: create `group.<prefix>.impulseblock` and attach it to all
   four identifiers. (File to edit if you change the naming scheme:
   `mobile/ios/Config/Shared.xcconfig` → `IMPULSE_APP_GROUP`.)
4. **Team + prefix**: `cp mobile/ios/Config/Local.xcconfig.example
   mobile/ios/Config/Local.xcconfig` and fill `IMPULSE_BUNDLE_PREFIX` and
   `DEVELOPMENT_TEAM`.
5. **Signing**: open `mobile/ios/ImpulseBlock.xcodeproj`, sign in
   (Xcode → Settings → Accounts), let automatic signing create the four
   profiles.
6. **Family Controls DISTRIBUTION entitlement**: development builds work with
   the standard capability, but TestFlight/App Store builds require Apple to
   grant the distribution entitlement. Request it at
   developer.apple.com → Contact Us → "Family Controls & Personal Device
   Management" (per app ID). Expect days–weeks.
7. **Physical device**: enable Developer Mode on the iPhone
   (Settings → Privacy & Security → Developer Mode), run from Xcode, grant
   Screen Time authorization in the app.
8. **App Store Connect** (when distributing): create the app record; privacy
   labels = "Data Not Collected"; App Review notes: explain this is an
   *individual self-control* app using FamilyControls `.individual`
   authorization — not parental control — everything on-device, no accounts.
9. Run the full physical checklist: docs/mobile/PHYSICAL_TEST_IOS.md.

## Google

1. **Play Console** account; keep the application ID `com.impulseblock.mobile`
   or change it in `mobile/android/app/build.gradle.kts`
   (`applicationId`) before first upload.
2. **Signing key**: create an upload keystore
   (`keytool -genkeypair ...`), configure a `release` signingConfig in
   `mobile/android/app/build.gradle.kts` (do not commit the keystore or
   passwords), or enroll in Play App Signing.
3. **On device**: install the APK, accept the in-app disclosure, enable
   **ImpulseBlock pause service** under Settings → Accessibility.
4. **Play Console declarations**:
   - Accessibility API declaration — paste from
     docs/mobile/ANDROID_PLAY_DISCLOSURE.md §2.
   - Data safety form — §3 (no data collected/shared).
   - Review notes — §4.
5. **VPN declaration**: not applicable (the optional VPN layer was evaluated
   and intentionally not shipped — see KNOWN_LIMITATIONS.md).
6. Run the full physical checklist: docs/mobile/PHYSICAL_TEST_ANDROID.md.
