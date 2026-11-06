@echo off
rem FlowPlan v8 - lance avec cache navigateur désactivé (toujours la dernière version)
cd /d "%~dp0"
set V=8.1
where chrome >nul 2>nul && (start "" chrome --disk-cache-size=1 --app="file:///%CD%/index.html?v=%V%" & exit /b)
start "" "file:///%CD%/index.html?v=%V%"
