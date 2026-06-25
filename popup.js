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
        attemptAddSite(hostname); // monetization: entitlement + free 5-site cap gate (defined below)
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
    { id: 'sea', name: 'Sea', color: '#4f46e5' },
    { id: 'sun', name: 'Sun', color: '#e9883e' },
    { id: 'moon', name: 'Moon', color: '#6366f1' },
    { id: 'sky', name: 'Sky', color: '#3f87c8' },
    { id: 'wood', name: 'Wood', color: '#6f7a4e' }
  ];
  var THEME_DEFAULT = 'sea';
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

  // ===== Monetization: ExtPay entitlement + free 5-site cap + neutral dialogs (hardened) =====
  // Unlimited if grandfathered (existing user) OR Pro. The cap (5) applies only to free,
  // non-grandfathered users and is verified via ExtPay ONLY at the 6th site (never for sites 1–5).
  // STRICT fail-open (FIX 1): an unverifiable check grants grace ONLY to a user we've actually seen
  // pay before (everPaid). A brand-new free user who blocks extensionpay.com is NOT granted unlimited.
  var FREE_SITE_LIMIT = 5;
  var GETUSER_TIMEOUT_MS = 4000;
  var extpay = (typeof ExtPay !== 'undefined') ? ExtPay('impulseblock') : null;

  var capDialog = document.getElementById('cap-dialog');
  var capReplaceBtn = document.getElementById('cap-replace');
  var capKeepBtn = document.getElementById('cap-keep');
  var capUpgradeBtn = document.getElementById('cap-upgrade');
  var capReplaceHint = document.getElementById('cap-replace-hint');
  var capReplaceList = document.getElementById('cap-replace-list');
  var verifyDialog = document.getElementById('verify-dialog');
  var verifyRetryBtn = document.getElementById('verify-retry');
  var verifyRestoreBtn = document.getElementById('verify-restore');
  var verifyUpgradeBtn = document.getElementById('verify-upgrade');
  var restoreLink = document.getElementById('restore-link');
  var planStatusEl = document.getElementById('plan-status');
  var pendingHost = null; // host the user is trying to add when a dialog appears

  function openPaymentPage() { if (extpay) { try { extpay.openPaymentPage('pro'); } catch (e) {} } }
  function openRestorePage() { if (extpay) { try { extpay.openLoginPage(); } catch (e) {} } } // FIX 5

  // FIX B: ONLY the persisted flag grants grandfather — never re-derive `true` from blockedHosts.
  // A missing flag is NOT proof of a legacy user: it can also mean the install-time `false` write
  // failed for a NEW user. So when grandfathered is undefined we treat the user as NOT grandfathered
  // for this attempt (no write — onInstalled is the single authoritative writer, with verify+retry).
  //   - New users: reliably grandfathered:false via onInstalled('install') verify+retry → unlimited
  //     can NEVER leak to a new user, even if a storage write transiently fails.
  //   - Legacy 124: reliably grandfathered:true via onInstalled('update') (completes before the popup).
  //   - Accepted tradeoff: a legacy user whose onInstalled('update') write double-fails would fall to
  //     the cap (vanishingly rare). Existing-user protection on the COMMON path is preserved.
  // cb(grandfathered:boolean, storageError:boolean).
  function ensureGrandfatherFlag(cb) {
    chrome.storage.local.get(['grandfathered'], function (res) {
      if (chrome.runtime.lastError) { cb(undefined, true); return; } // FIX 4: storage error → caller protective
      cb(!!(res && res.grandfathered === true), false);
    });
  }

  // FIX 1: resolve entitlement at the 6th site. Returns { unlimited, paid, grandfathered, verified }.
  // verified:false = "couldn't determine and not a known prior payer" → caller shows the verify dialog.
  function getEntitlement(cb) {
    chrome.storage.local.get(['grandfathered', 'everPaid'], function (res) {
      if (chrome.runtime.lastError) { // FIX 4: storage read error → protective (allow this add), unverified
        cb({ unlimited: true, paid: false, grandfathered: false, verified: false });
        return;
      }
      var gf = res && res.grandfathered;
      var everPaid = !!(res && res.everPaid);
      if (gf === true) { cb({ unlimited: true, paid: false, grandfathered: true, verified: true }); return; }
      var settled = false;
      function done(obj) { if (!settled) { settled = true; cb(obj); } }
      function cantVerify() {
        // STRICT: grace ONLY a user we've confirmed paid before. Otherwise we could not verify →
        // do NOT grant unlimited (closes the "block extensionpay.com = free unlimited" hole).
        done(everPaid
          ? { unlimited: true, paid: false, grandfathered: false, verified: true }
          : { unlimited: false, paid: false, grandfathered: false, verified: false });
      }
      if (!extpay) { cantVerify(); return; }
      try {
        var p = extpay.getUser();
        if (p && typeof p.then === 'function') {
          var timer = setTimeout(cantVerify, GETUSER_TIMEOUT_MS); // hang → couldn't verify (NOT blanket unlimited)
          p.then(function (user) {
            clearTimeout(timer);
            if (user && user.paid) {
              chrome.storage.local.set({ everPaid: true }); // remember a real payment for offline grace
              done({ unlimited: true, paid: true, grandfathered: false, verified: true });
            } else {
              done({ unlimited: false, paid: false, grandfathered: false, verified: true }); // confirmed free
            }
          }).catch(function () { clearTimeout(timer); cantVerify(); });
        } else {
          cantVerify(); // unexpected non-promise
        }
      } catch (e) { cantVerify(); }
    });
  }

  function hideDialogs() {
    if (capDialog) capDialog.hidden = true;
    if (capReplaceHint) capReplaceHint.hidden = true;
    if (capReplaceList) { capReplaceList.hidden = true; capReplaceList.innerHTML = ''; }
    if (verifyDialog) verifyDialog.hidden = true;
    pendingHost = null;
  }

  function showCapDialog(hostname) {
    pendingHost = hostname;
    if (verifyDialog) verifyDialog.hidden = true;
    if (capReplaceHint) capReplaceHint.hidden = true;
    if (capReplaceList) { capReplaceList.hidden = true; capReplaceList.innerHTML = ''; }
    if (capDialog) capDialog.hidden = false;
  }

  function showVerifyDialog(hostname) { // FIX 1b
    pendingHost = hostname;
    if (capDialog) capDialog.hidden = true;
    if (verifyDialog) verifyDialog.hidden = false;
  }

  // FIX 3: atomic guarded add — re-checks the cap at write time so rapid clicks / concurrent popups
  // can't push a capped user past 5. unlimited => no cap.
  function commitAddSite(hostname, unlimited) {
    var limit = unlimited ? Infinity : FREE_SITE_LIMIT;
    PDBlockCore.addBlockedHostIfAllowed(hostname, limit, function (r) {
      r = r || {};
      if (r.added) {
        status.textContent = chrome.i18n.getMessage('popup_status_blocked', [hostname]);
      } else if (r.reason === 'cap') {
        showCapDialog(hostname); // a race filled the last slot → offer replace/keep/upgrade, not a silent drop
        return;
      } else if (r.reason === 'storage_error') {
        // FIX C: don't claim the site was blocked when storage failed; never silently drop existing sites.
        status.textContent = t('popup_status_save_error');
        return;
      } else {
        status.textContent = chrome.i18n.getMessage('popup_status_already', [hostname]);
      }
      loadBlockedList();
      updatePlanStatus();
    });
  }

  // Entry point from the Block button. ExtPay is verified ONLY at the 6th site (FIX 1b).
  function attemptAddSite(hostname) {
    ensureGrandfatherFlag(function (gf, storageError) {
      if (storageError) { commitAddSite(hostname, true); return; } // FIX 4: protective (existing-user > revenue)
      if (gf === true) { commitAddSite(hostname, true); return; } // grandfathered → unlimited, no ExtPay
      PDBlockCore.getBlockedHosts(function (hosts) {
        hosts = hosts || [];
        if (hosts.indexOf(hostname) !== -1) { commitAddSite(hostname, false); return; } // already blocked → no-op
        if (hosts.length < FREE_SITE_LIMIT) { commitAddSite(hostname, false); return; } // under cap → add, no ExtPay
        // 6th site → verify entitlement now.
        getEntitlement(function (ent) {
          if (ent.unlimited) { commitAddSite(hostname, true); return; } // paid / everPaid grace / storage-protective
          if (ent.verified) { showCapDialog(hostname); } // confirmed free at the cap → replace / keep / upgrade
          else { showVerifyDialog(hostname); } // couldn't verify → try again / restore / upgrade
        });
      });
    });
  }

  // Replace flow: list current sites; picking one removes it and adds the pending host.
  function buildReplaceList() {
    if (!capReplaceList) return;
    PDBlockCore.getBlockedHosts(function (hosts) {
      capReplaceList.innerHTML = '';
      (hosts || []).forEach(function (host) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = host;
        b.addEventListener('click', function () {
          var newHost = pendingHost;
          // Re-read live hosts (not the render-time snapshot) so a concurrent delete isn't undone.
          PDBlockCore.getBlockedHosts(function (current, readErr) {
            // FIX C: on a read error, NEVER write a possibly-empty list (that would wipe the user's
            // blocked sites). Abort with the calm save-error message instead.
            if (readErr) { hideDialogs(); status.textContent = t('popup_status_save_error'); return; }
            var next = (current || []).filter(function (h) { return h !== host; });
            PDBlockCore.setBlockedHosts(next, function (writeErr) {
              // FIX C: don't claim the replace worked if the write failed (old list stays intact).
              if (writeErr) { hideDialogs(); status.textContent = t('popup_status_save_error'); return; }
              hideDialogs();
              commitAddSite(newHost, false); // freed a slot → now under the cap
            });
          });
        });
        capReplaceList.appendChild(b);
      });
      if (capReplaceHint) capReplaceHint.hidden = false;
      capReplaceList.hidden = false;
    });
  }

  if (capReplaceBtn) capReplaceBtn.addEventListener('click', buildReplaceList);
  if (capKeepBtn) capKeepBtn.addEventListener('click', hideDialogs);
  if (capUpgradeBtn) capUpgradeBtn.addEventListener('click', openPaymentPage);
  if (verifyUpgradeBtn) verifyUpgradeBtn.addEventListener('click', openPaymentPage);
  if (verifyRestoreBtn) verifyRestoreBtn.addEventListener('click', openRestorePage);
  if (verifyRetryBtn) verifyRetryBtn.addEventListener('click', function () {
    var h = pendingHost;
    hideDialogs();
    if (h) attemptAddSite(h); // re-run the gate (re-checks ExtPay)
  });
  if (restoreLink) restoreLink.addEventListener('click', function (e) { e.preventDefault(); openRestorePage(); });

  // Subtle, factual plan indicator. Read fresh on popup open; also ensures the grandfather flag.
  function setPlanStatus(text) { if (planStatusEl) planStatusEl.textContent = text || ''; }
  function updatePlanStatus() {
    ensureGrandfatherFlag(function (gf, storageError) {
      if (storageError) { setPlanStatus(''); return; } // FIX 4: don't mislabel the plan on a storage error
      if (gf === true) { setPlanStatus(t('popup_plan_unlimited')); return; }
      chrome.storage.local.get(['blockedHosts', 'everPaid'], function (res) {
        if (chrome.runtime.lastError) { setPlanStatus(''); return; } // FIX 4: don't mislabel on a storage error
        var count = ((res && res.blockedHosts) || []).length;
        var everPaid = !!(res && res.everPaid);
        var freeLabel = chrome.i18n.getMessage('popup_plan_free', [String(count), String(FREE_SITE_LIMIT)]);
        if (!extpay) { setPlanStatus(everPaid ? t('popup_plan_pro') : freeLabel); return; }
        var settled = false;
        function show(text) { if (!settled) { settled = true; setPlanStatus(text); } }
        try {
          var p = extpay.getUser();
          if (p && typeof p.then === 'function') {
            var timer = setTimeout(function () { show(everPaid ? t('popup_plan_pro') : freeLabel); }, GETUSER_TIMEOUT_MS);
            p.then(function (user) {
              clearTimeout(timer);
              if (user && user.paid) { chrome.storage.local.set({ everPaid: true }); show(t('popup_plan_pro')); }
              else show(freeLabel);
            }).catch(function () { clearTimeout(timer); show(everPaid ? t('popup_plan_pro') : freeLabel); });
          } else { show(everPaid ? t('popup_plan_pro') : freeLabel); }
        } catch (e) { show(everPaid ? t('popup_plan_pro') : freeLabel); }
      });
    });
  }

  updatePlanStatus(); // fresh on popup open; ensures the grandfather flag + shows the plan
})();
