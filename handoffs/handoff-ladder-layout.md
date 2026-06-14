# Handoff: Ladder session reset + image/log layout + popup fixes

Four tasks: A (ladder session reset — touches background.js, do carefully), B (bigger image + inline log on the block screen), C (fix F4 image preview in popup), D (popup CSS polish). Do them in order A→B→C→D. After EACH task run its verification and report. If an existing feature would break, STOP and report.

## Project background
ImpulseBlock = published Manifest V3 Chrome extension, 124 users. Renewal Ladder grants longer override windows on repeated overrides of the same host (5→10→15→20 min), with a 60-minute daily cap. Block screen has 5 themes via `body[data-theme]` + `theme-loader.js`. Custom pause image stored under `pauseImage`. Theme under `blockTheme`.

## HARD CONSTRAINTS (all tasks)
- NEVER rename/remove existing storage keys: `blockedHosts`, `openCountByDate`, `lastOpenedAt`, `tempAllowedHosts`, `overrideHistoryByDate`. Do NOT change the SHAPE of `overrideHistoryByDate` — it stays `overrideHistoryByDate[dateKey][host] = [{ startedAt, durationMs }, ...]`. You only CHANGE how it's read for the ladder rung; you do not change what's written or the structure.
- Allowed new keys only: `blockTheme`, `pauseImage` (already exist). Task A needs NO new key.
- NEVER change element ids in blocked.html: `cheer-image`, `current-host`, `blocked-list`, `history-list`, `bursts-list`, `today-count`, `last-opened`, `btn-yes`, `btn-no`.
- New UI text → add `data-i18n` keys to BOTH `_locales/en/messages.json` and `_locales/ja/messages.json` (full parity).
- Do NOT bump version. Do NOT run git. Human handles versioning/zip/git.
- Keep on-device, no network, no new permissions. Preserve "observe over correct, don't judge" tone — no shame, no reward gamification.

## If something breaks
If blocking, timer, alarms, 7-day log, bursts, block list, theme switching, or image features would break, STOP and report. Prior work is committed; stopping mid-way is safe.

---

## TASK A — Ladder session reset (background.js — CORE LOGIC, be careful)

### Problem
The ladder rung is currently chosen by the COUNT of today's overrides for a host (`entries.length`). So a morning escalation carries into an unrelated evening visit. We want the rung to reflect the CURRENT urge episode, while the 60-minute daily cap stays based on the whole day.

### Decision (implement exactly this — do not redesign)
Split two clocks:
- **Daily cap (unchanged):** total `durationMs` of ALL of today's entries for the host still counts toward the 60-minute cap.
- **Ladder rung (new):** only count overrides that belong to the CURRENT session. A new session starts when the gap since the previous override's GRANT END exceeds 15 minutes.

Anchor = previous override's grant end = `entry.startedAt + entry.durationMs`.
RESET_THRESHOLD = 15 minutes (15 * 60 * 1000 ms).

### Algorithm for the ladder rung
Given today's entries for the host, sorted by `startedAt` ascending:
- Walk from the most recent entry backwards. Count how many consecutive entries belong to the same session, where two adjacent entries are in the same session if:
  `nextEntry.startedAt - (prevEntry.startedAt + prevEntry.durationMs) <= RESET_THRESHOLD`
- The number of entries in the current session = `sessionCount`.
- New override's rung index = `min(sessionCount, LADDER_DURATIONS.length - 1)` (same indexing style as the existing code: 0→5min for the first override of a session, then 10/15/20).
- Equivalent simpler framing: if `now - (lastEntry.startedAt + lastEntry.durationMs) > RESET_THRESHOLD`, the session has expired → this is a fresh session → rung index 0 (5 min). Otherwise continue counting back through the session as above.

Important: the FIRST override of a fresh session must grant 5 minutes (index 0). Verify the indexing matches the existing `LADDER_DURATIONS_MS` array (`[5,10,15,20]` minutes) and the existing `getNextDurationInfo` return shape so nothing downstream breaks.

### Daily cap stays as-is
`totalUsedMs` for the cap = sum of `durationMs` across ALL today's entries for the host (NOT just the session). `capReached` when `totalUsedMs >= DAILY_CAP_MS` (60 min). Keep the existing cap behavior and the existing return fields (`durationMs`, `capReached`, `ladderIndex`, `totalUsedMs`) intact.

