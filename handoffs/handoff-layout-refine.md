# Handoff: Block screen layout refinement (round 2)

Refine the existing per-theme column layout in `blocked.html`. The columns already exist (Bold/Focus = 2-col, Minimal/Calm/Zen = 3-col) and buttons/log are in the first view. This round fixes placement, spacing, image size, headline wrapping, and Bold button visibility. CSS + light markup only.

## HARD CONSTRAINTS (unchanged from before)
- DO NOT change element ids: `cheer-image`, `current-host`, `blocked-list`, `history-list`, `bursts-list`, `today-count`, `last-opened`, `btn-yes`, `btn-no`. All must stay.
- DO NOT touch `blocked.js`, `background.js`, `block-core.js`, `popup.js`, `theme-loader.js`, `manifest.json`. `blocked.html` ONLY.
- DO NOT change/remove `data-i18n` keys or their values in the locale files. (Headline line-break handled in markup/CSS — see TASK 4 — without editing locale JSON.)
- DO NOT change storage keys or logic. DO NOT bump version. DO NOT run git.
- Keep all 5 themes working and keep custom pause-image working (`#cheer-image` src is set by theme-loader.js).
- Keep each theme's visual identity (fonts/colors). Only arrangement/sizing/spacing changes.

## TASK 1 — 3-column themes (Minimal, Calm, Zen): top spacing + centered top
Currently the left column (block list) and right column (log) start at the very top of the page, level with nothing meaningful. Change so the TOP of the screen is minimal and centered:

Target structure (conceptually):
```
                 ● 現在ブロック中: <host>        ← centered, alone at top
                 本当に開きますか?                ← centered headline, alone

[block list]        [image]         [stats]      ← 3 columns START here,
 www.example...     [buttons]        7-day log      vertically aligned with
   ...                                bursts         the IMAGE's top edge
```
- The host chip (`.domain-chip` / `#current-host`) and the headline (`.headline`) sit at the top, CENTERED, spanning the center (not pushed into a side column).
- The three columns (left = `#blocked-list`, center = image + buttons, right = `.stats` + `#history-list` + `#bursts-list`) begin LOWER — their top edge should line up with the top of the image (`.cheer`), not with the headline. Add top spacing to the left and right columns so they start at the image's vertical position.
- Net effect: a calm, centered top (just the message + blocked domain), then the 3 columns begin together at the image line.

## TASK 2 — 3-column themes: headline on ONE line
The headline "本当に開きますか?" currently wraps to 2 lines in Minimal/Calm/Zen (e.g. "本当に開きま / すか?"). Make it fit on ONE line in these three themes — reduce font-size and/or set `white-space: nowrap` / widen the headline area as needed. It must read as a single line at ≥1100px width.

## TASK 3 — 2-column themes (Bold, Focus): bigger image + bottom-aligned buttons
- LEFT column is headline → image → buttons. RIGHT column is host → stats → log → block list. The RIGHT column is taller, leaving empty space under the LEFT buttons.
- Make the image (`.cheer`) BIGGER to use that space, and align the BUTTONS (`.actions`) to the BOTTOM of the left column so they line up with the bottom of the right column's block list. Use flex on the left column: headline and image at top, image grows, buttons pinned to bottom (e.g. `margin-top: auto` on `.actions`, left column `display:flex; flex-direction:column`). Increase image size to fill the freed vertical space (bump the per-theme `.cheer` max — e.g. bold/focus from ~170-180px up to whatever fills the column nicely, tune by eye).
- Goal: image has strong presence; buttons sit at the bottom edge aligned with the right column's end; no awkward empty gap.

## TASK 4 — Bold headline explicit line break + bigger
Bold's headline "本当に開きますか?" currently wraps at an ugly point ("本当に開きます / か?"). Make Bold break deliberately as:
```
本当に
開きますか?
```
Approach that does NOT touch locale JSON: in the headline element, the text comes from `data-i18n`. To control the break without editing the locale, use CSS on the bold headline — e.g. set a `max-width`/`width` on `.headline` so it breaks between "本当に" and "開きますか?", OR use `word-break`/line-box width tuning. If CSS-only control of the exact break point is unreliable, an acceptable alternative is to wrap the headline so the i18n value still populates but a styled break is forced (without changing the i18n string itself). Prefer the simplest robust method. The other themes are unaffected (Bold-specific selector). Keep Bold's headline large/impactful.

## TASK 5 — Bold buttons: colored by default (not hover-only)
Bold's buttons currently look like plain bordered text and only get color on hover, so they don't read as buttons. Give them a default filled/colored style (consistent with Bold's palette — the editorial black/red), so they're clearly tappable at rest. Keep a hover state but the resting state must look like a button. (`#btn-yes` and `#btn-no` in Bold.)

## General
- Buttons (`#btn-yes`/`#btn-no`) and the 7-day log must remain in the first view (≥1100px) for all themes.
- Image is the visual hero — bigger is good as long as buttons stay above the fold.
- Graceful stacking on narrow widths (<960px) should still work.

## Verification
- Id loop: all 9 present.
- `git diff --quiet HEAD -- blocked.js background.js block-core.js popup.js theme-loader.js manifest.json` → all unchanged (only blocked.html changes).
- data-i18n keys: count unchanged, locale JSON files untouched (`git diff --quiet HEAD -- _locales/en/messages.json _locales/ja/messages.json` → unchanged).
- Per theme, confirm: (1) headline on one line for Minimal/Calm/Zen; (2) Bold headline breaks as 本当に / 開きますか?; (3) 3-col themes have centered minimal top with columns starting at image line; (4) 2-col themes have bigger image with bottom-aligned buttons; (5) Bold buttons colored at rest; (6) buttons + log in first view.

## After
No version bump, no git. Human reloads and eyeballs all 5 themes.
