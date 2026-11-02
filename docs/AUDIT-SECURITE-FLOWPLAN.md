# Audit de sécurité FlowPlan — 2026-11-02 (v2)

Périmètre : tout le code de `apps/flowplan/` (web/PWA + Electron + serveur local).
Résultat : **51 tests, 0 échec** dont 7 tests de sécurité dédiés.

## 1. Modèle de menaces

FlowPlan est une app **100 % locale** : aucune donnée ne quitte l'appareil.
Les risques réels sont donc : (a) injection de contenu via les données de l'utilisateur
(lui-même ou un fichier .ics importé plus tard), (b) la surface du serveur de dev local,
(c) la surface de la fenêtre Electron, (d) la persistance localStorage.

## 2. Ce qui est en place (vérifié par tests + revue)

| Risque | Mesure | Preuve |
|---|---|---|
| XSS via titres d'événements | `textContent`/`createElement` partout, zéro `innerHTML` dynamique ; CSP `script-src 'self'`, `object-src 'none'`, `base-uri 'self'` | grep + test `sanitizeEvent` |
| Injection dans l'export .ics | échappement `\ ; , CRLF` + UID restreint à `[A-Za-z0-9_-]` | test anti-injection (1 seule vraie ligne SUMMARY/VEVENT) |
| Données corrompues/hostiles dans localStorage | `sanitizeEvent` (formats stricts date/heure/couleur), dédoublonnage des id, plafond 5000 événements | tests store |
| DoS mémoire via entrée géante | troncature à 300 caractères côté parser | test |
| Dates impossibles | validation calendaire (29/02 non bissextile rejeté) | test |
| Serveur dev : path traversal | `path.normalize` + préfixe racine, `..` → 403, NUL/URL > 2048 → 400 | smoke test HTTP |
| Serveur dev : méthodes | seul GET/HEAD autorisé, POST → 405 | smoke test HTTP |
| Serveur dev : écoute réseau | bind `127.0.0.1` uniquement (pas 0.0.0.0) | code serve.js |
| En-têtes HTTP | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, CSP | smoke test (présents sur 200) |
| Electron : escape sandbox | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true` | main.js |
| Electron : fenêtres/navigation externes | `setWindowOpenHandler → deny`, `will-navigate` bloqué hors `file://__dirname`, `will-attach-webview` bloqué, liens http(s) → navigateur externe via `shell.openExternal` | main.js |
| Secrets en dur | aucun (grep api_key/secret/token/password : 0 hit) | grep |
| Appels réseau depuis l'app | aucun `http(s)://` dans js/index/manifest/sw (hors commentaires) | grep |
| Supply chain | **zéro dépendance runtime** ; devDependencies = electron + electron-builder uniquement ; service worker sert uniquement des assets locaux cachés | package.json |
| Fichiers sensibles commités | `.gitignore` : `node_modules/`, `release/`, `dist/`, `*.log` | .gitignore |

## 3. Limites connues (acceptées, documentées)

- La **saisie vocale** passe par l'API Web Speech du navigateur (Chrome/Edge envoient
  potentiellement l'audio à leur service). C'est inhérent au navigateur, pas à FlowPlan ;
  la v3 desktop pourra utiliser un moteur 100 % local (Vosk).
- `localStorage` n'est pas chiffré : acceptable pour un planning personnel sur son propre
  appareil ; à chiffrer (WebCrypto) si des données sensibles y sont un jour stockées.
- Le serveur `serve.js` est un serveur de **développement local** (boucle 127.0.0.1) ;
  ne jamais l'exposer publiquement tel quel.

## 4. Commandes pour rejouer l'audit

```bash
cd apps/flowplan
npm test                                  # 51 tests dont 7 sécu
node serve.js &                           # puis tester à la main :
#   curl -i http://localhost:8000/            -> 200 + en-têtes sécu
#   curl -i --path-as-is http://localhost:8000/../../etc/passwd -> 403
#   curl -i -X POST http://localhost:8000/    -> 405
grep -rn "eval(" js/ ; grep -rn "innerHTML" js/ | grep -v "= ''"
```
