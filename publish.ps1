param(
    [string]$Branch = "",
    [switch]$RunTests,
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

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

$pomPath = ".\pom.xml"
if (-not (Test-Path -LiteralPath $pomPath)) {
    throw "pom.xml was not found. Run this script from the project root."
}

if (-not (Test-Path ".\Increment-Version.ps1")) {
    throw "Increment-Version.ps1 was not found. Run this script from the project root."
}

& .\Increment-Version.ps1 -Branch $Branch -PomPath $pomPath

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
& .\mvnw.cmd @mavenArgs
if ($LASTEXITCODE -ne 0) {
    throw "Maven build failed with exit code $LASTEXITCODE."
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
Write-Host "==> JAR: $($jar.FullName)"
