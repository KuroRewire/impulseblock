console.log("ImpulseBlock background loaded", new Date().toISOString());
importScripts('block-core.js');

// Hard-expiry temp allow: persisted in chrome.storage.local so service worker
// restarts and the content script overlay all see the same source of truth.
// Schema: { [hostname]: expiresAtMs }
var TEMP_ALLOW_KEY = 'tempAllowedHosts';
var ALARM_PREFIX = 'expire:';

// Renewal ladder: per-host overrides scale 5→10→15→20min over the day.
var LADDER_DURATIONS_MS = [5 * 60 * 1000, 10 * 60 * 1000, 15 * 60 * 1000, 20 * 60 * 1000];
var DAILY_CAP_MS = 60 * 60 * 1000;
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

function getNextDurationInfo(host, callback) {
  getOverrideHistory(function (history) {
    var entries = getTodayHostEntries(history, host);
    var idx = Math.min(entries.length, LADDER_DURATIONS_MS.length - 1);
    var ladderDuration = LADDER_DURATIONS_MS[idx];
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

chrome.runtime.onInstalled.addListener(function () {
  pruneOldOverrideHistory();
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
      PDBlockCore.addBlockedHost(ahost, function () {});
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

  getTempAllowed(function (map) {
    if (isHostTempAllowed(hostname, map)) return;
    PDBlockCore.isHostBlocked(hostname, function (blocked) {
      if (!blocked) return;
      var redirectUrl = chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(details.url);
      chrome.tabs.update(details.tabId, { url: redirectUrl });
    });
  });
});
