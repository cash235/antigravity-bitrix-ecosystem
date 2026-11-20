<#
.SYNOPSIS
  Packages (zero-npm) and installs the 1C-Bitrix Command Center Activity Bar extension into Antigravity IDE.
#>
$ErrorActionPreference = "Stop"

$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Pkg = Get-Content (Join-Path $SourceDir "package.json") -Raw | ConvertFrom-Json
$ExtId = "$($Pkg.publisher).$($Pkg.name)"
$ExtFolderName = "$ExtId-$($Pkg.version)"

$TargetBase = Join-Path $env:USERPROFILE ".antigravity\extensions"
$TargetDir = Join-Path $TargetBase $ExtFolderName

# Build a zero-dependency .vsix archive in temp so antigravity-ide CLI can install it cleanly
$StageDir = Join-Path $env:TEMP "bitrix-vsix-stage-$([Guid]::NewGuid().ToString('N').Substring(0,8))"
$ExtStage = Join-Path $StageDir "extension"
$VsixPath = Join-Path $env:TEMP "$ExtFolderName.vsix"

New-Item -ItemType Directory -Path $ExtStage -Force | Out-Null
foreach ($item in @("package.json", "extension.js", "README.md", "assets")) {
    $src = Join-Path $SourceDir $item
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $ExtStage -Recurse -Force
    }
}

$ContentTypesXml = @'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".json" ContentType="application/json" />
  <Default Extension=".js" ContentType="application/javascript" />
  <Default Extension=".md" ContentType="text/markdown" />
  <Default Extension=".svg" ContentType="image/svg+xml" />
  <Default Extension=".vsixmanifest" ContentType="text/xml" />
</Types>
'@

$VsixManifestXml = @"
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Language="en-US" Id="$($Pkg.name)" Version="$($Pkg.version)" Publisher="$($Pkg.publisher)" />
    <DisplayName>$($Pkg.displayName)</DisplayName>
    <Description xml:space="preserve">$($Pkg.description)</Description>
    <Categories>Other</Categories>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" />
  </Installation>
  <Dependencies />
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
  </Assets>
</PackageManifest>
"@

$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $StageDir "[Content_Types].xml"), $ContentTypesXml, $Utf8NoBom)
[System.IO.File]::WriteAllText((Join-Path $StageDir "extension.vsixmanifest"), $VsixManifestXml, $Utf8NoBom)

if (Test-Path $VsixPath) { Remove-Item $VsixPath -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($StageDir, $VsixPath)

$CliCandidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Antigravity IDE\bin\antigravity-ide.cmd"),
    (Join-Path $env:LOCALAPPDATA "Programs\Antigravity\bin\antigravity.cmd")
)
$IdeCli = $CliCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

$InstalledViaCli = $false
if ($IdeCli) {
    Write-Host "Installing via Antigravity IDE CLI: $IdeCli" -ForegroundColor Cyan
    & $IdeCli --install-extension $VsixPath --force
    if ($LASTEXITCODE -eq 0) {
        $InstalledViaCli = $true
    } else {
        Write-Warning "CLI returned exit code $LASTEXITCODE; falling back to direct folder copy."
    }
}

if (-not $InstalledViaCli) {
    if (-not (Test-Path $TargetBase)) {
        New-Item -ItemType Directory -Path $TargetBase -Force | Out-Null
    }
    if (Test-Path $TargetDir) {
        Remove-Item -Path $TargetDir -Recurse -Force
    }
    Copy-Item -Path $ExtStage -Destination $TargetDir -Recurse -Force
    Write-Host "Copied extension directly to $TargetDir" -ForegroundColor Green
}

Remove-Item -Path $StageDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path $VsixPath -Force -ErrorAction SilentlyContinue

Write-Host "Installed $ExtId v$($Pkg.version)!" -ForegroundColor Green
Write-Host "Reload Antigravity IDE window (Ctrl+Shift+P -> Developer: Reload Window) to see the 1C-Bitrix icon in the left Activity Bar." -ForegroundColor Cyan
