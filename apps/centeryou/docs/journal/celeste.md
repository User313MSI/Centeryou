# Céleste — 14/11/2026 — Mission : sécurité voix

## Contexte

La clé ElevenLabs était exposée au navigateur via `NEXT_PUBLIC_ELEVENLABS_API_KEY`, injectée dans le bundle client par le bloc `env:` de `next.config.mjs` (contournement de Vercel `NEXT_ELEVENLABS_API_KEY` → `NEXT_PUBLIC_…`). N'importe quel visiteur pouvait la voler dans les chunks JS et l'utiliser à nos frais. Interdit en production.

## Ce qui a été fait

1. **Appel ElevenLabs déplacé côté serveur** : nouvelle route API `src/app/api/voix/route.ts` (`POST /api/voix`, runtime Node). Elle reçoit `{ text }`, lit la clé via `process.env.NEXT_ELEVENLABS_API_KEY` (variable serveur déjà enregistrée sur Vercel, jamais préfixée `NEXT_PUBLIC_` côté client), appelle `https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL` (voix Sarah, `eleven_multilingual_v2`, `NEXT_ELEVENLABS_VOICE_ID` optionnel côté serveur) et renvoie l'audio `audio/mpeg`.
2. **Clé totalement retirée du bundle client** :
   - `src/lib/voice.ts` ne contient plus aucune clé ni aucun appel direct à ElevenLabs : `speak()` appelle d'abord `/api/voix`, puis bascule sur la Web Speech API.
   - `next.config.mjs` : bloc `env:` supprimé (c'était le vecteur d'injection).
   - **Vérification explicite dans le build de production** : `ELEVENLABS_API_KEY=<valeur-factice-de-test> npm run build`, puis recherche dans `.next/static` (chunks client) : aucune occurrence de la valeur factice, de `NEXT_PUBLIC_ELEVENLABS`, de `xi-api-key` ni d'`api.elevenlabs.io`. La clé n'existe que dans `.next/server` (code serveur).
3. **Quota de protection** : 300 caractères/jour par utilisateur connecté. Dans cette app local-first sans backend, « connecté » = profil renseigné (prénom dans Réglages) ; le client envoie l'en-tête `x-centeryou-user`. Compteur en mémoire keyed `jour:profil` dans la route (par instance serverless — voir limites). Dépassement → `429` + message français clair + **bascule douce** côté client sur la voix du navigateur (toast informatif). Anonyme (pas de prénom) → `403` → Web Speech API gratuite, silencieusement, sans erreur. Texte vide → `400`, > 1000 caractères → `413`, clé absente → `503` (bascule silencieuse, comme avant), erreur ElevenLabs → `502` (bascule).
4. **En-têtes de sécurité** : `next.config.mjs` applique à toutes les routes CSP (`default-src 'self'`, `connect-src 'self'` — le navigateur n'appelle plus ElevenLabs, `media-src blob:` pour l'audio, `frame-ancestors 'none'`…), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: microphone=(self)` (le micro reste utilisable pour la reconnaissance vocale). La route `/api/voix` ajoute `Cache-Control: no-store`.

## Fichiers touchés

- `src/app/api/voix/route.ts` (nouveau)
- `src/lib/voice.ts` (plus de clé client, appel `/api/voix`, bascule + toast quota)
- `next.config.mjs` (plus d'injection `env:`, en-têtes de sécurité)
- `.env.local.example`, `README.md`, `src/app/voix/page.tsx` (doc : variable serveur uniquement)

## Non touché (interdits respectés)

Séquence d'accueil, micro, réglages, design, parser, planning : inchangés. Aucune autre donnée exposée côté client.

## Limites connues

- Le quota est en mémoire (Map) dans la route : par instance serverless Vercel, il peut être remis à zéro sur cold start ou réparti entre instances. C'est un quota de protection anti-abus, pas une facturation exacte. Pour un quota durable, brancher un store persistant (Vercel KV / Edge Config).
- « Connecté » = prénom renseigné localement (l'app n'a pas de comptes) : un visiteur peut renseigner un prénom pour obtenir la voix premium. Le vrai gain de sécurité est ailleurs : **la clé n'est plus récupérable**, donc plus personne ne peut la voler pour l'utiliser hors de l'app.

## Où coller la clé sur Vercel (pas à pas)

1. Ouvrir le dashboard Vercel → projet **Centeryou** → onglet **Settings** → **Environment Variables**.
2. La variable `NEXT_ELEVENLABS_API_KEY` est déjà enregistrée (aucune variable à créer), valeur = ta clé ElevenLabs (copiée depuis ElevenLabs → profil → API Keys).
3. Environnements : cocher **Production** (et Preview/Development si tu veux la voix premium ailleurs qu'en prod). Ne surtout pas renommer avec le préfixe `NEXT_PUBLIC_`.
4. Cliquer **Save**, puis **Redeploy** le dernier déploiement (ou attendre le prochain) pour que la variable soit injectée côté serveur.
5. Optionnel : `NEXT_ELEVENLABS_VOICE_ID` (même procédure) pour changer de voix ; sinon Sarah (`EXAVITQu4vr4xnSDxMaL`) est utilisée par défaut.
6. Vérification : dans les logs de la route `/api/voix` aucune clé n'est loguée ; côté navigateur, `Outils de développement → Réseau → Sources` : aucun chunk `.next/static` ne contient la clé (vérifié aussi dans le build).

## Vérifications effectuées

- `npm run build` avec `ELEVENLABS_API_KEY` factice : build OK, et `grep` du bundle client (`.next/static`) négatif pour la clé / `xi-api-key` / `elevenlabs`.
- `npm run lint` et `npm run test:parser` : OK.

## Mise à jour 2026-11-14 — résolution de conflits avec l'audit d'Alpha (PR #8 fusionnée)

- La route `/api/tts` d'Alpha est **supprimée** : cette PR garde `/api/voix` + quota 300 car/jour.
- La clé est lue via `NEXT_ELEVENLABS_API_KEY` (variable déjà enregistrée sur Vercel, aucune nouvelle variable).
- Conservés intacts depuis la branche par défaut : la sanitation du store contre le localStorage corrompu (`store.ts`, `useHydrated.ts`) et le rapport `docs/AUDIT-2026-11.md` + `docs/journal/alpha.md`.
- Conservés : en-têtes de sécurité (`next.config.mjs`) et le reste de cette PR.
