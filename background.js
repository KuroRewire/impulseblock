console.log("ImpulseBlock background loaded", new Date().toISOString());
importScripts('block-core.js');

// Hard-expiry temp allow: persisted in chrome.storage.local so service worker
// restarts and the content script overlay all see the same source of truth.
// Schema: { [hostname]: expiresAtMs }
var TEMP_ALLOW_KEY = 'tempAllowedHosts';
var DEFAULT_TTL_MS = 5 * 60 * 1000;
var ALARM_PREFIX = 'expire:';

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

chrome.alarms.onAlarm.addListener(function (alarm) {
  var parsed = parseAlarmName(alarm.name);
  if (!parsed || !parsed.host) return;
  expireHost(parsed.host);
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || !msg.type) return;

  if (msg.type === 'TEMP_ALLOW') {
    var hostname = msg.hostname;
    var ttlMs = typeof msg.ttlMs === 'number' ? msg.ttlMs : DEFAULT_TTL_MS;
    if (!hostname) {
      sendResponse({ ok: false });
      return;
    }
    var expiresAt = Date.now() + ttlMs;
    getTempAllowed(function (map) {
      if (map[hostname]) {
        chrome.alarms.clear(alarmName(hostname, map[hostname]));
      }
      map[hostname] = expiresAt;
      setTempAllowed(map, function () {
        chrome.alarms.create(alarmName(hostname, expiresAt), { when: expiresAt });
        sendResponse({ ok: true, expiresAt: expiresAt });
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
      clearTempAllowFor(fbHostname, doRedirect);
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
