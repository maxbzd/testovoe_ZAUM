/* Применяет сохранённую тему до первой отрисовки, чтобы не было вспышки. */
(function () {
  try {
    var mode = window.localStorage.getItem('bloggers:theme');
    if (mode === 'light' || mode === 'dark') {
      document.documentElement.dataset.theme = mode;
      // Цвета те же, что THEME_COLORS в src/lib/appearance.ts.
      var color = mode === 'dark' ? '#0a0a0c' : '#ffffff';
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      for (var i = 0; i < metas.length; i += 1) metas[i].content = color;
    }
  } catch {
    /* localStorage недоступен — остаётся системная тема */
  }
})();
