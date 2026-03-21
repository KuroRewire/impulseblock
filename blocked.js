(function () {
  function t(key) {
    return chrome.i18n.getMessage(key) || '';
  }

  var cheerImg = document.getElementById('cheer-image');
  if (cheerImg) {
    var lang = chrome.i18n.getUILanguage();
    var isJa = lang.startsWith('ja');
    cheerImg.src = isJa ? 'assets/taero_ja.png' : 'assets/taero_en.png';
    var altMsg = chrome.i18n.getMessage('cheer_alt');
    if (altMsg) cheerImg.setAttribute('alt', altMsg);
  }

  var params = new URLSearchParams(location.search);
  var originalUrl = params.get('url');
  if (originalUrl) {
    try {
      originalUrl = decodeURIComponent(originalUrl);
    } catch (e) {}
  }
  var currentHostname = '';
  try {
    if (originalUrl) {
      currentHostname = new URL(originalUrl).hostname;
    }
  } catch (e) {}

  var currentHostEl = document.getElementById('current-host');
  if (currentHostEl) {
    currentHostEl.textContent =
      t('blocked_currently') + ' ' + (currentHostname || t('unknown_host'));
  }

  var blockedListEl = document.getElementById('blocked-list');
  var historyListEl = document.getElementById('history-list');

  function getTodayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function getLastNDates(n) {
    var result = [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    for (var i = 0; i < n; i++) {
      var d = new Date(today);
      d.setDate(today.getDate() - i);
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      var key = y + '-' + m + '-' + day;
      var label = m + '/' + day;
      result.push({ key: key, label: label });
    }
    return result;
  }

  function formatLastOpened(ms) {
    if (!ms) return '—';
    var d = new Date(ms);
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0') +
      ' ' +
      String(d.getHours()).padStart(2, '0') +
      ':' +
      String(d.getMinutes()).padStart(2, '0') +
      ':' +
      String(d.getSeconds()).padStart(2, '0')
    );
  }

  function refreshStats(data) {
    var today = getTodayKey();
    var count =
      data && data.openCountByDate && data.openCountByDate[today]
        ? data.openCountByDate[today]
        : 0;
    var last = data && data.lastOpenedAt ? data.lastOpenedAt : 0;
    document.getElementById('today-count').textContent = t('today_count') + ' ' + count;
    document.getElementById('last-opened').textContent =
      t('last_recorded') + ' ' + formatLastOpened(last);
  }

  function loadAndShowStats() {
    chrome.storage.local.get(['openCountByDate', 'lastOpenedAt'], function (data) {
      refreshStats(data || {});
      renderHistory((data && data.openCountByDate) || {});
    });
  }

  function renderHistory(openCountByDate) {
    if (!historyListEl) return;
    historyListEl.innerHTML = '';
    var days = getLastNDates(7);
    var max = 0;
    days.forEach(function (d) {
      var c = openCountByDate[d.key] || 0;
      if (c > max) max = c;
    });
    if (max === 0) {
      max = 1;
    }
    days.forEach(function (d) {
      var count = openCountByDate[d.key] || 0;
      var row = document.createElement('div');
      row.className = 'history-row';

      var dateEl = document.createElement('span');
      dateEl.className = 'history-date';
      dateEl.textContent = d.label;

      var bar = document.createElement('div');
      bar.className = 'history-bar';
      var barFill = document.createElement('div');
      barFill.className = 'history-bar-fill';
      barFill.style.width = String(Math.round((count / max) * 100)) + '%';

      var color;
      if (count === 0) {
        color = '#ddd';
      } else if (count >= max * 0.8) {
        color = '#f44336'; // red
      } else if (count >= max * 0.4) {
        color = '#ff9800'; // orange
      } else {
        color = '#4caf50'; // green
      }
      barFill.style.backgroundColor = color;

      bar.appendChild(barFill);

      var countEl = document.createElement('span');
      countEl.className = 'history-count';
      countEl.textContent = String(count);

      row.appendChild(dateEl);
      row.appendChild(bar);
      row.appendChild(countEl);
      historyListEl.appendChild(row);
    });
  }

  function renderBlockedList(hosts) {
    if (!blockedListEl) return;
    blockedListEl.innerHTML = '';
    if (!hosts || hosts.length === 0) {
      var empty = document.createElement('p');
      empty.textContent = t('empty_list');
      empty.style.fontSize = '13px';
      empty.style.color = '#666';
      blockedListEl.appendChild(empty);
      return;
    }

    hosts.forEach(function (host) {
      var row = document.createElement('div');
      row.className = 'blocked-item';

      var span = document.createElement('span');
      span.className = 'blocked-host';
      span.textContent = host;

      var btn = document.createElement('button');
      btn.textContent = t('btn_delete');
      btn.className = 'btn-small';
      btn.addEventListener('click', function () {
        PDBlockCore.getBlockedHosts(function (current) {
          var next = (current || []).filter(function (h) {
            return h !== host;
          });
          PDBlockCore.setBlockedHosts(next, function () {
            renderBlockedList(next);
          });
        });
      });

      row.appendChild(span);
      row.appendChild(btn);
      blockedListEl.appendChild(row);
    });
  }

  function loadBlockedList() {
    if (!blockedListEl) return;
    PDBlockCore.getBlockedHosts(function (hosts) {
      renderBlockedList(hosts || []);
    });
  }

  loadAndShowStats();
  loadBlockedList();

  document.getElementById('btn-yes').addEventListener('click', function () {
    if (!originalUrl) {
      window.close();
      return;
    }

    chrome.tabs.getCurrent(function (tab) {
      if (!tab || typeof tab.id !== 'number') {
        return;
      }

      var hostname = '';
      try {
        hostname = new URL(originalUrl).hostname;
      } catch (e) {}

      chrome.runtime.sendMessage(
        {
          type: 'TEMP_ALLOW',
          tabId: tab.id,
          hostname: hostname,
          ttlMs: 5 * 60 * 1000
        },
        function () {
          var today = getTodayKey();
          chrome.storage.local.get(['openCountByDate', 'lastOpenedAt'], function (data) {
            var counts = data.openCountByDate || {};
            counts[today] = (counts[today] || 0) + 1;
            var lastOpenedAt = Date.now();
            chrome.storage.local.set(
              {
                openCountByDate: counts,
                lastOpenedAt: lastOpenedAt
              },
              function () {
                var updatedData = { openCountByDate: counts, lastOpenedAt: lastOpenedAt };
                refreshStats(updatedData);
                renderHistory(counts);
                chrome.tabs.update(tab.id, { url: originalUrl });
              }
            );
          });
        }
      );
    });
  });

  document.getElementById('btn-no').addEventListener('click', function () {
    chrome.tabs.getCurrent(function (tab) {
      if (tab && tab.id) {
        chrome.tabs.remove(tab.id).catch(function () {
          if (history.length > 1) {
            history.back();
          } else {
            window.close();
          }
        });
      } else {
        if (history.length > 1) history.back();
        else window.close();
      }
    });
  });
})();
