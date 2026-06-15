// ExtPay (ExtensionPay): initialize at the very top so the background service worker
// registers its payment handlers before anything else. startBackground() is called
// exactly once, here only. ExtPay only needs `storage` + the extensionpay.com content
// script (added in manifest.json) — no scary permission warnings.
try {
  importScripts('ExtPay.js');
  var extpay = ExtPay('impulseblock');
  extpay.startBackground();
  // FIX D: persist everPaid:true the moment ExtPay observes a payment, so offline grace no longer
  // depends on the popup re-checking getUser(). Registered here (extpay is in scope); not a 2nd start.
  extpay.onPaid.addListener(function () {
    chrome.storage.local.set({ everPaid: true });
  });
} catch (e) {
  // Mission first: if the payment library fails to load/init, core blocking must still work.
  console.warn('ImpulseBlock: ExtPay init failed; continuing without payment.', e);
}

console.log("ImpulseBlock background loaded", new Date().toISOString());
importScripts('block-core.js');

// Hard-expiry temp allow: persisted in chrome.storage.local so service worker
// restarts and the content script overlay all see the same source of truth.
// Schema: { [hostname]: expiresAtMs }
var TEMP_ALLOW_KEY = 'tempAllowedHosts';
var ALARM_PREFIX = 'expire:';

// Renewal ladder: per-host overrides scale 5→10→15→20min within an urge session.
var LADDER_DURATIONS_MS = [5 * 60 * 1000, 10 * 60 * 1000, 15 * 60 * 1000, 20 * 60 * 1000];
var DAILY_CAP_MS = 60 * 60 * 1000;
// The ladder rung reflects the CURRENT session: a quiet gap longer than this since the
// previous grant ENDED starts a fresh session back at rung 0 (5 min). The 60-min daily
// cap above is independent and still counts every override of the day.
var RESET_THRESHOLD_MS = 15 * 60 * 1000;
var OVERRIDE_HISTORY_KEY = 'overrideHistoryByDate';

function getTempAllowed(callback) {
  chrome.storage.local.get([TEMP_ALLOW_KEY], function (data) {
    callback((data && data[TEMP_ALLOW_KEY]) || {});
  });
}

function setTempAllowed(map, callback) {
  var payload = {};
  payload[TEMP_ALLOW_KEY] = map;
  chrome.storage.local.set(payload, callback || function () {});
}

function hostMatches(hostname, allowedKey) {
  return hostname === allowedKey || hostname.endsWith('.' + allowedKey);
}

// FIX A: ExtPay's payment/restore pages live on extensionpay.com. They are payment INFRASTRUCTURE,
// not a site the user is avoiding — never block/redirect them to the pause screen, even if the user
// has extensionpay.com (or a parent) in their block list. Otherwise openPaymentPage()/openLoginPage()
// would be redirected and the user couldn't pay or restore. Precise suffix match: extensionpay.com
// and *.extensionpay.com only (NOT evilextensionpay.com or extensionpay.com.evil.com).
var EXTPAY_HOST = 'extensionpay.com';
function isExtPayHost(hostname) {
  return !!hostname && (hostname === EXTPAY_HOST || hostname.endsWith('.' + EXTPAY_HOST));
}

function isHostTempAllowed(hostname, map) {
  if (!hostname || !map) return false;
  var now = Date.now();
  for (var key in map) {
    if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
    if (map[key] > now && hostMatches(hostname, key)) return true;
  }
  return false;
}

function alarmName(host, expiresAt) {
  return ALARM_PREFIX + host + ':' + String(expiresAt);
}

function parseAlarmName(name) {
  if (!name || name.indexOf(ALARM_PREFIX) !== 0) return null;
  var rest = name.slice(ALARM_PREFIX.length);
  var lastColon = rest.lastIndexOf(':');
  if (lastColon < 1) return null;
  return { host: rest.slice(0, lastColon), expiresAt: parseInt(rest.slice(lastColon + 1), 10) };
}

