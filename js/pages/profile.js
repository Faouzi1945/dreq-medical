
// Profil étudiant : identité, faculté, apparence, mot de passe.
import { state, updateProfile, updatePassword, getFaculties } from '../api/auth.js';
import { mountApp, refreshThemeButton, icon } from '../ui.js';
import { ACCENTS, getTheme, getAccent, setTheme, setAccent } from '../theme.js';
import { esc, frError, setBusy, toast } from '../utils.js';

export async function render() {
  const root = mountApp('/profile');
  const p = state.profile;
  if (!p) {
    root.innerHTML = '<div class="banner danger"><div><h3>Profil introuvable</h3><p style="margin:0">Reconnectez-vous puis réessayez.</p></div></div>';
    return;
  }
  let faculties = [];
  try { faculties = await getFaculties(); } catch (e) { /* liste vide */ }

  const statusBadge = { pending: ['badge-warn', 'En attente'], active: ['badge-ok', 'Actif'], suspended: ['badge-danger', 'Suspendu'] }[p.status] || ['', p.status];

  root.innerHTML = `
    <div class="page-head"><h1>Mon profil</h1><p>${esc(state.user.email)} · <span class="badge ${statusBadge[0]}">${statusBadge[1]}</span></p></div>

    <div class="card">
      <h2>Informations personnelles</h2>
      <form id="f-info" novalidate>
        <div class="row2">
          <div class="field"><label class="label" for="fn">Prénom</label>
            <input class="input" id="fn" value="${esc(p.first_name)}" maxlength="80" autocomplete="given-name"></div>
          <div class="field"><label class="label" for="ln">Nom</label>
            <input class="input" id="ln" value="${esc(p.last_name)}" maxlength="80" autocomplete="family-name"></div>
        </div>
        <div class="field"><label class="label" for="fac">Faculté</label>
          <select class="select" id="fac">
            <option value="">— Non renseignée —</option>
            ${faculties.map((f) => `<option value="${esc(f.id)}" ${f.id === p.faculty_id ? 'selected' : ''}>${esc(f.name)}${f.city ? ' — ' + esc(f.city) : ''}</option>`).join('')}
          </select></div>
        <button class="btn" type="submit">Enregistrer</button>
      </form>
    </div>

    <div class="card">
      <h2>Apparence</h2>
      <div class="field">
        <span class="label">Thème</span>
        <div class="segmented" id="seg-theme" role="group" aria-label="Thème">
          <button type="button" data-v="light">${icon('sun')} Clair</button>
          <button type="button" data-v="dark">${icon('moon')} Sombre</button>
          <button type="button" data-v="system">${icon('monitor')} Auto</button>
        </div>
      </div>
      <div class="field" style="margin-bottom:0">
        <span class="label">Couleur</span>
        <div class="swatches" id="swatches" role="group" aria-label="Couleur d'accent">
          ${ACCENTS.map((a) => `<button type="button" class="swatch" data-v="${a.id}" style="background:${a.color}" aria-label="${esc(a.label)}"></button>`).join('')}
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Mot de passe</h2>
      <form id="f-pw" novalidate>
        <div class="field"><label class="label" for="pw">Nouveau mot de passe</label>
          <input class="input" id="pw" type="password" autocomplete="new-password" minlength="8">
          <div class="hint">8 caractères minimum.</div></div>
        <button class="btn btn-ghost" type="submit">Changer le mot de passe</button>
      </form>
    </div>`;

  // Informations
  root.querySelector('#f-info').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button[type="submit"]');
    const first = f.fn.value.trim(), last = f.ln.value.trim();
    if (!first || !last) return toast('Prénom et nom obligatoires.', 'error');
    setBusy(btn, true, 'Enregistrement…');
    try {
      await updateProfile({ first_name: first, last_name: last, faculty_id: f.fac.value || null });
      toast('Profil enregistré.', 'ok');
    } catch (err) { toast(frError(err), 'error'); }
    setBusy(btn, false);
  });

  // Apparence
  const syncPressed = () => {
    root.querySelectorAll('#seg-theme button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === getTheme())));
    root.querySelectorAll('#swatches button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === getAccent())));
    refreshThemeButton();
  };
  syncPressed();
  root.querySelector('#seg-theme').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    setTheme(b.dataset.v); syncPressed();
    try { await updateProfile({ theme: b.dataset.v }); } catch (err) { /* sauvegarde locale conservée */ }
  });
  root.querySelector('#swatches').addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    setAccent(b.dataset.v); syncPressed();
    try { await updateProfile({ accent: b.dataset.v }); } catch (err) { /* idem */ }
  });

  // Mot de passe
  root.querySelector('#f-pw').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.pw.value.length < 8) return toast('Le mot de passe doit contenir au moins 8 caractères.', 'error');
    const btn = f.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Modification…');
    try { await updatePassword(f.pw.value); f.reset(); toast('Mot de passe modifié.', 'ok'); }
    catch (err) { toast(frError(err), 'error'); }
    setBusy(btn, false);
  });
}
