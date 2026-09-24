// Apply theme and reading font before first paint; ThemeController owns them afterwards.
(function initializeTheme() {
  var settings = {};
  try { settings = JSON.parse(localStorage.getItem('myos-settings') || '{}') || {}; } catch (_) {}
  var mode = settings.themeMode || 'system';
  var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.readingFont = settings.readingFont === 'serif' ? 'serif' : 'sans';
})();
