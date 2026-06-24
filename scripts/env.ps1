# Shared env for Rust/Cargo on D: (sourced by dev.ps1 / build.ps1)
$script:CargoHome = if ($env:CARGO_HOME) { $env:CARGO_HOME } else { "D:\cargo" }

if (-not (Test-Path $script:CargoHome)) {
    New-Item -ItemType Directory -Path $script:CargoHome -Force | Out-Null
}

$env:CARGO_HOME = $script:CargoHome
