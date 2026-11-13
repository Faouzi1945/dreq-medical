
// Espace administrateur : statistiques, étudiants, validation des paiements, accès aux semestres.
// Toutes les actions sont re-vérifiées côté serveur (RLS + fonctions admin_*).
import { supabase } from '../supabase.js';
import { getSettings } from '../api/auth.js';
import { mountApp, icon } from '../ui.js';
import { esc, frError, toast, fmtDate, fullName, SITE_URL, setBusy } from '../utils.js';

const STATUS = {
  pending:   ['badge-warn', 'En attente'],
  active:    ['badge-ok', 'Actif'],
  suspended: ['badge-danger', 'Suspendu'],
};

let data = { stats: null, students: [], semesters: [], access: [] };
let search = '';
let filter = 'all';

async function load() {
  const [stats, students, semesters, access] = await Promise.all([
    supabase.rpc('admin_stats'),
    supabase.from('profiles')
      .select('id, email, first_name, last_name, status, created_at, last_seen_at, faculties(short_name, name)')
      .order('created_at', { ascending: false }).limit(1000),
    supabase.from('semesters')
      .select('id, code, name, year_id, position, academic_years(id, level, name)').order('position'),
    supabase.from('semester_access').select('user_id, semester_id, is_active, plan, expires_at, note'),
  ]);
  const firstError = [stats, students, semesters, access].find((r) => r.error);
  if (firstError) throw firstError.error;
  data = { stats: stats.data, students: students.data || [], semesters: semesters.data || [], access: access.data || [] };
}

export async function render() {
  const root = mountApp('/admin');
  root.innerHTML = '<div class="center" style="padding:60px 0"><span class="spinner"></span></div>';
  try { await load(); } catch (err) {
    root.innerHTML = `<div class="banner danger">${icon('alert')}<div><h3>Chargement impossible</h3><p style="margin:0">${esc(frError(err))}</p></div></div>`;
    return;
  }
  draw(root);
}

