# Handoff: 7-day pruning for overrideHistoryByDate

## Goal
Add automatic pruning so that override history older than 7 days is deleted from chrome.storage.local. This makes the implementation match the store copy ("7-day override log") and avoids unbounded local data growth.

## Hard constraints (DO NOT VIOLATE)
- DO NOT rename or change any storage key. The key `overrideHistoryByDate` and its structure MUST stay exactly as-is.
- Existing structure: `overrideHistoryByDate[dateKey][host] = [{ startedAt, durationMs }, ...]` where `dateKey` is "YYYY-MM-DD" produced by `todayKey()`.
- DO NOT modify any other feature (Renewal Ladder, Burst grouping, blocking, timers, alarms).
- DO NOT touch overlay.js, blocked.js, popup.js, manifest.json, or _locales. ONLY edit background.js.
- REUSE the existing functions `todayKey()` (line ~53), `getOverrideHistory()` (~61), `setOverrideHistory()` (~67). Do not duplicate or rewrite them.

## What to implement in background.js

1. Add a helper that returns the cutoff date key (today minus 7 days) in "YYYY-MM-DD" format, using the same formatting logic as `todayKey()`:

```js
function cutoffDateKey(daysAgo) {
  var d = new Date();
  d.setDate(d.getDate() - daysAgo);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}
```

2. Add the prune function. It loads history via getOverrideHistory, deletes any dateKey strictly older than the cutoff (string comparison is valid because keys are zero-padded YYYY-MM-DD), and saves back only if something changed:

```js
function pruneOldOverrideHistory() {
  var cutoff = cutoffDateKey(7);
  getOverrideHistory(function (history) {
    var changed = false;
    Object.keys(history).forEach(function (dateKey) {
      if (dateKey < cutoff) {
        delete history[dateKey];
        changed = true;
      }
    });
    if (changed) setOverrideHistory(history);
  });
}
```

Note: cutoff = today - 7 days. Keys strictly less than cutoff are removed, so the last 7 days (today + previous 6) are retained. This matches the 7-window display in blocked.js (`getLastNDates(7)`).

3. Register triggers so pruning runs on browser startup AND on extension update/install (the update is how the 124 users will receive this). Add near the other chrome.runtime listeners:

```js
chrome.runtime.onStartup.addListener(function () {
  pruneOldOverrideHistory();
});

chrome.runtime.onInstalled.addListener(function () {
  pruneOldOverrideHistory();
});
```

## After implementing
- Do not bump the version yourself; the human will handle versioning and zipping.
- Do not run any git commands.
- Confirm: no storage key was renamed, only background.js was modified.
