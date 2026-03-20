param(
    [string]$Branch = "",
    [switch]$SkipGitSync,
    [switch]$RunTests,
    [switch]$SkipTests,
    [int]$Port = 8080,
    [string]$DbUrl = "jdbc:postgresql://localhost:5432/telos_db",
    [string]$DbUsername = "postgres",
    [string]$DbPassword = "root",
    [string]$SpringProfile = "",
    [string[]]$AdditionalAppArgs = @(),
    [string]$LogDirectory = ".\target"
)

$ErrorActionPreference = "Stop"

function Require-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' is not installed or not in PATH."
    }
}

function Get-PortListenerPid {
    param([int]$LocalPort)

    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
        $listener = Get-NetTCPConnection -State Listen -LocalPort $LocalPort -ErrorAction SilentlyContinue |
            Select-Object -First 1

        if ($listener) {
            return [int]$listener.OwningProcess
        }
    }

    $matches = netstat -ano | Select-String -Pattern "LISTENING" | ForEach-Object {
        $raw = $_.Line.Trim()
        $pattern = "^\s*TCP\s+\S+:$LocalPort\s+\S+\s+LISTENING\s+(\d+)\s*$"
        if ($raw -match $pattern) {
            [int]$Matches[1]
        }
    }

    return ($matches | Select-Object -First 1)
}

function Assert-CleanWorktree {
    $status = git status --porcelain
    if ($status) {
        throw "Working tree contains uncommitted changes. Commit/stash first, or rerun with -SkipGitSync."
    }
}

function Write-ProcessLogTails {
    param(
        [string]$StdoutPath,
        [string]$StderrPath,
        [int]$TailLines = 20
    )

    if (Test-Path $StdoutPath) {
        Write-Host "==> Last stdout lines:"
        Get-Content $StdoutPath -Tail $TailLines
    }

    if (Test-Path $StderrPath) {
        $stderrItem = Get-Item $StderrPath
        if ($stderrItem.Length -gt 0) {
            Write-Host "==> Last stderr lines:"
            Get-Content $StderrPath -Tail $TailLines
        }
    }
}

function Get-ExitCodeOrUnknown {
    param([System.Diagnostics.Process]$Process)

    try {
        $Process.WaitForExit()
    } catch {
        return "unknown"
    }

    $Process.Refresh()
    if ($null -eq $Process.ExitCode) {
        return "unknown"
    }

    return [string]$Process.ExitCode
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

if ($Port -lt 1 -or $Port -gt 65535) {
    throw "Invalid port '$Port'. Use a value between 1 and 65535."
}

Write-Host "==> Validating prerequisites..."
Require-Command java
$javaMajor = Get-JavaMajorVersion
if ($null -eq $javaMajor) {
    Write-Warning "Could not detect Java version from 'java -version'. Maven may fail if Java is not 21+."
} elseif ($javaMajor -lt 21) {
    throw "Java 21+ is required by this project, but detected Java $javaMajor."
}

if (-not (Test-Path ".\\mvnw.cmd")) {
    throw "mvnw.cmd was not found. Run this script from the project root."
}

if (-not $SkipGitSync) {
    Require-Command git

    if (-not (Test-Path ".\\.git")) {
        throw ".git directory was not found. This script expects a git checkout."
    }

    Assert-CleanWorktree

    $currentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
    if (-not $Branch) {
        $Branch = $currentBranch
    }

    Write-Host "==> Fetching latest changes..."
    git fetch --all --prune

    Write-Host "==> Pulling branch '$Branch'..."
    git checkout $Branch
    git pull --ff-only origin $Branch
}

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
& .\\mvnw.cmd @mavenArgs
if ($LASTEXITCODE -ne 0) {
    throw "Maven build failed with exit code $LASTEXITCODE."
}

$jar = Get-ChildItem ".\\target\\*.jar" |
    Where-Object {
        $_.Name -notlike "*sources*" -and
        $_.Name -notlike "*javadoc*" -and
        $_.Name -notlike "*original*" -and
        $_.Name -notlike "*plain*"
    } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $jar) {
    throw "No runnable JAR found in .\\target after build."
}

$listenerPid = Get-PortListenerPid -LocalPort $Port
if ($listenerPid) {
    throw "Port $Port is already in use by PID $listenerPid. Use -Port with a free port (for example, -Port 8081)."
}

$javaArgs = @("-jar", $jar.FullName, "--server.port=$Port")
if ($SpringProfile) {
    $javaArgs += "--spring.profiles.active=$SpringProfile"
}
if ($DbUrl) {
    $javaArgs += "--spring.datasource.url=$DbUrl"
}
if ($DbUsername) {
    $javaArgs += "--spring.datasource.username=$DbUsername"
}
if ($DbPassword) {
    $javaArgs += "--spring.datasource.password=$DbPassword"
}
if ($AdditionalAppArgs.Count -gt 0) {
    $javaArgs += $AdditionalAppArgs
}

Write-Host "==> Starting application from $($jar.FullName)..."
$logDirPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $LogDirectory))
if (-not (Test-Path $logDirPath)) {
    New-Item -Path $logDirPath -ItemType Directory -Force | Out-Null
}
$stdoutLog = Join-Path $logDirPath "publish-app.stdout.log"
$stderrLog = Join-Path $logDirPath "publish-app.stderr.log"

$proc = Start-Process -FilePath "java" -ArgumentList $javaArgs -WorkingDirectory (Get-Location) -PassThru `
    -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog

Start-Sleep -Seconds 2
$proc.Refresh()
if ($proc.HasExited) {
    $exitCode = Get-ExitCodeOrUnknown -Process $proc
    Write-ProcessLogTails -StdoutPath $stdoutLog -StderrPath $stderrLog
    throw "Application exited early with exit code $exitCode. See logs: $stdoutLog, $stderrLog"
}

$isListening = $false
$deadline = (Get-Date).AddSeconds(20)
while ((Get-Date) -lt $deadline) {
    $proc.Refresh()
    if ($proc.HasExited) {
        break
    }

    $listenerAfterStart = Get-PortListenerPid -LocalPort $Port
    if ($listenerAfterStart -eq $proc.Id) {
        $isListening = $true
        break
    }

    Start-Sleep -Milliseconds 500
}

if ($proc.HasExited) {
    $exitCode = Get-ExitCodeOrUnknown -Process $proc
    Write-ProcessLogTails -StdoutPath $stdoutLog -StderrPath $stderrLog
    throw "Application exited during startup with exit code $exitCode. See logs: $stdoutLog, $stderrLog"
}

if (-not $isListening) {
    Write-Warning "App process is running (PID: $($proc.Id)), but port $Port did not open within 20 seconds. Check logs if startup is still in progress."
}

Write-Host "==> Publish completed. App is running in background (PID: $($proc.Id), Port: $Port)."
Write-Host "==> Logs:"
Write-Host "    stdout: $stdoutLog"
Write-Host "    stderr: $stderrLog"
