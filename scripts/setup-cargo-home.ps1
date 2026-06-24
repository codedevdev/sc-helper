# One-time: move Cargo cache from C: to D:\cargo and set user env CARGO_HOME.
# Run in PowerShell (no admin required).

$ErrorActionPreference = "Stop"
$dest = "D:\cargo"
$src = Join-Path $env:USERPROFILE ".cargo"

New-Item -ItemType Directory -Path $dest -Force | Out-Null

if (Test-Path $src) {
    Write-Host "Moving $src -> $dest ..."
    robocopy $src $dest /E /MOVE /NFL /NDL | Out-Null
    if ($LASTEXITCODE -ge 8) {
        throw "robocopy failed with exit code $LASTEXITCODE"
    }
    if (Test-Path $src) {
        Remove-Item $src -Recurse -Force -ErrorAction SilentlyContinue
    }
}

[Environment]::SetEnvironmentVariable("CARGO_HOME", $dest, "User")
$env:CARGO_HOME = $dest

Write-Host "CARGO_HOME set to $dest (User environment)."
Write-Host "Open a new terminal for the change to apply everywhere."
