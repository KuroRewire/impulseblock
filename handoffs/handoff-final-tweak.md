# Handoff: Final tweak — Calm character position + Zen enso size

Two small positioning tweaks to `blocked.html`. CSS + light markup only. Everything else is final.

## HARD CONSTRAINTS
- DO NOT change element ids: `cheer-image`, `current-host`, `blocked-list`, `history-list`, `bursts-list`, `today-count`, `last-opened`, `btn-yes`, `btn-no`.
- DO NOT touch `blocked.js`, `background.js`, `block-core.js`, `popup.js`, `theme-loader.js`, `manifest.json`, or locale JSON. `blocked.html` ONLY.
- DO NOT change/remove `data-i18n` keys. DO NOT bump version or run git.
- Keep `#cheer-image` + custom-image feature working. Keep all 5 themes working.

## FIX 1 — Calm character: move to between the domain chip and the headline (top center)
Currently the Calm character (`.calm-character`) sits in the center column above `#cheer-image`, which makes the 3-column layout unbalanced (the center column is taller than the side columns).

Move the character to the TOP CENTER, specifically BETWEEN the domain chip ("現在ブロック中: …" / `.domain-chip`) and the headline ("本当に開きますか?" / `.headline`). Target top structure for Calm:
```
        ● 現在ブロック中: <host>     (domain chip, centered, top)
            [character]              (the mascot, here — between chip and headline)
        本当に開きますか?            (headline, centered)
   [blocked list]  [image → buttons]  [log]   (the 3 columns below)
```
- The character moves OUT of the center column and into the centered top area (the same area where the domain chip and headline live, which spans the center / is not inside a side column).
- This removes the extra height from the center column so the 3 columns start at a more balanced level (the center column is now just image → buttons, like before but without the character on top).
- Keep the character's circular crop, the warm `#ffe7d4` background, white ring, soft shadow, and ~104px size. Only its POSITION changes (now between chip and headline, centered).
- Still Calm-only (`display:none` in other themes). Must not take any protected id and must not interfere with `#cheer-image` (which stays in the center column).
- If achieving this requires moving the `.calm-character` element in the markup to sit between the domain-chip element and the headline element in the centered top block, that's fine — just keep it Calm-only via CSS and keep all ids intact.

## FIX 2 — Zen enso: bigger
The Zen enso (`.enso`) is currently 440px and looks good but could be more present. Enlarge it (e.g. ~520–560px) so the brush circle is a more prominent backdrop framing the 300px image. Keep it behind the image (z-index:0 < image's z-index:1) and faint (opacity ~0.10). Re-center as needed so it still frames the image nicely (adjust top if it drifts off-center).

## Verification
- Id loop: all 9 present.
- `git diff --quiet HEAD -- blocked.js background.js block-core.js popup.js theme-loader.js manifest.json _locales/en/messages.json _locales/ja/messages.json` → all unchanged.
- data-i18n count still 13.
- Confirm: (1) Calm character now sits between the domain chip and the headline (top center), and the 3 columns are more height-balanced; (2) Zen enso is bigger and still behind the image.

## After
No version bump, no git. Human reloads and eyeballs Calm + Zen. If good, the layout work is complete and we commit.
