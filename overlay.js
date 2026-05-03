// Hard-expiry countdown overlay (shown only on temp-allowed hosts).
// Reads chrome.storage.local.tempAllowedHosts directly so the overlay can
// re-render across SPA navigations and storage updates.
(function () {
  var overlayId = 'impulseblock-countdown-overlay';
  var triggerBannerId = 'impulseblock-trigger-banner';
  var TEMP_ALLOW_KEY = 'tempAllowedHosts';
  var tickHandle = null;
  var currentExpiresAt = 0;

  function t(key) {
    return chrome.i18n.getMessage(key) || '';
  }

  function fmt(remainingMs) {
    if (remainingMs < 0) remainingMs = 0;
    var totalSec = Math.ceil(remainingMs / 1000);
    var min = Math.floor(totalSec / 60);
    var sec = totalSec % 60;
    return min + ':' + (sec < 10 ? '0' + sec : String(sec));
  }

  function ensureOverlay() {
    var existing = document.getElementById(overlayId);
    if (existing) return existing;
    if (!document.body) return null;

    var container = document.createElement('div');
    container.id = overlayId;
    container.style.position = 'fixed';
    container.style.top = '16px';
    container.style.right = '16px';
    container.style.zIndex = '2147483647';
    container.style.background = 'rgba(255, 255, 255, 0.95)';
    container.style.color = '#1A1A1A';
    container.style.padding = '8px 12px';
    container.style.borderRadius = '8px';
    container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    container.style.fontSize = '12px';
    container.style.lineHeight = '1.4';
    container.style.maxWidth = '200px';
    container.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.08)';
    container.style.border = '1px solid rgba(0, 0, 0, 0.06)';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';

    var countdownEl = document.createElement('span');
    countdownEl.className = 'ib-countdown';
    countdownEl.style.fontVariantNumeric = 'tabular-nums';
    countdownEl.style.fontWeight = '500';

    var sep1 = document.createElement('span');
    sep1.textContent = '·';
    sep1.style.color = 'rgba(0, 0, 0, 0.3)';

    var label = document.createElement('span');
    label.textContent = 'ImpulseBlock';
    label.style.color = 'rgba(0, 0, 0, 0.6)';

    var sep2 = document.createElement('span');
    sep2.textContent = '·';
    sep2.style.color = 'rgba(0, 0, 0, 0.3)';

    var link = document.createElement('a');
    link.href = '#';
    link.className = 'ib-reblock-link';
    link.textContent = t('overlay_force_block');
    link.style.color = '#1A1A1A';
    link.style.textDecoration = 'underline';
    link.style.cursor = 'pointer';
    link.addEventListener('click', function (e) {
      e.preventDefault();
      chrome.runtime.sendMessage({
        type: 'FORCE_BLOCK',
        hostname: window.location.hostname,
        url: window.location.href
      });
    });

    container.appendChild(countdownEl);
    container.appendChild(sep1);
    container.appendChild(label);
    container.appendChild(sep2);
    container.appendChild(link);
    document.body.appendChild(container);
    return container;
  }

  function removeOverlay() {
    var el = document.getElementById(overlayId);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    if (tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
    currentExpiresAt = 0;
  }

  function tick() {
    var remaining = currentExpiresAt - Date.now();
    if (remaining <= 0) {
      removeOverlay();
      return;
    }
    var el = document.getElementById(overlayId);
    if (!el) return;
    var countdownEl = el.querySelector('.ib-countdown');
    if (countdownEl) countdownEl.textContent = fmt(remaining);
  }

  function startCountdown(expiresAt) {
    if (expiresAt - Date.now() <= 0) {
      removeOverlay();
      return;
    }
    currentExpiresAt = expiresAt;
    var el = ensureOverlay();
    if (!el) return;
    var countdownEl = el.querySelector('.ib-countdown');
    if (countdownEl) countdownEl.textContent = fmt(expiresAt - Date.now());
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = setInterval(tick, 1000);
  }

  function findExpiresFor(map, hostname) {
    var best = 0;
    for (var key in map) {
      if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
      if (hostname === key || hostname.endsWith('.' + key)) {
        if (map[key] > best) best = map[key];
      }
    }
    return best;
  }

  function syncFromStorage() {
    var hostname = window.location.hostname || '';
    if (!hostname) return;
    chrome.storage.local.get([TEMP_ALLOW_KEY], function (data) {
      var map = (data && data[TEMP_ALLOW_KEY]) || {};
      var expiresAt = findExpiresFor(map, hostname);
      if (expiresAt && expiresAt > Date.now()) {
        startCountdown(expiresAt);
      } else {
        removeOverlay();
      }
    });
  }

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    if (!changes[TEMP_ALLOW_KEY]) return;
    syncFromStorage();
  });

  function createTriggerBanner() {
    if (document.getElementById(triggerBannerId)) return;
    if (!document.body) return;

    var container = document.createElement('div');
    container.id = triggerBannerId;
    container.style.position = 'fixed';
    container.style.top = '56px';
    container.style.right = '16px';
    container.style.zIndex = '2147483647';
    container.style.background = 'rgba(0,0,0,0.85)';
    container.style.color = '#fff';
    container.style.padding = '6px 10px';
    container.style.borderRadius = '6px';
    container.style.fontSize = '12px';
    container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    container.style.maxWidth = '260px';

    var msg = document.createElement('div');
    msg.textContent = t('trigger_suspicious');
    msg.style.marginBottom = '4px';

    var btn = document.createElement('button');
    btn.textContent = t('trigger_add_candidate');
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '11px';
    btn.style.padding = '2px 6px';
    btn.style.borderRadius = '4px';
    btn.style.background = '#ff9800';
    btn.style.color = '#fff';

    btn.addEventListener('click', function () {
      var hostname = window.location.hostname || '';
      if (!hostname) return;
      chrome.runtime.sendMessage({
        type: 'TRIGGER_SUGGEST_BLOCK',
        hostname: hostname
      });
      msg.textContent = t('trigger_request_sent');
    });

    container.appendChild(msg);
    container.appendChild(btn);
    document.body.appendChild(container);
  }

  function runTriggerDetector() {
    try {
      var hostname = (window.location.hostname || '').toLowerCase();
      var title = (document.title || '').toLowerCase();
      var bodyText = '';
      if (document.body && document.body.innerText) {
        bodyText = document.body.innerText.toLowerCase();
      }

      var text = hostname + ' ' + title + ' ' + bodyText.slice(0, 50000);

      var keywords = [
        'porn',
        'xxx',
        'sex',
        'adult',
        'nsfw',
        ' エロ',
        'エロ ',
        'アダルト',
        'セックス',
        '無修正',
        '裏動画',
        'オナニー',
        'ヌード',
        'jav '
      ];

      var score = 0;
      keywords.forEach(function (k) {
        if (text.indexOf(k.toLowerCase()) !== -1) {
          score += 1;
        }
      });

      if (score >= 3) {
        createTriggerBanner();
      }
    } catch (e) {
      // 失敗しても何もしない
    }
  }

  function init() {
    syncFromStorage();
    runTriggerDetector();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
