param([Parameter(Mandatory=$true)][string]$InstallDir)
$ErrorActionPreference = 'Stop'
$installRoot = [IO.Path]::GetFullPath($InstallDir).TrimEnd('\') + '\'
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('DesktopDirectory')
$programs = [Environment]::GetFolderPath('Programs')
$expectedDesktop = Join-Path $desktop '聊天话术助手.lnk'
$expectedStart = Join-Path $programs '聊天话术助手\聊天话术助手.lnk'
# Only remove legacy app shortcuts targeting our own fixed installation folder.
# Never remove shortcuts pointing elsewhere or the user's app data.
$links = @(Get-ChildItem -LiteralPath $desktop -Filter '*.lnk' -File -ErrorAction SilentlyContinue)
$links += @(Get-ChildItem -LiteralPath $programs -Filter '*.lnk' -File -Recurse -ErrorAction SilentlyContinue)
foreach ($file in $links) {
    try {
        $shortcut = $shell.CreateShortcut($file.FullName)
        $target = $shortcut.TargetPath
        if (-not $target) { continue }
        if (-not $target.StartsWith($installRoot, [StringComparison]::OrdinalIgnoreCase)) { continue }
        if ([IO.Path]::GetFileName($target) -ieq 'Uninstall.exe') { continue }
        if ($file.FullName -ieq $expectedDesktop -or $file.FullName -ieq $expectedStart) { continue }
        Remove-Item -LiteralPath $file.FullName -Force
    } catch {
        Write-Warning ('Could not inspect legacy shortcut: ' + $file.FullName)
    }
}
foreach ($link in @($expectedDesktop, $expectedStart)) {
    if (-not (Test-Path -LiteralPath $link)) { throw ('Installer did not create shortcut: ' + $link) }
    $shortcut = $shell.CreateShortcut($link)
    $shortcut.TargetPath = Join-Path $InstallDir 'ChatDraft.exe'
    $shortcut.WorkingDirectory = $InstallDir
    $shortcut.IconLocation = (Join-Path $InstallDir 'ChatDraft.exe') + ',0'
    $shortcut.Save()
}
