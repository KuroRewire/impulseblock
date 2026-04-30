# ImpulseBlock

Pause before distracting sites, track overrides, and regain control — privately, on-device.

**No account. No cloud sync. All local. Open source.**

A Chrome extension (Manifest V3) that puts a deliberate pause between you and the sites that pull you off task. Everything stays in your browser — there is no backend, no telemetry, no sign-in.

Built with no build step — plain HTML, CSS, and JavaScript.

---

## Features

- **Block any site** — Add a hostname to your block list and ImpulseBlock redirects it to a mindful pause page.
- **Mindful pause** — Before opening a blocked site, you see a confirmation page that asks if you really want to go there.
- **5-minute temporary allow** — Choose "open" on the pause page to allow that tab for 5 minutes, then it blocks again. (Hard expiry — coming soon.)
- **7-day override log** — See how many times you chose "open" each day, with a simple bar chart. Self-awareness over willpower.
- **Quick re-block overlay** — On a temporarily allowed page, a small overlay lets you re-block immediately when the urge passes.
- **Open source** — Read the code, audit the behavior, fork it.

---

## Privacy

- All data lives in `chrome.storage.local` on your device.
- No analytics, no remote servers, no third-party requests.
- No account or sign-in.
- The block list and override log never leave your browser.

---

## How it works

When you visit a site on your block list, ImpulseBlock redirects the tab to a pause page that shows:

- The 7-day override log
- A visual reminder
- Buttons to **open temporarily** (5 min) or **stay focused** (close tab / go back)

You can manage the block list and see "currently blocking" info from that page or from the toolbar popup.

---

## Install (Developer mode)

1. Clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the **`pd-extension`** folder from this repo.

After loading, you will see "ImpulseBlock" in the extensions list. Pin it if you like. If you change files under `assets/`, click the extension's **Reload** on `chrome://extensions` to apply changes.

Repository: https://github.com/KuroRewire/impulseblock

---

## Technical note (permissions)

The extension currently uses `host_permissions: ["<all_urls>"]` for the MVP. The goal is to move to a more minimal setup later (e.g. declarativeNetRequest or host-only permissions). Block logic is centralized in `block-core.js` so the implementation can be swapped without changing the rest of the extension.
