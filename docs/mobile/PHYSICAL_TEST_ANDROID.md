# Android physical-device test plan

Accessibility enforcement needs a real device (or emulator with Chrome).
**No item below has been verified on hardware yet.** Prereq: `adb install
mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

## A. Disclosure & permission

- [ ] A1. Fresh install → prominent disclosure explains: foreground-app
      observation, Chrome address-bar reading, local-only processing, no URL
      logging/upload, accessibility used only for user-requested blocking.
- [ ] A2. "I understand and agree" required before the accessibility-settings
      button appears (no dark patterns).
- [ ] A3. "Open Accessibility settings" → system list shows **ImpulseBlock
      pause service** with the same honest description → enable it.
- [ ] A4. Back in app: Home shows "Accessibility service is on."
- [ ] A5. Disable the service in system settings → Home shows OFF warning +
      "Fix in Accessibility settings" shortcut works.

## B. App blocking (Instagram, TikTok, YouTube)

- [ ] B1. Apps tab: quick picks show installed targets (Instagram/TikTok/
      YouTube); search works; icons/labels correct; package name visible.
- [ ] B2. Select **Instagram** → open it from launcher → full-screen indigo
      pause: "Pause before the click." / "Take one breath. The urge passes
      either way." / "Not now" / "Continue intentionally".
- [ ] B3. Same for **TikTok**.
- [ ] B4. Same for **YouTube**.
- [ ] B5. Open a blocked app from a **notification** → overlay appears.
- [ ] B6. Open via a **link** (e.g. instagram.com link resolving to the app)
      → overlay appears.
- [ ] B7. "Not now" → returns to home screen; overlay gone.
- [ ] B8. The overlay blocks touches to the app behind it.
- [ ] B9. Blocked app in Recents/app switcher → reopening it re-triggers overlay.

## C. Chrome domain blocking

- [ ] C1. Websites tab → add `example.com`.
- [ ] C2. Chrome → `https://example.com` → overlay appears.
- [ ] C3. `https://www.example.com` and `https://m.example.com`-style
      subdomains → blocked (root + subdomain matching).
- [ ] C4. A **redirect** into a blocked domain (e.g. shortened link) → overlay
      appears once the URL bar shows the blocked domain.
- [ ] C5. **Incognito** tab → same domain → verify overlay appears; if the
      address bar is not exposed on this Chrome version, record it here and
      in KNOWN_LIMITATIONS.md.
- [ ] C6. New Tab Page / typing a search query ("youtube") → NO overlay
      (queries never match).
- [ ] C7. Tab switching between a blocked and unblocked tab → overlay
      appears/disappears correctly.
- [ ] C8. Chrome Custom Tab from another app opening a blocked domain →
      record behavior (custom tabs may not expose url_bar).
- [ ] C9. Background Chrome mid-block (Home) → overlay disappears; return → reappears.
- [ ] C10. Unrelated sites are never blocked (no false positives during ~10 min browsing).
- [ ] C11. After a Chrome update, re-run C2 (view-id fallback resilience).

## D. Temporary access

- [ ] D1. On overlay tap "Continue intentionally" → 5/15-minute buttons appear.
- [ ] D2. "5 minutes" → overlay clears; app/site usable.
- [ ] D3. Keep using it past expiry WITHOUT opening ImpulseBlock → overlay
      returns at ~5 min (service-side timer). Record delay: ______
- [ ] D4. Same for 15 minutes: ______
- [ ] D5. Home shows "Temporary access active until …"; "End access now"
      re-blocks immediately.

## E. Resilience & safety

- [ ] E1. **Reboot** → service auto-restarts (Android re-binds enabled
      accessibility services) → blocking works without opening the app.
- [ ] E2. Force-stop ImpulseBlock → service restarts per platform policy;
      record behavior: ______
- [ ] E3. Revoke accessibility permission mid-use → no crash; Home shows OFF.
- [ ] E4. Uninstall a blocked app → no crash; selection survives reinstall test.
- [ ] E5. App update (adb install -r) → settings intact; service resumes.
- [ ] E6. Empty selection + enabled → nothing blocked, no overlay flicker.
- [ ] E7. Master toggle OFF → everything allowed instantly.
- [ ] E8. Rotation / dark mode / font-size changes → overlay renders correctly.

## F. Critical-system safety (must all pass)

- [ ] F1. Phone/dialer usable while blocking is active; make a call.
- [ ] F2. Emergency dialer reachable from lock screen (DO NOT place a real
      emergency call — just verify the screen is not covered).
- [ ] F3. System Settings and Accessibility settings never covered (no lockout).
- [ ] F4. Launcher/home never covered.
- [ ] F5. Alarm firing is usable while blocking active.
- [ ] F6. Keyboard use in a non-blocked app never triggers the overlay.
- [ ] F7. ImpulseBlock itself never gets covered (no overlay loop).

VPN section: N/A — the optional VPN layer was evaluated and not shipped.

Sign-off: device ______ Android version ______ Chrome version ______ date ______ tester ______
