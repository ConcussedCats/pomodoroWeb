[CmdletBinding()]
param(
    [string]$Branch = "",
    [string]$PomPath = ".\pom.xml"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Get-ProjectVersion {
    param([Parameter(Mandatory = $true)][string]$PomPath)

    [xml]$pom = Get-Content -LiteralPath $PomPath
    return [string]$pom.project.version
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

function Set-ProjectVersion {
    param(
        [Parameter(Mandatory = $true)][string]$PomPath,
        [Parameter(Mandatory = $true)][string]$Version
    )

    [xml]$pom = Get-Content -LiteralPath $PomPath
    $pom.project.version = $Version
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $writer = New-Object System.IO.StreamWriter($PomPath, $false, $utf8NoBom)

    try {
        $pom.Save($writer)
    }
    finally {
        $writer.Dispose()
    }
}

if (-not (Test-Path -LiteralPath $PomPath)) {
    throw "pom.xml was not found: $PomPath"
}

$Branch = Get-EffectiveBranchName -ProvidedBranch $Branch
$currentVersion = Get-ProjectVersion -PomPath $PomPath
$nextVersion = Get-IncrementedVersion -Version $currentVersion -Branch $Branch

Write-Host "==> Branch: $Branch"
Write-Host "==> Bumping project version from $currentVersion to $nextVersion..."
Set-ProjectVersion -PomPath $PomPath -Version $nextVersion
Write-Host "==> Version: $nextVersion"
