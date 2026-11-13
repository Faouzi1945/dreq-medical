import { requestPasswordReset } from '../api/auth.js';
import { mountAuth, showFormError, clearFormError, icon } from '../ui.js';
import { esc, frError, setBusy } from '../utils.js';

export async function render() {
  const el = mountAuth();
  el.innerHTML = `
    <h1>Mot de passe oublié</h1>
    <p class="muted">Saisissez votre adresse e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
    <form id="f" novalidate>
      <div class="field">
        <label class="label" for="email">Adresse e-mail</label>
        <input class="input" id="email" type="email" autocomplete="email" inputmode="email" required>
      </div>
      <button class="btn btn-block" type="submit">Envoyer le lien</button>
    </form>
    <div class="auth-links"><a href="#/login">← Retour à la connexion</a></div>`;

  const form = el.querySelector('#f');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormError(form);
    const email = form.email.value.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return showFormError(form, 'Adresse e-mail invalide.');
    const btn = form.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Envoi…');
    try {
      await requestPasswordReset(email);
      // Même message que le compte existe ou non (ne révèle pas qui est inscrit).
      el.innerHTML = `
        <div class="banner ok">${icon('mail')}
          <div><h3>Demande envoyée</h3>
          <p style="margin:0">Si un compte existe pour <b>${esc(email)}</b>, un e-mail avec un lien de réinitialisation vient de partir.</p></div>
        </div>
        <p style="margin-top:16px"><a class="btn btn-block btn-ghost" href="#/login">Retour à la connexion</a></p>`;
    } catch (err) {
      showFormError(form, frError(err));
      setBusy(btn, false);
    }
  });
}
