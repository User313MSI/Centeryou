# Audit FlowPlan — 2026-11-02

Audit complet (code + robustesse + sécurité + UI/UX) réalisé avant mise en prod.
Résultat : **44 tests, 0 échec** après corrections.

## 1. Bugs trouvés et corrigés (parser)

| Entrée | Avant | Après |
|---|---|---|
| `12/13/2026 10h truc` | date fausse `2027-01-12` | date rejetée (validation calendaire) |
| `32 janvier 2026` | `2026-02-01` (débordement JS) | rejeté |
| `lundi 9h à 8h truc` | `end 08:00 <= start 09:00` | fin rejetée, durée implicite 1h |
| `lundi 23h truc` | `end 00:00` incohérent | coince à `23:59` |
| `lundi 9h99 truc` | heure invalide dans le titre | retirée proprement |
| `mecredi 14h30` | jour non reconnu | rattrapé → mercredi (Levenshtein ≤ 1) |
| `ce soir 20h film` | non compris | aujourd'hui |
| `dans 3 jours 10h truc` | non compris | date relative calculée |
| `lundi prochain 9h truc` | « prochain » dans le titre | mot retiré |
| entrée > 300 caractères | non tronquée côté affichage | tronquée |

## 2. Bugs trouvés et corrigés (moteur / persistance / UI)

- **planner** : `end <= start` et date non ISO maintenant annulés à l'ajout (défense en profondeur, même si le parser est propre).
- **store** : `save()` gère le dépassement de quota localStorage (~5 Mo) avec repli + message utilisateur ; `load()` filtre les entrées corrompues (id + title obligatoires).
- **UI XSS** : suppression de tous les `innerHTML` avec données dynamiques → `textContent` / `createElement` partout (filtres, en-têtes de jours, stats).
- **Accessibilité** : focus visible (`:focus-visible`) sur tous les boutons/champs, fermeture de la modale avec `Échap`, conflits surlignés en orange sur les cartes (`conflictedIds()`).
- **CSP renforcée** : ajout `object-src 'none'; base-uri 'self'; form-action 'self'`.
- **Contraste** : texte secondaire éclairci (`#8b98a8` → `#a3b0c0`) pour viser WCAG AA sur fond sombre.
- **Nouveautés UX** : filtres par catégorie (puces cliquables avec compteurs), exemples cliquables, export `.ics`, impression.

## 3. Sécurité (vérifié, rien à corriger)

- Aucun `eval` / `new Function`.
- Aucun secret en dur (grep api_key/secret/token/password : 0 hit).
- CSP stricte dans `index.html` ; Electron : `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Serveur statique : protection contre la sortie de répertoire (`..` → 403, testé).
- `node --check` OK sur les 11 fichiers JS.
- 100 % local : aucun appel réseau dans le code app (hors service worker local).

## 4. UI/UX — ce qui reste à peaufiner (volontairement reporté)

- Icône PWA en SVG uniquement : iOS Safari préfère un PNG 180×180 (`apple-touch-icon`). À générer au build.
- Pas de drag & drop des événements entre jours (prévu v2).
- Pas de thème clair (prévu v2, variable CSS déjà isolées).
- Vue mois en plus de la vue semaine (prévu v2).
- Voix : dépend du navigateur (Chrome/Edge). Alternative TTS/STT 100 % locale à étudier (ex. Vosk) pour la v2 desktop.

## 5. Comment rejouer l'audit

```bash
cd apps/flowplan
npm test                 # 44 tests
node -e "const P=require('./js/parser.js'); console.log(P.parseEvent('mecredi 14h30 dentiste', new Date(2026,10,3)))"
```
