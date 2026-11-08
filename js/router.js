// Navigation par "#/chemin" (compatible GitHub Pages).
import { state } from './api/auth.js';

// access : 'public' (visiteurs seulement) | 'user' (connecté) | 'admin' (administrateur)
const ROUTES = [
  { path: '/login',          page: () => import('./pages/login.js'),    access: 'public' },
  { path: '/register',       page: () => import('./pages/register.js'), access: 'public' },
  { path: '/forgot',         page: () => import('./pages/forgot.js'),   access: 'public' },
  { path: '/reset-password', page: () => import('./pages/reset.js'),    access: 'any' },
  { path: '/',               page: () => import('./pages/dashboard.js'), access: 'user' },
  { path: '/profile',        page: () => import('./pages/profile.js'),  access: 'user' },
  { path: '/admin',          page: () => import('./pages/admin.js'),    access: 'admin' },
];

export function currentPath() {
  const h = location.hash;
  if (!h.startsWith('#/')) return '/';
  return h.slice(1).split('?')[0] || '/';
}

export function navigate(path) {
  if (currentPath() === path && location.hash === '#' + path) render();
  else location.hash = '#' + path;
}

let rendering = 0;

export async function render() {
  const ticket = ++rendering;
  let path = currentPath();
  const route = ROUTES.find((r) => r.path === path) || ROUTES.find((r) => r.path === '/');
  path = route.path;

  const loggedIn = !!state.user;
  if (route.access === 'public' && loggedIn) return navigate('/');
  if ((route.access === 'user' || route.access === 'admin') && !loggedIn) return navigate('/login');
  if (route.access === 'admin' && !state.isAdmin) return navigate('/');

  try {
    const mod = await route.page();
    if (ticket !== rendering) return; // une navigation plus récente a pris le relais
    window.scrollTo(0, 0);
    await mod.render();
  } catch (err) {
    console.error(err);
    const app = document.getElementById('app');
    app.innerHTML = '<div class="setup-box"><div class="card"><h2>Oups, une erreur est survenue</h2>' +
      '<p class="muted">Rechargez la page. Si le problème continue, contactez le support DREQ.</p></div></div>';
  }
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  render();
}
