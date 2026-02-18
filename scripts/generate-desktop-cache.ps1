$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $repoRoot "src\cache\desktopApps.generated.json"

function To-FileUri([string]$path) {
  if ([string]::IsNullOrWhiteSpace($path)) { return $null }
  $normalized = $path.Replace("\", "/").Replace(" ", "%20")
  return "file:///$normalized"
}

function Resolve-ShortcutTarget([string]$shortcutPath) {
  try {
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    return $shortcut.TargetPath
  } catch {
    return $null
  }
}

$desktopSoftware = @()
$startMenuPaths = @(
  "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
  "$env:ProgramData\Microsoft\Windows\Start Menu\Programs"
) | Where-Object { Test-Path $_ }

foreach ($menuPath in $startMenuPaths) {
  $links = Get-ChildItem -Path $menuPath -Filter *.lnk -Recurse -ErrorAction SilentlyContinue
  foreach ($link in $links) {
    $target = Resolve-ShortcutTarget $link.FullName
    if ([string]::IsNullOrWhiteSpace($target)) { continue }
    if (-not (Test-Path $target)) { continue }
    $desktopSoftware += [PSCustomObject]@{
      id = "desktop-$([Math]::Abs($target.GetHashCode()))"
      name = [System.IO.Path]::GetFileNameWithoutExtension($link.Name)
      packageName = "desktop:$([System.IO.Path]::GetFileNameWithoutExtension($target).ToLower())"
      launchUri = To-FileUri $target
      executablePath = $target
    }
  }
}

$projectExecutables = Get-ChildItem -Path $repoRoot -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Extension -in @(".exe", ".bat", ".cmd") } |
  Select-Object -First 80

foreach ($file in $projectExecutables) {
  $desktopSoftware += [PSCustomObject]@{
    id = "project-$([Math]::Abs($file.FullName.GetHashCode()))"
    name = "Project: $($file.BaseName)"
    packageName = "project:$($file.BaseName.ToLower())"
    launchUri = To-FileUri $file.FullName
    executablePath = $file.FullName
  }
}

$knownProtocols = @(
  @{ id = "desktop-vscode"; name = "VS Code"; packageName = "desktop:vscode"; launchUri = "vscode://" },
  @{ id = "desktop-edge"; name = "Microsoft Edge"; packageName = "desktop:edge"; launchUri = "microsoft-edge:https://www.bing.com" },
  @{ id = "desktop-settings"; name = "Windows Settings"; packageName = "desktop:settings"; launchUri = "ms-settings:" }
)

$all = @($desktopSoftware + $knownProtocols) |
  Group-Object packageName |
  ForEach-Object { $_.Group | Select-Object -First 1 } |
  Select-Object -First 250

$json = $all | ConvertTo-Json -Depth 6
Set-Content -Path $outputPath -Value $json -Encoding UTF8

Write-Host "Desktop cache generated: $outputPath"
Write-Host "Total entries: $($all.Count)"
