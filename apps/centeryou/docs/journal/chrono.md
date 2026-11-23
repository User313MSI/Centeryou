# Journal — Chrono

## Mission M-27 — Audit fiabilité, rapidité et fonctionnalités, la règle à la main (lecture seule) — 2026-11-22

- **Agent** : Chrono. Branche : `vibe/chrono-fiabilite` (base `main` `ff7fe48` = `b37ac8e` + mon inscription M-27). Inscription publiée sur `main` à `ff7fe48` à 04:46 UTC avant de commencer.
- **Environnement de mesure** : worktree isolé `Centeryou-wt-chrono`, Node 24.22.1 / npm 11.19.1, Next 14.2.35, `node_modules` partagé en symlink (lockfile identique, sha256 `2f002236…` des deux côtés). Build de production `npm run build` ✅ (23 routes). Serveur de smoke `next start` sur ports 3990/3991 (127.0.0.1). Sondes jsdom via config vitest temporaire (`vitest.chrono.config.mjs` + `chrono-probes/`, **supprimés avant la PR**, extraits en annexe §9). Machine partagée (d'autres agents buildaient en parallèle).
- **Références lues** : `AGENTS.md`, `docs/MISSIONS.md` (M-27, cibles : landing et pages < 800 Ko), tout `docs/journal/` — en particulier `souffle.md` (M-11 : partagé 87,5 kO, `/` 114 kO, `/aujourdhui` 122 kO, `/reglages` 121 kO, `.next/static` 1 313 806 B, CSS 43 703 B, smoke 22/22, 383/383 tests à l'époque), `sentinelle.md` (top risques à revérifier), `lynx.md` (landing 824 kO avant lazy Supabase), `pont.md` (ICS), `cloche.md` (rappels), `accord.md`, `pinceau.md`, `nord.md`.
- **Zone tenue** : AUCUN fichier de code modifié. `git status` propre hors ce journal. Livrable unique : ce fichier.

---

## 1. Stabilité — suite de tests complète

| Exécution | Résultat | Durée |
|---|---|---|
| Run 1 (04:47 UTC) | **543/543 passed**, 32 fichiers | ~15 s |
| Run 2 (04:47 UTC) | **543/543 passed**, 32 fichiers | ~15 s |
| Run 3 (04:48 UTC) | **543/543 passed**, 32 fichiers | ~15 s |
| Runs 4–7 avec `TZ=America/New_York` / `Pacific/Kiritimati` / `UTC` / `Europe/Paris` | **543/543 à chaque fois** | ~15 s |

- **Aucun test n'a changé de verdict** entre les 7 exécutions → aucun flaky détecté.
- ⚠️ Honnêteté de méthode : sur cette machine Windows, Node **ignore la variable `TZ`** (vérifié : `TZ=Pacific/Kiritimati node -e …` affiche toujours `GMT+0100`). Les 4 runs « fuseaux » ont donc tourné dans le même fuseau local. Ce n'est pas grave ici : l'app travaille en heure murale locale par construction (`parseISO`/`toISODate` en local, jamais d'UTC), et la règle calendaire de MISSIONS.md (aucun test dépendant de la date réelle) est tenue — vérifié par grep : `tests/rappels.test.ts:270,292` recalcule « aujourd'hui » et « un autre jour » à l'exécution (l'incident du 21/11 est bien corrigé).
- `npm run build` ✅ exit 0, 23 routes. `npx tsc --noEmit` non lancé séparément (le build fait la vérification de types — « Linting and checking validity of types » ✅).

## 2. Rapidité mesurée (local, reproductible)

### 2.1 Poids du code embarqué par page (scripts+CSS référencés dans le HTML, téléchargés et sommés)

| Page | JS+CSS brut embarqué | dont gzip (ce que reçoit le navigateur) | First Load JS (Next) |
|---|---|---|---|
| `/` (landing) | 571 831 o | 183 074 o | 114 kO |
| `/aujourdhui` | 586 670 o | 187 958 o | 123 kO |
| `/planning` | 580 584 o | 185 030 o | 107 kO |
| `/reglages` (max) | 594 062 o | 186 521 o | **124 kO** |
| pages légales (min) | 546 527 o | 173 450 o | 96,4 kO |
| toutes les pages | 546–594 kO brut | 173–196 kO gzip | 96,4–124 kO |

- **Cible M-27 « landing et pages < 800 Ko » : tenue**, même en brut non compressé (marge ×1,35), et largement en gzip (marge ×4). CSS commun : 44 399 o brut partout.
- Chunk Supabase (`879-*.js`, 191 394 o) **absent du HTML initial de toutes les pages** — la promesse de Souffle/Lynx tient (lazy confirmé).
- `.next/static` total : **1 625 473 o, 56 fichiers** (Souffle à M-11 : 1 313 806 B → **+311 kO depuis**, expliqués par les missions fusionnées après M-11 : compte/sync/paiement, voix naturelle M-19, etc. — croissance de fonctionnalités, pas de régression silencieuse). Partagé Next : **87,5 kO exactement comme Souffle** ; `/` = 114 kO identique ; `/aujourdhui` 122→123 kO, `/reglages` 121→124 kO.
- Chiffre à redresser : Lynx citait « landing `/` : 17 chunks, **824 kO** » — c'était avant le lazy Supabase ; aujourd'hui `/` embarque 15 ressources uniques, **572 kO brut / 183 kO gzip**. Le 824 kO est historique, plus d'actualité.

### 2.2 Temps de réponse des routes (local `next start`, médiane de 5)

| Route | Statut | TTFB médian | Total |
|---|---|---|---|
| 16 pages (`/`, `/aujourdhui`, … `/voix`) | 200 | **25–77 ms** | ≤ 78 ms |
| `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/sw.js` | 200 | 4–5 ms | ≤ 6 ms |
| `/opengraph-image` | 200 | 77 ms | 78 ms |
| **froid** (1ʳᵉ requête après démarrage) | 200 | 37–377 ms (`/` = 377 ms) | ≤ 377 ms |
| rafale 20 requêtes parallèles sur `/`, `/planning`, `/api/sync` | 100 % 200 | — | max 67 ms |

### 2.3 Routes `/api/*` en local (sans backend configuré — comportements dégradés mesurés)

| Appel | Résultat | Temps |
|---|---|---|
| `POST /api/voix` texte valide | 503 `not-configured` (clé absente en local) + message FR | 4–9 ms |
| `POST /api/voix` ×22 | 20× 503 puis **429 + Retry-After** (plafond 20/h par IP) | 4–8 ms |
| `POST /api/voix` corps 3 Mo | **413** « Corps de requête trop volumineux » (middleware 2 Mo) | 9–11 ms |
| `GET /api/sync` sans customerId | 400 FR | 4–10 ms |
| `GET/POST /api/sync?customerId=cus_…` | **200**, snapshot null puis persisté (repli mémoire OK) | 8–15 ms |
| `POST /api/sync` champ inattendu / corps 1,5 Mo | 400 / 429 (rate-limit) — plafond 1 Mo en code | 4–7 ms |
| `POST /api/checkout` sans deviceId / champ en trop | 400 FR | 5–8 ms |
| `POST /api/checkout` avec deviceId (sans clé Stripe) | 503 « Paiement non configuré » propre | 4 ms |
| `POST /api/stripe/webhook` sans signature | 400 « Signature invalide » | 5–8 ms |
| `POST /api/subscription/status` | 200 `{"configured":false}` ; GET → 405 | 4 ms |
| `POST /api/compte/suppression` e-mail invalide | 400 `email_invalide` ; DELETE → 405 | 5 ms |

Toutes les erreurs sont en français, sans détail interne, `no-store` — conforme à Verrou. La validation du Host forgé (`trustedBaseUrl`) n'est pas testable localement sans clé Stripe (le 503 passe avant) — code relu, conforme.

### 2.4 Rendu avec 500 événements en mémoire (jsdom, vrais composants)

- `eventsOnDate(500)` : 36 items en **0,92 ms** · `calendarMonthOnDate` sur 42 jours : **8,2 ms** · `computeStats(500)` : **28,6 ms** · `statsWeeks(500)` : 4,9 ms.
- `PlanningPage` rendu avec 500 events : **113–158 ms**, 1249 nœuds DOM ; passage vue Mois : 64–96 ms. `StatsPage` 500 events : **22–26 ms**. 500 événements sérialisés = **90 Ko** dans localStorage (quota 5–10 Mo très large).

## 3. Parcours réels rejoués (jsdom + testing-library sur les vrais composants — 54 sondes, toutes vertes)

1. **Première ouverture** : `/` vierge → H1 « Ton planning qui te parle », CTA « Créer mon compte » / « Voir la démo », 3 blocs, liens Démo/Offres/Presse/Légal (tous 200 en HTTP). Profil existant → redirection `/aujourdhui` avec message lisible. Les 16 pages rendent sans plantage (2–76 ms).
2. **Saisie rapide** : « sport demain 14h santé » → événement 23/11 14:00–15:00 cat. Santé + toast FR ✓ ; « rapport vendredi !travail » → tâche priorité haute ✓ ; « — » seul → tâche « — » créée sans plantage ✓ ; champ vide → rien, pas de crash ✓.
3. **Création d'événement** : clic sur un créneau de la grille (98 zones `data-drop` présentes) → dialogue pré-rempli (date + heure du créneau) → « Créer l'événement » → créé ✓.
4. **Déplacement au doigt/souris** : pointerdown/move/up sur un bloc → `moveEvent` appelé : 22/11 14:00 → **24/11 10:00** + toast « « Sport » déplacé au mar. 24 nov. à 10h00. » ✓ (déposé sur une autre journée, créneau arrondi au 30 min).
5. **Import ICS** : fichier pile **1 Mo (1 048 576 o) accepté** (lecture 17,8 ms, parse 2,3 ms) → aperçu → import OK ; **1 Mo + 1 Ko refusé** : toast « Ce fichier est trop volumineux (1,0 Mo) : la limite est de 1 Mo. Aucune donnée n'a été modifiée. » ✓ ; **corrompu** → toast FR propre ✓ ; 500 VEVENT + `RRULE COUNT=100000` → 868 candidats en 6–18 ms, récurrence tronquée à 366 ✓ ; export→import round-trip identique ✓.
6. **Rappels** : à 9h50, un RDV 10h00 avec rappel 10 min est dû (1 notification calculée) ; à 9h40 → 0 ; rappels off → 0 ✓.
7. **Stats** : page complète rendue en 22 ms avec 500 events, textes FR (« Temps prévu par semaine », etc.) ✓.
8. **Film de lancement** : mode « daily » → auto-ouvert à l'ouverture (dialog `role="dialog"` « Film de lancement »), « Passer » ferme + `launchFilmShownDate = 2026-11-22` ; **réouverture le même jour : le film ne réapparaît pas** ✓.
9. **Réglages** : bascule « Mode sombre » → `theme: 'sombre'` ✓ ; « Effets sonores » ✓ ; slider « Volume des sons — 60 % » ✓ (un seul volume, par design) ; section Rappels présente ✓.
10. **Mobile 320 px** : vérifié statiquement (jsdom ne fait pas de layout) — `body { overflow-x: clip }` (globals.css:121), grilles semaine/mois en `overflow-x-auto` interne (`min-w-[720px]`/`min-w-[560px]` encapsulés), aucune largeur fixe ≥ 300 px hors conteneurs scrollables → **pas de scroll horizontal de page à 320 px** ; la vue jour tient à 320 px (confirmé par Pinceau). Icônes PWA toutes 200.

## 4. Cas limites sadiques (tous sondés, aucun crash)

- **Bissextile** : 2028-02-28+1 = 2028-02-29 ✓ ; 2027-02-28+1 = 2027-03-01 ✓ ; `addMonthsISO('2028-01-31',1)` = 2028-02-29 ✓ ; matrice février 2027 = 6×7 sans 29/02 ✓.
- **Heure d'été/hiver 2026** (29/03, 25/10) : `addDaysISO` ne saute jamais de jour ✓ ; l'app étant en heure murale locale par construction, les changements de fuseau ne cassent rien.
- **Parseur** : 26 entrées sadiques (« dans 999999999 jours », « dans 501 jours », « demain 25h », « 12:60 », « — », « ! », 100 000 caractères, émojis…) → **0 throw, date toujours valide** ; « dans 999999999 jours » retombe proprement sur aujourd'hui avec les mots dans le titre (plafond 500, correctif M-08 confirmé — Sentinelle #4 est corrigé).
- **Chevauchements** : `overlaps(23:00–00:00, 23:30–23:59)` = vrai ✓ ; `findConflict` détecte ✓ ; ICS qui traverse minuit → **refusé avec raison FR** (« Centeryou ne représente pas encore les événements de nuit ») ✓ ; le dialogue bloque fin ≤ début ✓.
- **Récurrence « mois » le 31** : clamp sur le dernier jour du mois (Sentinelle #6 corrigé : 31/01 → 28/02, 30/04, 29/02/2028) ✓.
- **Programme vide** : états vides propres sur `/aujourdhui`, `/planning`, `/taches` (voir 🟡 ci-dessous pour le texte de l'état vide du planning).
- **localStorage corrompu** : `createSafeStorage` → état neuf + copie `centeryou-v1__corrupt-<ts>` + message FR, rien supprimé ✓. **Quota plein** (setItem qui lève) : aucun throw, état en mémoire conservé ✓.
- **Chaînes géantes** : titre de 100 000 car accepté par `sanitizeEvents` (voir 🟡) ; parseur 100 000 car OK.

## 5. Fonctionnalités annoncées vs réalité (landing, /offres, /presse, docs marketing)

| Promesse | Réalité mesurée | Verdict |
|---|---|---|
| « Dis « ajoute sport demain 14h » » | parseur exact, événement créé avec bonne date/heure/catégorie | ✅ |
| « te briefe à la voix » | brief du matin + `speak()`, repli Web Speech API du navigateur sans clé (voice.ts) | ✅ |
| « 100 % en français, gratuit, données sur ton appareil » | localStorage uniquement, aucun appel réseau hors /api/* explicites | ✅ |
| « Installable en application, même hors-ligne » | `manifest.webmanifest` + `sw.js` (précache coquille + icônes) + install-prompt, icônes 200 | ✅ |
| « glisser-déposer » | drag & drop testé, déplacement effectif + toast | ✅ |
| Offres : gratuit 0 € + Premium 4,99 €/mois | `/offres` + `plans.ts` `priceMonthlyEur: 4.99` ; paiement → 503 propre sans clé Stripe en local | ✅ |
| Démo lecture seule | `/demo` rendue (76 ms), semaine de Sofia | ✅ |
| Export JSON / ICS, effacer en un clic | boutons présents et testés (ics-ui, backup) | ✅ |
| Rappels « quand l'app est ouverte ou en arrière-plan » (honnêteté) | moteur local testé, texte conforme | ✅ |
| Liens Démo / Offres / Presse / Légal | tous 200 | ✅ |

**Aucune promesse non tenue trouvée.** Deux avertissements honnêtes (pas des promesses cassées) : les TZID des ICS importés sont ignorés (heures lues en local, note dans le compte-rendu) ; « hors-ligne » couvre la coquille + données locales, pas la voix premium (qui retombe sur la voix du navigateur — c'est écrit dans le code et les tests).

## 6. Défauts trouvés, classés par gravité (reproduction exacte)

Aucun 🔴 (aucun crash reproductible, aucune perte de données, aucune promesse cassée).

### 🟠 Orange

1. **Import de sauvegarde JSON sans aucun plafond de taille.** `src/lib/backup.ts:78` `readBackupFile` lit le fichier entier en mémoire (`FileReader.readAsText`) puis `JSON.parse`, sans limite. Mesuré en jsdom : un fichier de **50 Mo est lu en 99 ms et parsé en 38 ms** — un fichier de plusieurs centaines de Mo bloquera/tuera l'onglet (OOM) au clic « Restaurer ». *Repro* : Réglages → « Restaurer » → choisir un JSON de 50 Mo+ → freeze. (Sentinelle #13, toujours d'actualité sur main.) Correctif : plafond ~5 Mo + message FR, comme `readIcsFile`.

### 🟡 Jaune

2. **`sanitizeEvents` n'impose ni plafond de titre ni `fin > début`.** Un fichier de sauvegarde (ou un localStorage édité) avec un titre de 1 Mo est accepté tel quel (mesuré : `titreLen=1000000`) et persisté → rendu ralenti ; un événement `23:00→02:00` est accepté et devient **invisible en vue Jour/Semaine** (`EventBlock` retourne `null` car `visEnd <= visStart`) tout en restant présent en vue Mois. *Repro* : restaurer `{"app":"centeryou","events":[{"id":"x","title":"Nuit","date":"2026-11-22","start":"23:00","end":"02:00",…}]}` → événement fantôme. Correctif : dans `sanitizeEvents`, rejeter/réparer si `endMinutesOf(end) <= minutesOf(start)` et tronquer le titre à 140 car (cohérent avec `ICS_MAX_TITLE` et les `maxLength` des champs).
3. **État vide du planning incohérent.** Quand le programme est totalement vide, `planning/page.tsx` affiche l'`EmptyState` (« clique sur un créneau horaire ou appuie sur « Nouvel événement »») **mais ne rend pas la grille** — mesuré : 0 zone `data-drop` à vide. Le « clique sur un créneau » n'existe pas. *Repro* : nouveau profil → `/planning` → texte invitant à cliquer un créneau, aucun créneau affiché. Correctif : toujours rendre la grille, ou corriger le texte.
4. **TZID des fichiers ICS importés ignorés sans avertissement par événement.** `parseIcs` note « Les fuseaux horaires du fichier (TZID) ont été ignorés » dans le compte-rendu, mais un agenda importé d'un autre fuseau (ex. `TZID=America/New_York`) voit ses heures lues telles quelles en heure locale → décalage silencieux pour l'utilisateur. Mesuré : `DTSTART;TZID=America/New_York:20261122T090000` → importé 09:00 (et non 15:00/16:00 heure de Paris).
5. **Salutation doublonnée sur `/aujourdhui`** : « Bonjour, Camille » en en-tête + « Bonjour, Camille. Nous sommes le dimanche 22 novembre. » en première phrase du brief — le « Bonjour » apparaît deux fois à l'écran. Cosmétique.

### Notes (🟢, pas des défauts)

- Voix premium en local sans clé → 503 propre + repli voix navigateur (attendu, testé).
- `GET /api/subscription/status` → 405 (la route attend POST) — cohérent, documenté par les tests.
- Croissance du bundle depuis M-11 (+311 kO sur `.next/static`) = fonctionnalités fusionnées, cible < 800 Ko toujours tenue.

## 7. Chiffres des journaux redressés / confirmés

| Chiffre cité | Source | Mesuré aujourd'hui | Verdict |
|---|---|---|---|
| Partagé 87,5 kO, `/` 114 kO | Souffle M-11 | 87,5 kO / 114 kO exactement | ✅ exact |
| `/aujourdhui` 122 kO, `/reglages` 121 kO | Souffle M-11 | 123 kO / 124 kO | ✅ +1/+3 kO (features M-19+), cible tenue |
| `.next/static` 1 313 806 B | Souffle M-11 | 1 625 473 B / 56 fichiers | ⚠️ +311 kO depuis, expliqué (missions fusionnées) |
| Smoke 22/22 routes en 200 | Souffle M-11 | 22/22 URLs en 200 | ✅ exact |
| Landing 824 kO / 17 chunks | Lynx (avant lazy) | 572 kO brut / 183 kO gzip, 15 ressources | ⚠️ chiffre historique, plus d'actualité |
| 383/383 tests (M-11) ; 457/457 (Nord/Pinceau) ; 539 (Banquier) | journaux | **543/543 × 7 runs** | ✅ stable, aucun flaky |
| Supabase lazy, absent du HTML initial | Souffle/Lynx/Sentinelle | chunk 191 kO non référencé | ✅ tenu |
| Sentinelle #4 (parseur NaN), #5 (hooks), #6 (mois 31) | sentinelle.md | tous corrigés et revérifiés | ✅ |
| Sentinelle #13 (pas de plafond restauration) | sentinelle.md | **toujours vrai** | 🟠 voir défaut 1 |

## 8. Tableau de bord

| Critère | Note /10 | Justification |
|---|---|---|
| **Fiabilité** | **9** | 0 crash sur 54 sondes + 7×543/543 tests stables + smoke 22/22 ; localStorage corrompu/quota plein gérés ; −1 pour l'import JSON sans plafond et la sanitation trop permissive (🟠🟡) |
| **Rapidité** | **9** | JS embarqué 546–594 kO brut (173–196 kO gzip) < cible 800 kO ; TTFB 25–77 ms chaud local, API 4–15 ms, rendu 500 events < 160 ms ; −1 pour le 1ᵉʳ hit à 377 ms et la croissance bundle (+311 kO, expliquée) |
| **Fonctionnalités** | **9** | Tout ce qui est annoncé existe et marche (tableau §5) ; −1 pour TZID ignoré et l'état vide incohérent |
| **Cohérence** | **8** | Chiffres des journaux vérifiés un par un (§7), 2 redressés ; −2 pour les 🟡 de cohérence UI/données (doublon de salutation, état vide, sanitize) |

**Les 3 corrections qui apporteraient le plus** (toutes petites, sans risque) :
1. Plafonner `readBackupFile` (~5 Mo, message FR) **et** renforcer `sanitizeEvents` (titre ≤ 140 car, `endMinutesOf(end) > minutesOf(start)`) — ferme le 🟠 et 2 🟡 d'un coup, ~30 lignes, 0 impact sur les données valides.
2. Toujours rendre la grille du planning à vide (ou corriger le texte de l'état vide) — 5 lignes, supprime l'incohérence mesurée (0 zone cliquable).
3. À l'import ICS, soit convertir les TZID via `Intl`, soit lister « N événements importés avec leur fuseau ignoré (heures inchangées) » dans le compte-rendu — aujourd'hui la note globale est noyée.

**Verdict « prêt pour un lancement public le 1er janvier ? »** : **OUI, avec les 3 correctifs ci-dessus à poser avant** (ce sont des garde-fous, pas des refontes). Aucun défaut bloquant reproductible : pas un seul crash en 54 sondes + 7×543 tests, perfs sous toutes les cibles documentées, promesses marketing toutes tenues. Je ne signe pas « parfait » — l'import de sauvegarde sans plafond et la sanitation trop permissive sont les deux seules vraies fragilités, et elles ne pardonnent qu'aux utilisateurs qui restaurent un fichier géant ou corrompu. Le reste est du peaufinage.

## 9. Annexe — extraits des scripts de mesure (non committés, supprimés du dépôt)

Smoke HTTP + poids embarqué (bash/curl) :

```bash
B=http://127.0.0.1:3991
for p in / /aujourdhui /planning /reglages /stats /voix ...; do
  curl -s "$B$p" -o /tmp/p.html
  for u in $(grep -oE '(src|href)="[^"]+\.(js|css)(\?[^"]*)?"' /tmp/p.html | sed -E 's/^(src|href)="//; s/"$//' | sort -u); do
    curl -s -o /dev/null -w "%{size_download} " "$B$u"          # brut
    curl -s -H "Accept-Encoding: gzip" -o /dev/null -w "%{size_download} " "$B$u"  # gzip
  done
done
# TTFB : curl -s -o /dev/null -w "%{http_code} %{time_starttransfer} %{time_total}" "$B$p" (x5, médiane)
```

Sonde jsdom (vitest temporaire, vrais composants) — extrait :

```ts
// drag & drop réel sur un bloc d'événement
bloc.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
bloc.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 200, clientY: 300 }));
bloc.dispatchEvent(new MouseEvent('pointerup',   { bubbles: true, clientX: 200, clientY: 300 }));
// -> useStore.getState().events[0] : 2026-11-22 14:00 -> 2026-11-24 10:00, toast FR
```

Sonde ICS limite : fichier construit pile à `ICS_MAX_BYTES` (1 048 576 o) → accepté (17,8 ms) ; +1 Ko → `IcsError` « trop volumineux » ; 500 VEVENT + `RRULE:FREQ=DAILY;COUNT=100000` → 868 candidats en ~7 ms, tronqué à 366.

---

*Journal tenu par Chrono, 2026-11-22 04:46–05:12 UTC. Branche `vibe/chrono-fiabilite`, base `main` `ff7fe48`. Aucun fichier de code modifié (`git status` propre hors ce journal) ; sondes de mesure temporaires supprimées avant la PR. **PR #44** : https://github.com/User313MSI/Centeryou/pull/44 (brouillon, base `main`, ce seul fichier journal) — inscription MISSIONS.md publiée sur `main` à `ff7fe48` (lancement) puis `fd6fe81` (« PR #44 ouverte »).*
