# Iris — 14 novembre 2026 — Mission : conformité

Agent : **Iris** (responsable conformité). Périmètre : `apps/centeryou/` (Next.js App Router + TypeScript + Tailwind + Zustand, local-first).

## Contexte constaté

- L'app dans le dépôt est **100 % local-first** : persistance `localStorage` (clé `centeryou-v1`), aucun compte, aucun e-mail collecté, aucun paiement en ligne. Seul flux externe : la synthèse vocale **ElevenLabs**, uniquement si `NEXT_PUBLIC_ELEVENLABS_API_KEY` est configurée (sinon Web Speech API du navigateur). Hébergement : **Vercel** (journaux techniques usuels).
- Conséquence : les textes publiés décrivent **strictement ce fonctionnement réel** (honnêteté RGPD), avec une mention explicite dans la confidentialité : si une sauvegarde en ligne (ex. Supabase) ou un paiement (ex. Stripe) est un jour activé, la politique sera mise à jour avant activation. Aucun SIRET ni société inventé(e) : l'éditeur est présenté comme un particulier.
- Point ouvert remonté à Origine : la mission mentionnait comptes Supabase / offre Premium / Stripe — absents du code à ce jour ; en attente de décision pour ajouter des sections dédiées « prévues mais non actives ».

## Réalisations

1. **CGU** — `src/app/cgu/page.tsx` (version 1.0, mise à jour le 14 novembre 2026) : éditeur, présentation du service, accès sans compte, offre gratuite, responsabilités, propriété, résiliation/suppression, modification, droit français.
2. **Politique de confidentialité (RGPD)** — `src/app/confidentialite/page.tsx` (v1.0) : responsable, données collectées et stockage (local + ElevenLabs si activé + journaux Vercel + correspondance e-mail), finalités, bases légales, durées, sous-traitants (Vercel, ElevenLabs) et transferts hors UE (CCT), droits (accès, rectification, effacement, export/portabilité, opposition, limitation) et modalités d'exercice (e-mail, délai annoncé, CNIL), cookies/stockage local, sécurité, mise à jour.
3. **Suppression de compte** — Réglages (`src/app/reglages/page.tsx`) : carte « Supprimer mon compte et mes données » avec **double confirmation** (clic d'armement + confirmation explicite « Oui, supprimer définitivement »), effacement **local** (store `deleteAccount` : état remis à zéro + clés `centeryou*` supprimées du localStorage) + appel **serveur** `POST /api/compte/suppression` (`src/app/api/compte/suppression/route.ts` : si `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` sont configurés et un e-mail fourni, suppression REST des lignes correspondantes ; sinon accusé « aucun compte serveur configuré » — aucun effet de bord dangereux).
4. **Contact & support** — `src/app/contact/page.tsx` : e-mail de contact centralisé, délai de réponse annoncé (« le plus souvent sous 7 jours ouvrés, au plus tard sous 1 mois conformément au RGPD »), motifs de contact, liens utiles.
5. **Pied de page** — `src/components/layout/footer.tsx`, rendu dans `AppShell` sur **toutes** les pages : CGU · Confidentialité · Contact · © 2026 Centeryou.
6. **Constantes uniques** — `src/lib/legal.ts` (e-mail, versions, dates, délais, année) pour garantir la cohérence entre toutes les pages.

## Points de vigilance

- **Adresse e-mail de contact** : `contact@centeryou.fr` est un **placeholder centralisé** dans `src/lib/legal.ts` — à remplacer par l'adresse réelle avant mise en production.
- Aucun SIRET, numéro d'entreprise ou promesse juridique inventé ; l'éditeur est qualifié de particulier.
- Aucune fonctionnalité existante modifiée (la carte « Données locales » d'origine est conservée telle quelle).
- **Rappel Origine** : faire relire l'ensemble de ces textes par un professionnel du droit avant toute vente/commercialisation réelle.

## Vérifications

- `npm run build` : OK (pages `/cgu`, `/confidentialite`, `/contact`, route API compilées sans erreur).
- `npm run lint` : OK. `npm run test:parser` : OK (inchangé).
- Liens du pied de page et inter-pages tous résolus vers des routes existantes.

## 2026-11-14 22:04 UTC — Synchronisation avec la branche par défaut

- Contexte : `AGENTS.md` (ajouté entre-temps) confirme que la **branche par défaut du dépôt est `vibe/novaloom-suite-fe60b6`** (jamais `main`, branche gelée) — la PR #13 cible donc cette base. Travaux fusionnés depuis : voix 100 % serveur (`/api/voix`, clé ElevenLabs retirée du bundle client — Celeste), mobile/bottom-nav + PWA hors-ligne (Farid), app bureau (Gigi), audit + sanitation du localStorage (Alpha), nettoyage du dépôt (Kilo).
- `git merge origin/vibe/novaloom-suite-fe60b6` : un seul conflit (`app-shell.tsx`), résolu en gardant **les deux côtés** : bottom-nav/install/PWA de la base + pied de page légal (Footer) de la mission. `store.ts` fusionné automatiquement (sanitation + `deleteAccount` conservés).
- Politique de confidentialité mise à jour pour refléter le vrai flux voix actuel : texte prononcé + prénom (en-tête `x-centeryou-user`, quota en mémoire uniquement, jamais enregistré) → route serveur `/api/voix` (Vercel) → ElevenLabs ; sans voix premium, aucune donnée ne sort du navigateur.
- Vérifications après merge : `npm run build` ✅ (12 pages + `/api/voix` + `/api/compte/suppression`), `npm run test:parser` ✅, smoke test loopback : toutes les pages 200, `POST /api/compte/suppression` → 200.
- Journaux des autres agents lus (alpha, celeste, farid, gigi, kilo) : aucun chevauchement avec ma zone (pages légales / conformité) ; aucune fonctionnalité existante modifiée.
- PR : https://github.com/User313MSI/Dev-Apps/pull/13 (base `vibe/novaloom-suite-fe60b6`).
