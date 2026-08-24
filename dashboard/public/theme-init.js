(function initializeTheme() {
  var stored = localStorage.getItem('myos-settings');
  var mode = 'system';
  try { mode = JSON.parse(stored || '{}').themeMode || 'system'; } catch (_) {}
  var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
