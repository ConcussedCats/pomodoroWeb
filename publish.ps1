param(
    [string]$Branch = "",
    [switch]$RunTests,
    [switch]$SkipTests
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
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' is not installed or not in PATH."
    }
}

function Get-JavaMajorVersion {
    $versionLine = (cmd /c "java -version 2>&1" | Select-Object -First 1)
    if (-not $versionLine) {
        return $null
    }

    if ($versionLine -match '\"(\d+)(?:\.\d+)?') {
        return [int]$Matches[1]
    }

    return $null
}

function Invoke-MavenWrapper {
    param([string[]]$Arguments)

    $escapedArguments = $Arguments | ForEach-Object {
        if ($_ -match '[\s"]') {
            '"' + ($_ -replace '"', '\"') + '"'
        } else {
            $_
        }
    }

    $commandLine = '".\mvnw.cmd" ' + ($escapedArguments -join ' ')
    & cmd.exe /c $commandLine
}

if ($RunTests -and $SkipTests) {
    throw "Use either -RunTests or -SkipTests, not both."
}

Write-Host "==> Validating prerequisites..."
Require-Command java
$javaMajor = Get-JavaMajorVersion
if ($null -eq $javaMajor) {
    Write-Warning "Could not detect Java version from 'java -version'. Maven may fail if Java is not 21+."
} elseif ($javaMajor -lt 21) {
    throw "Java 21+ is required by this project, but detected Java $javaMajor."
}

if (-not (Test-Path ".\mvnw.cmd")) {
    throw "mvnw.cmd was not found. Run this script from the project root."
}

$versionFilePath = ".\version.json"
if (-not (Test-Path -LiteralPath $versionFilePath)) {
    throw "version.json was not found. Run this script from the project root."
}

$currentVersion = Get-VersionFileVersion -VersionFilePath $versionFilePath

$skipTestsForBuild = $true
if ($RunTests) {
    $skipTestsForBuild = $false
}
if ($SkipTests) {
    $skipTestsForBuild = $true
}

$mavenArgs = @("clean", "package", "-Dmaven.compiler.proc=full")
if ($skipTestsForBuild) {
    $mavenArgs += "-DskipTests"
}

$testsMode = if ($skipTestsForBuild) { "skip tests" } else { "run tests" }
Write-Host "==> Building application ($testsMode)..."
$null = Invoke-MavenWrapper -Arguments $mavenArgs
$mavenExitCode = $LASTEXITCODE
if ($mavenExitCode -ne 0) {
    throw "Maven build failed with exit code $mavenExitCode."
}

$jar = Get-ChildItem ".\target\*.jar" |
    Where-Object {
        $_.Name -notlike "*sources*" -and
        $_.Name -notlike "*javadoc*" -and
        $_.Name -notlike "*original*" -and
        $_.Name -notlike "*plain*"
    } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $jar) {
    throw "No runnable JAR found in .\target after build."
}

Write-Host "==> Build completed."
Write-Host "==> Version: $currentVersion"
Write-Host "==> JAR: $($jar.FullName)"
