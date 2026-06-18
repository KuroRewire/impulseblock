# Privacy Policy for ImpulseBlock

_Last updated: June 19, 2026_

ImpulseBlock is a browser extension that helps you block distracting websites, pause before visiting them, and review your recent override activity. Your privacy is central to how it works.

## Summary

ImpulseBlock stores all of your blocking data **locally on your device**. It does not create accounts for its core features, does not send your blocklist or override history to any server, does not use analytics, and does not sell data to anyone. An optional one-time Pro upgrade is processed by a third-party payment provider (see "Optional Pro upgrade" below).

## What ImpulseBlock accesses

**Domain / URL of pages you visit**
ImpulseBlock checks the domain or URL of a page you attempt to open **only** to determine whether it matches a site on your blocklist, and to show the pause or re-block screen on that site. This check happens locally. ImpulseBlock does not store your full browsing history.

**Your blocklist**
The websites you choose to block are saved locally in chrome.storage.local.

**Override history**
When you choose to keep a site blocked, start a timed access window, or re-block, ImpulseBlock records that choice locally. Each record may include the date, time, domain, choice type, and timed access duration. This history is used to display your recent (last 7 days) override activity. Records older than 7 days are automatically deleted.

## Optional Pro upgrade

ImpulseBlock offers an optional one-time Pro upgrade that unlocks additional features (such as blocking more than five sites). Payments are processed by **ExtensionPay**, a third-party service that uses **Stripe** for payment processing.

- When you choose to upgrade, your email address and payment details are collected and handled by **ExtensionPay and Stripe**, not by ImpulseBlock. ExtensionPay and Stripe process this information according to their respective privacy policies. You can review Stripe's policy at https://stripe.com/privacy.
- ImpulseBlock only receives your **payment status** (for example, paid or unpaid) in order to unlock Pro features.
- Your blocklist, override history, and browsing activity are **never** sent to ExtensionPay, Stripe, or any other server during payment or at any other time.
- The Pro upgrade is entirely optional. If you never upgrade, no email or payment information is ever collected.

## What ImpulseBlock does NOT do

- It does **not** read page text, images, form contents, messages, passwords, or cookies.
- It does **not** send your blocklist or override history to any server.
- It does **not** use third-party analytics or tracking.
- It does **not** sell or share your data with third parties.
- It does **not** use your data to determine creditworthiness or for lending purposes.

## Data storage and retention

All of your blocking data (blocklist, timed access state, override log) is stored locally in your browser using chrome.storage.local. Override history older than 7 days is automatically removed. You can clear all data at any time by removing the extension or clearing its storage from your browser settings. Payment records are held by ExtensionPay/Stripe, not by ImpulseBlock.

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
