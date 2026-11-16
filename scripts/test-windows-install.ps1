$ErrorActionPreference = 'Stop'
$version = (Get-Content -LiteralPath (Join-Path $PSScriptRoot '../package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
$installer = (Resolve-Path (Join-Path $PSScriptRoot "../release/ChatDraft-Setup-$version-x64.exe")).Path
$installDir = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Programs\ChatDraftAssistant'
$exe = Join-Path $installDir 'ChatDraft.exe'
$desktop = [Environment]::GetFolderPath('DesktopDirectory')
$shortcutPath = Join-Path $desktop '聊天话术助手.lnk'
$startPath = Join-Path ([Environment]::GetFolderPath('Programs')) '聊天话术助手\聊天话术助手.lnk'
$appData = Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'ChatDraftAssistant'
New-Item -ItemType Directory -Path $appData -Force | Out-Null
$sentinel = Join-Path $appData ('installer-test-' + [Guid]::NewGuid().ToString() + '.txt')
'Should survive uninstall and reinstall' | Set-Content -LiteralPath $sentinel -Encoding UTF8
$shell = New-Object -ComObject WScript.Shell
$legacyName = [Text.Encoding]::GetEncoding(1252).GetString([Text.Encoding]::UTF8.GetBytes('聊天话术助手')) + '.lnk'
$legacyPath = Join-Path $desktop $legacyName
$legacyStaging = Join-Path $env:TEMP ([Guid]::NewGuid().ToString('N') + '.lnk')
$legacy = $shell.CreateShortcut($legacyStaging)
$legacy.TargetPath = Join-Path $installDir 'legacy-missing.exe'
$legacy.Save()
Move-Item -LiteralPath $legacyStaging -Destination $legacyPath -Force
function Invoke-Installer {
    $process = Start-Process -FilePath $installer -ArgumentList '/S' -PassThru
    if (-not $process.WaitForExit(180000)) { $process.Kill(); throw 'Installer timed out' }
    if ($process.ExitCode -ne 0) { throw ('Installer failed: ' + $process.ExitCode) }
}
function Assert-Shortcuts {
    if (-not (Test-Path -LiteralPath $exe)) { throw 'ASCII executable not installed' }
    foreach ($file in @($shortcutPath, $startPath)) {
        if (-not (Test-Path -LiteralPath $file)) { throw ('Correct Chinese shortcut missing: ' + $file) }
        $tempLink = Join-Path $env:TEMP ([Guid]::NewGuid().ToString('N') + '.lnk')
        Copy-Item -LiteralPath $file -Destination $tempLink -Force
        $link = $shell.CreateShortcut($tempLink)
        Write-Host ('Shortcut: ' + $file + '; size=' + (Get-Item -LiteralPath $file).Length + '; target=' + $link.TargetPath + '; icon=' + $link.IconLocation)
        Remove-Item -LiteralPath $tempLink -Force
        if ($link.TargetPath -ine $exe) { throw ('Invalid shortcut target: ' + $link.TargetPath) }
        if ($link.IconLocation -notlike ($exe + '*')) { throw ('Invalid shortcut icon: ' + $link.IconLocation) }
    }
    if (Test-Path -LiteralPath $legacyPath) { throw 'Legacy mojibake shortcut was not removed' }
    Write-Host 'PASS: correct Unicode desktop/start menu names, existing ASCII targets and icons, old broken shortcut removed'
}
function Stop-Application {
    Get-Process -Name 'ChatDraft' -ErrorAction SilentlyContinue | Where-Object { $_.Path -ieq $exe } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}
try {
    Invoke-Installer
    Assert-Shortcuts
    $null = $shell.Run(('"' + $shortcutPath + '"'), 1, $false)
    $window = $null
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        $window = Get-Process -Name 'ChatDraft' -ErrorAction SilentlyContinue | Where-Object { $_.Path -ieq $exe -and $_.MainWindowTitle -eq '聊天话术助手' } | Select-Object -First 1
        if ($window) { break }
    }
    if (-not $window) { throw 'Packaged app did not open its Chinese-titled window through the desktop shortcut' }
    Write-Host 'PASS: real installed application opens through the desktop shortcut'
    Stop-Application
    $uninstall = Start-Process -FilePath (Join-Path $installDir 'Uninstall.exe') -ArgumentList '/S' -PassThru
    if (-not $uninstall.WaitForExit(60000)) { throw 'Uninstaller timed out' }
    for ($i = 0; $i -lt 20 -and (Test-Path -LiteralPath $exe); $i++) { Start-Sleep -Seconds 1 }
    if (Test-Path -LiteralPath $exe) { throw 'Uninstaller did not remove application files' }
    if (Test-Path -LiteralPath $shortcutPath) { throw 'Uninstaller left desktop shortcut' }
    if (-not (Test-Path -LiteralPath $sentinel)) { throw 'Uninstaller deleted user data' }
    Invoke-Installer
    Assert-Shortcuts
    if (-not (Test-Path -LiteralPath $sentinel)) { throw 'Reinstall deleted user data' }
    Write-Host 'PASS: uninstall/reinstall retains the independent user data directory'
} catch {
    $diagnostics = Join-Path $PSScriptRoot '../release/install-diagnostics'
    New-Item -ItemType Directory -Path $diagnostics -Force | Out-Null
    foreach ($linkFile in @($shortcutPath, $startPath, $legacyPath)) {
        if (Test-Path -LiteralPath $linkFile) { Copy-Item -LiteralPath $linkFile -Destination (Join-Path $diagnostics ([Guid]::NewGuid().ToString('N') + '.lnk')) }
    }
    Get-ChildItem -LiteralPath $installDir -ErrorAction SilentlyContinue | Select-Object Name, Length | ConvertTo-Json | Set-Content (Join-Path $diagnostics 'installed-files.json') -Encoding UTF8
    throw
} finally {
    Stop-Application
    Remove-Item -LiteralPath $sentinel -Force -ErrorAction SilentlyContinue
}
