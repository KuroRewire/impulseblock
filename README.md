# PD Counter

A Chrome extension (Manifest V3) that helps you manage porn-related impulses.

Built during my 100-day AI coding challenge. No build step—plain HTML, CSS, and JavaScript only.

---

## Features

- **Website blocking** — Block sites by hostname (exact match).
- **Temporary allow (5 minutes)** — Choose “open” on the block page to allow that tab for 5 minutes, then it blocks again.
- **Force re-block overlay** — On temporarily allowed sites, a small overlay lets you re-block immediately.
- **Adult site detection (rule-based)** — Keyword-based detection can suggest adding a site to the block list.
- **7-day impulse log** — View how many times you chose “open” per day, with a simple bar chart.
- **Blocked site management** — Add/remove blocked hosts from the popup or from the block page.

---

## How it works

When you visit a blocked site, the extension redirects you to a block page that shows:

- The 7-day impulse log
- A visual reminder (image)
- Buttons to **open temporarily** (5 min) or **stop** (close tab / go back)

You can also manage the block list and see “currently blocked” info on that page. The extension can detect likely adult pages (rule-based) and offer to add them to the block list.

---

## Install (Developer mode)

1. Clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked**.
5. Select the **`pd-extension`** folder from this repo.

After loading, you’ll see “PD Blocker” in the extensions list. Pin it if you like. If you add or change files under `assets/`, click the extension’s **Reload** on `chrome://extensions` to apply changes.

---

## Project

This project is part of a 100-day AI coding challenge.

---

## Technical note (permissions)

The extension currently uses `host_permissions: ["<all_urls>"]` for the MVP. The goal is to move to a more minimal setup later (e.g. declarativeNetRequest or host-only permissions). Block logic is centralized in `block-core.js` so the implementation can be swapped without changing the rest of the extension.

---

## Disclaimer

Adult detection is **rule-based and experimental**. It may mis-detect. Use the “suggested block” feature only as a hint, and review sites before adding them to your block list.
