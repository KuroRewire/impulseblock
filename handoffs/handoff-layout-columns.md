# Handoff: Block screen layout — fit everything in first view (per-theme columns)

ONE task with one goal: restructure `blocked.html` so that on a normal PC screen, the user sees the headline, image, BOTH buttons, and the impulse log WITHOUT scrolling. The current single-column layout pushes the buttons below the fold — that's the core problem to fix. Use multi-column layouts per theme as specified. This is CSS + light markup re-grouping only.

## Project background
ImpulseBlock = published Manifest V3 Chrome extension, 124 users. Block screen `blocked.html` has 5 themes via `body[data-theme]`. `blocked.js` renders runtime data into specific element ids — those ids MUST NOT change. We are only changing LAYOUT (how elements are arranged into columns), not the ids or the logic.

## THE PROBLEM (why we're doing this)
After enlarging the image and showing the log inline, the action buttons (`#btn-yes` "5分だけ許可" / `#btn-no` "やめる") fall below the fold. A block screen is a decision screen — the buttons and the user's own pattern data (the log) must be visible immediately, or the tool fails its purpose. Fix: stop stacking everything vertically; use the horizontal space with per-theme column layouts so it all fits in the first view.

## HARD CONSTRAINTS
- DO NOT change element ids. blocked.js renders into ALL of these — they must stay exactly: `cheer-image`, `current-host`, `blocked-list`, `history-list`, `bursts-list`, `today-count`, `last-opened`, `btn-yes`, `btn-no`.
- DO NOT touch `blocked.js`, `background.js`, `block-core.js`, `popup.js`, `theme-loader.js`, `manifest.json`. This is a `blocked.html` (markup + CSS) task ONLY.
- DO NOT change `data-i18n` keys. If you re-group markup, keep every existing `data-i18n` attribute on its element. Do NOT add or remove i18n keys (no locale changes needed).
- DO NOT change storage keys or any logic.
- DO NOT bump version. DO NOT run git.
- Keep all 5 themes working. Keep the custom pause-image feature working (the image is `#cheer-image`; theme-loader sets its src — don't break that).
- Preserve the "observe over correct, don't judge" tone. No new copy needed.

## Element → meaning map (so you group correctly)
- `.headline` = the question "本当に開きますか?"
- `.domain-chip` containing `#current-host` = "現在ブロック中: <host>"
- `.cheer` containing `#cheer-image` = the motivation image (user-swappable)
- `.actions` containing `#btn-yes` (5min allow) + `#btn-no` (go back) = the decision buttons
- `.stats` containing `#today-count` + `#last-opened` = today's count / last time
- `.details` containing `#history-list` (7-day chart) + `#bursts-list` (recent bursts) + `#blocked-list` (blocked sites with delete buttons) = the log

Note: `.details` is currently `<details open>`. For the new layout you may keep it as `<details open>` or convert it to a plain container, BUT `#history-list`, `#bursts-list`, `#blocked-list` MUST remain present with those exact ids.

## TARGET LAYOUT (per theme)

### Bold & Focus — 2 columns
- LEFT column: `.headline` (at the TOP of the column) → `.cheer` (image) → `.actions` (both buttons, directly under the image)
- RIGHT column: `.domain-chip` (current host) → `.stats` (today count) → `.details` (7-day log + bursts + blocked list)
- The headline must sit at the top of the screen (Bold currently bottom-aligns it via `align-items: end` on `.mid` — change Bold so the headline is at the top, with the image and buttons flowing beneath it).

### Minimal, Calm, Zen — 3 columns
- LEFT column: `.details`'s blocked-sites list (`#blocked-list`) — the block list goes on the left
- CENTER column: `.headline` → `.cheer` (image) → `.actions` (both buttons). This is the decision spine; keep it visually central.
- RIGHT column: `.stats` (today count) → the 7-day chart (`#history-list`) + bursts (`#bursts-list`)

IMPORTANT for the 3-column themes: the log is currently all inside one `.details` block (`#history-list` + `#bursts-list` + `#blocked-list` together). To put `#blocked-list` on the LEFT and the chart/bursts on the RIGHT, you'll need to split where these three ids live in the markup. That's allowed — just keep all three ids present and keep blocked.js's render targets intact. blocked.js looks them up by id (getElementById), so their DOM position can change freely as long as the ids exist.

### All themes
- The decision spine (headline → image → buttons) must be fully visible in the first view, with the buttons clearly above the fold.
- The log (at least 7-day chart + bursts) should also be in the first view.
- Tune image size DOWN if needed so the column fits without scrolling — the earlier "make it big" overshot and pushed buttons off-screen. The image should have presence but not dominate the fold. Buttons visible > image huge.
- Use CSS grid or flex for the columns. Make it degrade gracefully on narrow widths (stack columns) via a max-width media query, but optimize for a typical desktop (≥1100px) first view.
- Keep each theme's existing visual identity (fonts, colors, accents). Only the arrangement changes.

## Verification
- Run the id loop: `for id in cheer-image current-host blocked-list history-list bursts-list today-count last-opened btn-yes btn-no; do grep -q "id=\"$id\"" blocked.html && echo "OK $id" || echo "MISSING $id"; done` — all 9 must be OK.
- Confirm `git diff --quiet HEAD -- blocked.js && echo UNCHANGED` (and same for background.js, popup.js, theme-loader.js, manifest.json) — all UNCHANGED.
- Confirm every `data-i18n` attribute that existed before still exists (no i18n keys dropped): compare counts before/after.
- For EACH of the 5 themes, describe the resulting layout and confirm the buttons (`#btn-yes`/`#btn-no`) and the 7-day log are positioned in the first view (above the fold) at ≥1100px width.
- Note any theme where fitting everything was tight and what you did (e.g. reduced image size to Npx).

## After
Do NOT bump version or run git. The human will reload the unpacked extension, eyeball all 5 themes for "buttons + log visible without scrolling," then iterate or commit.
