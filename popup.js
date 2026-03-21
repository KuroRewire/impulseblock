(function () {
  function t(key) {
    return chrome.i18n.getMessage(key) || '';
  }

  var blockBtn = document.getElementById('block-btn');
  var status = document.getElementById('status');
  var forceBlockBtn = document.getElementById('force-block-btn');
  var blockedListEl = document.getElementById('blocked-list');

  function renderBlockedList(hosts) {
    blockedListEl.innerHTML = '';
    if (!hosts || hosts.length === 0) {
      var empty = document.createElement('p');
      empty.textContent = t('empty_list');
      empty.style.fontSize = '12px';
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
    PDBlockCore.getBlockedHosts(function (hosts) {
      renderBlockedList(hosts || []);
    });
  }

  blockBtn.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs[0];
      if (!tab || !tab.url) {
        status.textContent = t('popup_status_no_url');
        return;
      }
      try {
        var url = new URL(tab.url);
        var hostname = url.hostname;
        if (!hostname || hostname === '') {
          status.textContent = t('popup_status_cant_block');
          return;
        }
        PDBlockCore.addBlockedHost(hostname, function (added) {
          if (added) {
            status.textContent = chrome.i18n.getMessage('popup_status_blocked', [hostname]);
          } else {
            status.textContent = chrome.i18n.getMessage('popup_status_already', [hostname]);
          }
          loadBlockedList();
        });
      } catch (e) {
        status.textContent = t('popup_status_cant_block');
      }
    });
  });

  forceBlockBtn.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs[0];
      if (!tab || !tab.url) {
        status.textContent = t('popup_status_no_tab');
        return;
      }
      var hostname = '';
      try {
        hostname = new URL(tab.url).hostname;
      } catch (e) {}

      chrome.runtime.sendMessage({
        type: 'FORCE_BLOCK',
        tabId: tab.id,
        url: tab.url,
        hostname: hostname
      });
      status.textContent = t('popup_status_force_done');
    });
  });

  loadBlockedList();
})();
