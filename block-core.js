/**
 * ブロック対象の取得・判定・追加を1箇所に集約。
 * 将来の declarativeNetRequest や permissions.request への差し替えをしやすくする。
 */
var PDBlockCore = (function () {
  var STORAGE_KEY = 'blockedHosts';

  // FIX C: surface storage errors via a second callback arg (additive — existing single-arg callbacks
  // ignore it, so addBlockedHost and every other caller stay behavior-identical).
  function getBlockedHosts(callback) {
    chrome.storage.local.get([STORAGE_KEY], function (data) {
      callback((data && data[STORAGE_KEY]) || [], chrome.runtime.lastError || null);
    });
  }

  function setBlockedHosts(hosts, callback) {
    var payload = {};
    payload[STORAGE_KEY] = hosts;
    chrome.storage.local.set(payload, function () {
      (callback || function () {})(chrome.runtime.lastError || null);
    });
  }

  function addBlockedHost(hostname, callback) {
    getBlockedHosts(function (list) {
      if (list.indexOf(hostname) !== -1) {
        (callback || function () {})(false);
        return;
      }
      list.push(hostname);
      setBlockedHosts(list, function () {
        (callback || function () {})(true);
      });
    });
  }

  // Additive guarded variant (FIX 3): atomically re-checks the count right before the write so
  // the per-account cap can't be exceeded by rapid clicks / concurrent popups. `limit` is the max
  // number of hosts allowed (pass Infinity for unlimited users). Does NOT change addBlockedHost.
  // callback receives { added, reason } where reason is 'added' | 'already' | 'cap'.
  function addBlockedHostIfAllowed(hostname, limit, callback) {
    var cb = callback || function () {};
    getBlockedHosts(function (list, readErr) {
      // FIX C: on a read error, never proceed with a possibly-empty list (that write would DROP the
      // user's existing sites). Report a distinct outcome so the caller doesn't claim success.
      if (readErr) { cb({ added: false, reason: 'storage_error' }); return; }
      if (list.indexOf(hostname) !== -1) { cb({ added: false, reason: 'already' }); return; }
      if (list.length >= limit) { cb({ added: false, reason: 'cap' }); return; }
      list.push(hostname);
      setBlockedHosts(list, function (writeErr) {
        if (writeErr) { cb({ added: false, reason: 'storage_error' }); return; }
        cb({ added: true, reason: 'added' });
      });
    });
  }

  function isHostBlocked(hostname, callback) {
    if (!hostname) {
      callback(false);
      return;
    }
    getBlockedHosts(function (list) {
      callback(list.indexOf(hostname) !== -1);
    });
  }

  return {
    getBlockedHosts: getBlockedHosts,
    setBlockedHosts: setBlockedHosts,
    addBlockedHost: addBlockedHost,
    addBlockedHostIfAllowed: addBlockedHostIfAllowed,
    isHostBlocked: isHostBlocked
  };
})();
