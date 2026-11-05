/* Применяет сохранённую тему до первой отрисовки, чтобы не было вспышки. */
(function () {
  try {
    var mode = window.localStorage.getItem('bloggers:theme');
    if (mode === 'light' || mode === 'dark') document.documentElement.dataset.theme = mode;
  } catch {
    /* localStorage недоступен — остаётся системная тема */
  }
})();
