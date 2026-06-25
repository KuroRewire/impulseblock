// Hard-expiry countdown overlay (shown only on temp-allowed hosts).
// Reads chrome.storage.local.tempAllowedHosts directly so the overlay can
// re-render across SPA navigations and storage updates.
(function () {
  var overlayId = 'impulseblock-countdown-overlay';
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

  // Injects the overlay's stylesheet once (approach B: <style> injection — enables @font-face,
  // breathing/pulse @keyframes and :hover, which inline styles can't do). All rules are scoped
  // under #impulseblock-countdown-overlay with an ibov- prefix to avoid host-page CSS clashes.
  function injectOverlayStyle() {
    if (document.getElementById('ibov-style')) return; // inject once
    function face(family, weight, file) {
      return "@font-face{font-family:'" + family + "';font-style:normal;font-weight:" + weight +
        ";font-display:swap;src:url('" + chrome.runtime.getURL('assets/fonts/' + file) +
        "') format('woff2');}";
    }
    var ov = '#' + overlayId;
    var css = [
      face('Inter', 400, 'inter-400.woff2'),
      face('Inter', 500, 'inter-500.woff2'),
      face('Inter', 600, 'inter-600.woff2'),
      face('Space Grotesk', 400, 'space-grotesk-400.woff2'),
      face('Space Grotesk', 500, 'space-grotesk-500.woff2'),
      // container — gated by .ibov so the new look activates only when Step 3 adds the class + child markup
      ov + ".ibov{position:fixed !important;top:16px !important;right:16px !important;left:auto !important;bottom:auto !important;z-index:2147483647 !important;display:inline-flex !important;align-items:center !important;gap:12px !important;margin:0 !important;padding:11px 12px 11px 20px !important;background:rgba(255,255,255,.97) !important;border:1px solid #e0e7ff !important;border-radius:999px !important;box-shadow:0 6px 22px rgba(79,70,229,.18) !important;font-family:'Inter',system-ui,sans-serif !important;font-size:13px !important;line-height:1.2 !important;white-space:nowrap !important;width:auto !important;max-width:none !important;}",
      ov + " .ibov-mark{width:22px !important;height:22px !important;flex:none !important;display:block !important;}",
      ov + " .ibov-mark svg{width:100% !important;height:100% !important;display:block !important;overflow:visible !important;}",
      ov + " .ibov-ring{transform-box:fill-box;transform-origin:center;animation:ibovRing 5.6s ease-in-out infinite !important;}",
      ov + " .ibov-bar{transform-box:fill-box;transform-origin:center;animation:ibovBar 5.6s ease-in-out infinite !important;}",
      ov + " .ibov-bar.b2{animation-delay:.14s !important;}",
      "@keyframes ibovRing{0%,100%{transform:scale(.92);}50%{transform:scale(1);}}",
      "@keyframes ibovBar{0%,100%{transform:scaleY(.8);opacity:.8;}50%{transform:scaleY(1.05);opacity:1;}}",
      ov + " .ibov-time{color:#4338ca !important;font-weight:700 !important;font-family:'Space Grotesk',monospace !important;font-size:17px !important;letter-spacing:-.01em !important;font-variant-numeric:tabular-nums !important;}",
      ov + " .ibov-sep{color:#a5b4fc !important;}",
      ov + " .ibov-lbl{color:#4338ca !important;font-weight:500 !important;font-size:12px !important;}",
      ov + " a.ibov-reblock{color:#4f46e5 !important;font-weight:600 !important;font-size:13px !important;text-decoration:none !important;cursor:pointer !important;display:inline-block !important;transform-origin:center;animation:ibovReblockPulse 5.6s ease-in-out infinite !important;}",
      ov + " a.ibov-reblock:hover{color:#4338ca !important;}",
      "@keyframes ibovReblockPulse{0%,100%{transform:scale(.97);opacity:.9;}50%{transform:scale(1.06);opacity:1;}}",
      "@media (prefers-reduced-motion:reduce){" +
        ov + " .ibov-ring," +
        ov + " .ibov-bar," +
        ov + " .ibov-reblock{animation:none !important;}}"
    ].join('\n');
    var styleEl = document.createElement('style');
    styleEl.id = 'ibov-style';
    styleEl.textContent = css;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  function ensureOverlay() {
    var existing = document.getElementById(overlayId);
    if (existing) return existing;
    if (!document.body) return null;

    injectOverlayStyle();

    var container = document.createElement('div');
    container.id = overlayId;
    container.className = 'ibov'; // activates the injected .ibov stylesheet (look lives in injectOverlayStyle)

    // breathing mark (enso: ring + two pause bars) — same signature as the stop screen / popup
    var markEl = document.createElement('span');
    markEl.className = 'ibov-mark';
    markEl.innerHTML =
      '<svg viewBox="0 0 32 32" fill="none">' +
        '<circle class="ibov-ring" cx="16" cy="16" r="14.5" stroke="#4f46e5" stroke-width="2"/>' +
        '<rect class="ibov-bar b1" x="11.5" y="9.5" width="3" height="13" rx="1.5" fill="#4f46e5"/>' +
        '<rect class="ibov-bar b2" x="17.5" y="9.5" width="3" height="13" rx="1.5" fill="#4f46e5"/>' +
      '</svg>';

    var countdownEl = document.createElement('span');
    countdownEl.className = 'ib-countdown ibov-time'; // ib-countdown kept (tick/startCountdown querySelector)

    var sep1 = document.createElement('span');
    sep1.className = 'ibov-sep';
    sep1.textContent = '·';

    var label = document.createElement('span');
    label.className = 'ibov-lbl';
    label.textContent = 'ImpulseBlock';

    var sep2 = document.createElement('span');
    sep2.className = 'ibov-sep';
    sep2.textContent = '·';

    var link = document.createElement('a');
    link.href = '#';
    link.className = 'ib-reblock-link ibov-reblock';
    link.textContent = t('overlay_force_block');
    link.addEventListener('click', function (e) {
      e.preventDefault();
      chrome.runtime.sendMessage({
        type: 'FORCE_BLOCK',
        hostname: window.location.hostname,
        url: window.location.href
      });
    });

    container.appendChild(markEl);
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

  function init() {
    syncFromStorage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
