$ErrorActionPreference = "Stop"

$harmonyDir = Split-Path -Parent $PSScriptRoot
Set-Location $harmonyDir

if (-not (Test-Path ".\hvigorw.bat")) {
  Write-Error "hvigorw.bat not found under harmony/. Please open this folder in DevEco Studio once to generate wrapper files."
}

cmd /c ".\hvigorw.bat clean"
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

cmd /c ".\hvigorw.bat assembleHap"
exit $LASTEXITCODE
