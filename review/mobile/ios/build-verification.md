# iOS build & test verification — Xcode 26.3

- **Xcode:** 26.3 (build 17C529), Swift 6.2.4
- **SDK:** iphonesimulator (iOS 26.2 SDK shipped with Xcode 26.3)
- **Simulator runtime:** iOS 26.3 (23D8133); device iPhone 17 Pro
  (`F64D1460-6CF1-4FC7-AE65-70E43EFD0B48`)
- **Project:** `mobile/ios/ImpulseBlock.xcodeproj` (XcodeGen 2.46.0 from
  `mobile/ios/project.yml`)
- **Branch / base:** `validation/ios-compile` from `main@c4ec43e`
- All builds unsigned: `CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO`.

## Schemes discovered

`xcodebuild -project mobile/ios/ImpulseBlock.xcodeproj -list` →
Targets: `ImpulseBlock`, `ShieldConfigurationExtension`, `ShieldActionExtension`,
`DeviceActivityMonitorExtension`, `ImpulseBlockTests`.
Schemes: `ImpulseBlock` (shared, has the test target), plus one per extension.

## Build results

| Component | Command | Result |
|---|---|---|
| Main app (Debug) | `xcodebuild -scheme ImpulseBlock -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' clean build` | ✅ **BUILD SUCCEEDED** |
| Main app (Release) | same, `-configuration Release` | ✅ **BUILD SUCCEEDED** |
| ShieldConfigurationExtension | `-scheme ShieldConfigurationExtension … build` | ✅ **BUILD SUCCEEDED** |
| ShieldActionExtension | `-scheme ShieldActionExtension … build` | ✅ **BUILD SUCCEEDED** |
| DeviceActivityMonitorExtension | `-scheme DeviceActivityMonitorExtension … build` | ✅ **BUILD SUCCEEDED** |

Only warnings emitted: harmless `appintentsmetadataprocessor … No
AppIntents.framework dependency found` (informational; the app uses no
AppIntents). Zero compiler warnings in first-party Swift.

## Embedded extensions (verified in the built .app)

`ImpulseBlock.app/PlugIns/` contains all three `.appex` bundles, each with a
real Mach-O executable and correct `NSExtension` wiring:

| Extension | NSExtensionPointIdentifier | Principal class | Executable |
|---|---|---|---|
| ShieldConfigurationExtension | `com.apple.ManagedSettingsUI.shield-configuration-service` | `ShieldConfigurationExtension.ShieldConfigurationProvider` | 70,288 B |
| ShieldActionExtension | `com.apple.ManagedSettings.shield-action-service` | `ShieldActionExtension.ShieldActionProvider` | 70,280 B |
| DeviceActivityMonitorExtension | `com.apple.deviceactivity.monitor-extension` | `DeviceActivityMonitorExtension.ActivityMonitor` | 70,288 B |

## Unit tests

`xcodebuild -scheme ImpulseBlock -destination 'platform=iOS Simulator,id=<udid>' test`
→ ✅ **TEST SUCCEEDED** — **25 tests, 0 failures**:

- `DomainNormalizerTests` — 10
- `ImportExportTests` — 6
- `PunycodeTests` — 4
- `TemporaryAccessTests` — 5

One failure was found and fixed during this run (see IMPLEMENTATION_AUDIT.md
F8): the Swift `DomainNormalizer` lacked the whitespace-rejection guard the
Kotlin one has, so `"not a domain"` returned `.localOrReserved` instead of
`.malformed`. Added the guard; all 25 pass.

## Scripts

- `scripts/mobile-doctor.sh` → reports Xcode 26.3, Swift 6.2.4, iOS SDKs,
  XcodeGen, JDK 17, Android SDK — ✅.
- `scripts/mobile-build.sh ios` → ✅ BUILD SUCCEEDED.
- `scripts/mobile-test.sh ios` → ✅ TEST SUCCEEDED (now auto-discovers an
  available simulator UDID instead of the hardcoded `iPhone 16`).

## Not verified here (requires a physical iPhone + Apple entitlement/signing)

Family Controls authorization, `FamilyActivityPicker`, ManagedSettings app/web
shielding, the custom shield UI, ShieldAction responses, and DeviceActivity
re-shield all **compile** against the real SDK but cannot execute in the
simulator or without the approved Family Controls distribution entitlement.
See `docs/mobile/PHYSICAL_TEST_IOS.md`.
