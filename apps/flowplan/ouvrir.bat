@echo off
rem FlowPlan — ouvre l'app dans le navigateur par defaut, en file:// (aucun serveur).
rem %~dp0 = dossier du .bat, avec slashes pour l'URL file.
cd /d "%~dp0"
set "APPDIR=%CD%"
set "APPDIR=%APPDIR:\=/%"
start "" "file:///%APPDIR%/index.html"
