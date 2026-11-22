<#
.SYNOPSIS
    Builds the Linux packages (AppImage, deb, rpm) in WSL and copies them to dist\linux.

.DESCRIPTION
    Runs scripts/build-linux-wsl.sh inside WSL. Needs a WSL 2 distro with curl and rpm
    (sudo apt-get install -y rpm); Node 22 is installed into the WSL home folder on first run.

.PARAMETER Distro
    WSL distro to build in. Defaults to the default WSL distro.

.PARAMETER Clean
    Delete the cached node_modules in WSL (~/fsb-build) and install from scratch.

.EXAMPLE
    npm run build:linux:wsl
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\build-linux-wsl.ps1 -Distro Ubuntu -Clean
#>
param(
    [string]$Distro,
    [switch]$Clean
)
$ErrorActionPreference = 'Stop'

if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
    throw 'WSL is not installed. Install it with: wsl --install -d Ubuntu'
}

$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$script = Join-Path $PSScriptRoot 'build-linux-wsl.sh'

# bash can't run a script with Windows line endings (e.g. after a checkout with core.autocrlf)
$text = [IO.File]::ReadAllText($script)
if ($text.Contains("`r")) {
    [IO.File]::WriteAllText($script, $text.Replace("`r`n", "`n"), (New-Object Text.UTF8Encoding $false))
}

$wslArgs = @()
if ($Distro) { $wslArgs += @('-d', $Distro) }

function ConvertTo-WslPath([string]$p) {
    $out = & wsl.exe @wslArgs -- wslpath -a ($p -replace '\\', '/')
    if ($LASTEXITCODE -ne 0 -or -not $out) { throw "wslpath failed for $p" }
    return "$out".Trim()
}

$repoWsl = ConvertTo-WslPath $repo
$scriptWsl = ConvertTo-WslPath $script

$bashArgs = @($scriptWsl, $repoWsl)
if ($Clean) { $bashArgs += '--clean' }

Write-Host "Building in WSL$(if ($Distro) { " ($Distro)" }) from $repoWsl"
& wsl.exe @wslArgs -- bash @bashArgs
if ($LASTEXITCODE -ne 0) { throw "Linux build failed (exit code $LASTEXITCODE)" }

Write-Host "`nLinux packages are in $(Join-Path $repo 'dist\linux')"
