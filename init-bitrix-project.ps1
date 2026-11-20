<#
.SYNOPSIS
  Bootstraps or updates a 1C-Bitrix project with the Antigravity 4-plugin ecosystem:
  auto-updates global plugins if source versions are newer (or -UpdatePlugins is set),
  creates/updates `.agents/plugins.json`, `.gitignore`, `AGENTS.md`, `docs/memory/*`, and `docs/backlog.md`.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\init-bitrix-project.ps1 -TargetDir "D:\Projects\my-shop" -Profile store -Name "My Bitrix Shop"
  powershell -ExecutionPolicy Bypass -File .\init-bitrix-project.ps1 -TargetDir "D:\Projects\my-shop" -Profile store -UpdatePlugins -UpdateConfig
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$TargetDir,

    [Alias("Profile")]
    [ValidateSet("full", "store", "corporate", "minimal")]
    [string]$BundleProfile = "full",

    [string]$Plugins = "",
    [string]$Name = "",
    [switch]$UpdatePlugins,
    [switch]$UpdateConfig,
    [switch]$Force,
    [switch]$DryRun,
    [switch]$SkipPluginInstall
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$GlobalPluginsRoot = Join-Path $env:USERPROFILE ".gemini\config\plugins"

function Get-ManifestVersion([string]$ManifestPath) {
    if (-not (Test-Path $ManifestPath)) { return $null }
    try {
        return (Get-Content $ManifestPath -Raw | ConvertFrom-Json).version
    } catch {
        return $null
    }
}

$NeedsInstallOrUpdate = $false
if ($UpdatePlugins) {
    $NeedsInstallOrUpdate = $true
} elseif (-not $SkipPluginInstall) {
    foreach ($p in @("antigravity-bitrix-core", "antigravity-bitrix-seo-geo", "antigravity-bitrix-qa", "antigravity-bitrix-marketing")) {
        $srcVer = Get-ManifestVersion (Join-Path $RootDir "$p\plugin.json")
        $dstVer = Get-ManifestVersion (Join-Path $GlobalPluginsRoot "$p\plugin.json")
        if (-not $dstVer) {
            Write-Information "Plugin '$p' is not installed globally yet -> will install." -InformationAction Continue
            $NeedsInstallOrUpdate = $true
            break
        }
        if ($srcVer -and ($srcVer -ne $dstVer)) {
            try {
                if ([version]$srcVer -gt [version]$dstVer) {
                    Write-Information "Newer version detected for '$p' (installed v$dstVer -> source v$srcVer) -> will auto-update." -InformationAction Continue
                    $NeedsInstallOrUpdate = $true
                    break
                }
            } catch {
                $NeedsInstallOrUpdate = $true
                break
            }
        }
    }
}

if ($NeedsInstallOrUpdate -and -not $SkipPluginInstall) {
    $EcosystemInstaller = Join-Path $RootDir "install-ecosystem.ps1"
    if (Test-Path $EcosystemInstaller) {
        & powershell -ExecutionPolicy Bypass -File $EcosystemInstaller
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install/update ecosystem (exit $LASTEXITCODE)"
        }
    }
}

$BootstrapLocal = Join-Path $RootDir "antigravity-bitrix-core\scripts\bitrix-bootstrap.mjs"
$BootstrapGlobal = Join-Path $GlobalPluginsRoot "antigravity-bitrix-core\scripts\bitrix-bootstrap.mjs"
$ScriptPath = if (Test-Path $BootstrapGlobal) { $BootstrapGlobal } else { $BootstrapLocal }
if (-not (Test-Path $ScriptPath)) {
    throw "bitrix-bootstrap.mjs not found."
}

$NodeArgs = @($ScriptPath, $TargetDir, "--profile", $BundleProfile)
if ($Plugins) { $NodeArgs += @("--plugins", $Plugins) }
if ($Name) { $NodeArgs += @("--name", $Name) }
if ($UpdateConfig) { $NodeArgs += "--update-config" }
if ($Force) { $NodeArgs += "--force" }
if ($DryRun) { $NodeArgs += "--dry-run" }

& node @NodeArgs
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
