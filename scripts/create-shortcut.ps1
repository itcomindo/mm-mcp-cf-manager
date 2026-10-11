param(
  [Parameter(Mandatory = $true)]
  [string]$LauncherPath,
  [Parameter(Mandatory = $true)]
  [string]$WorkingDirectory,
  [Parameter(Mandatory = $true)]
  [string]$IconPath,
  [Parameter(Mandatory = $true)]
  [string]$ShortcutName
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $LauncherPath)) {
  Write-Error "Launcher not found: $LauncherPath"
}

$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop $ShortcutName

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $LauncherPath
$shortcut.WorkingDirectory = $WorkingDirectory
$shortcut.Description = 'MM MCP CF Manager - MCP Cloudflare Zone Manager'
$shortcut.WindowStyle = 1

if (Test-Path -LiteralPath $IconPath) {
  $shortcut.IconLocation = "$IconPath,0"
}

$shortcut.Save()
Write-Host "Shortcut created: $shortcutPath"
