// Point d'entrée de DREQ.
import { configProblem } from './supabase.js';
import { applyTheme } from './theme.js';
import { esc } from './utils.js';

applyTheme();

function showSetupProblem(kind) {
  const app = document.getElementById('app');
  const text = kind === 'secret'
    ? "La clé placée dans <code>js/config.js</code> est une clé SECRÈTE (service_role). Par sécurité, DREQ refuse de démarrer. Remplacez-la par la clé publique (« anon » ou « publishable »), puis régénérez la clé secrète dans Supabase."
    : "Ouvrez <code>js/config.js</code> et collez la clé publique de Supabase à la place de <code>COLLEZ_ICI_VOTRE_CLE_PUBLIQUE</code>.";
  app.innerHTML = `<div class="setup-box"><div class="card"><h2>Configuration requise</h2><p class="muted">${text}</p></div></div>`;
}

async function boot() {
  if (configProblem) return showSetupProblem(configProblem);

  const { initAuth, state } = await import('./api/auth.js');
  const { startRouter, render, navigate } = await import('./router.js');

  // Erreur éventuelle renvoyée par un lien d'e-mail expiré (ex. #error_description=...)
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (params.get('error_description')) {
    try {
      sessionStorage.setItem('dreq-flash', 'Ce lien est expiré ou invalide. Reconnectez-vous ou demandez un nouveau lien.');
    } catch (e) { /* ignoré */ }
    history.replaceState(null, '', location.pathname);
  }

  await initAuth((event) => {
    if (event === 'PASSWORD_RECOVERY') return navigate('/reset-password');
    if (event === 'SIGNED_OUT') return navigate('/login');
    if (event === 'SIGNED_IN' || event === 'USER_UPDATED') return render();
  });

  startRouter();
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('app').innerHTML =
    `<div class="setup-box"><div class="card"><h2>Chargement impossible</h2>
     <p class="muted">Vérifiez votre connexion Internet puis rechargez la page.</p>
     <p class="muted small">${esc(err?.message || '')}</p></div></div>`;
});
