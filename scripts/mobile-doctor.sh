#!/usr/bin/env bash
# ImpulseBlock Mobile — environment doctor.
# Reports every tool the mobile builds need and what still requires human action.
set -u

BOLD=$(tput bold 2>/dev/null || true); RESET=$(tput sgr0 2>/dev/null || true)
ok()   { echo "  ✅ $1"; }
warn() { echo "  ⚠️  $1"; }
bad()  { echo "  ❌ $1"; }

echo "${BOLD}ImpulseBlock mobile doctor${RESET}"
echo
echo "${BOLD}Operating system${RESET}"
echo "  $(uname -srm)"
sw_vers 2>/dev/null | sed 's/^/  /'

echo
echo "${BOLD}iOS toolchain${RESET}"
if xcodebuild -version >/dev/null 2>&1; then
  xcodebuild -version | sed 's/^/  /'
  ok "Xcode present"
  echo "  iOS SDKs:"
  xcodebuild -showsdks 2>/dev/null | grep -i ios | sed 's/^/    /'
else
  bad "Xcode is NOT installed (xcodebuild unavailable — command line tools alone cannot build iOS apps)."
  echo "     → Install Xcode from the App Store, then run: sudo xcode-select -s /Applications/Xcode.app"
fi
if command -v swift >/dev/null 2>&1; then
  echo "  swift: $(swift --version 2>&1 | head -1)"
fi
if command -v xcodegen >/dev/null 2>&1; then
  ok "xcodegen $(xcodegen version 2>/dev/null | head -1) (regenerates mobile/ios/ImpulseBlock.xcodeproj)"
else
  warn "xcodegen not found (brew install xcodegen) — only needed if you edit mobile/ios/project.yml"
fi

echo
echo "${BOLD}Android toolchain${RESET}"
JAVA_HOME_CANDIDATE="${JAVA_HOME:-$(/opt/homebrew/bin/brew --prefix openjdk@17 2>/dev/null)/libexec/openjdk.jdk/Contents/Home}"
if [ -x "${JAVA_HOME_CANDIDATE}/bin/java" ]; then
  ok "Java: $("${JAVA_HOME_CANDIDATE}/bin/java" -version 2>&1 | head -1)"
  echo "     JAVA_HOME=${JAVA_HOME_CANDIDATE}"
else
  bad "No JDK found. Install with: brew install openjdk@17"
fi

SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
if [ -d "$SDK" ]; then
  ok "Android SDK: $SDK"
  echo "  Installed platforms:"
  ls "$SDK/platforms" 2>/dev/null | sed 's/^/    /' || echo "    (none)"
  echo "  Build tools:"
  ls "$SDK/build-tools" 2>/dev/null | sed 's/^/    /' || echo "    (none)"
else
  bad "Android SDK not found at $SDK (run: scripts/mobile-build.sh android — it bootstraps via sdkmanager)"
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -x "$REPO_ROOT/mobile/android/gradlew" ]; then
  ok "Gradle wrapper present (mobile/android/gradlew)"
else
  bad "Gradle wrapper missing in mobile/android"
fi

echo
echo "${BOLD}Human-only items (cannot be automated — see docs/mobile/HUMAN_ONLY_STEPS.md)${RESET}"
warn "Apple Developer Program enrollment + Family Controls capability/entitlement"
warn "iOS code signing (set your team in mobile/ios/Config/Local.xcconfig)"
warn "Physical-device validation of Screen Time shielding (simulator cannot enforce)"
warn "Android: enabling the accessibility service on a device, Play Console declarations"
