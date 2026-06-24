# Reports installer/cache sizes on C: (read-only). Run: .\scripts\disk-usage-report.ps1

function Get-FolderSizeGB([string]$Path) {
    if (-not (Test-Path $Path)) { return $null }
    $sum = (Get-ChildItem $Path -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    return [math]::Round($sum / 1GB, 2)
}

Write-Host "`n=== Installer / cache sizes (C:) ===`n" -ForegroundColor Cyan

$rows = @(
    @{ Name = "Package Cache (MSI payloads, VS/SDK/.NET)"; Path = "C:\ProgramData\Package Cache" },
    @{ Name = "Windows Installer service cache"; Path = "C:\Windows\Installer" },
    @{ Name = "Visual Studio download cache (Packages)"; Path = "C:\ProgramData\Microsoft\VisualStudio\Packages" },
    @{ Name = "VS Installer app"; Path = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer" },
    @{ Name = "VS Build Tools (installed C++)"; Path = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools" },
    @{ Name = "Windows SDK"; Path = "C:\Program Files (x86)\Windows Kits" },
    @{ Name = "WinSxS component store"; Path = "C:\Windows\WinSxS" },
    @{ Name = "Rust toolchain (.rustup)"; Path = "$env:USERPROFILE\.rustup" },
    @{ Name = "Cargo cache"; Path = $env:CARGO_HOME },
    @{ Name = "npm cache"; Path = "$env:LOCALAPPDATA\npm-cache" },
    @{ Name = "Tauri WiX/NSIS cache"; Path = "$env:LOCALAPPDATA\tauri" },
    @{ Name = "User Temp"; Path = $env:TEMP },
    @{ Name = "Tauri build target (E:)"; Path = "e:\SC-Trader\src-tauri\target" },
    @{ Name = "D:\BuilderTool (MSBuild only)"; Path = "D:\BuilderTool" }
)

foreach ($r in $rows) {
    $p = if ($r.Path -eq $env:CARGO_HOME -and -not $r.Path) { "D:\cargo" } else { $r.Path }
    $gb = Get-FolderSizeGB $p
    $label = if ($null -eq $gb) { "n/a" } else { "$gb GB" }
    Write-Host ("{0,-42} {1,8}  {2}" -f $r.Name, $label, $p)
}

Write-Host "`n=== Safe cleanup (manual) ===`n" -ForegroundColor Yellow
Write-Host "1. Visual Studio Installer -> Build Tools 2022 -> More -> remove outdated downloads"
Write-Host "2. Settings -> System -> Storage -> Temporary files -> Cleanup"
Write-Host "3. npm cache clean --force"
Write-Host "4. Optional: delete e:\SC-Trader\src-tauri\target (rebuilds on next build)"
Write-Host ""
Write-Host "Do NOT delete C:\Windows\Installer or all of Package Cache by hand.`n"
