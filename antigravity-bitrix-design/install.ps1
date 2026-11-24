$ErrorActionPreference = "Stop"

$sourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetDir = Join-Path $env:USERPROFILE ".gemini\config\plugins\antigravity-bitrix-design"

if (Test-Path $targetDir) {
    Remove-Item -Path $targetDir -Recurse -Force
}

New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

$items = @("plugin.json", "README.md", "LICENSE", "assets", "rules", "skills", "agents", "scripts")
foreach ($item in $items) {
    $src = Join-Path $sourceDir $item
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $targetDir $item) -Recurse -Force
    }
}

Write-Host "Installed antigravity-bitrix-design to $targetDir"
Write-Host "Enable it in Antigravity -> Customizations if needed."
