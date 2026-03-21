console.log("PD Counter background loaded", new Date().toISOString());
importScripts('block-core.js');

// 「Yesで開く」直後のリダイレクトループを避けるため、
// 「そのタブだけ」「そのホストだけ」一時的にブロックをスキップする（MVP: service worker のメモリ）。
var tempAllowByTabHost = new Map(); // key: "<tabId>:<hostname>", value: expiresAt(ms)

function tempAllowKey(tabId, hostname) {
  return String(tabId) + ':' + String(hostname);
}

function isTempAllowed(tabId, hostname) {
  var now = Date.now();
  var hit = false;

  tempAllowByTabHost.forEach(function (expiresAt, key) {
    var parts = String(key).split(':');
    var storedTabId = parseInt(parts[0], 10);
    if (storedTabId !== tabId) return;

    if (!expiresAt || now > expiresAt) {
      tempAllowByTabHost.delete(key);
      return;
    }

    var allowedHost = parts.slice(1).join(':');
    if (!allowedHost) return;

    if (hostname === allowedHost || hostname.endsWith('.' + allowedHost)) {
      hit = true;
    }
  });

  return hit;
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || !msg.type) return;

  if (msg.type === 'TEMP_ALLOW') {
    var tabId = typeof msg.tabId === 'number' ? msg.tabId : undefined;
    var hostname = msg.hostname;
    var ttlMs = typeof msg.ttlMs === 'number' ? msg.ttlMs : 5 * 60 * 1000;

    if (typeof tabId !== 'number' || !hostname) {
      console.log('TEMP_ALLOW invalid message', { tabId: tabId, hostname: hostname });
      sendResponse({ ok: false });
      return;
    }

    var expiresAt = Date.now() + ttlMs;
    tempAllowByTabHost.set(tempAllowKey(tabId, hostname), expiresAt);
    console.log('TEMP_ALLOW set', { tabId: tabId, hostname: hostname, expiresAt: expiresAt });
    sendResponse({ ok: true, expiresAt: expiresAt });
    return;
  }

  if (msg.type === 'OVERLAY_CHECK') {
    var oTabId = sender && sender.tab ? sender.tab.id : undefined;
    var oHostname = msg.hostname;

    try {
      if (!oHostname && sender && sender.tab && sender.tab.url) {
        oHostname = new URL(sender.tab.url).hostname;
      }
    } catch (e) {}

    var show = false;
    if (typeof oTabId === 'number' && oHostname) {
      show = isTempAllowed(oTabId, oHostname);
    }

    sendResponse({ show: show });
    return;
  }

  if (msg.type === 'ADULT_SUGGEST_BLOCK') {
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

    // TEMP_ALLOW を対象ホストに対して削除
    if (fbHostname) {
      tempAllowByTabHost.forEach(function (_, key) {
        var parts = String(key).split(':');
        var storedTabId = parseInt(parts[0], 10);
        var allowedHost = parts.slice(1).join(':');
        if (storedTabId === fbTabId && allowedHost === fbHostname) {
          tempAllowByTabHost.delete(key);
        }
      });
    }

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

  var allowHit = isTempAllowed(details.tabId, hostname);
  console.log('onCommitted', { tabId: details.tabId, hostname: hostname, allowHit: allowHit });
  if (allowHit) return;

  PDBlockCore.isHostBlocked(hostname, function (blocked) {
    if (!blocked) return;
    var redirectUrl = chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(details.url);
    chrome.tabs.update(details.tabId, { url: redirectUrl });
  });
});
