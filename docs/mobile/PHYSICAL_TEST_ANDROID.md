# Android physical-device test plan

Accessibility enforcement needs a real device (or emulator with Chrome).
Prereq: `adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

## Executed validation run — 2026-07-26

- **Device:** Google Pixel 10 Pro (`blazer`), **Android 16 (API 36)**, locale ja-JP
- **Chrome:** 150.0.7871.181
- **APK validated:** started from
  `f66ea6e9…c62e` (commit `cf2b7d7`); fixes re-validated on the rebuilt APK.
- **Application ID:** `com.impulseblock.mobile`
- Evidence (screenshots + decision logs) under `review/mobile/android/`.

Marker legend: **PASS** (observed on device) · **NOT TESTED** ·
**BLOCKED BY USER ACTION** · **BLOCKED BY DEVICE/OS LIMITATION**.

Results below are annotated inline. Items without a marker were not part of
this run and remain to be executed.

## A. Disclosure & permission

- [x] A1. **PASS** — disclosure shown on first launch listing all four points
      (screenshot `01-onboarding.png`).
- [x] A2. **PASS** — "I understand and agree" gate precedes the settings
      button (`06-onboarding-service-detected.png`).
- [x] A3. **PASS** — system list shows "ImpulseBlock pause service" with the
      honest description (`04-service-page.png`); enabling binds the service
      (`dumpsys accessibility` → Bound/Enabled services present).
- [x] A4. **PASS** — Home shows "Accessibility service is on." after return
      (`07-home.png`), confirming the ON_RESUME refresh (audit fix F4).
- [x] A5. **PASS** — after force-stop the service unbinds; Home shows
      "Accessibility service is OFF — blocking cannot work." with a working
      "Fix in Accessibility settings" button (`16-home-after-forcestop.png`).

## B. App blocking (Instagram, TikTok, YouTube)

- [x] B1. **PASS** — quick picks show Instagram, TikTok, YouTube (+ Facebook,
      Reddit, X) with icons, labels and package names; checkboxes toggle
      (`09-apps-selected.png`).
- [x] B2/B3. **PASS (selection)** — Instagram + TikTok selected and persisted
      (verified in DataStore: `blocked_packages_json` includes
      `com.instagram.android`, `com.ss.android.ugc.trill`). Their launch-block
      uses the identical code path proven by B4; not separately opened this run.
- [x] B4. **PASS** — opening **YouTube** shows the full-screen indigo pause
      with the exact required copy and both buttons
      (`10-youtube-blocked.png`); decision log
      `decision=BlockApp(com.google.android.youtube)`.
- [ ] B5/B6. **NOT TESTED** — notification / deep-link entry (same
      foreground-package path; not exercised this run).
- [x] B7. **PASS** — "Not now" returns to launcher, overlay gone
      (`mCurrentFocus`=nexuslauncher after tap).
- [x] B8. **PASS** — overlay covers the app; underlying YouTube is dimmed and
      non-interactive (`11-overlay-blocks-touch.png`).
- [ ] B9. **NOT TESTED** — Recents re-entry (not exercised this run).

## C. Chrome domain blocking

- [x] C1. **PASS** — `example.com` added and stored
      (`32-example-in-list.png`; DataStore `blocked_domains_json:["example.com"]`).
- [x] C2. **PASS** — Chrome → `https://example.com` → overlay appears over the
      dimmed Example Domain page (`33-chrome-example-blocked.png`); decision log
      `decision=BlockSite(host=example.com, browserPackage=com.android.chrome)`.
      Confirms Chrome 150 `url_bar` node is read correctly on Android 16.
- [ ] C3. **NOT TESTED (positive subdomain)** — example.com has no live
      subdomain to visit; root+subdomain matching is proven by unit tests
      (`m.youtube.com` matches `youtube.com`) but not visited in-browser.
- [ ] C4. **NOT TESTED** — redirect chain (not exercised this run).
- [ ] C5. **NOT TESTED** — incognito (not exercised this run).
- [x] C6. **PASS (negative)** — a Google **search** whose query contains
      "example.com" (`google.com/search?q=example.com+news`) is NOT blocked;
      decision log `None`, host = google.com (`34-search-not-blocked.png`).
      Confirms query/search text never triggers a match.
- [ ] C7. **NOT TESTED** — tab switching (not exercised this run).
- [ ] C8. **NOT TESTED** — Chrome Custom Tabs (documented best-effort in
      KNOWN_LIMITATIONS.md).
