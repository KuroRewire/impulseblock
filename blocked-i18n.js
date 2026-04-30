(function () {
  // Scripts are at end of <body>; all [data-i18n] nodes already exist. Applying
  // here avoids missing DOMContentLoaded (listener registered after it already fired).
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    var key = el.getAttribute('data-i18n');
    var msg = chrome.i18n.getMessage(key);
    if (!msg) return;
    if (el.tagName === 'IMG') {
      el.setAttribute('alt', msg);
    } else {
      el.textContent = msg;
    }
  });
  document.title = chrome.i18n.getMessage('extName') || 'ImpulseBlock';
})();
