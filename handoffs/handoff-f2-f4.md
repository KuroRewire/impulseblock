# Handoff F2-F4 + Polish: theme picker, custom image, details, Japanese fixes

You will implement four things in one session: F2 (details polish), F3 (popup theme picker), F4 (custom pause image), and small polish fixes. Work through them in order. After EACH phase, run its verification and report before moving on. If any verification fails or you would need to break a hard constraint, STOP and report instead of proceeding.

## Project background
ImpulseBlock is a published Manifest V3 Chrome extension with 124 existing users. The block screen (`blocked.html`) now has 5 themes (bold/focus/calm/minimal/zen) driven by `body[data-theme]`, set by `theme-loader.js` which reads `chrome.storage.local` key `blockTheme` (default `minimal`). Fonts are bundled locally in `assets/fonts/`. F1 (themes) is already committed.

## HARD CONSTRAINTS — applies to ALL phases (DO NOT VIOLATE)
- NEVER change or rename existing storage keys: `blockedHosts`, `openCountByDate`, `lastOpenedAt`, `tempAllowedHosts`, `overrideHistoryByDate`. These hold 124 users' data.
- You MAY add ONLY these new keys: `blockTheme` (already used), `pauseImage` (new, for F4).
- NEVER change element ids that `blocked.js` reads: `cheer-image`, `current-host`, `blocked-list`, `history-list`, `bursts-list`, `today-count`, `last-opened`, `btn-yes`, `btn-no`.
- NEVER change `data-i18n` keys or remove them. If you add new UI text, add new `data-i18n` keys AND add their values to BOTH `_locales/en/messages.json` and `_locales/ja/messages.json`.
- DO NOT touch `background.js`, `block-core.js`, or the block/timer/alarm logic.
- DO NOT modify the existing logic in `blocked.js` or `popup.js` — only ADD to them. Existing functions (block add, force block, list render, 7-day render, bursts) must keep working.
- DO NOT bump the version number. DO NOT run any git commands. The human handles versioning, zipping, and git.
- Keep everything local/on-device. No network calls, no external resources, no new permissions in manifest.json.
- Preserve the privacy-first philosophy: no shame language, no streak pressure.

## If something breaks
If at any point an existing feature (blocking, timer, 7-day log, bursts, block list, theme switching) would break, STOP immediately and report what happened. Do not try to "fix" existing logic — the human will review. The whole F1 work is already committed, so it's fine to stop mid-way.

---

## PHASE F2 — Details & layout polish (small)
Goal: tidy the block screen.
1. In `blocked.html`, the `<details>` ("View details" / 衝動ログ) currently sits between the insight line and the action buttons in a slightly cramped spot. Give it more breathing room: add vertical spacing so it doesn't crowd the buttons. Keep it collapsed by default.
2. Minimal theme: the gap between the `<details>` summary and the action buttons is tight — add spacing.
3. Do NOT change what's inside details (history-list / bursts-list / blocked-list must stay).

### F2 verification
- `grep -c 'id="history-list"\|id="bursts-list"\|id="blocked-list"' blocked.html` → still present.
- Report the spacing changes made.

---

## PHASE F3 — Popup theme picker (main feature)
Goal: let users pick the block-screen theme from the popup. This is what makes the 5 themes usable.

Current `popup.html` / `popup.js` have: block-this-site button, force-block button, blocked-sites list. KEEP all of that working. ADD a theme picker section below the existing controls.

1. In `popup.html`, add a "Theme" section (new `data-i18n` label, e.g. `popup_theme_label`). Render 5 selectable theme options: bold / focus / calm / minimal / zen. Each option should be a small clickable swatch/button showing the theme name (a tiny color preview is a plus but not required — keep it lightweight; the popup is only 280px wide).
2. In `popup.js`, ADD logic (do not touch existing functions):
   - On popup open, read `chrome.storage.local.get('blockTheme')` and highlight the currently selected theme (default `minimal`).
   - On clicking a theme option, `chrome.storage.local.set({ blockTheme: <name> })` and update the highlight.
   - Because `theme-loader.js` already has a `chrome.storage.onChanged` listener, any open blocked tab updates live — no extra wiring needed.
