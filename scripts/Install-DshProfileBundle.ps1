[CmdletBinding()]
param(
  [ValidateSet("Install", "Verify", "Rollback")]
  [string]$Action = "Install",
  [string]$ProfileName = "web",
  [string]$DshHome = (Join-Path $env:USERPROFILE ".dsh"),
  [string]$RepositoryRoot,
  [string]$BackupName,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
  $RepositoryRoot = Split-Path -Parent $PSScriptRoot
}

function Get-Sha256([string]$Path) {
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Require-File([string]$Path, [string]$Description) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    throw "$Description does not exist: $Path"
  }
}

function Ensure-ParentDirectory([string]$Path) {
  $parent = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $parent -PathType Container)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
}

$repository = (Resolve-Path -LiteralPath $RepositoryRoot).Path
$profileRoot = Join-Path (Join-Path $DshHome "profiles") $ProfileName
$backupRoot = Join-Path $DshHome "backups"

$files = @(
  [pscustomobject]@{
    profileRelative = "node_modules/@dsh-a2ui/a2ui-adapter/lib/index.js"
    source = Join-Path $repository "packages/a2ui-adapter/lib/index.js"
    backupRelative = "adapter/index.js"
  },
  [pscustomobject]@{
    profileRelative = "node_modules/@dsh-a2ui/a2ui-renderer/lib/index.js"
    source = Join-Path $repository "packages/a2ui-renderer/lib/index.js"
    backupRelative = "renderer/index.js"
  },
  [pscustomobject]@{
    profileRelative = "node_modules/@dsh-a2ui/a2ui-renderer/lib/client.js"
    source = Join-Path $repository "packages/a2ui-renderer/lib/client.js"
    backupRelative = "renderer/client.js"
  },
  [pscustomobject]@{
    profileRelative = "node_modules/@dsh-a2ui/a2ui-renderer/lib/client.js.map"
    source = Join-Path $repository "packages/a2ui-renderer/lib/client.js.map"
    backupRelative = "renderer/client.js.map"
  }
)

function Get-TargetPath($File) {
  return Join-Path $profileRoot $File.profileRelative
}

function Test-BundleMatch {
  $mismatches = @()
  foreach ($file in $files) {
    Require-File $file.source "Workspace bundle"
    $target = Get-TargetPath $file
    if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
      $mismatches += "$($file.profileRelative): missing from profile"
      continue
    }
    if ((Get-Sha256 $file.source) -ne (Get-Sha256 $target)) {
      $mismatches += "$($file.profileRelative): SHA-256 differs"
    }
  }
  return $mismatches
}

if ($Action -eq "Verify") {
  $mismatches = Test-BundleMatch
  if ($mismatches.Count -gt 0) {
    $mismatches | ForEach-Object { Write-Error $_ }
    throw "DSH profile bundle does not match the workspace build."
  }
  Write-Output "Verified DSH profile '$ProfileName': all bundle hashes match."
  exit 0
}

if ($Action -eq "Rollback") {
  if ([string]::IsNullOrWhiteSpace($BackupName)) {
    throw "Rollback requires -BackupName."
  }
  $resolvedBackupRoot = [IO.Path]::GetFullPath($backupRoot)
  $backupDirectory = [IO.Path]::GetFullPath((Join-Path $backupRoot $BackupName))
  $prefix = $resolvedBackupRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
  if (-not $backupDirectory.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "BackupName must resolve inside $resolvedBackupRoot."
  }
  $manifestPath = Join-Path $backupDirectory "manifest.json"
  Require-File $manifestPath "Backup manifest"
  $manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($manifest.profileName -ne $ProfileName) {
    throw "Backup profile '$($manifest.profileName)' does not match requested profile '$ProfileName'."
  }
  foreach ($entry in $manifest.files) {
    $file = $files | Where-Object { $_.profileRelative -eq $entry.profileRelative } | Select-Object -First 1
    if ($null -eq $file) {
      throw "Backup manifest contains an unsupported profile file: $($entry.profileRelative)"
    }
    $source = Join-Path $backupDirectory $entry.backupRelative
    Require-File $source "Backup bundle"
    $target = Get-TargetPath $file
    Ensure-ParentDirectory $target
    Copy-Item -LiteralPath $source -Destination $target -Force
    if ((Get-Sha256 $target) -ne $entry.sha256) {
      throw "Rollback hash verification failed for $($entry.profileRelative)."
    }
  }
  Write-Output "Rolled back DSH profile '$ProfileName' from '$BackupName'. Restart dsh web to load the restored bundle."
  exit 0
}

if (-not $SkipBuild) {
  & pnpm.cmd -r run build
  if ($LASTEXITCODE -ne 0) {
    throw "Bundle build failed; profile was not modified."
  }
}

foreach ($file in $files) {
  Require-File $file.source "Workspace bundle"
  Require-File (Get-TargetPath $file) "Profile bundle"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupName = "dsh-a2ui-$ProfileName-$timestamp"
$backupDirectory = Join-Path $backupRoot $backupName
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$manifestFiles = @()

foreach ($file in $files) {
  $target = Get-TargetPath $file
  $backupFile = Join-Path $backupDirectory $file.backupRelative
  Ensure-ParentDirectory $backupFile
  Copy-Item -LiteralPath $target -Destination $backupFile -Force
  $manifestFiles += [ordered]@{
    profileRelative = $file.profileRelative
    backupRelative = $file.backupRelative
    sha256 = Get-Sha256 $backupFile
  }
}

$manifest = [ordered]@{
  schemaVersion = 1
  profileName = $ProfileName
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  files = $manifestFiles
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $backupDirectory "manifest.json") -Encoding UTF8

foreach ($file in $files) {
  Copy-Item -LiteralPath $file.source -Destination (Get-TargetPath $file) -Force
}

$mismatches = Test-BundleMatch
if ($mismatches.Count -gt 0) {
  $mismatches | ForEach-Object { Write-Error $_ }
  throw "Deployment verification failed. Roll back with: -Action Rollback -BackupName $backupName"
}

Write-Output "Installed DSH profile '$ProfileName'. Backup: $backupName. Restart dsh web to load the new bundle."
