# VaultGuard — Installation & distribution (Windows)

## 1. Prérequis sur ton PC Windows

Ouvre **PowerShell en administrateur** et colle :

```powershell
winget install OpenJS.NodeJS.LTS Git.Git
```

Ferme et rouvre PowerShell, puis vérifie :

```powershell
node -v
npm -v
```

## 2. Récupérer le code

```powershell
cd $env:USERPROFILE
git clone https://github.com/User313MSI/Dev-Apps.git
cd Dev-Apps\apps\vaultguard
```

> Si le dossier existe déjà : `cd Dev-Apps` puis `git pull`

## 3. Installer les dépendances

```powershell
npm install
```

## 4. Tester l'application

```powershell
npm test
npm start
```

## 5. Générer l'installeur Windows (setup .exe)

```powershell
npm run release:win
```

Le setup se trouve dans :

```
Dev-Apps\apps\vaultguard\release\VaultGuard Setup 1.1.0.exe
```

(et la version portable dans `release\win-unpacked\` si besoin)

## 6. Installer sur ton bureau

Double-clique le setup, laisse l'emplacement par défaut, coche « Lancer VaultGuard » à la fin.
Un raccourci Bureau + menu Démarrer sont créés automatiquement.

## 7. Publier une mise à jour

1. Monte la version dans `package.json` (ex: `1.2.0`)
2. `npm run release:win`
3. Renomme le setup en `VaultGuard-Setup-1.2.0.exe` et mets-le en ligne
4. Signe le manifeste de mise à jour (voir `README.md`, section « Update manifest format »)

## Dépannage

| Problème | Solution |
|---|---|
| « npm » reconnu nulle part | Redémarre PowerShell après l'installation de Node |
| Le setup ne se lance pas / « Windows a protégé votre ordinateur » | Clic sur « Informations complémentaires » → « Exécuter quand même » (normal tant que l'exe n'est pas signé avec un certificat) |
| `npm install` échoue | `npm cache clean --force` puis relance `npm install` |
| Icône manquante dans le setup | Vérifie que `assets\icon.ico` existe (présent dans le dépôt) |
