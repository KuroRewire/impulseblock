# ImpulseBlock iOS — Setup

## Prerequisites

- macOS with **Xcode 15+** installed (`xcodebuild -version` must work — the
  Command Line Tools alone are not enough). Compile-validated on
  **Xcode 26.3 / Swift 6.2.4 / iOS 26.3 simulator** (2026-07-27): app + all
  extensions build unsigned and the 25 unit tests pass.
- Optional: `brew install xcodegen` (only if you edit `mobile/ios/project.yml`).
- For on-device testing: an Apple Developer account (free account works for
  development; distribution needs the paid program + Family Controls
  distribution entitlement — see HUMAN_ONLY_STEPS.md).

## Configure your identifiers

```bash
cd mobile/ios
cp Config/Local.xcconfig.example Config/Local.xcconfig
# Edit Config/Local.xcconfig:
#   IMPULSE_BUNDLE_PREFIX = com.yourcompany
#   DEVELOPMENT_TEAM = <your Team ID>
```

Everything derives from these two values:

- App: `<prefix>.impulseblock`
- Extensions: `<prefix>.impulseblock.shieldconfig` / `.shieldaction` / `.activitymonitor`
- App Group: `group.<prefix>.impulseblock` (injected into all targets via the
  `ImpulseBlockAppGroup` Info.plist key)

`Config/Local.xcconfig` is gitignored; no personal identifiers are committed.

## Open and build

```bash
cd mobile/ios
open ImpulseBlock.xcodeproj        # project is committed, pre-generated
```

In Xcode: select the **ImpulseBlock** scheme → your iPhone → Run.
Xcode's automatic signing will create the four provisioning profiles once the
capabilities exist on your account (App Groups + Family Controls; see
HUMAN_ONLY_STEPS.md).

Command line (compile check without signing):

```bash
scripts/mobile-build.sh ios     # simulator build, code signing disabled
scripts/mobile-test.sh ios      # unit tests on a simulator
```

If you change `project.yml`, regenerate with `xcodegen generate`.
Note: the Info.plists are hand-maintained (they carry the NSExtension
declarations); `project.yml` deliberately has no `info:` blocks so XcodeGen
never overwrites them.

## Targets

| Target | Purpose |
|---|---|
| ImpulseBlock | SwiftUI app: onboarding/authorization, FamilyActivityPicker, domain manager, temp access, settings |
| ShieldConfigurationExtension | Draws the calm "Pause before the click." shield |
| ShieldActionExtension | Handles "Not now" / "Continue intentionally" taps |
| DeviceActivityMonitorExtension | Re-applies shields when temporary access expires |

## Important behavioral notes

- **Simulator builds compile but do not enforce.** Screen Time shielding only
  works on a physical device — run docs/mobile/PHYSICAL_TEST_IOS.md.
- The 5-minute temporary access uses a DeviceActivity 15-minute schedule with
  a 10-minute warning offset (15-minute platform minimum) — see TECH_DECISION.md.
- Manual web domains are capped at 50 by ManagedSettings; the UI enforces it.
