# Known limitations — stated honestly

## Both platforms

- **Domain-level blocking only.** `youtube.com` blocks the whole site and its
  subdomains; path-level rules (e.g. only `/shorts`) are out of scope for P0.
- **Import/export never includes iOS app selections** — Apple's opaque tokens
  cannot be exported meaningfully. Portable settings = domains + toggles
  (+ Android package names).
- **iOS is compiled-verified** as of 2026-07-27 on **Xcode 26.3 (Swift 6.2.4)**:
  the main app and all three extensions build (Debug + Release, unsigned
  simulator) with zero errors, and the 25 pure unit tests pass on the iOS 26.3
  simulator (`review/mobile/ios/build-verification.md`). What remains unverified
  is **runtime enforcement**, which needs a physical iPhone + the Family
  Controls entitlement (below) — compiling against the SDK does not exercise the
  OS shielding behavior.

## iOS

- **Physical device required for enforcement.** Simulator builds compile and
  run the UI, but Screen Time shields do nothing there.
- **"Continue intentionally" cannot deep-open the app.** The ShieldAction
  extension has no supported API to launch the parent app; it records the
  request and closes the shield. The user opens ImpulseBlock, which
  immediately shows the 5/15-minute chooser. (If a future SDK adds a
  supported open-parent-app response, adopt it in `ShieldActionProvider`.)
- **5-minute restore rides a 15-minute schedule.** DeviceActivity's minimum
  interval is 15 minutes; the 5-minute option fires via
  `intervalWillEndWarning` (warningTime = 10 min). iOS may deliver callbacks
  with some latency. Safety net: grants carry `expiresAt` and the app
  re-applies shields on every launch/foreground — an app can never remain
  permanently unblocked because a timer failed; worst case re-shield happens
  at the next callback or next app open.
- **Manual web domains capped at 50** (ManagedSettings platform limit). The
  UI explains the cap; exceeding it requires the future URL-Filter
  architecture (TECH_DECISION.md).
- **Chrome-on-iOS web blocking is expected (WebKit) but unverified on
  hardware.** PHYSICAL_TEST_IOS.md C4 is the gate; do not claim it works
  until checked. EU alternative-engine Chrome builds may behave differently.
- **Adult-content toggle** uses Apple's classifier; classification quality is
  the OS's, and it will not catch every site (stated in-app).
- **Reboot behavior** of an in-flight temporary-access window depends on
  DeviceActivity rescheduling; the launch-time re-apply covers the gap but
  needs the E8 physical check.

## Android

- **Chrome (all channels) is the supported browser for domain blocking.**
  Other browsers currently get app-level blocking only (you can block the
  browser app itself). Adding a browser = one entry in `SupportedBrowsers.kt`
  with its url-bar view id.
- **Accessibility view-ids are not a contract.** Chrome's `url_bar` id has
  been stable for years, but a Chrome update could rename it; detection then
  fails **open** (no false blocking, no crash) until the table is updated.
  PHYSICAL_TEST_ANDROID.md C11 covers update checks.
- **Chrome Custom Tabs / WebViews** inside other apps may not expose the
  address bar; domain blocking there is best-effort (C8 records actual
  behavior). Blocking the host app remains available.
- **A determined user can bypass** by disabling the accessibility service or
  uninstalling — ImpulseBlock is deliberately a pause, not a parental-control
  lockdown. This is product philosophy, not an oversight.
- **Detection latency** is event-driven (~100–300 ms typical): a brief flash
  of the blocked app/site before the overlay is possible on slow devices.
- **OEM battery killers** (aggressive task managers) can stop accessibility
  services; Android normally restarts them, and Home shows permission health
  with a fix shortcut.
- **Temporary-access re-block** happens via the service's scheduled
  re-evaluation and on the next accessibility event; if the service was dead
  at expiry, re-block occurs as soon as it is running again. As of the
  2026-07-26 physical run, the service also **seeds the current foreground app
  on connect** (`seedForegroundPackage()`), so a restart while a blocked app
  is already open re-blocks immediately rather than waiting for the next
  navigation.

- **CJK IME composition in text fields (cosmetic, input-side).** On a
  Japanese-locale device with Gboard in kana-input mode, characters typed into
  the "add domain" / "search apps" fields are romaji-composed to kana until
  committed (e.g. "example.com" shows as `えぁmpぇ` while composing). The app
  faithfully normalizes whatever is finally committed — if kana is committed it
  is punycode-encoded (correct IDN behavior), which is not what the user
  intended. Mitigations shipped: the domain field uses `KeyboardType.Uri` to
  bias Gboard toward ASCII, and the visible commit reflects exactly what will
  be stored. A user simply commits the ASCII candidate (Gboard offers
  "example.com" as the top suggestion) or switches to English input. This is a
  device-input ergonomics limitation, not an enforcement bug; observed only via
  ADB text injection, which bypasses the field's keyboard-type hint.

## Optional local VPN DNS filter — evaluated, intentionally not shipped

Preconditions that could not be established without hardware in this run:
Private DNS (DoT) and in-browser DoH bypass a local DNS sinkhole; Chrome
Async-DNS may bypass the VPN's DNS; IPv6/split-tunnel handling risks breaking
connectivity. Shipping a filter that silently misses DoH traffic would fake
coverage — contrary to this product's honesty rule. Revisit with:
local-only `VpnService` + DNS-only routing + explicit DoH/DoT limitation UI +
kill-switch-free design + the full physical test matrix.
