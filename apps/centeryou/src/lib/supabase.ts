'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

let clientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * La sauvegarde en ligne est OPTIONNELLE : sans les deux variables
 * d'environnement NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY,
 * l'application reste 100 % locale (mode anonyme inchangé).
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Vrai si une session Supabase est déjà persistée (clé `sb-<projet>-auth-token`)
 * ou si l'URL contient un retour de confirmation (hash #access_token=…).
 * Sert à ne charger le client que quand la sauvegarde en ligne est réellement utilisée.
 */
export function hasStoredSupabaseSession(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.hash.includes('access_token')) return true;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && /^sb-.*-auth-token$/.test(key)) return true;
    }
  } catch {
    // localStorage indisponible : on considère qu'aucune session n'existe
  }
  return false;
}

/**
 * Client Supabase unique (session persistée dans le localStorage par défaut), ou null si
 * non configuré / côté serveur. Le paquet @supabase/supabase-js (~188 Ko) n'est importé
 * dynamiquement que lors du premier appel effectif : jamais au premier chargement pour
 * un visiteur sans compte.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (typeof window === 'undefined') return null;
  if (!isSupabaseConfigured()) return null;
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }),
    );
  }
  return clientPromise;
}