### Copy (neutral, non-judgmental)
When a fresh session resets the rung to 5 min after a quiet gap, it's fine to surface a neutral line on the block screen if the existing UI has a natural place (e.g. near the duration button). Keep it measurement-toned, e.g. en: "New session — 5 minutes available" / ja: "新しいセッション — 5分許可". Only add this if it fits cleanly with existing elements and i18n; do NOT restructure the block logic to force it. If unsure, skip the copy and just fix the timing logic. If you do add it, add i18n keys to both locales.

### Constraints specific to A
- Modify ONLY `background.js` (and `_locales` if you add the optional copy). Do NOT touch blocked.js.
- Do NOT change what gets WRITTEN to `overrideHistoryByDate` or its structure. `recordOverrideStart` keeps writing `{ startedAt, durationMs }` as today. You only change the READ logic in `getNextDurationInfo` (and any helper it uses) to compute the session-based rung.
- Keep the daily cap exactly as before.

### TASK A verification
- `node -c background.js` → valid.
- Confirm `overrideHistoryByDate` is still written with the same `{ startedAt, durationMs }` shape (grep `recordOverrideStart`, show it's unchanged in what it writes).
- Confirm `LADDER_DURATIONS_MS` / `DAILY_CAP_MS` still exist and cap logic still sums all today's entries.
- Walk through the logic in your report with a concrete example: morning 3 overrides (rung climbs to 15min), then a 30-min gap, then evening override → must be 5 min (fresh session), but daily cap still counts the morning minutes.

---

## TASK B — Bigger image + inline log on the block screen (blocked.html, CSS/markup)

### Goal
The motivation image should be the visual hero (bigger), and the impulse log detail should show inline (one page) instead of hidden behind the collapsed `<details>`, since the layout has too much empty space.

1. **Bigger image:** across all 5 themes, increase the `.cheer` max size so the image has real presence. Current maxes are small (e.g. minimal 200px, calm 280px, bold/zen ~220px). Roughly double the visual weight where it fits the theme (e.g. minimal/zen ~340-380px, calm ~360px, bold keep its grid but enlarge, focus a bit larger). Tune by eye per theme; keep aspect-ratio 1/1 and the existing rounding per theme.
2. **Inline log:** change the impulse log from a collapsed `<details>` to shown inline by default. Simplest: keep the `<details>` element but add the `open` attribute so it's expanded, OR convert to a plain section. EITHER WAY the ids `history-list`, `bursts-list`, `blocked-list` MUST stay exactly, because blocked.js renders into them. Don't remove them.
3. Rebalance spacing so the page fills nicely without big empty gaps. Keep it clean per theme.

### TASK B verification
- All 9 ids still present (run the id loop).
- Confirm `history-list`, `bursts-list`, `blocked-list` are still in the DOM and now visible by default (not behind a collapsed toggle).
- Report the new `.cheer` sizes per theme.

---

## TASK C — Fix F4 image preview in popup (popup.js / popup.html)
The custom-image upload works (saves to `pauseImage`, applies to block screen, reset works), BUT the small preview of the current image in the popup does not appear. Fix it so:
- On popup open, read `pauseImage` from storage; if present, show it in the preview `<img>`; if absent, show the default (`assets/taero_en.png`) or a neutral placeholder.
- After a successful upload, immediately update the preview to the new image.
- After reset, the preview returns to default.
Do NOT change the storage key or the compression logic — only fix the preview rendering. Don't touch existing popup functions (block add / force block / list / theme picker).

### TASK C verification
- Confirm `pauseImage` still the only image key, compression untouched.
- Report what was wrong with the preview and the fix.

---

## TASK D — Popup CSS polish (popup.html)
The popup works but looks rough (plain default buttons). Give it a clean, consistent look at 280px width: tidy button styles, spacing, and the theme swatches / image section so it feels intentional. Keep it lightweight (no external resources, no fonts beyond what's bundled/system). Don't change any logic or ids — CSS/markup only.

### TASK D verification
- Confirm popup button ids unchanged (`block-btn`, `force-block-btn`), theme picker and image section still functional (logic untouched).
- Report the visual changes.

---

## FINAL report
- List every file changed.
- Confirm: no existing storage key renamed; `overrideHistoryByDate` structure & what's written unchanged; only read-logic for ladder rung changed in background.js; blocked.js untouched; all 9 ids intact; i18n parity in both locales; daily cap behavior preserved.
- Run the id loop on blocked.html and report.
- `node -c background.js && node -c popup.js && node -c theme-loader.js` → report.
- Do NOT bump version or run git.
