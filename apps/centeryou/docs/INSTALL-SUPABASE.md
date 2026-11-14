# Installer la sauvegarde en ligne de Centeryou (Supabase, gratuit)

Ce guide explique, pas à pas et sans jargon de développeur, comment activer les **comptes** et la **sauvegarde en ligne** de Centeryou avec [Supabase](https://supabase.com) (offre gratuite largement suffisante). **Sans cette installation, Centeryou fonctionne exactement comme avant : 100 % local, sans compte.**

Temps estimé : environ 10 minutes.

---

## Étape 1 — Créer un compte Supabase (gratuit)

1. Va sur [supabase.com](https://supabase.com) et clique sur **« Start your project »** (ou « Sign in » si tu as déjà un compte).
2. Inscris-toi avec ton e-mail (ou avec un compte GitHub/Google). Confirme ton e-mail si un message te lo demande.

## Étape 2 — Créer ton projet

1. Une fois connecté, clique sur **« New project »** (bouton vert, en haut à droite).
2. Choisis une **organisation** (crée-la si besoin — c'est juste un dossier qui contient tes projets).
3. Donne un **nom au projet**, par exemple `centeryou`.
4. Choisis un **mot de passe de base de données** fort (note-le dans un gestionnaire de mots de passe — il sert en cas de restauration, pas pour l'app).
5. Choisis une **région** proche de chez toi (ex. : `Frankfurt (EU Central)` pour la France).
6. Clique sur **« Create new project »** et attends 1 à 2 minutes (l'écran affiche « Setting up your project… »).

## Étape 3 — Créer les tables (copier le script SQL)

1. Dans le menu de gauche de ton projet, clique sur **« SQL Editor »** (icône `>_`).
2. Clique sur **« New query »** (ou « + New query »).
3. Ouvre le fichier [`docs/supabase/schema.sql`](./supabase/schema.sql) de ce dépôt, **copie tout son contenu** et colle-le dans l'éditeur SQL.
4. Clique sur **« Run »** (en bas à droite, ou raccourci `Ctrl + Entrée`).
5. Tu dois voir un message de succès (ex. : « Success. No rows returned »). Si tu vois une erreur, vérifie que tu as bien tout copié, puis réessaie — le script peut être réexécuté sans risque.

> Ce script crée deux tables : `profiles` (ton prénom et ton e-mail) et `backups` (ta sauvegarde de données), plus des règles de sécurité qui garantissent que **seul toi** peux lire tes données.

## Étape 4 — Activer la connexion par e-mail (c'est déjà le cas par défaut)

1. Dans le menu de gauche, clique sur **« Authentication »** (icône clé), puis sur **« Providers »**.
2. Vérifie que **« Email »** est bien activé (bouton sur « Enabled »).
3. Optionnel : dans **« Authentication » → « Settings » → « Email Auth »**, tu peux désactiver **« Confirm email »** pour te connecter immédiatement après l'inscription (utile pour tester). En production, laisse-la activée.

## Étape 5 — Récupérer les 2 clés du projet

1. Dans le menu de gauche, clique sur **« Project Settings »** (icône engrenage, tout en bas).
2. Clique sur **« API »** dans le sous-menu.
3. Tu vois deux informations :
   - **Project URL** — ex. : `https://abcdefghijkl.supabase.co` → c'est ta `NEXT_PUBLIC_SUPABASE_URL`.
   - **anon public** (dans « Project API keys») — une longue clé qui commence par `eyJ…` → c'est ta `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copie-les toutes les deux (bouton « Copy » à côté de chaque valeur). **La clé `anon public` est publique de conception** (elle ne donne accès qu'aux données de l'utilisateur connecté, grâce aux règles de sécurité de l'étape 3) — ne copie surtout pas la clé `service_role`, elle est secrète.

## Étape 6 — Coller les 2 clés dans Vercel (pour la production)

1. Va sur [vercel.com](https://vercel.com), ouvre ton projet Centeryou, puis l'onglet **« Settings » → « Environment Variables »**.
2. Ajoute deux variables :
   - Nom : `NEXT_PUBLIC_SUPABASE_URL` — Valeur : ton Project URL (étape 5) — coche **Production**, **Preview** et **Development**.
   - Nom : `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Valeur : ta clé `anon public` — coche les trois environnements aussi.
3. Clique sur **« Save »**.
4. Redéploie l'application : onglet **« Deployments »** → menu `⋯` du dernier déploiement → **« Redeploy »** (ou pousse un commit, selon ton flux). Les variables `NEXT_PUBLIC_*` sont intégrées au moment du build.

## Étape 7 — Tester en local (optionnel, pour les développeurs)

1. À la racine de `apps/centeryou/`, copie `.env.local.example` en `.env.local`.
2. Décommente les deux lignes `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` et colle tes valeurs.
3. `npm run dev` puis ouvre [http://localhost:3000](http://localhost:3000) → **Réglages** → crée un compte.

> `.env.local` est ignoré par Git (voir `.gitignore`) : tes clés ne seront jamais publiées.

---

## C'est prêt — comment ça marche ensuite ?

- **Réglages → « Compte & sauvegarde en ligne »** : crée un compte ou connecte-toi (mot de passe oublié disponible).
- À la connexion, si tu as déjà des données locales, Centeryou te propose **« Enregistrer mes données en ligne »**.
- Ensuite, chaque modification (événement, tâche, réglage) est **synchronisée automatiquement en arrière-plan** : l'indicateur discret en haut de page affiche **« Enregistré ✓ »**.
- Sur un **autre appareil**, ouvre Centeryou, connecte-toi avec le même compte : tes données sont récupérées (la version la plus récente gagne).
- **Hors ligne** : tout continue de fonctionner en local ; la synchro reprend à la reconnexion.
- **Sans compte** : aucun changement, l'app reste anonyme et 100 % locale.
- **Export** : Réglages → « Export des données » télécharge un fichier JSON de toutes tes données.
