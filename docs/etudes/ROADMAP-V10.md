# FlowPlan — Roadmap "voir plus loin" (horizon 2027)

Vision : FlowPlan devient **l'assistant temporel personnel** — il comprend ta vie, pas seulement tes phrases.

## v7 (maintenant) — installable
- PWA complète : manifest + raccourcis (voix/semaine/présentation), service worker à jour, installable téléphone & PC
- CSS 100 % propre, fuzz parser dans CI

## v8 — voix parfaite partout
- TTS embarqué local (Kokoro/Piper en WASM) : même voix sur Chrome, Edge, Firefox, mobile
- STT amélioré : modèle local léger (whisper.cpp tiny) en option
- "FlowPlan te parle" : annonces proactives (prochain RDV, retard détecté)

## v9 — mémoire & habitudes
- Graphe de connaissances local : personnes, lieux, durées habituelles, préférences horaires
- Suggestions proactives : « Tu fais toujours X le vendredi — je bloque ? »
- Import auto : lit ton calendrier existant (.ics) et propose d'importer

## v10 — collaboration souveraine
- Sync chiffré de bout en bout optionnel (E2EE, clés chez toi) — multi-appareils sans voir tes données
- Partage de dispo P2P chiffré : deux FlowPlan négocient un créneau sans serveur central
- Marketplace de routines communautaires (anonymisées, chiffrées)

## Mesure du succès (pas des features)
- 5 utilisateurs filmés, 0 blocage en 10 min
- Temps moyen "phrase → planning affiché" < 8 s
- 0 crash sur 1000 phrases (fuzz)
- Taux de rétention J7 > 40 %
