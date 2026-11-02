# FlowPlan — ouvre l'app dans le navigateur par defaut (aucun serveur, file:// pur).
# Double-clic possible dans l'Explorateur (clic droit > Exécuter avec PowerShell), ou :
#   powershell -ExecutionPolicy Bypass -File ouvrir.ps1
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$uri = 'file:///' + ($dir -replace '\\', '/') + '/index.html'
Start-Process $uri
