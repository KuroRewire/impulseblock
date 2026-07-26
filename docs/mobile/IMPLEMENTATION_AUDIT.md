# Implementation audit — commit `32cdb3b`

Audit date: 2026-07-26. Scope: the full diff of commit `32cdb3b`
("Add native ImpulseBlock mobile apps"), audited against the checklist below.
Backup created first: branch `backup/mobile-implementation-32cdb3b` → `32cdb3b`.

## Findings that required fixes (all fixed in the follow-up commit)

| # | Severity | Finding | Resolution |
|---|---|---|---|
| F1 | High (iOS tests broken) | The `ImpulseBlockTests` target had neither `INFOPLIST_FILE` nor `GENERATE_INFOPLIST_FILE`, so `xcodebuild test` would fail to produce the test bundle's Info.plist. | `GENERATE_INFOPLIST_FILE: true` added to the tests target in `project.yml`; project regenerated (pbxproj now shows `YES` for both test configs). |
| F2 | Medium (blocks App Store archive) | The iOS app had **no app icon** — no asset catalog existed at all. Debug/simulator builds work, but archive/distribution fails without an AppIcon. | Added `ImpulseBlock/Assets.xcassets` with a single-size 1024×1024 `AppIcon` (sourced from the repo's existing `assets/icon.png`, verified 1024×1024) + `ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon`. |
| F3 | Medium (platform-guidance) | Accessibility service was declared `android:exported="false"`. Current platform guidance for accessibility services (Android 12+ explicit-export rules for components with intent filters) is `exported="true"`; security is unaffected because binding is gated by the signature-level `BIND_ACCESSIBILITY_SERVICE` permission that only the system holds. | Changed to `android:exported="true"` with an explanatory comment in the manifest. |
| F4 | Low (UX/permission health) | Accessibility-service status shown in Onboarding/Home/Settings was read once per composition; returning from Android's Settings did not refresh it (`Settings.Secure` is not observable), so "service is OFF" could stay stale until an unrelated recomposition. | New `rememberServiceEnabled()` (`ui/ServiceStatus.kt`) re-reads the status on every lifecycle `ON_RESUME`; all three screens now use it. |
| F5 | Low (privacy hardening, lint `DataExtractionRules`) | `allowBackup=false` alone does not govern Android 12+ device-to-device transfer. | Added `res/xml/data_extraction_rules.xml` excluding everything from cloud backup and device transfer, wired via `android:dataExtractionRules` + `android:fullBackupContent="false"`. Block lists now provably never leave the device by any backup path. |
| F6 | Info (lint `ObsoleteSdkInt`) | Adaptive icon lived in `mipmap-anydpi-v26`; the `-v26` qualifier is redundant with `minSdk 26`. | Directory renamed to `mipmap-anydpi`. |
| F7 | Info (lint `StaticFieldLeak` false positive) | Lint cannot see that the repository singleton stores only the application context. | Annotated with `@SuppressLint("StaticFieldLeak")` + explanatory comment. |

### Lint warnings intentionally left

`GradleDependency`/`AndroidGradlePluginVersion` (pinned toolchain versions —
deliberate, upgrade as a unit), `ButtonStyle`/`Overdraw`/`InflateParams`
(custom full-screen overlay design; null parent is the correct pattern for
WindowManager roots), `SwitchIntDef` (only two event types are relevant by
design). Zero lint *errors*; the build runs with `abortOnError = true`.

## Checklist results — audited clean (no action needed)

- **TODO/FIXME/stub/placeholder/hard-coded success**: zero in code. The only
  pattern matches are documentation prose: TECH_DECISION.md line about the VPN
  layer being "not implemented" (a decision statement), and a UrlBarParser
  comment describing the address bar's "placeholder hint" text.
- **Tests exercise production code**: all 43 Android tests import and call the
  real `domain/` classes (no re-implemented logic in tests); iOS tests use
  `@testable import ImpulseBlock` against the app target's sources.
- **AccessibilityService configuration**: `typeWindowStateChanged|typeWindowContentChanged`,
  `canRetrieveWindowContent="true"`, and `flagReportViewIds` (required for
  `findAccessibilityNodeInfosByViewId`) all present; label + user-facing
  description + `meta-data` + intent-filter present in the manifest.
- **Overlay lifecycle**: `hide()` runs on `onInterrupt`, `onUnbind`,
  `onDestroy`, and every non-blocking decision; the view reference is nulled;
  `addView`/`removeView` are exception-guarded (fail-open); a same-target key
  check prevents rebuild flicker. **Overlay loops**: events from ImpulseBlock's
  own package are ignored before any state change, so showing the overlay can
  never trigger its own hide/show cycle; keyboards are ignored as app switches.
- **Critical system-package exclusions**: system UI, Settings (incl.
  accessibility management), phone/telecom/in-call/dialer (AOSP, Google,
  Samsung), emergency + cell-broadcast, permission controller / package
  installer, contacts, clock/alarms, known launchers **plus the runtime-resolved
  set of CATEGORY_HOME handlers**, and IME prefixes. Unit-tested
  (`SystemAllowlistTest`, `BlockDecisionTest.neverBlocksCriticalSystemPackages`).
- **Chrome URL detection**: not single-ID-dependent — per-channel
  `<pkg>:id/url_bar` across all four Chrome channels plus a secondary id, and
  the design **fails open** (unknown/missing bar ⇒ no block, no crash). The
  secondary id is best-effort only; this is documented in KNOWN_LIMITATIONS.md
  rather than load-bearing.
- **Domain-matching false positives**: matching is exact-or-dot-suffix only;
  `youtube.com.evil.example` does not match `youtube.com` (tested); search
  queries/whitespace/dotless text never match; non-web schemes
  (`chrome:`, `about:`, `data:`, `javascript:`, …) are ignored (tested).
- **Temporary access with UI killed**: allowances persist in DataStore with
  absolute expiry timestamps; the accessibility service (not the UI) grants,
  reads, schedules a re-evaluation at the exact expiry, and re-blocks; Android
  auto-restarts enabled accessibility services, and state is re-collected in
  `onServiceConnected`. The main UI is never required.
- **DataStore persistence**: single `preferencesDataStore` delegate held in the
  repository companion (one instance app-wide); repository is a singleton;
  corrupt JSON decodes fall back to safe defaults; expired entries pruned on
  write.
- **Swift files vs. Xcode targets**: all 19 app/extension sources, 4 test
  files, entitlements, Info.plists and the `enso.png` shield resource verified
  present in `project.pbxproj`; shared sources are compiled into every target
  that needs them.
- **iOS API usage**: all symbols used are documented public API
  (`AuthorizationCenter.requestAuthorization(for: .individual)`,
  `.familyActivityPicker`, `Label(token)`, `ManagedSettingsStore(named:)`,
  `shield.applications/applicationCategories/webDomains`,
  `WebDomain(domain:).token`, `WebContentSettings.FilterPolicy.auto(_:except:)`,
  `ShieldConfigurationDataSource`, `ShieldActionDelegate` (+ `.close`),
  `DeviceActivitySchedule(warningTime:)`, `intervalWillEndWarning`). ⚠️ These
  are **compile-gated**: Xcode is not installed on this machine, so exact
  signatures could not be compiler-verified — recorded, not hidden.
- **App Group / entitlements / bundle IDs / plists**: four entitlements files
  are identical in shape (Family Controls + `$(IMPULSE_APP_GROUP)`); five
  bundle IDs all derive from `$(IMPULSE_BUNDLE_PREFIX)`; every target's
  Info.plist carries the `ImpulseBlockAppGroup` key; all plists pass
  `plutil -lint`; NSExtension point identifiers present in all three extension
  plists after regeneration.
- **Generated/local files**: `local.properties`, `.gradle/`, `build/`,
  `DerivedData/`, `xcuserdata/`, `Local.xcconfig` are gitignored and **not**
  committed; the Gradle wrapper jar is committed intentionally (standard
  practice). No machine-local absolute paths in tracked files (the only
  `/Users/` match is the `sdk.dir=/Users/you/...` example in ANDROID_SETUP.md).
- **Secrets/credentials/Team IDs**: none. `DEVELOPMENT_TEAM` is empty in the
  committed xcconfig; `Local.xcconfig.example` contains an obvious placeholder
  (`ABCDE12345`); real values live only in the gitignored `Local.xcconfig`.

## Items that remain device/Xcode-gated (tracked elsewhere)

- iOS compile verification of the API surface (F1/F2 fixes included) — first
  `xcodebuild` run after installing Xcode; `scripts/mobile-build.sh ios`.
- Everything in PHYSICAL_TEST_IOS.md / PHYSICAL_TEST_ANDROID.md (no item is
  claimed as verified).

## Post-audit verification

`cd mobile/android && ./gradlew clean test lint assembleDebug` re-run from a
clean state after the fixes — results recorded in
MOBILE_IMPLEMENTATION_REPORT.md (§4).
