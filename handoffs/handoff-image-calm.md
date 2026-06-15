# Handoff: Image sizing + Calm character

Three small visual refinements to `blocked.html`. CSS + light markup only. The layout is already finalized and good — this only adjusts image sizing and adds a decorative character to the Calm theme.

## HARD CONSTRAINTS
- DO NOT change element ids: `cheer-image`, `current-host`, `blocked-list`, `history-list`, `bursts-list`, `today-count`, `last-opened`, `btn-yes`, `btn-no`. All must stay.
- DO NOT touch `blocked.js`, `background.js`, `block-core.js`, `popup.js`, `theme-loader.js`, `manifest.json`, or the locale JSON files. `blocked.html` ONLY (markup + CSS).
- DO NOT change/remove `data-i18n` keys or add new ones (no new copy needed).
- DO NOT break the custom pause-image feature: `#cheer-image`'s src is set by theme-loader.js; keep `#cheer-image` exactly where it is and working. The Calm character is a SEPARATE decorative element, NOT a replacement for `#cheer-image`.
- Keep all 5 themes working. DO NOT bump version or run git.
- Keep buttons (`#btn-yes`/`#btn-no`) and the 7-day log in the first view at ≥1100px for all themes.

## TASK 1 — Enlarge the image across all themes
The motivation image (`.cheer` / `#cheer-image`) is the visual hero and can be bigger. Increase the per-theme `.cheer` max size another step up (the user explicitly wants it bigger), while keeping the buttons and 7-day log above the fold. Current approx sizes: bold 240, focus 280, minimal/calm/zen smaller. Bump them meaningfully (e.g. +20–40%) and tune by eye so nothing pushes the buttons below the fold at ≥1100px. The image should feel like the centerpiece.

## TASK 2 — Calm theme: add the character above the image
Calm currently shows only `#cheer-image` and feels empty without its mascot. Add the Calm character as a decorative element ABOVE the `#cheer-image` (in the center column / decision spine), visible ONLY in the Calm theme.

- The asset is at `assets/calm-character.png` (an orange meditation mascot). It is already in the repo.
- Add a new element (e.g. `<img class="calm-character" src="assets/calm-character.png" alt="">`) in the markup, placed above `.cheer` in the center spine. Use a Calm-only selector so it is `display: none` in all other themes and only shows for `body[data-theme="calm"]`.
- IMPORTANT — the character PNG is NOT transparent (it has a solid/RGB background). To avoid an ugly square box on Calm's warm gradient: put the character in a rounded container (e.g. `border-radius: 50%` for a circular crop, or a rounded-rect with the same treatment as `.cheer`), so the square background is hidden. A circular crop usually looks best for a mascot. Size it tastefully (smaller than the main image — it's an accent, e.g. 80–120px), centered above the image.
- Keep `#cheer-image` below it, fully working (so the user's custom image still shows in Calm too). Result: Calm shows character (accent) on top, then the motivation/custom image, then buttons.
- This element must NOT have any of the protected ids and must NOT interfere with `#cheer-image`.

## TASK 3 — Zen theme: bigger, more prominent image
In Zen, the image is currently small and gets visually lost against the enso background. Make the Zen `.cheer` image notably BIGGER and ensure it sits clearly in FRONT of the enso (higher z-index than the `.enso` element, which is a faint background at opacity 0.10). The image should be the clear focal point; the enso stays a subtle backdrop behind it. Tune size so it's prominent but buttons/log stay in first view.

## Verification
- Id loop: all 9 present.
- `git diff --quiet HEAD -- blocked.js background.js block-core.js popup.js theme-loader.js manifest.json _locales/en/messages.json _locales/ja/messages.json` → all unchanged (only blocked.html changes).
- data-i18n key count unchanged (still 13).
- Confirm `#cheer-image` is intact and the new `.calm-character` is a separate element shown only in Calm, with a rounded/circular crop to hide its non-transparent background.
- Report per-theme image sizes and confirm buttons + 7-day log remain in first view at ≥1100px.

## After
No version bump, no git. Human reloads and eyeballs all 5 themes (especially Calm's character crop and Zen's enlarged image over the enso).
