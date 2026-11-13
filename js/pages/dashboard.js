
// Accueil étudiant : bienvenue, statut du compte, semestres accessibles, formules.
import { state, getSettings } from '../api/auth.js';
import { supabase } from '../supabase.js';
import { mountApp, icon } from '../ui.js';
import { esc, waLink, fullName, fmtDate } from '../utils.js';

export async function render() {
  const root = mountApp('/');
  root.innerHTML = '<div class="center" style="padding:60px 0"><span class="spinner"></span></div>';

  const p = state.profile;
  if (!p) return renderProfileProblem(root);
  if (p.status === 'suspended') return renderSuspended(root);

  const [semRes, accRes, settings] = await Promise.all([
    supabase.from('semesters')
      .select('id, code, name, position, academic_years(level, name, faculties(name, short_name))')
      .order('position'),
    supabase.from('semester_access').select('semester_id, is_active, plan, expires_at').eq('user_id', state.user.id),
    getSettings(),
  ]);

  const semesters = semRes.data || [];
  const now = new Date();
  const activeIds = new Set((accRes.data || [])
    .filter((a) => a.is_active && (!a.expires_at || new Date(a.expires_at) > now))
    .map((a) => a.semester_id));
  const mine = semesters.filter((s) => activeIds.has(s.id));
  const discover = semesters.filter((s) => !activeIds.has(s.id));
  const name = fullName(p) || 'étudiant';
  const hour = new Date().getHours();
  const hello = hour >= 18 || hour < 5 ? 'Bonsoir' : 'Bonjour';

  const waText = (plan) =>
    `Bonjour DREQ, je suis ${fullName(p) || p.email} (${p.email}). Je souhaite activer : ${plan}. Je vous envoie mon reçu de paiement.`;
  const waBtn = (plan, label, cls = '') => {
    const href = waLink(settings.whatsapp, waText(plan));
    return href
      ? `<a class="btn btn-wa btn-block ${cls}" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`
      : `<button class="btn btn-block" type="button" disabled>WhatsApp bientôt disponible</button>`;
  };

  const semCard = (s, active) => {
    const y = s.academic_years;
    const where = [y?.name, y?.faculties?.short_name || y?.faculties?.name].filter(Boolean).join(' · ');
    return `
      <div class="card sem-card">
        <div class="code">${esc(s.code)}</div>
        <h3>${esc(s.name)}</h3>
        <div class="muted small">${esc(where)}</div>
        <div>${active ? '<span class="badge badge-ok">Accès activé</span>' : '<span class="badge badge-accent">Découverte gratuite</span>'}</div>
      </div>`;
  };

  root.innerHTML = `
    <div class="hero">
      <h1>${hello}, ${esc(p.first_name || name)} 👋</h1>
      <p>${mine.length
        ? `Vous avez accès à ${mine.length} semestre${mine.length > 1 ? 's' : ''}.`
        : 'Bienvenue sur DREQ. Votre compte est créé.'}</p>
    </div>

    ${mine.length ? '' : `
      <div class="banner warn">${icon('info')}
        <div>
          <h3>Accès en attente d'activation</h3>
          <p style="margin:0">Pour activer un semestre, réglez-le puis envoyez votre reçu sur WhatsApp.
          Votre accès est activé manuellement après vérification.</p>
        </div>
      </div>`}

    <div class="section-title"><h2>Mes semestres</h2></div>
    ${mine.length
      ? `<div class="grid grid-3">${mine.map((s) => semCard(s, true)).join('')}</div>`
      : `<div class="card empty">Aucun semestre activé pour le moment.</div>`}

    ${discover.length ? `
      <div class="section-title"><h2>À découvrir</h2></div>
      <div class="grid grid-3">${discover.map((s) => semCard(s, false)).join('')}</div>` : ''}

    <div class="section-title"><h2>Activer un semestre</h2></div>
    <div class="grid grid-3">
      <div class="card plan">
        <h3>Découverte</h3>
        <div class="price">Gratuit</div>
        <ul><li>Une sélection de cours et de QCM</li><li>Quelques utilisations de l'IA par mois</li></ul>
        <span class="badge badge-ok" style="align-self:flex-start">Inclus avec votre compte</span>
      </div>
      <div class="card plan featured">
        <h3>Semestre</h3>
        <div class="price">${settings.priceSemester} DH <small>/ semestre</small></div>
        <ul><li>Tous les modules, cours et QCM du semestre</li><li>Espace IA et suivi complet</li></ul>
        ${waBtn('un semestre (' + settings.priceSemester + ' DH)', 'Activer sur WhatsApp')}
      </div>
      <div class="card plan">
        <h3>Année complète</h3>
        <div class="price">${settings.priceYear} DH <small>/ année</small></div>
        <ul><li>Tous les semestres de l'année</li><li>Les semestres ajoutés ensuite sont inclus</li></ul>
        ${waBtn("l'année complète (" + settings.priceYear + ' DH)', 'Activer sur WhatsApp')}
      </div>
    </div>
    <p class="muted small" style="margin-top:14px">Le paiement s'effectue en dehors de la plateforme. Inscrit le ${esc(fmtDate(p.created_at))}.</p>
  `;
}

function renderSuspended(root) {
  root.innerHTML = `
    <div class="banner danger">${icon('alert')}
      <div><h3>Compte suspendu</h3>
      <p style="margin:0">Votre accès est suspendu. Contactez DREQ sur WhatsApp pour plus d'informations.</p></div>
    </div>`;
}

function renderProfileProblem(root) {
  const detail = state.loadError ? esc(state.loadError.message || '') : '';
  root.innerHTML = `
    <div class="banner danger">${icon('alert')}
      <div><h3>Profil introuvable</h3>
      <p style="margin:0">Votre compte est connecté, mais votre profil n'a pas pu être lu.
      Déconnectez-vous puis reconnectez-vous. Si le problème continue, contactez DREQ.</p>
      ${detail ? `<p class="muted small" style="margin:8px 0 0">Détail technique : ${detail}</p>` : ''}</div>
    </div>`;
}
