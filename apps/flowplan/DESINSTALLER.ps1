# Désinstalle FlowPlan proprement
param([string]$InstallDir = "$env:LOCALAPPDATA\FlowPlan")
Remove-Item "$env:USERPROFILE\Desktop\FlowPlan.lnk" -ErrorAction SilentlyContinue
Remove-Item "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\FlowPlan-MAJ-auto.bat" -ErrorAction SilentlyContinue
Remove-Item $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "FlowPlan désinstallé."
