# Audit de sécurité FlowPlan v3 — 2026-11-02 (intransigeant)

Périmètre : 100 % du code de `apps/flowplan/` (web/PWA/file:// + Electron + serveur de dev).
Méthode : revue ligne par ligne + **attaques simulées exécutées** (pas juste théoriques).
Résultat : **77 tests, 0 échec**, dont 10 tests d'attaque. Findings corrigés dans le même commit.

## Attaques simulées et résultats

| # | Vecteur d'attaque | Résultat avant audit | Action |
|---|---|---|---|
| 1 | XSS via titre d'événement (`<script>`, `<img onerror>`) | ✅ neutre : rendu en `textContent` uniquement, zéro `innerHTML` dynamique (grep prouvé) | test de non-régression ajouté |
| 2 | Payload parser (5000 caractères) | ✅ tronqué à 300 | test ajouté |
| 3 | Injection `.ics` (CRLF dans titre/id pour forger un faux VEVENT) | ✅ échappé, 1 seul VEVENT/VCALENDAR, UID `[A-Za-z0-9_-]` | test ajouté |
| 4 | Path traversal serveur (`..%2f`, `....//`, `..\`, double-encodage) | ✅ 403/404, aucun contenu servi | testé en HTTP réel |
| 5 | localStorage hostile (`2026-13-99`, `99:99`, couleur `javascript:`) | ⚠️ date/heure au format regex seulement → **corrigé** : validation calendaire réelle (`isRealDate`/`isRealTime`, ex. 29/02 non bissextile rejeté) | fix + test |
| 6 | Méthodes HTTP (PUT/DELETE/POST) sur serveur | ✅ 405 | testé |
| 7 | En-têtes serveur | ✅ `nosniff`, CSP, `X-Frame-Options: DENY`, `Referrer-Policy`, `Cache-Control: no-store` sur code | testé |
| 8 | Electron : ouverture de liens | ⚠️ `http://` accepté → **corrigé** : seul `https://` ouvrable, `http://` bloqué | fix |
| 9 | Service worker relai externe | ⚠️ `fetch` non filtré → **corrigé** : toute URL hors origine locale = `Response.error()` | fix |
| 10 | Secrets / télémétrie / URLs externes dans le code | ✅ aucun (grep) | — |

## Ce qui est vérifié propre

- **CSP stricte** dans `index.html` : `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- **Electron** : `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, `setWindowOpenHandler → deny`, `will-navigate` restreint au dossier app, `will-attach-webview` bloqué, preload minimal (`{isDesktop:true}` uniquement, aucun IPC exposé).
- **Serveur de dev** : bind `127.0.0.1` uniquement, GET/HEAD seuls, limite URL 2048, rejet NUL.
- **Stockage** : sanitize à chaque load (formats stricts + calendaire), dédoublonnage des id, plafond 5000, quota géré.
- **Zéro dépendance runtime** ; devDependencies = electron + electron-builder seulement.
- **Aucune permission navigateur** déclarée (pas de micro/cam/géo/notifications dans le manifest — la voix passe par l'API navigateur sans permission persistante).
- **`.gitignore`** couvre `node_modules/`, `release/`, `dist/`, `*.log`.

## Limites documentées (acceptées)

- `localStorage` non chiffré : OK pour un planning perso sur son propre appareil ; à chiffrer (WebCrypto) si données sensibles un jour.
- Saisie vocale = API Web Speech du navigateur (Chrome/Edge) : le navigateur peut transmettre l'audio à son service. Alternative 100 % locale (Vosk) prévue en v3 desktop.
- `serve.js` = serveur de **développement local** uniquement, jamais exposé publiquement.

## Rejouer l'audit

```bash
cd apps/flowplan
npm test                       # 77 tests dont attaques
node serve.js &                # puis :
#   GET / -> 200 + headers ; PUT -> 405 ; /..%2f.. -> 403
grep -rn "innerHTML" js/ | grep -v "= ''"   # -> vide
grep -rnE "https?://" js/ index.html sw.js  # -> aucune URL externe
```
