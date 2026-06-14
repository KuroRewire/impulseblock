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

  // ===== F3: block-screen theme picker (added — existing logic above is untouched) =====
  var THEMES = [
    { id: 'bold', name: 'Bold', color: '#e8482b' },
    { id: 'focus', name: 'Focus', color: '#3d7dff' },
    { id: 'calm', name: 'Calm', color: '#ff9f5a' },
    { id: 'minimal', name: 'Minimal', color: '#4f46e5' },
    { id: 'zen', name: 'Zen', color: '#6a5e4d' }
  ];
  var THEME_DEFAULT = 'minimal';
  var themeGrid = document.getElementById('theme-grid');
  var themeButtons = {};

  function highlightTheme(selected) {
    Object.keys(themeButtons).forEach(function (id) {
      themeButtons[id].classList.toggle('selected', id === selected);
    });
  }

  function buildThemePicker() {
    if (!themeGrid) return;
    THEMES.forEach(function (th) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-swatch';
      btn.setAttribute('data-theme-id', th.id);

      var dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.backgroundColor = th.color;

      var label = document.createElement('span');
      label.textContent = th.name;

      btn.appendChild(dot);
      btn.appendChild(label);
      btn.addEventListener('click', function () {
        chrome.storage.local.set({ blockTheme: th.id }, function () {
          highlightTheme(th.id);
        });
      });

      themeButtons[th.id] = btn;
      themeGrid.appendChild(btn);
    });

    chrome.storage.local.get(['blockTheme'], function (data) {
      highlightTheme((data && data.blockTheme) || THEME_DEFAULT);
    });
  }

  buildThemePicker();

  // ===== F4: custom pause image (added — compress/resize happens here in the popup) =====
  var PAUSE_MAX_EDGE = 800;        // longest side, in px, after downscale
  var PAUSE_JPEG_QUALITY = 0.85;
  var PAUSE_MAX_BYTES = 1024 * 1024; // reject if still > ~1MB after compression

  // Lightweight neutral placeholder for the no-custom-image / default state and as an
  // onerror fallback. The previous default pulled the full 2000x2000, ~3MB taero PNG into
  // a 56px thumbnail, which could leave the preview blank; this inline SVG paints instantly
  // and never fails to load, so the preview always shows something.
  var PAUSE_PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">' +
    '<rect width="56" height="56" rx="8" fill="#f0f0f0"/>' +
    '<circle cx="20" cy="21" r="5" fill="#cdcdcd"/>' +
    '<path d="M10 45 L24 30 L33 39 L41 31 L47 45 Z" fill="#cdcdcd"/>' +
    '</svg>'
  );

  var pauseInput = document.getElementById('pause-image-input');
  var pausePreview = document.getElementById('pause-image-preview');
  var pauseReset = document.getElementById('pause-image-reset');
  var pauseStatus = document.getElementById('pause-image-status');

  // Never leave the preview blank/broken: any failed image load falls back to the placeholder.
  if (pausePreview) {
    pausePreview.addEventListener('error', function () {
      if (pausePreview.src !== PAUSE_PLACEHOLDER) pausePreview.src = PAUSE_PLACEHOLDER;
    });
  }

  function setPauseStatus(msg) {
    if (pauseStatus) pauseStatus.textContent = msg || '';
  }

  function showPausePreview(src) {
    if (pausePreview) pausePreview.src = src || PAUSE_PLACEHOLDER;
  }

  function loadPausePreview() {
    chrome.storage.local.get(['pauseImage'], function (data) {
      showPausePreview(data && data.pauseImage ? data.pauseImage : PAUSE_PLACEHOLDER);
    });
  }

  function dataUrlByteSize(dataUrl) {
    var i = dataUrl.indexOf(',');
    var b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
    var pad = 0;
    if (b64.charAt(b64.length - 1) === '=') pad = b64.charAt(b64.length - 2) === '=' ? 2 : 1;
    return Math.floor(b64.length * 3 / 4) - pad;
  }

  function downscaleToDataUrl(image) {
    var w = image.naturalWidth || image.width;
    var h = image.naturalHeight || image.height;
    if (!w || !h) return null;
    var scale = Math.min(1, PAUSE_MAX_EDGE / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // white backdrop so transparent PNGs don't turn black when re-encoded as JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(image, 0, 0, cw, ch);
    return canvas.toDataURL('image/jpeg', PAUSE_JPEG_QUALITY);
  }

  if (pauseInput) {
    pauseInput.addEventListener('change', function () {
      setPauseStatus('');
      var file = pauseInput.files && pauseInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var image = new Image();
        image.onload = function () {
          var dataUrl = null;
          try { dataUrl = downscaleToDataUrl(image); } catch (e) { dataUrl = null; }
          if (!dataUrl) {
            // couldn't decode/encode (e.g. dimensionless SVG, unsupported codec) — not a size issue
            setPauseStatus(t('popup_image_unsupported'));
            pauseInput.value = '';
            return;
          }
          if (dataUrlByteSize(dataUrl) > PAUSE_MAX_BYTES) {
            setPauseStatus(t('popup_image_too_large'));
            pauseInput.value = '';
            return;
          }
          chrome.storage.local.set({ pauseImage: dataUrl }, function () {
            if (chrome.runtime.lastError) {
              setPauseStatus(t('popup_image_too_large'));
              pauseInput.value = '';
              return;
            }
            showPausePreview(dataUrl);
          });
        };
        image.onerror = function () {
          setPauseStatus(t('popup_image_unsupported'));
          pauseInput.value = '';
        };
        image.src = reader.result;
      };
      reader.onerror = function () {
        setPauseStatus(t('popup_image_unsupported'));
        pauseInput.value = '';
      };
      reader.readAsDataURL(file);
    });
  }

  if (pauseReset) {
    pauseReset.addEventListener('click', function () {
      chrome.storage.local.remove('pauseImage', function () {
        if (pauseInput) pauseInput.value = '';
        setPauseStatus('');
        showPausePreview(PAUSE_PLACEHOLDER);
      });
    });
  }

  showPausePreview(PAUSE_PLACEHOLDER); // paint neutral placeholder instantly; resolved below
  loadPausePreview();
})();
