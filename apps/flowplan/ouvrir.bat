@echo off
rem FlowPlan — ouvre l'app dans le navigateur par defaut, en file:// (aucun serveur).
rem %~dp0 = dossier du .bat, avec slashes pour l'URL file.
cd /d "%~dp0"
set "APPDIR=%CD%"
set "APPDIR=%APPDIR:\=/%"
rem Essaie Chrome d'abord, sinon navigateur par défaut
where chrome >nul 2>nul && (start "" "chrome" --app="file:///%APPDIR%/index.html" & exit /b)
where "chrome.exe" /r "C:\Program Files\Google\Chrome\Application" >nul 2>nul && (start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="file:///%APPDIR%/index.html" & exit /b)
where "chrome.exe" /r "C:\Program Files (x86)\Google\Chrome\Application" >nul 2>nul && (start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --app="file:///%APPDIR%/index.html" & exit /b)
start "" "file:///%APPDIR%/index.html"
