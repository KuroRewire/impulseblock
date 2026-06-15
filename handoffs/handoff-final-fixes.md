# Handoff: Final 2 layout fixes (Calm character bg + Zen enso)

Two small fixes to `blocked.html`. CSS only (likely). The layout is otherwise final and approved.

## HARD CONSTRAINTS
- DO NOT change element ids: `cheer-image`, `current-host`, `blocked-list`, `history-list`, `bursts-list`, `today-count`, `last-opened`, `btn-yes`, `btn-no`.
- DO NOT touch `blocked.js`, `background.js`, `block-core.js`, `popup.js`, `theme-loader.js`, `manifest.json`, or locale JSON. `blocked.html` ONLY.
- DO NOT change/remove `data-i18n` keys. DO NOT bump version or run git.
- Keep `#cheer-image` and the custom-image feature working. Keep all 5 themes working.

## FIX 1 — Calm character: kill the checkerboard
The Calm character (`.calm-character`, `assets/calm-character.png`) shows a checkerboard (transparency) pattern inside its circular crop. The PNG actually HAS transparency (earlier assumption that it was opaque RGB was wrong) — so the circle's current white/transparent background is letting the checkerboard show through the character's transparent areas.

Fix: give `.calm-character`'s circular container a SOLID background color that fits Calm's warm palette (e.g. a soft cream/peach tint consistent with Calm's gradient background — something like a light warm tone), so the character's transparent regions show that color instead of a checkerboard. The character should sit on a clean, warm-tinted circle that blends with Calm's aesthetic. Keep the circular crop, the soft shadow, and the ~104px accent size. Just ensure the background behind the transparent PNG is a solid pleasant color (not transparent, not stark white if that clashes — match Calm's warmth).

## FIX 2 — Zen: restore the enso
The Zen enso (`.enso`, `assets/enso.png`, the faint sumi-e brush circle background) has disappeared after the Zen image was enlarged to 300px and given z-index:1. The enlarged image now covers/hides the enso, or the stacking/positioning changed so the enso is no longer visible.

Fix: make the enso visible again as a subtle backdrop in the Zen theme. The enso should sit BEHIND the image (lower z-index) but still be VISIBLE — e.g. larger than the image so it peeks around it, or positioned so it frames the image rather than being fully hidden behind it. Keep it faint (opacity ~0.10) and decorative. The image stays the focal point in front; the enso returns as the soft brush-circle atmosphere behind/around it. Adjust the enso's size and/or position (e.g. make it bigger than the 300px image, centered behind it) so it's clearly present again, as it was before the image enlargement.

## Verification
- Id loop: all 9 present.
- `git diff --quiet HEAD -- blocked.js background.js block-core.js popup.js theme-loader.js manifest.json _locales/en/messages.json _locales/ja/messages.json` → all unchanged.
- data-i18n count still 13.
- Confirm: (1) Calm character circle has a solid warm background (no checkerboard possible); (2) Zen enso is visible again behind/around the enlarged image.

## After
No version bump, no git. Human reloads and eyeballs Calm + Zen. If good, this completes the layout work and we commit.
