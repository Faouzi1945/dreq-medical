
// Applique le thème AVANT l'affichage de la page (évite le flash blanc en mode sombre).
(function () {
  try {
    var theme = localStorage.getItem('dreq-theme') || 'dark';
    var accent = localStorage.getItem('dreq-accent') || 'teal';
    var dark = theme === 'dark' ||
      (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    root.setAttribute('data-mode', dark ? 'dark' : 'light');
    root.setAttribute('data-accent', accent);
  } catch (e) { /* stockage indisponible : thème clair par défaut */ }
})();
