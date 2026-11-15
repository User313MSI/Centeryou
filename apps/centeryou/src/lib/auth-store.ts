'use client';

import { create } from 'zustand';
import { useStore } from './store';
import { useUiStore } from './ui-store';
import { getSupabase, hasStoredSupabaseSession, isSupabaseConfigured } from './supabase';
import { fetchBackup, hasLocalData, pullBackup, pushBackup, syncNow, type SyncOutcome } from './sync';

export interface AuthUser {
  id: string;
  email: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'saved' | 'restored' | 'error' | 'offline';

export interface AuthResult {
  error?: string;
  info?: string;
}

interface AuthState {
  /** 'loading' tant que la session initiale n'est pas résolue */
  status: 'loading' | 'ready';
  user: AuthUser | null;
  /** prénom du profil en ligne */
  prenom: string;
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
  /** true si une sauvegarde distante existe déjà (proposé à la connexion) */
  remoteAvailable: boolean;
  /** fenêtre « Enregistrer mes données en ligne » proposée à la connexion */
  offerOpen: boolean;

  init: () => void;
  setOfferOpen: (b: boolean) => void;
  signUp: (email: string, password: string, prenom: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  savePrenom: (prenom: string) => Promise<AuthResult>;
  pushNow: () => Promise<SyncOutcome>;
  pullNow: () => Promise<SyncOutcome>;
  runSync: () => Promise<SyncOutcome>;
}

/** Traduit les erreurs Supabase en messages français clairs. */
export function frenchAuthError(err: unknown): string {
  const e = err as { message?: string; code?: string } | null;
  const msg = e?.message ?? '';
  const code = e?.code ?? '';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return 'E-mail ou mot de passe incorrect.';
  if (code === 'user_already_registered' || /already registered/i.test(msg)) return 'Un compte existe déjà avec cet e-mail.';
  if (code === 'weak_password' || /password should be at least/i.test(msg) || /weak password/i.test(msg))
    return 'Mot de passe trop faible : 6 caractères minimum.';
  if (code === 'over_email_send_rate_limit' || /rate limit/i.test(msg)) return 'Trop de tentatives : réessaie dans quelques instants.';
  if (/email not confirmed/i.test(msg)) return 'Confirme d’abord ton e-mail (lien envoyé à l’inscription), puis connecte-toi.';
  if (/fetch|network|Failed to fetch|ERR_/i.test(msg)) return 'Connexion impossible — vérifie ta connexion internet.';
  return 'Une erreur est survenue. Réessaie dans un instant.';
}

function toSyncStatus(outcome: SyncOutcome): SyncStatus {
  if (outcome === 'up-to-date' || outcome === 'saved') return 'saved';
  if (outcome === 'restored') return 'restored';
  if (outcome === 'offline' || outcome === 'error') return outcome;
  return 'idle';
}

async function loadProfile(userId: string): Promise<string> {
  const sb = await getSupabase();
  if (!sb) return '';
  const { data, error } = await sb.from('profiles').select('prenom').eq('id', userId).maybeSingle();
  if (error || !data) return '';
  const prenom = typeof data.prenom === 'string' ? data.prenom : '';
  useAuthStore.setState({ prenom });
  // si aucun prénom local : le prénom du compte alimente le brief vocal
  if (prenom && !useStore.getState().settings.prenom.trim()) {
    useStore.getState().updateSettings({ prenom });
  }
  return prenom;
}

/** Après connexion : restaure si la sauvegarde distante est plus récente, sinon propose l'enregistrement. */
async function afterSignIn(get: () => AuthState, userId: string): Promise<void> {
  const set = (patch: Partial<AuthState>) => useAuthStore.setState(patch);
  const sb = await getSupabase();
  if (!sb) return;
  set({ syncStatus: 'syncing' });
  let remote = null;
  try {
    remote = await fetchBackup(userId);
  } catch {
    remote = null;
  }
  set({ remoteAvailable: !!remote });
  const localAt = hasLocalData() ? Date.now() : 0;
  const remoteSavedAt = remote?.savedAt ?? 0;
  if (remote && remoteSavedAt > localAt) {
    const outcome = await get().pullNow();
    useUiStore.getState().pushToast({ message: 'Données récupérées depuis ton compte ✓' });
    set({ syncStatus: toSyncStatus(outcome), lastSyncAt: Date.now(), offerOpen: false });
    return;
  }
  if (!remote && hasLocalData()) {
    // première connexion avec des données locales : on propose « Enregistrer mes données en ligne »
    set({ syncStatus: 'idle', offerOpen: true });
    return;
  }
  const outcome = await get().runSync();
  set({ syncStatus: toSyncStatus(outcome), lastSyncAt: Date.now() });
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'loading',
  user: null,
  prenom: '',
  syncStatus: 'idle',
  lastSyncAt: null,
  remoteAvailable: false,
  offerOpen: false,

  init: () => {
    if (get().status !== 'loading') return;
    // Le client Supabase (~188 Ko) n'est importé que si la sauvegarde en ligne est
    // réellement utilisée sur ce navigateur : configuration + session persistée
    // (ou retour de confirmation d'e-mail dans l'URL). Sinon, aucun chargement.
    if (!isSupabaseConfigured() || !hasStoredSupabaseSession()) {
      set({ status: 'ready' });
      return;
    }
    set({ status: 'ready' });
    void getSupabase().then((sb) => {
      if (!sb) return;
      void sb.auth.getSession().then(({ data }) => {
        const u = data.session?.user ?? null;
        if (u) {
          set({ user: { id: u.id, email: u.email ?? '' } });
          void loadProfile(u.id);
          void afterSignIn(get, u.id);
        }
      });
      sb.auth.onAuthStateChange((event, session) => {
        const u = session?.user ?? null;
        set({ status: 'ready', user: u ? { id: u.id, email: u.email ?? '' } : null });
        if (event === 'SIGNED_IN' && u) {
          void loadProfile(u.id);
          void afterSignIn(get, u.id);
        }
        if (event === 'SIGNED_OUT') {
          set({ prenom: '', offerOpen: false, syncStatus: 'idle', lastSyncAt: null, remoteAvailable: false });
        }
      });
    });
  },

  setOfferOpen: (b) => set({ offerOpen: b }),

  signUp: async (email, password, prenom) => {
    const sb = await getSupabase();
    if (!sb) return { error: 'La sauvegarde en ligne n’est pas configurée sur ce déploiement.' };
    if (password.length < 6) return { error: 'Mot de passe trop faible : 6 caractères minimum.' };
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { prenom } },
    });
    if (error) return { error: frenchAuthError(error) };
    const u = data.user;
    if (u) {
      await sb
        .from('profiles')
        .upsert({ id: u.id, email, prenom, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      if (prenom.trim()) useStore.getState().updateSettings({ prenom: prenom.trim() });
    }
    if (!data.session) {
      return { info: 'Compte créé ! Confirme ton e-mail (lien envoyé), puis connecte-toi.' };
    }
    return {};
  },

  signIn: async (email, password) => {
    const sb = await getSupabase();
    if (!sb) return { error: 'La sauvegarde en ligne n’est pas configurée sur ce déploiement.' };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { error: frenchAuthError(error) };
    return {};
  },

  signOut: async () => {
    const sb = await getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
  },

  resetPassword: async (email) => {
    const sb = await getSupabase();
    if (!sb) return { error: 'La sauvegarde en ligne n’est pas configurée sur ce déploiement.' };
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reglages`,
    });
    if (error) return { error: frenchAuthError(error) };
    return { info: 'E-mail envoyé : suis le lien reçu pour choisir un nouveau mot de passe.' };
  },

  savePrenom: async (prenom) => {
    const { user } = get();
    const sb = await getSupabase();
    if (!user || !sb) return { error: 'Connecte-toi d’abord pour modifier ton profil.' };
    const clean = prenom.trim().slice(0, 30);
    const { error } = await sb
      .from('profiles')
      .upsert({ id: user.id, email: user.email, prenom: clean, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) return { error: frenchAuthError(error) };
    set({ prenom: clean });
    // le prénom du profil alimente le brief vocal et la salutation
    useStore.getState().updateSettings({ prenom: clean });
    return {};
  },

  pushNow: async () => {
    const { user } = get();
    if (!user) return 'disabled';
    set({ syncStatus: 'syncing' });
    try {
      await pushBackup(user.id);
      set({ syncStatus: 'saved', lastSyncAt: Date.now(), remoteAvailable: true });
      return 'saved';
    } catch {
      const outcome = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error';
      set({ syncStatus: outcome as SyncStatus });
      return outcome;
    }
  },

  pullNow: async () => {
    const { user } = get();
    if (!user) return 'disabled';
    set({ syncStatus: 'syncing' });
    try {
      const payload = await pullBackup(user.id);
      set({ syncStatus: payload ? 'restored' : 'saved', lastSyncAt: Date.now(), remoteAvailable: !!payload });
      return payload ? 'restored' : 'up-to-date';
    } catch {
      const outcome = typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error';
      set({ syncStatus: outcome as SyncStatus });
      return outcome;
    }
  },

  runSync: async () => {
    const { user } = get();
    if (!user) return 'disabled';
    set({ syncStatus: 'syncing' });
    const outcome = await syncNow(user.id);
    set({ syncStatus: toSyncStatus(outcome), lastSyncAt: Date.now() });
    return outcome;
  },
}));
