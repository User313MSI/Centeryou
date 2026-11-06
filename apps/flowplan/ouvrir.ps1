# FlowPlan — lance l'app dans Chrome en mode app, cache minimale, toujours la dernière version
$dir = $PSScriptRoot
$url = "file:///" + ($dir -replace '\\','/') + "/index.html?v=8.1b"
$chrome = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe" }
if (Test-Path $chrome) {
  Start-Process $chrome -ArgumentList "--app=$url","--disk-cache-size=1"
} else {
  Start-Process $url
}
