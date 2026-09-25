// Apply the theme, reading font, and line width before first paint; ThemeController owns them afterwards.
(function initializeTheme() {
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem('myos-next-appearance') || '{}') || {}; } catch (_) {}
  var theme = saved.theme || 'system';
  var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.readingFont = saved.readingFont === 'serif' ? 'serif' : 'sans';
  document.documentElement.dataset.lineWidth = saved.lineWidth === 'narrow' || saved.lineWidth === 'wide' ? saved.lineWidth : 'normal';
})();
