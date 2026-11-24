# Install antigravity-bitrix-core plugin into Antigravity user plugins directory
$ErrorActionPreference = "Stop"

$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetDir = Join-Path $env:USERPROFILE ".gemini\config\plugins\antigravity-bitrix-core"

if (-not (Test-Path (Split-Path -Parent $TargetDir))) {
    New-Item -ItemType Directory -Path (Split-Path -Parent $TargetDir) -Force | Out-Null
}

if (Test-Path $TargetDir) {
    Remove-Item -Path $TargetDir -Recurse -Force
}

New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null

$ItemsToCopy = @("plugin.json", "README.md", "LICENSE", "assets", "rules", "skills", "agents", "scripts", "templates", "hooks")
foreach ($Item in $ItemsToCopy) {
    $SrcPath = Join-Path $SourceDir $Item
    if (Test-Path $SrcPath) {
        Copy-Item -Path $SrcPath -Destination $TargetDir -Recurse -Force
    }
}

Write-Host "Installed antigravity-bitrix-core to $TargetDir" -ForegroundColor Green
Write-Host "Enable it in Antigravity -> Customizations if needed." -ForegroundColor Cyan
