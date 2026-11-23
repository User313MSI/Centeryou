# REGLES — Formules autorisées / interdites (M-30 · Projecteur)

> Lire avant TOUTE publication (post, story, vidéo, commentaire, e-mail). En cas de doute : ne pas publier, demander à l'équipe. Toute affirmation doit être **montrable à l'écran dans l'app réelle le jour de la publication**.

## ✅ AUTORISÉ (formulations validées, à utiliser telles quelles)

- **Slogan** : « Ton planning qui te parle. » (en ligne sur `/`).
- **Différenciation** : « Le seul planning qui te souhaite bon matin. » — le film du matin existe réellement (5 scènes, ~38 s, lu à voix haute, salutation au prénom selon l'heure).
- **Saisie naturelle** : « Dis/écris « sport demain 14h », et Centeryou range ton agenda. » Variantes réelles : « !lundi réunion » (priorité haute), « dentiste mardi 10h30 santé » (catégorie), « demain », « jeudi 18h », « midi », « ce soir », « dans 3 jours », dates absolues « 14 décembre », « 14/12/2026 ».
- **Voix** : « ajoute sport demain 14h », « mon programme », « quoi de prévu demain ? », « c'est fait sport » (coche la tâche et félicite). Préciser si besoin : « ou écris ta commande si ton navigateur ne reconnaît pas la parole ».
- **Confidentialité** : « Tes données restent sur ton appareil / chez toi. » « Pas de compte serveur, pas de pub, pas de traceur. Rien de vendu, rien de partagé. » « Tu peux tout exporter et tout effacer en un geste depuis les Réglages. » (export fichier + « Effacer toutes mes données » réels).
- **Sans compte** : « Sans compte, sans e-mail — juste un prénom. » (vrai : aucun e-mail demandé, profil local). **Jamais** « sans inscription » (il y a une étape d'accueil à un champ). La démo `/demo` : « la semaine de Sofia, en lecture seule, sans rien entrer ».
- **Rappels, honnêteté** : « Les rappels partent quand l'app est ouverte ou en arrière-plan — pas si elle est complètement fermée. » (formulation exacte de l'app).
- **Gratuit d'abord** : « Gratuit pour l'essentiel, 0 € pour toujours : planning et tâches illimités, assistant vocal avec la voix du navigateur, mode sombre, rappels, appli installable hors-ligne. » (offre Découverte, CGU art. 4).
- **Prix, formulation exacte et unique** : « Premium à 4,99 € par mois, sans engagement » — toujours **après** l'offre gratuite, jamais seul, jamais modifié (CGU art. 4 : 4,99 €/mois TTC, facultative et sans engagement).
- **Français** : « 100 % français » (interface, voix, compréhension du français).
- **Mobile/desktop** : « Pensé d'abord pour le téléphone, installable et fonctionnel hors-ligne » (PWA réelle) ; « une version de bureau Windows existe » (release `bureau-v1.0` sur GitHub).
- **Date de lancement** : « En ligne le 1er janvier 2027 » / « Rendez-vous le 1er janvier. »
- **Ton** : chaleureux, léger, tutoiement (sauf LinkedIn : vouvoiement naturel), zéro jargon, zéro superlatif creux (« révolutionnaire », « game changer »…). On montre, on ne proclame pas.

## ❌ INTERDIT (jamais, sur aucune plateforme)

- **Synchronisation Google / Apple / Outlook** : n'existe pas. Ne jamais écrire « synchronisé avec Google Calendar », « se connecte à Apple », « importe ton agenda Google en continu ». (L'import d'un fichier .ics existe, en une fois — ne pas le présenter comme une synchro live.)
- **« Sauvegarde en ligne », « compte cloud », « synchro multi-appareils » présentés comme actifs** : les comptes en ligne arrivent, on ne les annonce pas. Ne jamais dire « tes données sont sauvegardées en ligne ».
- **Prix modifié ou arrondi** : jamais « 5 € », « à partir de 4,99 € », « 4,99 €/mois TTC » en marketing — la formule exacte est « Premium à 4,99 € par mois, sans engagement », et le gratuit passe d'abord.
- **Promesses non vérifiables** : « notifications push même app fermée », « compréhension parfaite », « voix premium illimitée » en claim marketing, « export .ics vers Google », « partage d'agenda familial », « IA ».
- **Jargon** : localStorage, parseur, Supabase, Stripe, quota, webhook, JSON (dans le texte client — dire « un fichier lisible »), API, PWA (dire « installable, marche hors-ligne »).
- **URL inventée** : toujours `centeryou.app` à remplacer par l'URL de production réelle avant envoi — ne jamais inventer d'URL.
- **Images binaires dans le dépôt** : aucun visuel committé ; texte et HTML/CSS réutilisables uniquement.
- **Ton agressif ou racoleur** : pas de « dernière chance », « offre limitée » fictive, culpabilisation, comparaisons méprisantes des concurrents. On peut dire honnêtement « on ne fait pas encore X ».
- **Données de vrais utilisateurs** : jamais de capture avec de vraies données personnelles ; utiliser le profil de démo (Sofia) ou un profil fictif de tournage.
- **Chiffres inventés** : pas de « 10 000 utilisateurs », pas de stats d'usage (il n'y en a pas — zéro traceur, assumé).

## 🔎 Vérification rapide avant publication (30 secondes)

1. Chaque fonction citée est-elle visible dans l'app aujourd'hui ? (ouvrir la page, montrer)
2. Le gratuit est-il mentionné avant tout prix, et le prix est-il exactement « Premium à 4,99 € par mois, sans engagement » ?
3. Aucune mention de synchro Google/Apple ni de sauvegarde en ligne active ?
4. Tutoiement (IG/TikTok/X) ou vouvoiement naturel (LinkedIn), ton doux, zéro jargon ?
5. URL = URL de production réelle ?
