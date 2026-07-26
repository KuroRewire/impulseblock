#!/usr/bin/env bash
# ImpulseBlock Mobile — run every locally executable check.
# Usage: scripts/mobile-test.sh [ios|android|extension|all]   (default: all)
set -uo pipefail

TARGET="${1:-all}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILURES=0

test_extension() {
  echo "==> Browser extension (syntax checks — the extension has no test suite)"
  cd "$REPO_ROOT"
  local rc=0
  for f in *.js; do
    if node --check "$f" 2>/dev/null; then
      echo "  ✅ $f"
    else
      echo "  ❌ $f"; rc=1
    fi
  done
  [ $rc -ne 0 ] && FAILURES=$((FAILURES+1))
}

test_android() {
  echo "==> Android: gradlew test + lint"
  export JAVA_HOME="${JAVA_HOME:-$(/opt/homebrew/bin/brew --prefix openjdk@17 2>/dev/null)/libexec/openjdk.jdk/Contents/Home}"
  export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
  cd "$REPO_ROOT/mobile/android"
  ./gradlew test lint || FAILURES=$((FAILURES+1))
}

# Prints the UDID of an available iPhone simulator (any iOS runtime), or nothing.
pick_ios_sim() {
  xcrun simctl list devices available 2>/dev/null | awk '
    /^-- iOS/       { ios = 1; next }
    /^-- /          { ios = 0 }
    ios && /iPhone/ {
      if (match($0, /\(([0-9A-Fa-f-]{36})\)/)) {
        print substr($0, RSTART + 1, RLENGTH - 2); exit
      }
    }'
}

test_ios() {
  echo "==> iOS: unit tests (requires Xcode + a simulator runtime)"
  if ! xcodebuild -version >/dev/null 2>&1; then
    echo "  ❌ SKIPPED: Xcode is not installed on this machine."
    FAILURES=$((FAILURES+1))
    return
  fi
  local sim_id
  sim_id="$(pick_ios_sim)"
  if [ -z "$sim_id" ]; then
    echo "  ❌ SKIPPED: no available iOS Simulator found."
    echo "     Install one via Xcode > Settings > Components, then re-run."
    FAILURES=$((FAILURES+1))
    return
  fi
  echo "  Using simulator: $sim_id"
  cd "$REPO_ROOT/mobile/ios"
  if command -v xcodegen >/dev/null 2>&1; then xcodegen generate >/dev/null; fi
  xcodebuild test \
    -project ImpulseBlock.xcodeproj \
    -scheme ImpulseBlock \
    -destination "platform=iOS Simulator,id=$sim_id" \
    CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO \
    || FAILURES=$((FAILURES+1))
}

case "$TARGET" in
  ios) test_ios ;;
  android) test_android ;;
  extension) test_extension ;;
  all) test_extension; test_android; test_ios ;;
  *) echo "usage: $0 [ios|android|extension|all]"; exit 2 ;;
esac

if [ "$FAILURES" -gt 0 ]; then
  echo "❌ $FAILURES check group(s) failed or were skipped."
  exit 1
fi
echo "✅ All requested checks passed."
