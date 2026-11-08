// Thème clair / sombre / automatique + couleur d'accent, mémorisés dans le navigateur.

export const ACCENTS = [
  { id: 'teal',   label: 'Turquoise', color: '#0f766e' },
  { id: 'blue',   label: 'Bleu',      color: '#1d4ed8' },
  { id: 'violet', label: 'Violet',    color: '#6d28d9' },
  { id: 'rose',   label: 'Rose',      color: '#be123c' },
  { id: 'amber',  label: 'Ambre',     color: '#b45309' },
  { id: 'green',  label: 'Vert',      color: '#15803d' },
];

const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function read(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* ignoré */ }
}

export function getTheme()  { return read('dreq-theme', 'dark'); }
export function getAccent() { return read('dreq-accent', 'teal'); }

export function applyTheme(theme = getTheme(), accent = getAccent()) {
  const dark = theme === 'dark' || (theme === 'system' && media && media.matches);
  const root = document.documentElement;
  root.setAttribute('data-mode', dark ? 'dark' : 'light');
  root.setAttribute('data-accent', ACCENTS.some((a) => a.id === accent) ? accent : 'teal');
}

export function setTheme(theme) { write('dreq-theme', theme); applyTheme(); }
export function setAccent(accent) { write('dreq-accent', accent); applyTheme(); }

/** Utilisé à la connexion : applique les préférences enregistrées dans le profil. */
export function adoptProfilePrefs(profile) {
  if (!profile) return;
  if (['light', 'dark', 'system'].includes(profile.theme)) write('dreq-theme', profile.theme);
  if (profile.accent) write('dreq-accent', profile.accent);
  applyTheme();
}

if (media) {
  media.addEventListener('change', () => { if (getTheme() === 'system') applyTheme(); });
}
