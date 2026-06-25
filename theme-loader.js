// Reads the user's chosen block-screen theme and applies it before render.
// Theme is stored under 'blockTheme' in chrome.storage.local (set from the popup, F3).
// Falls back to 'sea' when nothing is stored.
//
// Also applies the user's custom pause image (F4): stored under 'pauseImage' as a
// base64 data URL. blocked.js sets #cheer-image to the bundled language default
// synchronously; this file only overrides via async storage callbacks, which run
// AFTER blocked.js, so a custom image wins and the default is left untouched when
// none is set. Reset (pauseImage removed) restores the language default live.
(function () {
  var DEFAULT_THEME = 'sea';
  var VALID = ['sea', 'sun', 'moon', 'sky', 'wood'];

  function apply(theme) {
    var t = VALID.indexOf(theme) !== -1 ? theme : DEFAULT_THEME;
    document.body.setAttribute('data-theme', t);
  }

  function defaultPauseSrc() {
    var lang = '';
    try { lang = (chrome.i18n.getUILanguage() || '').toLowerCase(); } catch (e) {}
    return lang.indexOf('ja') === 0 ? 'assets/taero_ja.png' : 'assets/taero_en.png';
  }

  function applyPauseImage(dataUrl) {
    var img = document.getElementById('cheer-image');
    if (!img) return;
    img.src = dataUrl || defaultPauseSrc();
  }

  try {
    chrome.storage.local.get(['blockTheme', 'pauseImage'], function (data) {
      apply(data && data.blockTheme);
      // Only override when a custom image exists; otherwise leave blocked.js's default.
      if (data && data.pauseImage) applyPauseImage(data.pauseImage);
    });
    // live-update if the user changes theme or pause image while a blocked tab is open
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== 'local') return;
      if (changes.blockTheme) {
        apply(changes.blockTheme.newValue);
      }
      if (changes.pauseImage) {
        // newValue undefined on reset -> applyPauseImage restores the language default
        applyPauseImage(changes.pauseImage.newValue);
      }
    });
  } catch (e) {
    apply(DEFAULT_THEME);
  }
})();
