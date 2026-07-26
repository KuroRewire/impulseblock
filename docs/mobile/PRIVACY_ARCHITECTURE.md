# ImpulseBlock Mobile — Privacy architecture

Same contract as the browser extension: **local-first, no account, no
telemetry, no browsing-history collection.** This document states what is
stored, what is deliberately never stored, and the mechanisms that make the
claims verifiable.

## What is stored (locally only)

| Data | iOS | Android |
|---|---|---|
| Master blocking state | App Group UserDefaults | DataStore Preferences |
| Selected apps | Opaque Screen Time tokens (`FamilyActivitySelection`, Codable) | Package names chosen by the user |
| Selected categories | Opaque category tokens | — |
| Manually blocked domains | `blockedDomains: [String]` | `blocked_domains_json` |
| Adult-filter toggle | Bool | — (not offered; no OS classifier) |
| Temporary allowances | Grant with `expiresAt` (+ token sets) | `{key: expiryEpochMs}` maps |
| Permission/setup state | Authorization state (derived), onboarding flag | Disclosure-consent + onboarding flags |
| Settings/migration version | `schemaVersion` in `BlockSettings` | `settings_version` key |

## What is never stored, by design

- Browsing history, full visited URLs, page titles, search queries.
- Time spent per site/app.
- User identity, advertising identifiers, analytics events.

## Enforcement mechanisms (how the claims hold)

**Android**
- The app declares **no INTERNET permission** — upload is impossible at the
  OS level, not just promised.
- The accessibility service reads only the browser **address-bar node**
  (`url_bar` view id); page content is never queried
  (`ImpulseBlockAccessibilityService.detectBrowserHost`).
- Detected hostnames live in a local variable, are compared against the
  user's list, and are discarded; nothing observed is persisted.
- No third-party SDKs at runtime (AndroidX + Kotlin stdlib only).

**iOS**
- Apple's FamilyControls hands the app **opaque tokens** for picked apps —
  ImpulseBlock cannot technically know which apps you selected.
- All state lives in the App Group container; the app makes zero network
  requests and links no third-party SDKs.
- Tokens are never exported: JSON export contains only portable settings
  (domains, toggles).

## Import/export schema (v1)

```json
{
  "schema": "impulseblock.settings",
  "version": 1,
  "exportedAt": "2026-07-26T00:00:00Z",
  "platform": "ios | android | extension",
  "blockedHosts": ["youtube.com", "tiktok.com"],
  "settings": { "isEnabled": true, "adultFilterEnabled": false, "defaultTempMinutes": 5 },
  "blockedPackages": ["com.instagram.android"]
}
```

- `blockedHosts` uses the extension's storage key name and semantics, so an
  extension storage dump (`{"blockedHosts": [...]}`) and a bare array import
  directly.
- `blockedPackages` is Android-only; iOS ignores it (Apple forbids
  reconstructing app selections from identifiers).
- Imports validate and normalize every domain; invalid entries are reported
  and skipped, never silently written.

## Deletion

- iOS: delete the app, or Settings → Reset all data (clears the App Group and
  removes all shields).
- Android: uninstall, or Settings → Reset all data (clears DataStore).
