(function () {
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
  document.title = chrome.i18n.getMessage('extName') || 'PD Counter';
})();
