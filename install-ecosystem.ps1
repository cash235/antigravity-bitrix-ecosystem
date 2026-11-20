<#
.SYNOPSIS
  Installs the 4-plugin 1C-Bitrix Antigravity Ecosystem (and optional IDE Activity Bar extension) in one command.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\install-ecosystem.ps1
  powershell -ExecutionPolicy Bypass -File .\install-ecosystem.ps1 -Plugins core,seo-geo -WithIdePanel:$false
#>
param(
    [string[]]$Plugins = @("core", "seo-geo", "qa", "marketing"),
    [switch]$WithIdePanel = $true
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$Map = @{
    "core"      = "antigravity-bitrix-core"
    "seo-geo"   = "antigravity-bitrix-seo-geo"
    "qa"        = "antigravity-bitrix-qa"
    "marketing" = "antigravity-bitrix-marketing"
    "antigravity-bitrix-core"      = "antigravity-bitrix-core"
    "antigravity-bitrix-seo-geo"   = "antigravity-bitrix-seo-geo"
    "antigravity-bitrix-qa"        = "antigravity-bitrix-qa"
    "antigravity-bitrix-marketing" = "antigravity-bitrix-marketing"
}

# Normalize comma-separated input
$Normalized = @()
foreach ($entry in $Plugins) {
    foreach ($part in ($entry -split ",")) {
        $k = $part.Trim().ToLower()
        if ($Map.ContainsKey($k) -and ($Normalized -notcontains $Map[$k])) {
            $Normalized += $Map[$k]
        }
    }
}
if ($Normalized -notcontains "antigravity-bitrix-core") {
    $Normalized = @("antigravity-bitrix-core") + $Normalized
}

Write-Host "=== Installing 1C-Bitrix Antigravity Ecosystem ===" -ForegroundColor Cyan

# Check Node.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Warning "Node.js 18+ not found in PATH. CLI scanners and dashboard renderer require Node.js."
} else {
    Write-Host "Node.js: $(node -v)" -ForegroundColor DarkGray
}

foreach ($pluginDirName in $Normalized) {
    $installer = Join-Path $RootDir "$pluginDirName\install.ps1"
    if (-not (Test-Path $installer)) {
        Write-Warning "Installer not found: $installer"
        continue
    }
    Write-Host "-> Installing $pluginDirName ..." -ForegroundColor Yellow
    & powershell -ExecutionPolicy Bypass -File $installer
    if ($LASTEXITCODE -ne 0) {
        throw "Installation failed for $pluginDirName (exit $LASTEXITCODE)"
    }

    # Fail-Closed syntax check of bundled scripts
    if ($nodeCmd) {
        $scriptsDir = Join-Path $RootDir "$pluginDirName\scripts"
        if (Test-Path $scriptsDir) {
            Get-ChildItem -Path $scriptsDir -Filter "*.mjs" | ForEach-Object {
                node --check $_.FullName
                if ($LASTEXITCODE -ne 0) {
                    throw "Syntax check failed for $($_.FullName)"
                }
            }
        }
    }
}

if ($WithIdePanel) {
    $ideInstaller = Join-Path $RootDir "antigravity-bitrix-ide-panel\install-ide-extension.ps1"
    if (Test-Path $ideInstaller) {
        Write-Host "-> Installing Antigravity IDE Activity Bar extension..." -ForegroundColor Yellow
        & powershell -ExecutionPolicy Bypass -File $ideInstaller
        if ($LASTEXITCODE -ne 0) {
            throw "Installation failed for Antigravity IDE Activity Bar extension (exit $LASTEXITCODE)"
        }
    }
}

Write-Host ""
Write-Host "Done! Installed plugins: $($Normalized -join ', ')" -ForegroundColor Green
Write-Host "Next: run .\init-bitrix-project.ps1 -TargetDir <path-to-bitrix-project> to initialize any new project." -ForegroundColor Cyan
