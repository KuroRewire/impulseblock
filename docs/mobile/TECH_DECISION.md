# ImpulseBlock Mobile — Architecture & Technology Decision

Decision date: 2026-07-26.
Status: implemented (iOS + Android sources in `mobile/`).

## Decision

**Native platform implementations on both OSes.** No React Native / Expo /
Flutter / Capacitor / PWA layer.

| | iOS | Android |
|---|---|---|
| Language / UI | Swift + SwiftUI | Kotlin + Jetpack Compose (Material 3) |
| App blocking | FamilyControls + ManagedSettings application shields | AccessibilityService foreground-package detection + `TYPE_ACCESSIBILITY_OVERLAY` |
| Website blocking (Chrome) | ManagedSettings web-domain shields (`WebDomain(domain:).token`) + optional `webContent.blockedByFilter = .auto(...)` | Accessibility read of Chrome's address-bar node (`<pkg>:id/url_bar`) → local domain match → overlay |
| Custom pause UI | ManagedSettingsUI ShieldConfiguration extension | Overlay view (XML, inflated by the service) |
| Temp-access restore | DeviceActivity schedule (+ `intervalWillEndWarning` trick for 5 min) + re-apply on app launch/foreground | Expiry timestamps in DataStore; service re-evaluates on events and at the exact expiry via a scheduled callback |
| Persistence | App Group `UserDefaults` (JSON-encoded Codable) | DataStore Preferences (+ kotlinx-serialization) |
| App selection | `FamilyActivityPicker` (opaque tokens — Apple never reveals selections to the developer) | PackageManager `MAIN/LAUNCHER` query (no `QUERY_ALL_PACKAGES`), with quick suggestions for Instagram/TikTok/YouTube when installed |

## Why native (and not cross-platform)

The entire hard part of this product is OS enforcement, and none of it is
shareable:

- iOS enforcement is FamilyControls/ManagedSettings/DeviceActivity — Swift-only
  system frameworks plus **three app extensions** (shield UI, shield action,
  activity monitor) that must be native targets. A JS/Dart bridge adds code
  without removing any of this.
- Android enforcement is an AccessibilityService + window overlay — again a
  purely native component.
- The shared "UI layer" (4 simple screens per platform) is smaller than the
  bridge/tooling cost of any cross-platform framework.

## Platform API facts this design relies on

Primary sources: Apple Developer documentation (FamilyControls,
ManagedSettings, ManagedSettingsUI, DeviceActivity), Android developer
documentation (AccessibilityService, accessibility overlays, package
visibility), Google Play policy pages (Accessibility API use, target API
level). Verified against the installed SDK where possible; items that can
only be proven on hardware are flagged in PHYSICAL_TEST_*.md.

### iOS

- **Individual authorization**: `AuthorizationCenter.requestAuthorization(for: .individual)`,
  iOS 16.0+ → our deployment target is 16.0. Uses the standard (free-to-develop)
  Family Controls entitlement in development; **distribution** requires the
  Family Controls distribution entitlement granted by Apple on request
  (HUMAN_ONLY_STEPS.md).
- **FamilyActivityPicker** returns `FamilyActivitySelection` (Codable) with
  opaque `ApplicationToken` / `ActivityCategoryToken` / `WebDomainToken` sets.
  Tokens cannot be introspected or exported; SwiftUI `Label(token)` renders
  system-provided name/icon.
- **Application/category shields**: `ManagedSettingsStore.shield.applications`
  and `.applicationCategories` (`.specific(_:except:)`).
- **Web-domain shields**: `store.shield.webDomains: Set<WebDomainToken>`;
  a manually constructed `WebDomain(domain:)` exposes a `token` on device,
  which is how the user's typed domains are shielded. **Domain limit: 50**
  (enforced in UI). This is domain-level blocking (root + subdomains as
  handled by the system), not path-level.
- **Adult-content filter**: `store.webContent.blockedByFilter = .auto(...)` —
  Apple's on-device classifier; also accepts always-block `WebDomain`s. Exposed
  as the optional "Block adult websites" toggle, independent of the manual list.
- **Shield UI**: `ShieldConfigurationDataSource` extension
  (`com.apple.ManagedSettingsUI.shield-configuration-service`) with
  `ShieldConfiguration` (title/subtitle/two buttons/icon/colors).
- **Shield actions**: `ShieldActionDelegate` extension
  (`com.apple.ManagedSettings.shield-action-service`); responses are
  `.close` / `.defer` / `.none`. **The SDK provides no supported way to open
  the parent app from the shield** — "Continue intentionally" therefore writes
  a pending request to the App Group and responds `.close`; the app shows the
  5/15-minute chooser on next open. Documented in KNOWN_LIMITATIONS.md.