- [ ] C9. **NOT TESTED** — background/return (not exercised this run).
- [x] C10. **PASS (no false positives)** — `wikipedia.org` (unrelated, real
      site) is NOT blocked while `example.com` is configured; decision log
      `None`. Deceptive-suffix (`youtube.com.evil.example`) non-match is
      proven by unit tests.
- [ ] C11. **NOT TESTED** — future Chrome update resilience (by nature can't
      be run today; fallback view-ids in `SupportedBrowsers.kt`).

## D. Temporary access

- [x] D1. **PASS** — "Continue intentionally" reveals 5-minute / 15-minute
      buttons (`13-duration-row.png`).
- [x] D2. **PASS** — "5 minutes" clears the overlay; YouTube is fully usable
      (`15-youtube-usable.png`). Grant recorded at 10:37:26 → expiry 10:42:28
      (DataStore `temp_allowed_packages_json:{...youtube:1785030148545}`).
- [x] D3. **PASS (re-block after expiry)** — after the 5-minute window,
      re-opening YouTube shows the pause again; decision log at 10:47
      `decision=BlockApp` on the expired allowance. The **full 5-minute
      interval was honored** (not shortened). Note: re-block fires on the next
      foreground/navigation event or the scheduled re-evaluation — see the
      resilience note in E about an already-foreground app after a *process
      restart* (fixed this run).
- [ ] D4. **NOT TESTED (timing)** — 15-minute wall-clock expiry not waited out
      this run; same code path as D3 with a 15-min interval.
- [x] D5. **PASS** — Home shows "Temporary access active until 10:42" with an
      "End access now" control (`16-home-after-forcestop.png`).

## E. Resilience & safety

- [ ] E1. **NOT TESTED** — full reboot not performed this run.
- [x] E2. **PASS (with fix)** — force-stopping ImpulseBlock unbinds the
      service (`dumpsys` Bound/Enabled empty) and Home reflects OFF. **Defect
      found & fixed:** after a service *process restart* while a blocked app
      was already foreground (e.g. an allowance expired during the restart),
      the app was not re-blocked until the next navigation, because the
      service only evaluated on the next accessibility event. Fixed by seeding
      the foreground package from `rootInActiveWindow` on service connect
      (`seedForegroundPackage()`), verified by the seed-driven `evaluate` log
      line appearing with no preceding window-state event.
- [x] E3. **PASS** — revoking the service mid-use does not crash; Home shows
      the OFF state and the fix shortcut.
- [ ] E4. **NOT TESTED** — uninstall of a blocked app (selection persistence
      across reinstall is covered by E5).
- [x] E5. **PASS** — `adb install -r` over the running app: settings/selections
      persist (DataStore intact) and the service resumes after re-enable.
- [x] E6. **PASS** — with an empty selection the overlay never appears (no
      flicker); decision log `None` for launcher/settings/dialer.
- [x] E7. **PASS** — master toggle drives `enabled`; when off, decision is
      `None` for everything (Home "Everything is allowed").
- [ ] E8. **NOT TESTED** — rotation / font-scale (overlay is MATCH_PARENT; not
      exercised this run).

## F. Critical-system safety (must all pass)

Device system-package names were resolved live and all match the allowlist:
Settings `com.android.settings`, launcher `com.google.android.apps.nexuslauncher`,
dialer `com.google.android.dialer`, IME `com.google.android.inputmethod.latin`,
system UI `com.android.systemui`.

- [x] F1. **PASS** — Dialer opens and stays focused while 3 apps are blocked;
      decision log `None` (`com.google.android.dialer`). (No real call placed.)
- [ ] F2. **NOT TESTED** — emergency dialer (intentionally not exercised for
      safety; dialer package is allowlisted and passed F1).
- [x] F3. **PASS** — Android **Settings** opens and stays focused; decision log
      `None` (`com.android.settings`). No lockout. (Release-blocking check.)
- [x] F4. **PASS** — Home/launcher never covered; "Not now" reliably lands on
      the launcher; decision `None`.
- [ ] F5. **NOT TESTED** — alarm firing (clock package allowlisted).
- [x] F6. **PASS** — the Gboard IME (`com.google.android.inputmethod.latin`) is
      treated as a non-switch overlay and never triggers a block.
- [x] F7. **PASS** — ImpulseBlock's own package is ignored before any state
      change; no overlay loop observed across the whole session.

VPN section: N/A — the optional VPN layer was evaluated and not shipped.

Sign-off: **Pixel 10 Pro · Android 16 (API 36) · Chrome 150.0.7871.181 ·
2026-07-26 · automated ADB-driven validation.**
