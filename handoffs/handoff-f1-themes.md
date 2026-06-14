# Handoff F1: Themed block screen — integrate + localize fonts

## Goal
Apply the new 5-theme block screen (Bold / Focus / Calm / Minimal / Zen) to the extension. The new `blocked.html` and `theme-loader.js` are already written and placed by the human. Your job: localize the fonts (CDN → bundled), wire `theme-loader.js` into the manifest if needed, compress the theme images, and verify nothing in the existing block logic broke.

## Context
- ImpulseBlock is a published Chrome extension (Manifest V3) with 124 existing users. DO NOT break existing storage keys or the block logic in `blocked.js`.
- The new `blocked.html` keeps EVERY element id that `blocked.js` reads. Confirm this — see the verification step.
- Default theme is `minimal` (set on `<body data-theme="minimal">`). `theme-loader.js` overrides it from `chrome.storage.local` key `blockTheme`.

## Hard constraints (DO NOT VIOLATE)
- DO NOT rename or remove these element ids (blocked.js depends on them): `cheer-image`, `current-host`, `blocked-list`, `history-list`, `bursts-list`, `today-count`, `last-opened`, `btn-yes`, `btn-no`.
- DO NOT change any `data-i18n` keys.
- DO NOT touch `blocked.js`, `background.js`, `block-core.js`, `popup.js`, `_locales`, or any storage key.
- DO NOT modify the existing version number or run git commands. The human handles versioning/zipping/git.
- Only work on: `blocked.html` (already replaced by human), `theme-loader.js` (already added by human), a new `assets/fonts/` directory, `manifest.json` (only if a script reference is needed), and image compression in `assets/`.

## Files the human has already placed
- `blocked.html` — REPLACED with the new themed version (human backed up the old one).
- `theme-loader.js` — NEW file, reads `blockTheme` from storage and sets `body[data-theme]`.
- `assets/enso.png` — transparent enso brush image (referenced by Zen theme).
- `assets/calm-character.png` — transparent Calm mascot (not yet wired into blocked.html; leave for F-later, just keep the file).

## TASK 1 — Localize Google Fonts (main task)
The new `blocked.html` currently loads fonts from `fonts.googleapis.com` via `<link>` tags (lines ~7-9). Manifest V3 extension pages have a strict CSP that blocks external font/style loading, so these fonts will NOT load when running as an installed extension. Convert to locally bundled fonts.

Fonts used across the 5 themes (only the weights actually referenced):
- Archivo (400, 700, 800)
- Archivo Narrow (800)
- Space Grotesk (400, 500)
- JetBrains Mono (400, 700)
- Fraunces (400 italic, 500) — note: italic is used in Zen
- Inter (400, 500, 600, 700)
- Nunito (700, 800)

Steps:
1. Create `assets/fonts/`.
2. Download the required woff2 files for the weights/styles above (from the Google Fonts files, e.g. via the gstatic woff2 URLs in the CSS the link returns, or fontsource). Save them into `assets/fonts/` with clear names like `archivo-narrow-800.woff2`.
3. Remove the three `<link>` tags (preconnect + stylesheet) from the `<head>` of `blocked.html`.
4. Add a `<style>` block (or top of existing `<style>`) with `@font-face` rules pointing to the local files, e.g.:
   ```css
   @font-face {
     font-family: 'Archivo Narrow';
     font-style: normal;
     font-weight: 800;
     font-display: swap;
     src: url('assets/fonts/archivo-narrow-800.woff2') format('woff2');
   }
   ```
   Do this for every font/weight/style listed above. For Fraunces include the italic face (`font-style: italic`).
5. Keep the existing `font-family` CSS declarations in the themes unchanged — they reference the same family names, so once the @font-face rules exist locally, they resolve.

If a font weight is hard to obtain, fall back gracefully (the CSS already has fallbacks like `sans-serif`, `serif`, `monospace`), but prefer getting the real woff2.

## TASK 2 — Compress theme images
`assets/enso.png` (~1.5MB) and `assets/calm-character.png` (~890KB) are full-size 1254px. Resize each to ~500px wide (preserving aspect ratio and transparency) and re-save to cut file size to roughly 100-300KB each. Keep the same filenames. Use a tool like `sips` (macOS built-in) or Pillow.
- `sips --resampleWidth 500 assets/enso.png` (macOS) works, but verify transparency is preserved (PNG with alpha).

## TASK 3 — Manifest check
`blocked.html` loads scripts in this order: `block-core.js`, `theme-loader.js`, `blocked-i18n.js`, `blocked.js`. These are local script files referenced from the HTML, so no manifest change is usually needed. Confirm `theme-loader.js` loads (no CSP issue — it's a local file). If `blocked.html` is registered anywhere in `manifest.json` (e.g. web_accessible_resources), confirm the new file is still covered. Do NOT add remote permissions.

## VERIFICATION (run and report)
1. Confirm all required ids still exist in blocked.html:
   ```
   for id in cheer-image current-host blocked-list history-list bursts-list today-count last-opened btn-yes btn-no; do grep -q "id=\"$id\"" blocked.html && echo "OK $id" || echo "MISSING $id"; done
   ```
   All must be OK.
2. Confirm no `fonts.googleapis` / `fonts.gstatic` references remain in blocked.html.
3. Confirm `assets/fonts/` contains the woff2 files.
4. Report compressed sizes of enso.png and calm-character.png.
5. Load the extension locally (chrome://extensions, reload) and trigger a blocked page; confirm: text renders with correct fonts, the block buttons work (btn-yes / btn-no), the 7-day history / bursts / blocked list still populate under "View details". Theme defaults to minimal. (If you can't load it, just report the static checks.)

## After
- Report what changed. Do not bump version or run git — human will handle that, then re-zip and update CWS later.
