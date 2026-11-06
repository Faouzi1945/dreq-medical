
// Petits outils partagés.

/** Protège un texte avant de l'insérer dans du HTML (anti-injection). */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function toast(message, type = 'info', ms = 4500) {
  const box = document.getElementById('toasts');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

/** Lien WhatsApp avec message pré-rempli. Retourne null si le numéro est inconnu. */
export function waLink(number, text) {
  const n = String(number || '').replace(/\D/g, '');
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}

/** Traduit les erreurs techniques en messages simples en français. */
export function frError(err) {
  const raw = String(err?.message || err || '').toLowerCase();
  if (raw.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.';
  if (raw.includes('email not confirmed')) return "Votre adresse e-mail n'est pas encore confirmée. Ouvrez le message de confirmation reçu par e-mail.";
  if (raw.includes('already registered') || raw.includes('already been registered')) return 'Un compte existe déjà avec cette adresse e-mail.';
  if (raw.includes('password should be') || raw.includes('weak password')) return 'Mot de passe trop faible (8 caractères minimum).';
  if (raw.includes('same password') || raw.includes('different from the old')) return "Le nouveau mot de passe doit être différent de l'ancien.";
  if (raw.includes('rate limit') || raw.includes('too many') || raw.includes('security purposes')) return 'Trop de tentatives. Patientez quelques minutes puis réessayez.';
  if (raw.includes('failed to fetch') || raw.includes('networkerror') || raw.includes('load failed')) return 'Connexion impossible. Vérifiez votre connexion Internet.';
  if (raw.includes('invalid email') || raw.includes('unable to validate email')) return "Adresse e-mail invalide.";
  if (raw.includes('permission denied') || raw.includes('row-level security')) return "Action non autorisée.";
  return 'Une erreur est survenue. Réessayez.';
}

export function fmtDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function initials(profile) {
  const a = (profile?.first_name || '').trim()[0] || '';
  const b = (profile?.last_name || '').trim()[0] || '';
  return (a + b).toUpperCase() || '?';
}

export function fullName(profile) {
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
}

/** Désactive un bouton pendant une action. */
export function setBusy(btn, busy, busyLabel = 'Veuillez patienter…') {
  if (!btn) return;
  if (busy) {
    btn.dataset.label = btn.textContent;
    btn.textContent = busyLabel;
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.label || btn.textContent;
    btn.disabled = false;
  }
}

export const SITE_URL = () => location.origin + location.pathname;
