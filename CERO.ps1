# Arranque en un comando desde cero: deps, .env, Postgres+Redis (healthcheck), build.
# Uso:  .\CERO.ps1          (instala, levanta la base y compila)
#       .\CERO.ps1 -Dev     (además deja API + Web en modo desarrollo)
param([switch]$Dev)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

foreach ($t in 'node', 'npm', 'docker') {
  if (-not (Get-Command $t -ErrorAction SilentlyContinue)) { throw "Falta '$t' en el PATH." }
}

if (-not (Test-Path 'apps/api/.env')) {
  Copy-Item '.env.example' 'apps/api/.env'
  Write-Host '[INFO] Creado apps/api/.env desde .env.example (revisá los secretos).'
}

if (-not (Test-Path 'node_modules')) { npm ci; if ($LASTEXITCODE) { throw 'npm ci falló' } }

docker compose up -d --wait
if ($LASTEXITCODE) { throw 'docker compose up falló (healthcheck no verde)' }

npm run build
if ($LASTEXITCODE) { throw 'npm run build falló' }

if ($Dev) { npm run dev }
else { Write-Host '[OK] Base arriba y build verde. Para desarrollo: npm run dev' }