- **Temporary-access restoration**: DeviceActivity monitor extension
  (`com.apple.deviceactivity.monitor-extension`). `DeviceActivitySchedule`
  has a **15-minute minimum interval**; the 5-minute option uses a 15-minute
  interval with `warningTime = 10 min` so `intervalWillEndWarning` fires at
  +5 min. Both callbacks re-apply shields idempotently from persisted state.
  Defense in depth: the app also re-applies on every launch/foreground, and
  grants carry their own expiry — a missed callback can only delay, never
  cancel, re-shielding.
- **Web filtering scope**: ManagedSettings web filtering applies to WebKit
  content system-wide. Chrome on iOS uses WebKit (outside EU alternative-engine
  builds), so blocking is expected to apply in Chrome — **but this is exactly
  the class of behavior that must be validated on hardware**
  (PHYSICAL_TEST_IOS.md). If it proves unreliable on the tested OS, the P1
  path is Apple's Network Extension URL Filter (below).

### Android

- **AccessibilityService** with `typeWindowStateChanged|typeWindowContentChanged`,
  `canRetrieveWindowContent`, `flagReportViewIds` detects the foreground
  package and (in Chrome) the address-bar node — no special permissions beyond
  the user explicitly enabling the service.
- **`TYPE_ACCESSIBILITY_OVERLAY`** windows are available to enabled
  accessibility services **without** `SYSTEM_ALERT_WINDOW` ("draw over other
  apps"), and reliably cover the blocked app.
- **Chrome URL detection**: `findAccessibilityNodeInfosByViewId("com.android.chrome:id/url_bar")`
  — the omnibox view id has been stable across Chrome for years; the same id
  exists per-channel (`com.chrome.beta` etc.). Fallbacks are conservative; if
  no confident hostname is found, nothing is blocked. Only the address bar is
  read; never page content.
- **Google Play Accessibility policy**: apps using AccessibilityService for
  non-accessibility purposes must show a prominent in-app disclosure, obtain
  consent, and declare the use in Play Console (`ANDROID_PLAY_DISCLOSURE.md`
  contains the prepared text). The service description in
  `accessibility_service_config.xml` explains the exact use.
- **Package visibility (API 30+)**: launcher-app picker uses a `<queries>`
  intent declaration for `MAIN/LAUNCHER` — **no `QUERY_ALL_PACKAGES`**, which
  Play restricts.
- **Target SDK**: compile/target 35 (current Play requirement window),
  minSdk 26.
- **Foreground-app detection** comes from accessibility events themselves —
  no `PACKAGE_USAGE_STATS` or other restricted permission needed.

## Optional local VPN layer — evaluated, NOT shipped

A local-only `VpnService` DNS filter (sinkhole responses for blocked domains)
was evaluated for defense-in-depth on Android:

- It cannot be made reliable in this run without hardware validation:
  Private DNS (DoT) and browser DNS-over-HTTPS bypass a plain local DNS
  filter entirely, Chrome's Async DNS can bypass the VPN DNS, and IPv6 +
  split-tunnel handling carries real connectivity risk.
- A misleading or connectivity-breaking VPN is worse than none; the
  accessibility path fully covers the P0 requirement.

Decision: **not implemented**. The design and its preconditions are recorded
in KNOWN_LIMITATIONS.md; revisit only with physical-device time budgeted.

## iOS future architecture note — Network Extension URL Filter

Do **not** build Apple's system-wide URL Filter (Network Extension) for P0.
It becomes the right architecture when any of these appear:

- More than the 50-domain ManagedSettings limit.
- URL **path-level** filtering (e.g. block `/reels` but not DMs).
- Larger, remotely updated domain intelligence (needs a signed filter
  database, update pipeline, and hosting).
- Cross-browser guarantees beyond WebKit (EU alternative-engine browsers).

Costs it brings: the `com.apple.developer.networking.networkextension`
content-filter entitlement (approval required; historically supervised/managed
contexts), a content-filter data + control provider pair, a filter database,
on-device privacy review (Apple requires filter decisions to stay on device),
and meaningful operational maintenance. None of that is justified for a
50-domain personal denylist today.

## Data model & import/export

Versioned JSON (`impulseblock.settings`, version 1), directly compatible with
the extension's `blockedHosts` array; also accepts an extension storage dump
(`{"blockedHosts":[...]}`) and a bare hostname array. iOS opaque Screen Time
tokens are never exported (platform restriction) — exports carry only portable
settings (domains, toggles, Android package names). Matching semantics are the
extension's: `host === entry || host.endsWith("." + entry)`.
