# Journal — Gigi

## Gigi — 2026-11-14 — Mission : app bureau

**Mission** : packager Centeryou en application bureau installable sur ordinateur (Windows d'abord), via un dossier `apps/centeryou-desktop/` dans le monorepo, chargeant l'application en ligne avec repli hors-ligne sur la PWA.

**Contexte constaté** : sur la branche `main`, `apps/centeryou/` n'existe pas encore (l'app web vit sur les branches `vibe/centeryou-*`, PR #3–#5 vers `vibe/novaloom-suite-fe60b6`). La coquille bureau ne dépend donc d'aucun code web : elle charge l'URL de production Vercel **`https://dev-apps-centeryou.vercel.app`** (vérifiée en ligne le 2026-11-14, titre « Centeryou — ton planning, ta voix »). Conformément à l'interdit « aucun changement dans `apps/centeryou/` sauf stricte nécessité documentée », le **seul** ajout sous `apps/centeryou/` est ce fichier journal, exigé par la règle du journal — aucun fichier de l'application web n'est touché ni dupliqué.

**Décisions** :

- **Electron + electron-builder (NSIS)** plutôt que Tauri : la coquille charge une URL distante (pas de bundle local à servir), Electron/Chromium garantit le fonctionnement identique à la PWA (service worker, Web Speech API, micro), et le dépôt a déjà ce pattern (FlowPlan, `vibe/flowplan-88d3be`). Cible Windows x64 d'abord (`npm run dist:win`), mac/linux aussi configurés.
- **Installateur `.exe`** : NSIS one-click, `appId com.novaloom.centeryou`, icône `build/icon.ico` (générée en Node pur depuis l'icône PWA officielle `assets/icon-512.png`, tailles 256→16), raccourcis Bureau + menu Démarrer « Centeryou », fenêtre sans barre de menu, taille/position/plein écran persistés dans `window-state.json` (userData).
- **Liens externes** : `will-navigate` + `setWindowOpenHandler` → `shell.openExternal` (HTTPS uniquement) pour toute URL hors de l'origine de production ; `webview` interdite ; certificats invalides toujours refusés.
- **Hors-ligne** : si le chargement de l'URL échoue, `offline.html` (bouton « Réessayer » + reconnexion auto toutes les 5 s) ; entre-temps le service worker de la PWA (même origine Vercel) peut servir l'app depuis son cache.
- **Mise à jour** : la version en ligne est toujours la bonne — l'app charge l'URL de production à chaque lancement (sans cache) ; au démarrage elle compare le `x-vercel-id` courant à celui embarqué (`build-info.json`, régénéré par `npm run check-build` avant chaque `dist`) et notifie si un nouvel installateur existe (lien `CENTERYOU_DOWNLOAD_URL`, défaut : Releases GitHub). Procédure de production d'un nouvel installateur documentée pas à pas en français dans `apps/centeryou-desktop/README.md` — **une commande : `npm run dist:win`**.
- **Voix** : micro autorisé uniquement pour l'origine de production (jamais la caméra) via `setPermissionRequestHandler` / `setPermissionCheckHandler` ; synthèse vocale Web Speech API (voix Windows) fonctionnelle en Chromium.

**Fichiers ajoutés** : `apps/centeryou-desktop/` (`package.json`, `main.js`, `preload.js`, `offline.html`, `build-info.json`, `.gitignore`, `README.md`, `assets/icon-{512,192}.png` + `icon.svg`, `build/icon.ico` + `icon.png`, `scripts/make-icons.mjs`, `scripts/check-build.mjs`) et ce journal.

**Vérifications effectuées** : `node --check` sur `main.js`, `preload.js`, `scripts/*.mjs` ; validation JSON de `package.json` / `build-info.json` ; `node scripts/make-icons.mjs` → `build/icon.ico` valide (6 tailles 256→16, 32 bits, vérifié par `file`) ; URL de production joignable et rendue. La génération du `.exe` nécessite une machine Windows (ou CI) avec accès au registre npm — non exécutable dans ce sandbox Linux, d'où la procédure documentée.

**Branche** : `vibe/centeryou-desktop-5e29d7`, PR vers `main`.
