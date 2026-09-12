$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$portableNode = Join-Path $projectRoot '.tools/node-v22.16.0-win-x64'
if (Test-Path (Join-Path $portableNode 'node.exe')) {
    $env:PATH = $portableNode + ';' + $env:PATH
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'Node.js 22.12 or newer is required. Install Node.js, reopen PowerShell, and try again.'
}
Push-Location (Join-Path $projectRoot 'frontend')
try {
    if (-not (Test-Path 'node_modules/vite/bin/vite.js')) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
    }
    & npm.cmd run dev
} finally {
    Pop-Location
}
