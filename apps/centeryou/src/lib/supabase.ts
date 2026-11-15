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
 * Vrai si une session Supabase est déjà persistée dans le localStorage
 * (clé `sb-<projet>-auth-token`) : permet de réserver le chargement du client
 * aux comptes déjà connectés, sans charger le moindre octet de Supabase.
 */
export function hasStoredSession(): boolean {
  if (typeof window === 'undefined' || !isSupabaseConfigured()) return false;
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) return true;
    }
  } catch {
    // localStorage indisponible : aucune session supposée
  }
  return false;
}

/**
 * Client Supabase unique (session persistée dans le localStorage par défaut),
 * ou null si non configuré / côté serveur.
 *
 * Le paquet `@supabase/supabase-js` (~250 Ko) n'est chargé qu'en import dynamique,
 * uniquement quand la sauvegarde en ligne est réellement utilisée (connexion d'un
 * compte) : jamais au premier chargement, notamment pas sur la landing publique.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!isSupabaseConfigured()) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        }),
      )
      .catch(() => {
        // échec de chargement du chunk : on réessaiera au prochain appel
        clientPromise = null;
        return null;
      });
  }
  return clientPromise;
}
