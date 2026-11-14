# Centeryou — application bureau (Windows)

Coquille Electron qui charge **la version en ligne de Centeryou** (déployée sur Vercel) et la présente comme une application bureau installable sous Windows : icône Centeryou, raccourci dans le menu Démarrer, fenêtre propre (sans barre de menu ni chrome navigateur), taille et position de fenêtre mémorisées, liens externes ouverts dans le navigateur système, et repli hors-ligne sur la PWA.

Aucun code de l'application web n'est embarqué ni dupliqué ici : l'app bureau charge simplement l'URL de production. **La version en ligne est toujours la bonne.**

- URL de production : `https://dev-apps-centeryou.vercel.app` (surchargeable via la variable d'environnement `CENTERYOU_URL`)

## Prérequis

- Windows 10/11 64 bits (pour exécuter l'installateur) et une machine de build avec **Node.js 20+** et `npm`
- Accès à Internet (l'application charge la version en ligne)

## Générer l'installateur Windows en une commande

```bat
cd apps\centeryou-desktop
npm install
npm run dist:win
```

L'installateur est produit dans `dist\Centeryou-Setup-<version>.exe` (ex. `dist\Centeryou-Setup-1.0.0.exe`).

La commande `npm run dist:win` enchaîne automatiquement :

1. `npm run icons` — régénère `build\icon.ico` / `build\icon.png` depuis `assets\icon-512.png` (aucune dépendance externe, Node pur) ;
2. `npm run check-build` — interroge l'URL de production et écrit `build-info.json` (identifiant du déploiement Vercel courant, embarqué dans l'installateur) ;
3. `electron-builder --win --x64` — produit l'installateur NSIS `.exe`.

Double-clique sur le `.exe` pour installer : icône Centeryou sur le bureau et dans le menu Démarrer (`Centeryou`), désinstallation propre via « Paramètres > Applications ».

## Comportement de l'application

| Exigence | Implémentation |
|---|---|
| Charge la version en ligne | `main.js` charge `https://dev-apps-centeryou.vercel.app` (toujours la dernière version publiée sur Vercel) |
| Repli hors-ligne | si le chargement échoue, `offline.html` s'affiche avec bouton « Réessayer » et reconnexion automatique toutes les 5 s ; entre-temps, le cache du service worker de la PWA (même origine) peut servir l'application |
| Liens externes → navigateur | `will-navigate` et `setWindowOpenHandler` : toute URL hors de l'origine de production est ouverte via `shell.openExternal` (HTTPS uniquement), jamais dans l'app |
| Fenêtre propre | barre de menu supprimée (`Menu.setApplicationMenu(null)`, `autoHideMenuBar`), aucun chrome navigateur |
| Taille/position mémorisées | état de la fenêtre (x, y, largeur, hauteur, plein écran) persisté dans `window-state.json` (dossier `userData` d'Electron) et restauré au lancement |
| Voix incluse | le micro est autorisé **uniquement** pour l'origine de production (et jamais la caméra) via `setPermissionRequestHandler` ; la synthèse vocale (Web Speech API) fonctionne avec les voix Windows |
| Mise à jour au lancement | à chaque démarrage, l'app interroge l'URL de production (`x-vercel-id`) ; si le déploiement en ligne est plus récent que celui embarqué dans l'installateur (`build-info.json`), une notification propose de télécharger le nouvel installateur (lien `CENTERYOU_DOWNLOAD_URL`, par défaut les *Releases* GitHub du dépôt) |

Variables d'environnement optionnelles (à la build ou au lancement) :

- `CENTERYOU_URL` — changer l'URL chargée (ex. déploiement de prévisualisation)
- `CENTERYOU_DOWNLOAD_URL` — lien ouvert par la notification de mise à jour

## Produire un nouvel installateur (procédure pas à pas)

La version en ligne étant toujours la source de vérité, **le contenu de l'app est à jour sans réinstaller**. Un nouvel installateur n'est utile que si la coquille elle-même change (icône, comportement, version). Procédure :

1. Récupérer la dernière branche `main` : `git pull origin main`.
2. Se placer dans le dossier de la coquille : `cd apps\centeryou-desktop`.
3. Installer les dépendances si ce n'est pas déjà fait : `npm install`.
4. (Optionnel) Monter la version dans `package.json` (`"version": "1.0.1"`) — le nom du fichier suivra automatiquement.
5. Générer l'installateur : `npm run dist:win`.
6. Tester le `.exe` généré dans `dist\` sur une machine Windows propre (installation, lancement, voix, lien externe, mode hors-ligne en coupant le réseau).
7. Publier `dist\Centeryou-Setup-<version>.exe` (par ex. dans les *Releases* GitHub du dépôt `User313MSI/Dev-Apps`, ou à l'URL de votre choix via `CENTERYOU_DOWNLOAD_URL` à la build).
8. C'est tout : au prochain lancement, les utilisateurs ayant un ancien installateur voient la notification de mise à jour (comparaison du `buildId` Vercel) et le contenu de l'app est de toute façon déjà à jour puisqu'il est chargé en ligne.

## Structure

```
apps/centeryou-desktop/
├── package.json          # scripts + config electron-builder (NSIS .exe, icône, raccourcis)
├── main.js               # processus principal Electron (fenêtre, navigation, permissions, état)
├── preload.js            # API minimale exposée au renderer (contextIsolation, sandbox)
├── offline.html          # page de repli hors-ligne (bouton Réessayer + reconnexion auto)
├── build-info.json       # buildId Vercel embarqué (régénéré par npm run check-build avant chaque dist)
├── assets/               # icônes Centeryou (source : apps/centeryou/public/icons)
├── build/                # icon.ico / icon.png générés (buildResources electron-builder)
└── scripts/
    ├── make-icons.mjs    # génère build/icon.ico + build/icon.png depuis assets/icon-512.png
    └── check-build.mjs   # interroge l'URL de production et écrit build-info.json
```

## Dépannage

- **L'app affiche « hors ligne » au premier lancement sans connexion** : c'est attendu ; rebranchez le réseau, l'app se reconnecte toute seule (ou cliquez sur « Réessayer »).
- **Le micro ne répond pas** : vérifiez que Windows autorise le micro pour « Centeryou » (Paramètres > Confidentialité > Microphone) ; la coquille n'accorde le micro qu'à l'origine de production.
- **Un lien s'ouvre dans l'app au lieu du navigateur** : impossible côté coquille — toute navigation hors de `https://dev-apps-centeryou.vercel.app` est interceptée et ouverte dans le navigateur par défaut (HTTPS uniquement).
- **Proxy d'entreprise / certificat** : les certificats invalides sont toujours rejetés (`certificate-error` → refus).

## Lancer en développement

```bat
cd apps\centeryou-desktop
npm install
npm start          # ouvre la fenêtre sur l'URL de production
```
