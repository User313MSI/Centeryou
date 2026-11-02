@echo off
rem FlowPlan — ouvre l'app directement dans le navigateur par defaut.
rem URL file:/// ABSOLUE + ?fresh=1 : purge les service workers et caches du navigateur
rem au chargement (boot.js), puis recharge l'URL propre. Zéro serveur, zéro cache residuel.
cd /d "%~dp0"
set "APPDIR=%CD%"
set "APPDIR=%APPDIR:\=/%"
start "" "file:///%APPDIR%/index.html?fresh=1"
