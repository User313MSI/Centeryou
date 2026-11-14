# Jonas — 2026-11-14 — Mission : lancement

Mission : rendre Centeryou trouvable (Google), partageable (démo + fiche de presse) et parfait pour le 1er janvier.
Branche de travail : `vibe/centeryou-launch-jonas-d7c8a1` (base du PR : `main`).

## Ce qui a été construit

1. **Page d'accueil publique `/`** : slogan « Ton planning qui te parle », 3 arguments (mobile-first, ta voix te
   briefe, tes données restent les tiennes), aperçu du produit (semaine de la démo, lecture seule), CTA
   « Créer mon compte » + « Voir la démo ». Un visiteur ayant déjà un profil local (prénom, données ou parcours
   effectué) est redirigé automatiquement vers `/aujourdhui` (l'ancienne page `/`).
2. **SEO** : aucun `noindex` n'existe dans le code et les métadonnées posent explicitement
   `robots: { index: true, follow: true }` ; titres/descriptions en français sur toutes les pages publiques ;
   `html lang="fr"` ; canonical ; Open Graph (`fr_FR`, image 1200×630 `/opengraph-image` : logo + slogan sur fond
   `#FAFAFC`, générée à la build via `next/og` sans dépendance) + Twitter card ; `/robots.txt` (allow all +
   sitemap) ; `/sitemap.xml` (7 pages publiques). URL publique : `NEXT_PUBLIC_SITE_URL` (défaut
   `https://centeryou.vercel.app`, voir `.env.local.example`).
3. **Mode démo `/demo`** : lien partageable, lecture seule (aucun champ de saisie, pas de FAB voix, pas de
   raccourcis clavier sur les routes publiques ; la semaine affichée provient de `src/lib/demo-data.ts`, jamais du
   store). Semaine type de **Sofia, graphiste indépendante**, ancrée sur la semaine en cours. Aucune donnée réelle.
4. **Fiche de presse `/presse`** : description courte, slogan, 3 points produit, logo (aperçu + SVG/PNG
   téléchargeables), image de partage 1200×630, lien vers la démo en ligne, contact.
5. **Parcours compte** : `/inscription` (compte local = un prénom, sans serveur ni mot de passe, « Continuer sans
   compte » possible) puis `/onboarding` (3 étapes) puis `/aujourdhui`. `/offres` (gratuit, principes local-first)
   et `/legal` (mentions légales, confidentialité localStorage, CGU).

## Contrôle final — 10 vues clés

Vérifié en build de production + serveur `next start` local (HTTP 200 sur chaque route, contrôle du HTML rendu,
des balises SEO et de l'absence de `noindex`) + `npm run test:parser` :

| # | Vue | Résultat | Détail |
|---|---|---|---|
| 1 | Inscription (`/inscription`) | ✓ | Formulaire prénom rendu en SSR, CTA « Créer mon compte » → `/onboarding`, « Continuer sans compte » → `/aujourdhui`, redirection auto si déjà connecté |
| 2 | Onboarding (`/onboarding`) | ✓ | 3 étapes (voix/saisie, glisser, brief), salutation avec le prénom, CTA « C'est parti ! » → `/aujourdhui` |
| 3 | Création (dialog événement) | ✓ | Code inchangé : `N`, clic sur un créneau, bouton « Nouvel événement » ouvrent la dialog ; conflits détectés (tests parseur ✓) |
| 4 | Glisser (drag & drop) | ✓ | Code inchangé : `EventBlock` pointer + `resolveDropZone` + `moveEvent` avec conservation de la durée et bornes de journée |
| 5 | Saisie naturelle | ✓ | `QuickAdd` + parseur FR : 24 assertions `npm run test:parser` passent (« sport demain 14h », « !lundi réunion », « dentist mardi 10h30 santé »…) |
| 6 | Voix (`/voix` + FAB) | ✓ | Page + commandes testées (« ajoute… », « mon programme », « c'est fait… ») ; FAB et raccourcis désactivés sur les routes publiques (démo bien en lecture seule) |
| 7 | Réglages (`/reglages`) | ✓ | Profil, journée, sons/voix, effacement des données ; nouveau champ `onboarded` (persisté, rétrocompatible) |
| 8 | Offres (`/offres`) | ✓ | Offre « Gratuit — 0 € » tout inclus + principes (pas d'abonnement, pas de pistage) |
| 9 | Légal (`/legal`) | ✓ | Éditeur, hébergement, confidentialité (localStorage `centeryou-v1`, aucun envoi serveur), CGU |
| 10 | Démo (`/demo`) | ✓ | 200, bannière « Mode démo — lecture seule » + semaine de Sofia en SSR, aucune saisie possible, CTA « Créer mon compte » |

Parcours existants : non cassés — `/aujourdhui`, `/planning`, `/taches`, `/voix`, `/reglages` fonctionnent comme
avant (rendus côté client après hydratation, comme déjà le cas), aucune donnée utilisateur modifiée (le store
n'est pas touché par la démo), design 100 % dans les tokens (`design/tokens.ts`).

## Commandes exécutées

- `npm ci` ✓
- `npm run build` ✓ (18 routes statiques : `/`, `/aujourdhui`, `/demo`, `/inscription`, `/onboarding`, `/presse`,
  `/offres`, `/legal`, `/planning`, `/taches`, `/voix`, `/reglages`, `/robots.txt`, `/sitemap.xml`,
  `/opengraph-image`…)
- `npm run test:parser` ✓ (tous les tests passent)
- `next start` + requêtes HTTP sur les 15 routes : toutes 200, `noindex` absent partout, `robots.txt` et
  `sitemap.xml` conformes, `/opengraph-image` = PNG 1200×630 (vérifié visuellement : fond #FAFAFC, logo violet +
  onde turquoise, « Centeryou — Ton planning qui te parle »)

## Points d'attention

- Renseigner `NEXT_PUBLIC_SITE_URL` sur Vercel avec le vrai domaine de production pour des URL OG/canonical exactes
  (défaut : `https://centeryou.vercel.app`).
- Les pages app (`/aujourdhui`, `/planning`…) restent volontairement non indexées en contenu (rendues côté client,
  données locales) ; elles ne figurent pas dans le sitemap mais ne sont bloquées nulle part.
