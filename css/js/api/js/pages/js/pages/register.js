import { signUp, getFaculties } from '../api/auth.js';
import { mountAuth, showFormError, clearFormError, bindPasswordToggles, icon } from '../ui.js';
import { esc, frError, setBusy } from '../utils.js';
import { navigate } from '../router.js';

export async function render() {
  const el = mountAuth();
  let faculties = [];
  try { faculties = await getFaculties(); } catch (e) { /* la liste restera vide */ }

  el.innerHTML = `
    <h1>Créer un compte</h1>
    <p class="muted">Inscription gratuite. Un e-mail de confirmation vous sera envoyé.</p>
    <form id="f" novalidate>
      <div class="row2">
        <div class="field">
          <label class="label" for="fn">Prénom</label>
          <input class="input" id="fn" autocomplete="given-name" required maxlength="80">
        </div>
        <div class="field">
          <label class="label" for="ln">Nom</label>
          <input class="input" id="ln" autocomplete="family-name" required maxlength="80">
        </div>
      </div>
      <div class="field">
        <label class="label" for="email">Adresse e-mail</label>
        <input class="input" id="email" type="email" autocomplete="email" inputmode="email" required>
      </div>
      <div class="field">
        <label class="label" for="fac">Votre faculté</label>
        <select class="select" id="fac">
          <option value="">— Choisir plus tard —</option>
          ${faculties.map((f) => `<option value="${esc(f.id)}">${esc(f.name)}${f.city ? ' — ' + esc(f.city) : ''}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label class="label" for="pw">Mot de passe</label>
        <div class="input-wrap">
          <input class="input" id="pw" type="password" autocomplete="new-password" required minlength="8">
          <button class="toggle-pw" type="button" aria-label="Afficher ou masquer le mot de passe"></button>
        </div>
        <div class="hint">8 caractères minimum.</div>
      </div>
      <button class="btn btn-block" type="submit">Créer mon compte</button>
    </form>
    <div class="auth-links"><span class="muted">Déjà inscrit ?</span><a href="#/login">Se connecter</a></div>`;
  bindPasswordToggles(el);

  const form = el.querySelector('#f');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormError(form);
    const firstName = form.fn.value.trim();
    const lastName = form.ln.value.trim();
    const email = form.email.value.trim();
    const password = form.pw.value;
    if (!firstName || !lastName) return showFormError(form, 'Indiquez votre prénom et votre nom.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return showFormError(form, 'Adresse e-mail invalide.');
    if (password.length < 8) return showFormError(form, 'Le mot de passe doit contenir au moins 8 caractères.');

    const btn = form.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Création du compte…');
    try {
      const data = await signUp({ firstName, lastName, email, password, facultyId: form.fac.value });
      if (data.session) return navigate('/'); // confirmation d'e-mail désactivée côté Supabase
      el.innerHTML = `
        <div class="center">
          <div class="banner ok" style="text-align:left">${icon('mail')}
            <div><h3>Vérifiez votre boîte mail</h3>
            <p style="margin:0">Nous avons envoyé un lien de confirmation à <b>${esc(email)}</b>.
            Cliquez dessus pour activer votre compte, puis connectez-vous.</p></div>
          </div>
          <p class="muted small" style="margin-top:14px">Rien reçu ? Regardez dans les courriers indésirables (spam).</p>
          <a class="btn btn-block" href="#/login">Aller à la connexion</a>
        </div>`;
    } catch (err) {
      showFormError(form, frError(err));
      setBusy(btn, false);
    }
  });
}