3. Add the new label text to BOTH `_locales/en/messages.json` and `_locales/ja/messages.json` (e.g. en: "Block screen theme", ja: "ブロック画面のテーマ"). Theme names (Bold/Focus/Calm/Minimal/Zen) can stay as-is in English or add i18n if easy.
4. Keep the popup visually clean and consistent with its current simple style. Don't over-design; 280px wide.

### F3 verification
- Confirm existing popup ids/buttons still present (`block-btn`, `force-block-btn`, `blocked-list`).
- Confirm `blockTheme` is the only storage key written by the picker.
- Confirm new label keys exist in both locale files.
- Report: load the extension, open the popup, click each theme, and confirm a blocked tab reflects the change (if you can't load it, report static checks).

---

## PHASE F4 — Custom pause image (the ❸ feature)
Goal: let users replace the center motivation image on the block screen with their own. Default stays the existing `assets/taero_en.png`.

Design decisions (FOLLOW THESE — do not redesign):
- Store the user image in `chrome.storage.local` under key `pauseImage` as a base64 data URL string.
- Enforce a size cap: before saving, downscale the image so its longest side is <= 800px and re-encode (canvas.toDataURL, JPEG quality ~0.85). This keeps it well under chrome.storage.local limits. If after compression it's still > ~1MB, reject with a friendly message asking for a smaller image.
- The upload UI goes in the POPUP (operations belong in popup, per the design split). Add an "Pause image" section with: a file input (accept image/*), a small preview of the current image, and a "Reset to default" button.
- On `blocked.html`: `blocked.js` sets `#cheer-image`'s src. DO NOT modify blocked.js. Instead, in `theme-loader.js` (or a small new script loaded by blocked.html BEFORE blocked.js), after DOM ready, read `pauseImage` from storage; if present, set `document.getElementById('cheer-image').src = <dataURL>`. If absent, leave the default. Make sure this runs without racing blocked.js — simplest: do it in `theme-loader.js` inside a DOMContentLoaded handler, and also re-apply on `chrome.storage.onChanged` for `pauseImage` so live preview works.
- Compression/resize must happen in the popup (where the file is selected), using an offscreen canvas, NOT in a service worker.

New i18n keys (add to both locales): e.g. `popup_image_label` ("Pause image" / "停止画面の画像"), `popup_image_reset` ("Reset to default" / "デフォルトに戻す"), `popup_image_too_large` ("Image too large, please pick a smaller one" / "画像が大きすぎます。小さいものを選んでください").

### F4 verification
- Confirm `pauseImage` is the only new storage key (besides blockTheme).
- Confirm blocked.js was NOT modified (the image is applied from theme-loader.js / new script, not by editing blocked.js).
- Confirm the resize/compress happens in popup context.
- Report: upload an image, open a blocked tab, confirm it shows; click reset, confirm default returns.

---

## PHASE POLISH — Japanese headline & buttons
The themes were designed for English copy; Japanese text overflows in some themes.
1. Bold theme: the Japanese headline (「本当に開きますか?」) is too large/tall. Reduce the `clamp()` max for the bold headline so long Japanese fits without dominating the whole screen (e.g. lower the max from 150px to ~96px, tune by eye). Keep English still looking bold.
2. Bold buttons: "5分だけ許可" wraps to two lines. Prevent awkward wrapping (e.g. `white-space: nowrap` with smaller font, or allow it but make it clean). 
3. Quick pass on focus/calm/zen for any obvious Japanese overflow; fix only clear breakage, don't over-tune.

### POLISH verification
- Report the clamp/value changes.

---

## FINAL report (after all phases)
- List every file changed.
- Confirm: no existing storage key renamed; only `blockTheme` + `pauseImage` added; blocked.js & background.js & block-core.js untouched (or for blocked.js, confirm only ADDITIONS if any — ideally none); all 9 element ids intact; new i18n keys in both locales.
- Run: `for id in cheer-image current-host blocked-list history-list bursts-list today-count last-opened btn-yes btn-no; do grep -q "id=\"$id\"" blocked.html && echo "OK $id" || echo "MISSING $id"; done`
- Do NOT bump version or run git. Stop and let the human verify, test, and commit.