function todayKey() {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function getOverrideHistory(callback) {
  chrome.storage.local.get([OVERRIDE_HISTORY_KEY], function (data) {
    callback((data && data[OVERRIDE_HISTORY_KEY]) || {});
  });
}

function setOverrideHistory(history, callback) {
  var payload = {};
  payload[OVERRIDE_HISTORY_KEY] = history;
  chrome.storage.local.set(payload, callback || function () {});
}

function cutoffDateKey(daysAgo) {
  var d = new Date();
  d.setDate(d.getDate() - daysAgo);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

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

function getTodayHostEntries(history, host) {
  var key = todayKey();
  var todayMap = history[key] || {};
  return todayMap[host] || [];
}

// Ladder rung for the NEXT override = how many of today's entries belong to the
// CURRENT session. A session is the trailing run of overrides where each one starts
// within RESET_THRESHOLD_MS of the previous grant's END (startedAt + durationMs).
// A quiet gap longer than the threshold since the last grant ended means this override
// begins a fresh session at rung index 0 (5 min). This only READS the existing entries;
// it does not change what recordOverrideStart writes. The daily cap is computed
// separately over ALL of today's entries, so morning minutes still count tonight.
function sessionRungIndex(entries, now) {
  if (!entries || entries.length === 0) return 0;
  var sorted = entries.slice().sort(function (a, b) { return a.startedAt - b.startedAt; });
  var last = sorted[sorted.length - 1];
  var lastEnd = last.startedAt + (last.durationMs || 0);
  // Fresh session: nothing recent to continue from.
  if (now - lastEnd > RESET_THRESHOLD_MS) return 0;
  // Count the trailing run of entries that chain together into the current session.
  var sessionCount = 1;
  for (var i = sorted.length - 1; i > 0; i--) {
    var prevEnd = sorted[i - 1].startedAt + (sorted[i - 1].durationMs || 0);
    if (sorted[i].startedAt - prevEnd <= RESET_THRESHOLD_MS) {
      sessionCount++;
    } else {
      break;
    }
  }
  return Math.min(sessionCount, LADDER_DURATIONS_MS.length - 1);
}

function getNextDurationInfo(host, callback) {
  getOverrideHistory(function (history) {
    var entries = getTodayHostEntries(history, host);
    // Rung now reflects the current session (was: entries.length over the whole day).
    var idx = sessionRungIndex(entries, Date.now());
    var ladderDuration = LADDER_DURATIONS_MS[idx];
    // Daily cap still sums ALL of today's entries for the host (unchanged).
    var totalUsed = entries.reduce(function (s, e) { return s + (e.durationMs || 0); }, 0);
    var remaining = DAILY_CAP_MS - totalUsed;
    var capReached = remaining <= 0;
    var allocated = capReached ? 0 : Math.min(ladderDuration, remaining);
    callback({
      durationMs: allocated,
      capReached: capReached,
      ladderIndex: idx,
      totalUsedMs: totalUsed
    });
  });
}

function recordOverrideStart(host, durationMs, callback) {
  getOverrideHistory(function (history) {
    var key = todayKey();
    if (!history[key]) history[key] = {};
    if (!history[key][host]) history[key][host] = [];
    history[key][host].push({ startedAt: Date.now(), durationMs: durationMs });
    setOverrideHistory(history, callback);
  });
}

function trimLastOverrideOnReBlock(host, callback) {
  getOverrideHistory(function (history) {
    var key = todayKey();
    var entries = (history[key] && history[key][host]) || [];
    if (entries.length === 0) {
      callback && callback();
      return;
    }
    var last = entries[entries.length - 1];
    var elapsed = Date.now() - last.startedAt;
    if (elapsed >= 0 && elapsed < (last.durationMs || 0)) {
      last.durationMs = elapsed;
      setOverrideHistory(history, function () { callback && callback(); });
    } else {
      callback && callback();
    }
  });
}

function redirectMatchingTabsToBlocked(host) {
  chrome.tabs.query({}, function (tabs) {
    tabs.forEach(function (tab) {
      if (!tab.url || typeof tab.id !== 'number') return;
      var u;
      try { u = new URL(tab.url); } catch (e) { return; }
      if (!u.hostname || !hostMatches(u.hostname, host)) return;
      if (isExtPayHost(u.hostname)) return; // FIX A: never redirect ExtPay pages
      PDBlockCore.isHostBlocked(u.hostname, function (blocked) {
        if (!blocked) return;
        var redirectUrl = chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(tab.url);
        chrome.tabs.update(tab.id, { url: redirectUrl });
      });
    });
  });
}

function expireHost(host) {
  if (!host) return;
  getTempAllowed(function (map) {
    if (!Object.prototype.hasOwnProperty.call(map, host)) {
      redirectMatchingTabsToBlocked(host);
      return;
    }
    delete map[host];
    setTempAllowed(map, function () {
      redirectMatchingTabsToBlocked(host);
    });
  });
}

function clearTempAllowFor(host, callback) {
  getTempAllowed(function (map) {
    if (!Object.prototype.hasOwnProperty.call(map, host)) {
      callback && callback();
      return;
    }
    var prevExpires = map[host];
    chrome.alarms.clear(alarmName(host, prevExpires));
    delete map[host];
    setTempAllowed(map, function () { callback && callback(); });
  });
}

chrome.runtime.onStartup.addListener(function () {
  pruneOldOverrideHistory();
});

// FIX B: write the grandfather flag DURABLY — verify it landed (re-read) and retry once on a transient
// storage error / mismatch. This guarantees a fresh install reliably persists grandfathered:false, so
// the popup never has to (and never does) re-derive grandfather from blockedHosts — a NEW user can
// never become grandfathered:true even if a write transiently fails.
function writeGrandfathered(value, retry) {
  chrome.storage.local.set({ grandfathered: value }, function () {
    if (chrome.runtime.lastError) { if (retry) writeGrandfathered(value, false); return; }
    chrome.storage.local.get(['grandfathered'], function (res) {
      if (chrome.runtime.lastError) { if (retry) writeGrandfathered(value, false); return; }
      if (res.grandfathered !== value && retry) writeGrandfathered(value, false);
    });
  });
}

chrome.runtime.onInstalled.addListener(function (details) {
  pruneOldOverrideHistory();
  // FIX 2 + FIX B: a brand-new INSTALL is NEVER grandfathered — write false DURABLY (verify+retry).
  // An UPDATE grandfathers pre-cap existing users once (they already have blocked sites). Never flip
  // an already-set flag.
  if (details && details.reason === 'install') {
    writeGrandfathered(false, true);
    return;
  }
  chrome.storage.local.get(['blockedHosts', 'grandfathered'], function (res) {
    if (chrome.runtime.lastError) return; // FIX 4: storage error → leave unset; the popup stays safe (caps)
    if (res.grandfathered === undefined) {
      var hosts = res.blockedHosts || [];
      writeGrandfathered(hosts.length >= 1, true);
    }
  });
});

chrome.alarms.onAlarm.addListener(function (alarm) {
  var parsed = parseAlarmName(alarm.name);
  if (!parsed || !parsed.host) return;
  expireHost(parsed.host);
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || !msg.type) return;

  if (msg.type === 'GET_NEXT_DURATION') {
    var qhost = msg.hostname;
    if (!qhost) {
      sendResponse({ durationMs: 0, capReached: true, ladderIndex: 0, totalUsedMs: 0 });
      return;
    }
    getNextDurationInfo(qhost, function (info) {
      sendResponse(info);
    });
    return true;
  }

  if (msg.type === 'TEMP_ALLOW') {
    var hostname = msg.hostname;
    if (!hostname) {
      sendResponse({ ok: false, reason: 'invalid' });
      return;
    }
    getNextDurationInfo(hostname, function (info) {
      if (info.capReached || info.durationMs <= 0) {
        sendResponse({ ok: false, reason: 'daily_cap' });
        return;
      }
      var ttlMs = info.durationMs;
      var expiresAt = Date.now() + ttlMs;
      getTempAllowed(function (map) {
        if (map[hostname]) {
          chrome.alarms.clear(alarmName(hostname, map[hostname]));
        }
        map[hostname] = expiresAt;
        setTempAllowed(map, function () {
          chrome.alarms.create(alarmName(hostname, expiresAt), { when: expiresAt });
          recordOverrideStart(hostname, ttlMs, function () {
            sendResponse({ ok: true, expiresAt: expiresAt, durationMs: ttlMs });
          });
        });
      });
    });
    return true;
  }

  if (msg.type === 'TRIGGER_SUGGEST_BLOCK') {
    var ahost = msg.hostname;
    if (ahost) {
      // FIX 3: no sender for this exists in the repo (dead path), but route it through the guarded
      // add so it can never bypass the free cap. Grandfathered users keep unlimited; others cap at 5.
      chrome.storage.local.get(['grandfathered', 'everPaid'], function (res) {
        // grandfathered OR a known prior payer → unlimited; otherwise respect the 5-site cap.
        var unlimited = !!(res && (res.grandfathered === true || res.everPaid === true));
        PDBlockCore.addBlockedHostIfAllowed(ahost, unlimited ? Infinity : 5, function () {});
      });
    }
    return;
  }

  if (msg.type === 'FORCE_BLOCK') {
    var fbTabId = typeof msg.tabId === 'number' ? msg.tabId : (sender && sender.tab ? sender.tab.id : undefined);
    var fbHostname = msg.hostname;
    var fbUrl = msg.url || (sender && sender.tab ? sender.tab.url : undefined);

    if (typeof fbTabId !== 'number' || !fbUrl) {
      console.log('FORCE_BLOCK invalid message', { tabId: fbTabId, hostname: fbHostname, url: fbUrl });
      return;
    }

    var doRedirect = function () {
      try {
        var urlObj = new URL(fbUrl);
        var hostForCheck = urlObj.hostname;
        if (!hostForCheck) return;
        if (isExtPayHost(hostForCheck)) return; // FIX A: never force-block ExtPay pages
        PDBlockCore.isHostBlocked(hostForCheck, function (blocked) {
          if (!blocked) return;
          var redirectUrl = chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(fbUrl);
          chrome.tabs.update(fbTabId, { url: redirectUrl });
        });
      } catch (e) {
        console.log('FORCE_BLOCK URL parse error', e);
      }
    };

    if (fbHostname) {
      trimLastOverrideOnReBlock(fbHostname, function () {
        clearTempAllowFor(fbHostname, doRedirect);
      });
    } else {
      doRedirect();
    }
  }
});

chrome.webNavigation.onCommitted.addListener(function (details) {
  if (details.frameId !== 0) return;
  var url;
  try {
    url = new URL(details.url);
  } catch (e) {
    return;
  }
  var hostname = url.hostname;
  if (!hostname) return;
  if (isExtPayHost(hostname)) return; // FIX A: never block ExtPay's payment/restore pages

  getTempAllowed(function (map) {
    if (isHostTempAllowed(hostname, map)) return;
    PDBlockCore.isHostBlocked(hostname, function (blocked) {
      if (!blocked) return;
      var redirectUrl = chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(details.url);
      chrome.tabs.update(details.tabId, { url: redirectUrl });
    });
  });
});
