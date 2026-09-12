param([switch]$DebugBuild, [switch]$Run)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$portableNode = Join-Path $projectRoot '.tools/node-v22.16.0-win-x64'
if (Test-Path (Join-Path $portableNode 'node.exe')) {
    $env:PATH = $portableNode + ';' + $env:PATH
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'Build requires Node.js 22.12 or newer. Reopen PowerShell after installing it.'
}
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    throw 'Build requires Rust (MSVC toolchain) and Visual Studio C++ Build Tools.'
}
Push-Location (Join-Path $projectRoot 'frontend')
try {
    if (-not (Test-Path 'node_modules/vite/bin/vite.js')) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
} finally { Pop-Location }

Push-Location $projectRoot
try {
    $profile = 'release'
    if ($DebugBuild) {
        $profile = 'debug'
        & cargo build -p skilltopo --locked
    } else {
        & cargo build -p skilltopo --release --locked
    }
    if ($LASTEXITCODE -ne 0) { throw 'Desktop build failed.' }
    $executable = Join-Path $projectRoot "target/$profile/skilltopo.exe"
    if (-not $DebugBuild) {
        $distribution = Join-Path $projectRoot 'dist'
        New-Item -ItemType Directory -Force -Path $distribution | Out-Null
        Copy-Item -LiteralPath $executable -Destination (Join-Path $distribution 'SkillTopo.exe') -Force
        Copy-Item -LiteralPath (Join-Path $projectRoot 'LICENSE') -Destination (Join-Path $distribution 'LICENSE') -Force
        Copy-Item -LiteralPath (Join-Path $projectRoot 'examples') -Destination $distribution -Recurse -Force
        $executable = Join-Path $distribution 'SkillTopo.exe'
    }
    Write-Host "Built: $executable"
    if ($Run) { & $executable }
} finally { Pop-Location }
