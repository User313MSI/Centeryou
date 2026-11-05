# FlowPlan v7 — Guide de démarrage (30 secondes)

## La promesse
**Dis ta semaine à voix haute ou au clavier → le planning est fait.** 100 % local, chiffré, sans compte.

## Premier usage
1. Ouvre `index.html` (double-clic) ou `ouvrir.bat`
2. Tape ou dicte : `lundi 9h réunion équipe ; mardi 14h30 dentiste chez Martin ; tous les jeudis 18h sport`
3. Clique **Générer** (ou Entrée) → les événements apparaissent un par un
4. Clic sur un événement = éditer · glisser = déplacer · Ctrl+Z = annuler

## Ce que FlowPlan comprend (français naturel)
- Jours : `aujourd'hui`, `demain`, `lundi prochain`, `mardi 12`, `le 12 novembre 2026`
- Heures : `9h`, `14h30`, `de 9h à 11h`, `entre 14h et 16h`
- Relatifs : `dans 2 semaines`, `dans 3 mois`, `le mois prochain`
- Plages : `du 12 au 14 novembre 2026`
- Récurrence : `tous les lundis`, `tous les 2 jeudis`, `tous les jours`
- Exceptions : `pas le 9 novembre`
- Lieux : `chez Martin`, `à Lyon`, `au bureau`
- Commandes vocales : `annule`, `supprime le dernier`, `montre le mois`, `aujourd'hui`

## Fonctions clés
- Vues : Semaine · Liste · Mois · Année · Jour
- Moteur intelligent : routines détectées, créneaux suggérés, replanification proposée
- Voix : accueil auto, lecture de ta journée, dictée
- Données : export/import .ics · CSV · JSON · backup chiffré (.flowpack)
- Sécurité : verrouillage PIN (AES-GCM), auto-lock 5 min
- Design : sombre/clair, saisons, mode papier, tailles de texte

## Tests
```bash
npm test        # 121 tests unitaires + DOM + fuzz parser (500 phrases)
npm run fuzz    # fuzz seul
```
