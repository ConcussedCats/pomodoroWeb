[CmdletBinding()]
param(
    [string]$Repository = "whyisthecodeworking/telosrepo",
    [string]$Tag = "latest",
    [string]$ComposeFile = ".\docker\docker-compose.yml",
    [string]$ComposeImage = "telos_test:ver1",
    [switch]$SkipDockerLogin,
    [string]$DockerUsername = $env:DOCKERHUB_USERNAME,
    [string]$DockerToken = $env:DOCKERHUB_TOKEN
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Require-Command {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' is not installed or not in PATH."
    }
}

Write-Host "==> Validating prerequisites..."
Require-Command docker

if (-not (Test-Path -LiteralPath $ComposeFile)) {
    throw "Compose file not found: $ComposeFile"
}

if (-not $SkipDockerLogin) {
    if (-not [string]::IsNullOrWhiteSpace($DockerUsername) -and -not [string]::IsNullOrWhiteSpace($DockerToken)) {
        Write-Host "==> Logging in to Docker Hub as '$DockerUsername'..."
        $DockerToken | docker login --username $DockerUsername --password-stdin
        if ($LASTEXITCODE -ne 0) {
            throw "Docker Hub login failed."
        }
    }
    else {
        Write-Host "==> No Docker Hub credentials supplied. Using your existing Docker login session."
    }
}

$remoteImage = "${Repository}:$Tag"

Write-Host "==> Pulling '$remoteImage'..."
docker pull $remoteImage
if ($LASTEXITCODE -ne 0) {
    throw "Docker pull failed."
}

Write-Host "==> Tagging '$remoteImage' as '$ComposeImage'..."
docker tag $remoteImage $ComposeImage
if ($LASTEXITCODE -ne 0) {
    throw "Docker tag failed."
}

Write-Host "==> Starting compose stack from '$ComposeFile'..."
docker compose -f $ComposeFile up -d --force-recreate
if ($LASTEXITCODE -ne 0) {
    throw "Docker compose up failed."
}

Write-Host "==> Deploy complete."
