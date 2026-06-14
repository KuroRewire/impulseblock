# Privacy Policy for ImpulseBlock

_Last updated: June 14, 2026_

ImpulseBlock is a browser extension that helps you block distracting websites, pause before visiting them, and review your recent override activity. Your privacy is central to how it works.

## Summary

ImpulseBlock stores all data **locally on your device**. It does not create accounts, does not send your data to any server, does not use analytics, and does not share or sell data to anyone.

## What ImpulseBlock accesses

**Domain / URL of pages you visit**
ImpulseBlock checks the domain or URL of a page you attempt to open **only** to determine whether it matches a site on your blocklist, and to show the pause or re-block screen on that site. This check happens locally. ImpulseBlock does not store your full browsing history.

**Your blocklist**
The websites you choose to block are saved locally in `chrome.storage.local`.

**Override history**
When you choose to keep a site blocked, start a timed access window, or re-block, ImpulseBlock records that choice locally. Each record may include the date, time, domain, choice type, and timed access duration. This history is used to display your recent (last 7 days) override activity. Records older than 7 days are automatically deleted.

## What ImpulseBlock does NOT do

- It does **not** read page text, images, form contents, messages, passwords, or cookies.
- It does **not** collect personally identifiable information (name, email, account IDs).
- It does **not** send your blocklist or override history to any server.
- It does **not** use third-party analytics or tracking.
- It does **not** sell or share your data with third parties.
- It does **not** use your data to determine creditworthiness or for lending purposes.

## Data storage and retention

All data is stored locally in your browser using `chrome.storage.local`. Override history older than 7 days is automatically removed. You can clear all data at any time by removing the extension or clearing its storage from your browser settings.

## Permissions

ImpulseBlock requests the minimum permissions needed to function:

- **storage** — to save your blocklist, timed access state, and local override log on your device.
- **tabs** — to identify the active tab and domain for blocking, timed access, and re-blocking.
- **webNavigation** — to detect navigation to a blocked site and show the pause screen.
- **alarms** — to automatically re-block a site when its timed access window expires.
- **host permissions** — to detect when you visit a site on your blocklist and show the pause or re-block experience on that site.

## Open source

ImpulseBlock is open source. You can review the full code at:
https://github.com/KuroRewire/impulseblock

## Contact

For questions about this privacy policy, please open an issue at:
https://github.com/KuroRewire/impulseblock/issues
