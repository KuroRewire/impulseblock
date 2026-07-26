# Google Play — Accessibility API disclosure (prepared text)

Google Play requires apps that use AccessibilityService for
non-accessibility purposes to (1) show a prominent in-app disclosure and get
affirmative consent before requesting the permission, and (2) declare the
usage in Play Console. Both are prepared below.

## 1. In-app prominent disclosure (already implemented)

Shown on first launch, before the user is sent to accessibility settings
(`OnboardingScreen` in `mobile/android/.../ui/Screens.kt`); consent is stored
and required. Text used:

> **Accessibility access — what and why**
> To pause the apps and sites you select, ImpulseBlock needs Android's
> accessibility permission. With it, ImpulseBlock:
> • Observes which app is currently on screen, to check whether you chose to pause it.
> • In Chrome, reads only the visible address-bar text to match it against the domains you added.
> • Shows a full-screen pause over blocked apps and sites.
> Everything is processed on this device. ImpulseBlock stores no browsing
> history, never records the URLs you visit, has no internet permission, and
> uploads nothing. Accessibility access is used only for the blocking you
> configure.

The accessibility service's system-settings description
(`accessibility_service_config.xml`) carries the same explanation.

## 2. Play Console — Accessibility API declaration (paste-ready)

**Is your app's use of AccessibilityService designed to help people with
disabilities?** No — declared as follows:

> ImpulseBlock is a digital-wellbeing / self-control app. The user explicitly
> selects apps and website domains they want paused. The AccessibilityService
> is used solely to (a) detect which application is in the foreground so the
> user's own selection can be enforced, (b) read the visible browser
> address-bar text in Google Chrome only to compare the domain against the
> user's locally stored blocklist, and (c) display a full-screen pause overlay
> (TYPE_ACCESSIBILITY_OVERLAY). All processing is on-device. The app has no
> INTERNET permission and cannot transmit any data. No browsing history, URLs,
> page content, or personal data are collected, stored, or shared. The service
> is enabled only after an in-app prominent disclosure and explicit user
> consent, and the user can disable it at any time.

## 3. Data safety form (summary answers)

- Data collected: **None.**
- Data shared: **None.**
- Data encrypted in transit: N/A (no network access — no INTERNET permission).
- Data deletion: uninstalling the app, or Settings → Reset all data, removes everything.

## 4. Review notes for Play (paste-ready)

> This app requests no runtime permissions and has no network access. To
> test: open the app, accept the disclosure, enable "ImpulseBlock pause
> service" in Accessibility settings, select an app (e.g. YouTube) in the
> Apps tab, then open that app — a full-screen pause appears with "Not now"
> and "Continue intentionally (5/15 min)". Add "example.com" in the Websites
> tab and open example.com in Chrome to see the same pause for websites.
