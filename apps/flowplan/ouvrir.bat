@echo off
rem FlowPlan — ouvre l'app directement dans le navigateur par defaut.
rem Aucun serveur, aucun cache HTTP, aucun service worker : le code charge est toujours celui du disque.
cd /d "%~dp0"
start "" "index.html?fresh=1"
