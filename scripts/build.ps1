# Loads MSVC environment, then runs Tauri production build.
. "$PSScriptRoot\env.ps1"

$vcvars = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
if (-not (Test-Path $vcvars)) {
    Write-Error "vcvars64.bat not found. Install 'Desktop development with C++' in Visual Studio Build Tools."
    exit 1
}

$root = Split-Path -Parent $PSScriptRoot
$cargoHome = $env:CARGO_HOME

cmd /c "set CARGO_HOME=$cargoHome&& call `"$vcvars`" && cd /d `"$root`" && npm run tauri build"
