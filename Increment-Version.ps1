[CmdletBinding()]
param(
    [string]$Branch = "",
    [string]$VersionFilePath = ".\version.json"
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

function Set-VersionFileVersion {
    param(
        [Parameter(Mandatory = $true)][string]$VersionFilePath,
        [Parameter(Mandatory = $true)][string]$Version
    )

    $versionData = [ordered]@{
        version = $Version
    }

    $json = $versionData | ConvertTo-Json
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $VersionFilePath), $json + [Environment]::NewLine, $utf8NoBom)
}

function Get-EffectiveBranchName {
    param([string]$ProvidedBranch)

    if (-not [string]::IsNullOrWhiteSpace($ProvidedBranch)) {
        return $ProvidedBranch
    }

    if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_REF_NAME)) {
        return $env:GITHUB_REF_NAME
    }

    throw "Could not resolve branch name. Pass -Branch explicitly."
}

function Get-IncrementedVersion {
    param(
        [Parameter(Mandatory = $true)][string]$Version,
        [Parameter(Mandatory = $true)][string]$Branch
    )

    if ($Version -notmatch '^(\d+)\.(\d+)\.(\d+)$') {
        throw "Unsupported project version '$Version'. Expected semantic version format like 0.0.1."
    }

    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
    $patch = [int]$Matches[3]

    if ($Branch -eq "dev") {
        $patch += 1
    }
    elseif ($Branch -eq "staging_telos") {
        $minor += 1
        $patch = 0
    }
    else {
        throw "Unsupported branch '$Branch' for version increment. Supported branches: dev, staging_telos."
    }

    return "$major.$minor.$patch"
}

if (-not (Test-Path -LiteralPath $VersionFilePath)) {
    throw "version.json was not found: $VersionFilePath"
}

$Branch = Get-EffectiveBranchName -ProvidedBranch $Branch
$currentVersion = Get-VersionFileVersion -VersionFilePath $VersionFilePath
$nextVersion = Get-IncrementedVersion -Version $currentVersion -Branch $Branch

Write-Host "==> Branch: $Branch"
Write-Host "==> Bumping project version from $currentVersion to $nextVersion..."
Set-VersionFileVersion -VersionFilePath $VersionFilePath -Version $nextVersion
Write-Host "==> Version: $nextVersion"
