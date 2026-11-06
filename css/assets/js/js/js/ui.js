// Mise en page commune : écran de connexion, menu latéral, barre du bas.
import { state, signOut } from './api/auth.js';
import { esc, initials, fullName } from './utils.js';
import { getTheme, setTheme } from './theme.js';
import { supabase } from './supabase.js';
import { navigate } from './router.js';

const P = {
  home:    '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  user:    '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  shield:  '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  logout:  '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  sun:     '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:    '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  eye:     '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  info:    '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert:   '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  check:   '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  mail:    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
};
export const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;

/** Liens du menu. Les prochaines étapes y ajouteront Modules, QCM, IA, etc. */
function navItems() {
  const items = [
    { path: '/', label: 'Accueil', icon: 'home' },
    { path: '/profile', label: 'Mon profil', icon: 'user' },
  ];
  if (state.isAdmin) items.push({ path: '/admin', label: 'Administration', icon: 'shield' });
  return items;
}

const app = () => document.getElementById('app');

/** Écran centré (connexion, inscription…). Retourne l'élément où écrire le contenu. */
export function mountAuth() {
  app().innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-brand"><img src="assets/logo.svg" alt=""><span>DREQ</span></div>
        <p class="auth-tagline">Cours, QCM et révision pour étudiants en médecine</p>
        <div class="card" id="auth-content"></div>
      </div>
    </div>`;
  return document.getElementById('auth-content');
}

/** Application connectée avec menu. Retourne l'élément où écrire le contenu. */
export function mountApp(activePath) {
  const links = navItems();
  const nav = (cls) => links.map((l) =>
    `<a href="#${l.path}" ${l.path === activePath ? 'aria-current="page"' : ''}>${icon(l.icon)}${cls === 'tab' ? `<span>${esc(l.label)}</span>` : esc(l.label)}</a>`
  ).join('');
  const name = fullName(state.profile) || state.user?.email || '';

  const existing = document.getElementById('content');
  if (existing && document.querySelector('.shell')) {
    document.querySelector('.sidebar .nav').innerHTML = nav('side');
    document.querySelector('.tabbar').innerHTML = nav('tab');
    existing.innerHTML = '';
    return existing;
  }

  app().innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <a class="brand" href="#/"><img src="assets/logo.svg" alt=""><span>DREQ</span></a>
        <nav class="nav" aria-label="Navigation principale">${nav('side')}</nav>
        <div class="sidebar-foot">
          <div class="user-chip">
            <div class="avatar">${esc(initials(state.profile))}</div>
            <div class="who"><b>${esc(name)}</b><span class="muted small">${esc(state.user?.email || '')}</span></div>
          </div>
          <button class="btn btn-ghost btn-sm" id="btn-logout" type="button">${icon('logout')} Se déconnecter</button>
        </div>
      </aside>
      <div class="main-col">
        <header class="topbar">
          <a class="brand" href="#/"><img src="assets/logo.svg" alt=""><span>DREQ</span></a>
          <span class="spacer"></span>
          <button class="icon-btn" id="btn-theme" type="button" aria-label="Changer le thème"></button>
          <button class="icon-btn" id="btn-logout-m" type="button" aria-label="Se déconnecter">${icon('logout')}</button>
        </header>
        <main id="content" class="content" tabindex="-1"></main>
      </div>
      <nav class="tabbar" aria-label="Navigation">${nav('tab')}</nav>
    </div>`;

  const doLogout = async () => { await signOut(); navigate('/login'); };
  document.getElementById('btn-logout').addEventListener('click', doLogout);
  document.getElementById('btn-logout-m').addEventListener('click', doLogout);
  refreshThemeButton();
  document.getElementById('btn-theme').addEventListener('click', async () => {
    const order = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(getTheme()) + 1) % order.length];
    setTheme(next);
    refreshThemeButton();
    // Mémorise le choix dans le profil (sans bloquer l'interface)
    if (state.user) supabase.from('profiles').update({ theme: next }).eq('id', state.user.id).then(() => {});
  });
  return document.getElementById('content');
}

export function refreshThemeButton() {
  const btn = document.getElementById('btn-theme');
  if (!btn) return;
  const t = getTheme();
  btn.innerHTML = icon(t === 'dark' ? 'moon' : t === 'light' ? 'sun' : 'monitor');
  btn.title = t === 'dark' ? 'Mode sombre' : t === 'light' ? 'Mode clair' : 'Automatique';
}

/** Affiche un message d'erreur dans un formulaire. */
export function showFormError(form, message) {
  let box = form.querySelector('.form-error');
  if (!box) {
    box = document.createElement('div');
    box.className = 'form-error';
    box.setAttribute('role', 'alert');
    form.prepend(box);
  }
  box.textContent = message;
}
export function clearFormError(form) { form.querySelector('.form-error')?.remove(); }

/** Bouton "œil" pour afficher / masquer un mot de passe. */
export function bindPasswordToggles(root) {
  root.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.innerHTML = icon('eye');
    btn.addEventListener('click', () => {
      const input = btn.parentElement.querySelector('input');
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });
}
