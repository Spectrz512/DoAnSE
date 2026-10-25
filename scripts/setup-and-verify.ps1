# Runs the complete local setup and verification flow for Linh Ung GPS Guide.
# Usage (from the repository root):
#   powershell -ExecutionPolicy Bypass -File .\scripts\setup-and-verify.ps1

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

function Invoke-ProjectStep {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][scriptblock]$Command,
    [switch]$AllowNonZeroExit
  )

  Write-Host "`n==> $Name" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    if ($AllowNonZeroExit) {
      Write-Host "Warning: $Name completed with exit code $LASTEXITCODE. Continuing by policy." -ForegroundColor Yellow
      return
    }
    throw "Step failed: $Name (exit code $LASTEXITCODE)"
  }
}

function Invoke-ProjectStepWithRetry {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][scriptblock]$Command,
    [int]$MaxAttempts = 3
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    Write-Host "`n==> $Name (attempt $attempt/$MaxAttempts)" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -eq 0) { return }
    if ($attempt -lt $MaxAttempts) {
      Write-Host "Prisma engine may still be releasing a file; retrying in 3 seconds..." -ForegroundColor Yellow
      Start-Sleep -Seconds 3
    }
  }

  throw "Step failed: $Name after $MaxAttempts attempts. Stop any running API/Prisma Studio process and retry."
}

Set-Location $projectRoot

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example. Change JWT_SECRET before deployment." -ForegroundColor Yellow
}

Invoke-ProjectStep "Install dependencies" { npm install }
Invoke-ProjectStep "Start PostGIS database" { docker compose up -d --wait db }
Invoke-ProjectStep "Apply compatible dependency security fixes" { npm audit fix --package-lock-only } -AllowNonZeroExit
Invoke-ProjectStep "Synchronize installed dependencies after audit" { npm install }
Invoke-ProjectStep "Apply Prisma migrations" { npx prisma migrate deploy }
Invoke-ProjectStepWithRetry "Generate Prisma client" { npx prisma generate }
Invoke-ProjectStep "Seed local demo data" { npm run prisma:seed }
Invoke-ProjectStep "Lint" { npm run lint }
Invoke-ProjectStep "Run unit tests" { npm test }
Invoke-ProjectStep "Build API" { npm run build }
Invoke-ProjectStep "Audit production dependencies" { npm run audit:prod }

Write-Host "`nSetup and verification completed successfully." -ForegroundColor Green
Write-Host "Start the API with: npm run start:dev"
Write-Host "Open Swagger at: http://localhost:3000/docs"
