# FlowPlan — installeur autonome (à exécuter UNE fois sur le PC Windows)
#  - copie l'app dans C:\Program Files\FlowPlan (ou garde le dossier courant)
#  - crée le raccourci Bureau "FlowPlan"
#  - ajoute la mise à jour auto dans le dossier Démarrage
#  - (option) build le .exe Electron si Node est présent
param(
  [string]$InstallDir = "$env:LOCALAPPDATA\FlowPlan",
  [switch]$BuildExe
)

$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
Write-Host "== Installation de FlowPlan dans $InstallDir =="

# 1) copie les fichiers (sans .git, node_modules, dist)
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$exclude = @('.git','node_modules','dist','*.zip')
Get-ChildItem -Path $src -Recurse -File | Where-Object {
  $rel = $_.FullName.Substring($src.Length)
  -not ($exclude | Where-Object { $rel -like "*$_*" })
} | ForEach-Object {
  $dest = Join-Path $InstallDir $_.FullName.Substring($src.Length)
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  Copy-Item $_.FullName $dest -Force
}

# 2) raccourci Bureau
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\FlowPlan.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$InstallDir\ouvrir.ps1`""
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.IconLocation = "$InstallDir\assets\icon-192.png,0"
$Shortcut.Save()
Write-Host "Raccourci Bureau créé : FlowPlan.lnk"

# 3) mise à jour auto au démarrage (dossier Démarrage)
$MajBat = "@echo off`r`ncd /d `"$InstallDir`"`r`ngit fetch origin 2^>nul`r`ngit reset --hard origin/vibe/flowplan-88d3be 2^>nul`r`nexit /b 0"
$startup = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"
New-Item -ItemType Directory -Force -Path $startup | Out-Null
[IO.File]::WriteAllText("$startup\FlowPlan-MAJ-auto.bat", $MajBat)
Write-Host "Mise à jour auto ajoutée au Démarrage"

# 4) (option) build du .exe Electron
if ($BuildExe -and (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Build du .exe (peut prendre 2-5 min)..."
  Push-Location $InstallDir
  npm install --no-audit --no-fund
  npx electron-builder --win --x64
  Pop-Location
  $exe = Get-ChildItem "$InstallDir\dist\*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($exe) {
    $Shortcut.TargetPath = $exe.FullName
    $Shortcut.Arguments = ""
    $Shortcut.IconLocation = "$($exe.FullName),0"
    $Shortcut.Save()
    Write-Host "FlowPlan.exe installé : $($exe.FullName)"
  }
}

Write-Host "== OK. Double-clique sur l'icône Bureau FlowPlan. L'app se met à jour toute seule à chaque démarrage. =="
