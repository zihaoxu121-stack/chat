$ErrorActionPreference = 'Stop'
$testTemp = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Temp'
$root = Join-Path $testTemp ('ChatDraft-ShortcutTest-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $env:WINDIR 'System32\cmd.exe') -Destination (Join-Path $root 'ChatDraft.exe')
Copy-Item -LiteralPath (Join-Path $env:WINDIR 'System32\cmd.exe') -Destination (Join-Path $root 'Uninstall.exe')
$desktop = Join-Path ([Environment]::GetFolderPath('DesktopDirectory')) '聊天话术助手.lnk'
$menu = Join-Path ([Environment]::GetFolderPath('Programs')) '聊天话术助手'
$links = @($desktop, (Join-Path $menu '聊天话术助手.lnk'), (Join-Path $menu '卸载.lnk'))
try {
    & powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'repair-shortcuts.ps1') -InstallDir $root
    if ($LASTEXITCODE -ne 0) { throw 'Shortcut repair script failed under Windows PowerShell' }
    $shell = New-Object -ComObject WScript.Shell
    foreach ($file in $links) {
        if (-not (Test-Path -LiteralPath $file)) { throw ('Missing Unicode shortcut: ' + $file) }
        $temp = Join-Path $env:TEMP ([Guid]::NewGuid().ToString('N') + '.lnk')
        try {
            Copy-Item -LiteralPath $file -Destination $temp
            $link = $shell.CreateShortcut($temp)
            $target = [string]$link.TargetPath
            Write-Host ('Link: ' + $file + '; bytes=' + (Get-Item -LiteralPath $file).Length + '; target=' + $target)
            if (-not $target.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Shortcut target does not point into the test installation' }
        } finally { Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue }
    }
    Write-Host 'PASS: Unicode shortcut creation and saved targets under Windows PowerShell, inspected from PowerShell 7'
} finally {
    foreach ($file in $links) { Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue }
    if ((Test-Path -LiteralPath $menu) -and @(Get-ChildItem -LiteralPath $menu).Count -eq 0) { Remove-Item -LiteralPath $menu }
    Remove-Item -LiteralPath $root -Recurse -Force
}
