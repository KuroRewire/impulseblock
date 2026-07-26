#!/usr/bin/env bash
# ImpulseBlock Mobile — build everything buildable in the current environment.
# Usage: scripts/mobile-build.sh [ios|android|all]   (default: all)
set -uo pipefail

TARGET="${1:-all}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILURES=0

build_ios() {
  echo "==> iOS"
  if ! xcodebuild -version >/dev/null 2>&1; then
    echo "  ❌ SKIPPED: Xcode is not installed; iOS cannot be compiled on this machine."
    echo "     Sources + project live in mobile/ios (xcodegen-generated ImpulseBlock.xcodeproj)."
    echo "     After installing Xcode run this script again."
    FAILURES=$((FAILURES+1))
    return
  fi
  cd "$REPO_ROOT/mobile/ios"
  if command -v xcodegen >/dev/null 2>&1; then
    xcodegen generate
  fi
  # Simulator build catches all compile errors; Screen Time ENFORCEMENT still
  # requires a physical device (see docs/mobile/PHYSICAL_TEST_IOS.md).
  xcodebuild build \
    -project ImpulseBlock.xcodeproj \
    -scheme ImpulseBlock \
    -destination 'generic/platform=iOS Simulator' \
    CODE_SIGNING_ALLOWED=NO CODE_SIGN_IDENTITY="" \
    || FAILURES=$((FAILURES+1))
}

build_android() {
  echo "==> Android"
  export JAVA_HOME="${JAVA_HOME:-$(/opt/homebrew/bin/brew --prefix openjdk@17 2>/dev/null)/libexec/openjdk.jdk/Contents/Home}"
  export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
  cd "$REPO_ROOT/mobile/android"
  ./gradlew assembleDebug || FAILURES=$((FAILURES+1))
  echo "  APK: mobile/android/app/build/outputs/apk/debug/app-debug.apk"
}

case "$TARGET" in
  ios) build_ios ;;
  android) build_android ;;
  all) build_android; build_ios ;;
  *) echo "usage: $0 [ios|android|all]"; exit 2 ;;
esac

if [ "$FAILURES" -gt 0 ]; then
  echo "❌ $FAILURES build step(s) failed or were skipped."
  exit 1
fi
echo "✅ All requested builds succeeded."
