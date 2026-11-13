// Session, profil et réglages publics.
import { supabase } from '../supabase.js';
import { SITE_URL } from '../utils.js';
import { adoptProfilePrefs } from '../theme.js';

export const state = {
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  loadError: null,
};

let settingsCache = null;

export async function loadProfile() {
  state.loadError = null;
  const uid = state.user?.id;
  if (!uid) { state.profile = null; state.isAdmin = false; return; }
  const [p, a] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
    supabase.from('admins').select('user_id').eq('user_id', uid).maybeSingle(),
  ]);
  if (p.error) state.loadError = p.error;
  state.profile = p.data || null;
  state.isAdmin = !!a.data;
  if (state.profile) adoptProfilePrefs(state.profile);
}

export async function initAuth(onChange) {
  const { data } = await supabase.auth.getSession();
  state.session = data.session;
  state.user = data.session?.user || null;
  await loadProfile();

  supabase.auth.onAuthStateChange((event, session) => {
    // Important : pas d'appel Supabase direct dans ce rappel (risque de blocage).
    setTimeout(async () => {
      const previous = state.user?.id;
      state.session = session;
      state.user = session?.user || null;
      if (state.user?.id !== previous || event === 'USER_UPDATED') await loadProfile();
      if (!state.user) { state.profile = null; state.isAdmin = false; }
      onChange(event);
    }, 0);
  });
}

export async function signUp({ firstName, lastName, email, password, facultyId }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: SITE_URL(),
      data: { first_name: firstName, last_name: lastName, faculty_id: facultyId || null },
    },
  });
  if (error) throw error;
  return data; // data.session est null tant que l'e-mail n'est pas confirmé
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
  state.session = null; state.user = null; state.profile = null; state.isAdmin = false;
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL() });
  if (error) throw error;
}

export async function updatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function updateProfile(fields) {
  const { data, error } = await supabase
    .from('profiles').update(fields).eq('id', state.user.id).select().single();
  if (error) throw error;
  state.profile = data;
  return data;
}

export async function getFaculties() {
  const { data, error } = await supabase.from('faculties').select('id, name, short_name, city').order('name');
  if (error) throw error;
  return data || [];
}

/** Réglages publics : numéro WhatsApp, prix. */
export async function getSettings() {
  if (settingsCache) return settingsCache;
  const { data } = await supabase.from('app_settings').select('key, value');
  const s = {};
  (data || []).forEach((row) => { s[row.key] = row.value; });
  settingsCache = {
    whatsapp: typeof s.whatsapp_number === 'string' ? s.whatsapp_number : '',
    priceSemester: Number(s.price_semester_dh ?? 130),
    priceYear: Number(s.price_year_dh ?? 240),
  };
  return settingsCache;
}
