import { signIn } from '../api/auth.js';
import { mountAuth, showFormError, clearFormError, bindPasswordToggles } from '../ui.js';
import { frError, setBusy, toast } from '../utils.js';
import { navigate } from '../router.js';

export async function render() {
  const el = mountAuth();
  el.innerHTML = `
    <h1>Connexion</h1>
    <p class="muted">Content de vous revoir. Connectez-vous pour accéder à vos cours.</p>
    <form id="f" novalidate>
      <div class="field">
        <label class="label" for="email">Adresse e-mail</label>
        <input class="input" id="email" type="email" autocomplete="email" inputmode="email" required>
      </div>
      <div class="field">
        <label class="label" for="pw">Mot de passe</label>
        <div class="input-wrap">
          <input class="input" id="pw" type="password" autocomplete="current-password" required>
          <button class="toggle-pw" type="button" aria-label="Afficher ou masquer le mot de passe"></button>
        </div>
      </div>
      <button class="btn btn-block" type="submit">Se connecter</button>
    </form>
    <div class="auth-links">
      <a href="#/forgot">Mot de passe oublié ?</a>
      <a href="#/register">Créer un compte</a>
    </div>`;
  bindPasswordToggles(el);

  const msg = sessionStorage.getItem('dreq-flash');
  if (msg) { sessionStorage.removeItem('dreq-flash'); toast(msg, 'ok', 7000); }

  const form = el.querySelector('#f');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormError(form);
    const email = form.email.value.trim();
    const password = form.pw.value;
    if (!email || !password) return showFormError(form, 'Saisissez votre e-mail et votre mot de passe.');
    const btn = form.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Connexion…');
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      showFormError(form, frError(err));
      setBusy(btn, false);
    }
  });
}
