/**
 * ブロック対象の取得・判定・追加を1箇所に集約。
 * 将来の declarativeNetRequest や permissions.request への差し替えをしやすくする。
 */
var PDBlockCore = (function () {
  var STORAGE_KEY = 'blockedHosts';

  function getBlockedHosts(callback) {
    chrome.storage.local.get([STORAGE_KEY], function (data) {
      callback(data[STORAGE_KEY] || []);
    });
  }

  function setBlockedHosts(hosts, callback) {
    var payload = {};
    payload[STORAGE_KEY] = hosts;
    chrome.storage.local.set(payload, callback || function () {});
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
    isHostBlocked: isHostBlocked
  };
})();
