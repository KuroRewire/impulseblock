# Android physical-validation session — evidence log

Branch: `validation/android-physical` (from `cf2b7d7`).
Status: **COMPLETED** — enforcement validated on a physical device; two
defects found and fixed; Android build green.

## Device

- **Google Pixel 10 Pro** (`blazer`), **Android 16 (API 36)**, locale ja-JP
- **Chrome** 150.0.7871.181
- **Application ID:** `com.impulseblock.mobile`
- Starting APK SHA-256 (commit `cf2b7d7`):
  `f66ea6e9f11506a6727436a1e6acb0adc3fa5542b8729eb8d2a45c24ec951983` (verified
  matched the expected checksum before changes).
- Final validated debug APK SHA-256:
  `0904786ec1c8238eff84c081f562e0ab4c172c9be63a2ecc1cb9de2ff623d755`
  (9,737,529 bytes) after the validation fixes.

## What was confirmed on device (PASS)

Onboarding disclosure + consent gate; accessibility service enable → bind →
Home "on" (ON_RESUME refresh); YouTube app block with the calm overlay (exact
copy) and dimmed, non-interactive app behind it; "Not now" → launcher;
"Continue intentionally" → 5/15-min chooser; 5-minute allowance usable with the
full interval honored; re-block after expiry; Chrome `example.com` block
(reads Chrome 150 `url_bar`; decision `BlockSite`); no false positives
(wikipedia.org and a Google search containing "example.com" both `None`);
critical-system exclusions (Settings, Dialer, launcher all `None`, reachable);
force-stop / reinstall resilience; master toggle; empty selection.

## Privacy check (on-device storage)

`run-as … cat files/datastore/impulseblock_state.preferences_pb` contained
**only** `blocked_packages_json`, `temp_allowed_packages_json`,
`blocked_domains_json:["example.com"]` and setup flags — **no visited URLs and
no browsing history** (none of the sites browsed during testing were stored).

## Defects found and fixed this run

1. **Restart-while-foreground re-block gap** — service now seeds the foreground
   package on connect (`seedForegroundPackage()`), so a restarted service
   re-blocks an already-open app immediately.
2. **Verbose logging** — all diagnostics gated behind `BuildConfig.DEBUG`
   (release silent); logs never contained URLs/hostnames.
3. **CJK IME composition** — domain field switched to `KeyboardType.Uri`;
   residual behavior documented in KNOWN_LIMITATIONS.md.

## Evidence

Curated screenshots `01`–`34` in this directory; sanitized decision-log
excerpt in `decision-log-excerpt.txt`. Full annotated checklist with PASS /
NOT TESTED markers: `docs/mobile/PHYSICAL_TEST_ANDROID.md`.
