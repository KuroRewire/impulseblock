// Reads the user's chosen block-screen theme and applies it before render.
// Theme is stored under 'blockTheme' in chrome.storage.local (set from the popup, F3).
// Falls back to 'minimal' when nothing is stored.
(function () {
  var DEFAULT_THEME = 'minimal';
  var VALID = ['bold', 'focus', 'calm', 'minimal', 'zen'];

  function apply(theme) {
    var t = VALID.indexOf(theme) !== -1 ? theme : DEFAULT_THEME;
    document.body.setAttribute('data-theme', t);
  }

  try {
    chrome.storage.local.get(['blockTheme'], function (data) {
      apply(data && data.blockTheme);
    });
    // live-update if the user changes theme while a blocked tab is open
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area === 'local' && changes.blockTheme) {
        apply(changes.blockTheme.newValue);
      }
    });
  } catch (e) {
    apply(DEFAULT_THEME);
  }
})();
