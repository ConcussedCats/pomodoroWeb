[CmdletBinding()]
param(
    [string]$Repository = "whyisthecodeworking/telosrepo",
    [string]$Dockerfile = ".\telos.docker",
    [string]$ImageName = "telos-local",
    [string]$JarPattern = ".\target\*.jar",
    [string]$VersionFilePath = ".\version.json",
    [string]$BranchName = "",
    [switch]$SkipDockerLogin,
    [string]$DockerUsername = $env:DOCKERHUB_USERNAME,
    [string]$DockerToken = $env:DOCKERHUB_TOKEN
)


$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Get-VersionFileVersion {
    param([Parameter(Mandatory = $true)][string]$VersionFilePath)

    $versionData = Get-Content -LiteralPath $VersionFilePath -Raw | ConvertFrom-Json
    if (-not ($versionData.PSObject.Properties.Name -contains 'version')) {
        throw "Version file '$VersionFilePath' must contain a 'version' property."
    }

    return [string]$versionData.version
}

function Require-Command {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' is not installed or not in PATH."
    }
}

function Get-BuildJar {
    param([Parameter(Mandatory = $true)][string]$Pattern)

    $jar = Get-ChildItem $Pattern |
        Where-Object {
            $_.Name -notlike "*sources*" -and
            $_.Name -notlike "*javadoc*" -and
            $_.Name -notlike "*original*" -and
            $_.Name -notlike "*plain*"
        } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $jar) {
        throw "No runnable JAR found matching '$Pattern'."
    }

    return $jar
}

function Get-BranchName {
    param([string]$ProvidedBranchName)

    if (-not [string]::IsNullOrWhiteSpace($ProvidedBranchName)) {
        return $ProvidedBranchName
    }

    
    if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_REF_NAME)) {
        return $env:GITHUB_REF_NAME
    }

    $gitBranch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($gitBranch)) {
        return $gitBranch
    }

    throw "Could not resolve branch name. Pass -BranchName explicitly."
}

function ConvertTo-ImageTagPart {
    param([Parameter(Mandatory = $true)][string]$Value)

    $normalized = $Value.ToLowerInvariant() -replace '[^a-z0-9._-]', '-'
    $normalized = $normalized.Trim('-')

    if ([string]::IsNullOrWhiteSpace($normalized)) {
        throw "Value '$Value' could not be converted into a valid Docker tag fragment."
    }

    return $normalized
}

Write-Host "==> Validating prerequisites..."
Require-Command docker
Require-Command git

if (-not (Test-Path -LiteralPath $Dockerfile)) {
    throw "Dockerfile not found: $Dockerfile"
}

if (-not (Test-Path -LiteralPath $VersionFilePath)) {
    throw "version.json not found: $VersionFilePath"
}

$jar = Get-BuildJar -Pattern $JarPattern
Write-Host "==> Using JAR: $($jar.FullName)"

$version = Get-VersionFileVersion -VersionFilePath $VersionFilePath
$branch = ConvertTo-ImageTagPart -Value (Get-BranchName -ProvidedBranchName $BranchName)
$versionTag = "$(ConvertTo-ImageTagPart -Value $version)-$branch"
Write-Host "==> Version tag: $versionTag"

if (-not $SkipDockerLogin) {
    if (-not [string]::IsNullOrWhiteSpace($DockerUsername) -and -not [string]::IsNullOrWhiteSpace($DockerToken)) {
        Write-Host "==> Logging in to Docker Hub as '$DockerUsername'..."
        $DockerToken | docker login --username $DockerUsername --password-stdin
        if ($LASTEXITCODE -ne 0) {
            throw "Docker Hub login failed."
        }
    } else {
        Write-Host "==> No Docker Hub credentials supplied. Using your existing Docker login session."
        Write-Host "   Set DOCKERHUB_USERNAME and DOCKERHUB_TOKEN if you want the script to log in for you."
    }
}

$versionImage = "${Repository}:$versionTag"
$latestImage = "${Repository}:latest"

Write-Host "==> Building Docker image '$ImageName' from '$Dockerfile'..."
docker build -f $Dockerfile -t $ImageName .
if ($LASTEXITCODE -ne 0) {
    throw "Docker build failed."
}

Write-Host "==> Tagging '$ImageName' as '$versionImage'..."
docker tag $ImageName $versionImage
if ($LASTEXITCODE -ne 0) {
    throw "Docker version tag failed."
}

Write-Host "==> Tagging '$ImageName' as '$latestImage'..."
docker tag $ImageName $latestImage
if ($LASTEXITCODE -ne 0) {
    throw "Docker latest tag failed."
}

Write-Host "==> Pushing '$versionImage'..."
docker push $versionImage
if ($LASTEXITCODE -ne 0) {
    throw "Docker push failed for version tag."
}

Write-Host "==> Pushing '$latestImage'..."
docker push $latestImage
if ($LASTEXITCODE -ne 0) {
    throw "Docker push failed for latest tag."
}

Write-Host "==> Push complete: $versionImage"
Write-Host "==> Push complete: $latestImage"
