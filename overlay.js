// 再ブロックオーバーレイ（TEMP_ALLOW 中のタブだけ表示）
(function () {
  var overlayId = 'impulseblock-force-overlay';
  var triggerBannerId = 'impulseblock-trigger-banner';

  function t(key) {
    return chrome.i18n.getMessage(key) || '';
  }

  function createOverlay() {
    if (document.getElementById(overlayId)) return;

    var container = document.createElement('div');
    container.id = overlayId;
    container.style.position = 'fixed';
    container.style.top = '8px';
    container.style.right = '8px';
    container.style.zIndex = '2147483647';
    container.style.background = 'rgba(0,0,0,0.8)';
    container.style.color = '#fff';
    container.style.padding = '6px 10px';
    container.style.borderRadius = '6px';
    container.style.fontSize = '12px';
    container.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '6px';

    var label = document.createElement('span');
    label.textContent = t('extName');

    var btn = document.createElement('button');
    btn.textContent = t('overlay_force_block');
    btn.style.border = 'none';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '11px';
    btn.style.padding = '2px 6px';
    btn.style.borderRadius = '4px';
    btn.style.background = '#ff5c5c';
    btn.style.color = '#fff';

    btn.addEventListener('click', function () {
      chrome.runtime.sendMessage({
        type: 'FORCE_BLOCK',
        hostname: window.location.hostname,
        url: window.location.href
      });
    });

    container.appendChild(label);
    container.appendChild(btn);
    document.body.appendChild(container);
  }

  function createTriggerBanner() {
    if (document.getElementById(triggerBannerId)) return;

    var container = document.createElement('div');
    container.id = triggerBannerId;
    container.style.position = 'fixed';
    container.style.top = '40px';
    container.style.right = '8px';
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
    var hostname = window.location.hostname || '';
    chrome.runtime.sendMessage(
      {
        type: 'OVERLAY_CHECK',
        hostname: hostname
      },
      function (res) {
        if (res && res.show) {
          createOverlay();
        }
      }
    );
    runTriggerDetector();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
