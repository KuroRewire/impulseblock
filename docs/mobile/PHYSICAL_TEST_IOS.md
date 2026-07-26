# iOS physical-device test plan

Screen Time enforcement does not run in the simulator. **No item below has
been verified on hardware yet** — check items off as you complete them.
Prereqs: HUMAN_ONLY_STEPS.md (Apple section) done; app installed from Xcode
on an iPhone running iOS 16+.

## A. Authorization

- [ ] A1. Fresh install → onboarding explains pause philosophy, Screen Time
      requirement, on-device privacy, opaque tokens.
- [ ] A2. Tap "Allow Screen Time access" → system FamilyControls prompt
      appears → approve → state shows "granted", onboarding continues.
- [ ] A3. Denied path: on a fresh install decline the prompt → app shows the
      denied state calmly (no crash), Home shows permission health warning,
      re-request works.
- [ ] A4. Settings → Screen Time → revoke ImpulseBlock → app reflects loss on
      next foreground and offers re-request.

## B. App shielding (Instagram, TikTok, YouTube)

- [ ] B1. Apps tab → picker → search & select **Instagram** → done → count updates.
- [ ] B2. Same for **TikTok**.
- [ ] B3. Same for **YouTube**.
- [ ] B4. Open each: the custom shield appears — dark indigo, enso mark,
      "Pause before the click." / "Take one breath. The urge passes either
      way." / buttons "Not now" + "Continue intentionally".
- [ ] B5. "Not now" exits the app (shield `.close`).
- [ ] B6. Select an entire category in the picker → an app in it is shielded.
- [ ] B7. Master toggle OFF on Home → all shields drop. ON → they return.
- [ ] B8. Clear all selections → nothing shielded.

## C. Manual website blocking

- [ ] C1. Websites tab → add `example.com` → appears in list.
- [ ] C2. Safari → `https://example.com` → blocked (shield/restriction page).
- [ ] C3. Safari → `https://www.example.com` and any subdomain → blocked
      (root + subdomain matching).
- [ ] C4. **Google Chrome (iOS)** → `https://example.com` → verify whether the
      block applies. ⚠️ Expected to apply because Chrome iOS uses WebKit, but
      this is exactly the claim that MUST be hardware-verified. If Chrome is
      NOT blocked on the tested OS version, record the iOS version here and
      open a P1 decision on the Network Extension URL Filter path
      (TECH_DECISION.md future note) — do not ship the claim.
- [ ] C5. HTTPS everywhere: confirm both C2/C4 URLs were https.
- [ ] C6. Add 50 domains → adding the 51st shows the calm limit explanation
      (Apple platform limit), nothing silently dropped.
- [ ] C7. Remove a domain → immediately reachable again.
- [ ] C8. Import the browser extension's JSON export → domains appear;
      invalid entries reported as skipped.
- [ ] C9. Export JSON → file contains domains + settings, no tokens.

## D. Adult-content filter

- [ ] D1. Toggle "Block adult websites" ON → known adult site blocked in
      Safari (OS classifier).
- [ ] D2. Toggle OFF → manual list still enforced independently.

## E. Shield actions & temporary access

- [ ] E1. On a shielded app tap "Continue intentionally" → shield closes
      (SDK cannot deep-open the parent app — known limitation).
- [ ] E2. Open ImpulseBlock → Home shows the pending "Continue intentionally?"
      card for that request.
- [ ] E3. Grant **5 minutes** → app opens normally.
- [ ] E4. ~5 minutes later (no ImpulseBlock foreground): shield returns
      automatically (DeviceActivity `intervalWillEndWarning`). Record actual
      delay: ______
- [ ] E5. Grant **15 minutes** → re-shields at ~15 min (`intervalDidEnd`).
      Record actual delay: ______
- [ ] E6. During access, "End access now" on Home re-shields immediately.
- [ ] E7. Kill ImpulseBlock (app switcher) during a 5-min window → re-shield
      still happens (extension runs without the app).
- [ ] E8. **Reboot** during a temp window → after unlock, verify state:
      if expiry passed, target is shielded (at latest on first app open).

## F. State restoration

- [ ] F1. Reboot with active selections → shields persist after unlock.
- [ ] F2. Force-quit + relaunch app → settings, selections, domains intact.
- [ ] F3. Change selections/toggles rapidly → final state wins; no stale shields.

Sign-off: device ______ iOS version ______ date ______ tester ______