function draw(root) {
  const s = data.stats;
  root.innerHTML = `
    <div class="page-head"><h1>Administration</h1><p>Étudiants, paiements et accès aux semestres.</p></div>

    <div class="grid grid-4">
      <div class="card stat"><div class="n">${s.students_total}</div><div class="l">Étudiants inscrits</div></div>
      <div class="card stat"><div class="n">${s.students_pending}</div><div class="l">En attente d'activation</div></div>
      <div class="card stat"><div class="n">${s.students_active}</div><div class="l">Comptes actifs</div></div>
      <div class="card stat"><div class="n">${Number(s.revenue_total_dh).toLocaleString('fr-FR')} DH</div><div class="l">Paiements validés</div></div>
    </div>

    <div class="section-title"><h2>Étudiants</h2></div>
    <div class="toolbar">
      <input class="input" id="q" type="search" placeholder="Rechercher un nom ou un e-mail" value="${esc(search)}" aria-label="Rechercher">
      <div class="segmented" id="flt" role="group" aria-label="Filtrer">
        ${[['all', 'Tous'], ['pending', 'En attente'], ['active', 'Actifs'], ['suspended', 'Suspendus']]
          .map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${filter === v}">${l}</button>`).join('')}
      </div>
    </div>
    <div id="list"></div>
    <dialog class="dlg" id="dlg"></dialog>`;

  const list = root.querySelector('#list');
  const paint = () => {
    const term = search.trim().toLowerCase();
    const rows = data.students.filter((st) =>
      (filter === 'all' || st.status === filter) &&
      (!term || (fullName(st) + ' ' + st.email).toLowerCase().includes(term)));
    if (!rows.length) { list.innerHTML = '<div class="card empty">Aucun étudiant ne correspond.</div>'; return; }
    list.innerHTML = rows.map((st) => {
      const mine = data.access.filter((a) => a.user_id === st.id);
      const chips = data.semesters.map((sem) => {
        const a = mine.find((x) => x.semester_id === sem.id);
        const on = a && a.is_active && (!a.expires_at || new Date(a.expires_at) > new Date());
        return `<span class="chip ${on ? 'on' : ''}">${esc(sem.code)}</span>`;
      }).join('');
      const [cls, label] = STATUS[st.status] || ['', st.status];
      return `
        <div class="list-row">
          <div class="grow"><b>${esc(fullName(st) || 'Sans nom')}</b><span class="muted small">${esc(st.email)}</span></div>
          <div class="chips">${chips}</div>
          <span class="badge ${cls}">${label}</span>
          <button class="btn btn-ghost btn-sm" data-id="${esc(st.id)}" type="button">Gérer</button>
        </div>`;
    }).join('');
  };
  paint();

  root.querySelector('#q').addEventListener('input', (e) => { search = e.target.value; paint(); });
  root.querySelector('#flt').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    filter = b.dataset.v;
    root.querySelectorAll('#flt button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    paint();
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]'); if (b) openStudent(root, b.dataset.id);
  });
}

async function refresh(root, reopenId) {
  await load();
  draw(root);
  if (reopenId) openStudent(root, reopenId);
}

async function openStudent(root, id) {
  const st = data.students.find((x) => x.id === id);
  if (!st) return;
  const settings = await getSettings();
  const mine = data.access.filter((a) => a.user_id === id);
  const years = [];
  data.semesters.forEach((sem) => {
    const y = sem.academic_years;
    if (y && !years.some((x) => x.id === y.id)) years.push(y);
  });
  const [cls, label] = STATUS[st.status] || ['', st.status];
  const dlg = root.querySelector('#dlg');

  dlg.innerHTML = `
    <div class="dlg-head">
      <div><h2 style="margin:0">${esc(fullName(st) || 'Sans nom')}</h2>
        <div class="muted small">${esc(st.email)}</div>
        <div class="muted small">${st.faculties ? esc(st.faculties.name) + ' · ' : ''}inscrit le ${esc(fmtDate(st.created_at))}</div></div>
      <button class="icon-btn" id="x" type="button" aria-label="Fermer">✕</button>
    </div>
    <span class="badge ${cls}">${label}</span>

    <hr>
    <h3>Accès aux semestres</h3>
    ${data.semesters.length ? data.semesters.map((sem) => {
      const a = mine.find((x) => x.semester_id === sem.id);
      const on = a && a.is_active && (!a.expires_at || new Date(a.expires_at) > new Date());
      return `<div class="access-line">
        <div><b>${esc(sem.code)}</b> <span class="muted small">${esc(sem.name)}${a ? ' · ' + (a.plan === 'year' ? 'formule année' : a.plan === 'manual' ? 'manuel' : 'formule semestre') : ''}</span></div>
        ${a ? `<button class="btn btn-sm ${on ? 'btn-ghost' : ''}" data-toggle="${esc(sem.id)}" data-on="${on ? 1 : 0}" type="button">${on ? 'Désactiver' : 'Réactiver'}</button>`
            : '<span class="muted small">Pas d\'accès</span>'}
      </div>`;
    }).join('') : '<p class="muted">Aucun semestre créé.</p>'}

    <hr>
    <h3>Valider un paiement</h3>
    <form id="grant" novalidate>
      <div class="field"><label class="label" for="plan">Formule</label>
        <select class="select" id="plan">
          <option value="semester">Un semestre — ${settings.priceSemester} DH</option>
          <option value="year">Année complète — ${settings.priceYear} DH</option>
        </select></div>
      <div class="field" id="wrap-sem"><label class="label" for="sem">Semestre acheté</label>
        <select class="select" id="sem">${data.semesters.map((sem) => `<option value="${esc(sem.id)}">${esc(sem.code)} — ${esc(sem.name)}</option>`).join('')}</select></div>
      <div class="field hidden" id="wrap-year"><label class="label" for="year">Année</label>
        <select class="select" id="year">${years.map((y) => `<option value="${esc(y.id)}">${esc(y.name)}</option>`).join('')}</select></div>
      <div class="field"><label class="label" for="ref">Référence du reçu (facultatif)</label>
        <input class="input" id="ref" maxlength="200" placeholder="ex : reçu WhatsApp du 06/11"></div>
      <button class="btn btn-block" type="submit" ${data.semesters.length ? '' : 'disabled'}>Valider et activer l'accès</button>
    </form>

    <hr>
    <h3>Compte</h3>
    <div class="toolbar" style="margin:0">
      ${st.status !== 'active' ? '<button class="btn btn-sm" data-status="active" type="button">Activer</button>' : ''}
      ${st.status !== 'pending' ? '<button class="btn btn-sm btn-ghost" data-status="pending" type="button">Mettre en attente</button>' : ''}
      ${st.status !== 'suspended' ? '<button class="btn btn-sm btn-danger" data-status="suspended" type="button">Suspendre</button>' : ''}
      <button class="btn btn-sm btn-ghost" id="reset" type="button">Envoyer un e-mail de réinitialisation du mot de passe</button>
    </div>`;

  dlg.showModal();
  dlg.querySelector('#x').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  const plan = dlg.querySelector('#plan');
  plan.addEventListener('change', () => {
    dlg.querySelector('#wrap-sem').classList.toggle('hidden', plan.value !== 'semester');
    dlg.querySelector('#wrap-year').classList.toggle('hidden', plan.value !== 'year');
  });

  dlg.querySelector('#grant').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button[type="submit"]');
    setBusy(btn, true, 'Validation…');
    const isYear = plan.value === 'year';
    const { error } = await supabase.rpc('admin_grant_access', {
      p_user: id,
      p_plan: plan.value,
      p_semester: isYear ? null : f.sem.value,
      p_year: isYear ? f.year.value : null,
      p_reference: f.ref.value.trim() || null,
    });
    if (error) { toast(frError(error), 'error'); setBusy(btn, false); return; }
    toast('Paiement validé, accès activé.', 'ok');
    dlg.close();
    refresh(root, id);
  });

  dlg.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', async () => {
    const { error } = await supabase.from('semester_access')
      .update({ is_active: b.dataset.on !== '1' }).eq('user_id', id).eq('semester_id', b.dataset.toggle);
    if (error) return toast(frError(error), 'error');
    toast('Accès mis à jour.', 'ok');
    dlg.close();
    refresh(root, id);
  }));

  dlg.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', async () => {
    const { error } = await supabase.rpc('admin_set_profile_status', { p_user: id, p_status: b.dataset.status });
    if (error) return toast(frError(error), 'error');
    toast('Statut mis à jour.', 'ok');
    dlg.close();
    refresh(root, id);
  }));

  dlg.querySelector('#reset').addEventListener('click', async (e) => {
    setBusy(e.target, true, 'Envoi…');
    const { error } = await supabase.auth.resetPasswordForEmail(st.email, { redirectTo: SITE_URL() });
    setBusy(e.target, false);
    if (error) return toast(frError(error), 'error');
    toast("E-mail de réinitialisation envoyé à l'étudiant.", 'ok');
  });
}
