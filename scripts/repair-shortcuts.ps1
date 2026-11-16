param([Parameter(Mandatory=$true)][string]$InstallDir)
$ErrorActionPreference = 'Stop'
$installRoot = [IO.Path]::GetFullPath($InstallDir).TrimEnd('\') + '\'
$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('DesktopDirectory')
$programs = [Environment]::GetFolderPath('Programs')
$expectedDesktop = Join-Path $desktop '聊天话术助手.lnk'
$expectedStart = Join-Path $programs '聊天话术助手\聊天话术助手.lnk'
$expectedUninstall = Join-Path $programs '聊天话术助手\卸载.lnk'
# Windows Script Host is a legacy component. Stage link reads/writes under
# ASCII filenames, then use .NET Unicode file operations for the display names.
function Read-LinkTarget([string]$Path) {
    $temp = Join-Path $env:TEMP ([Guid]::NewGuid().ToString('N') + '.lnk')
    try {
        Copy-Item -LiteralPath $Path -Destination $temp -Force
        $link = $shell.CreateShortcut($temp)
        return [string]$link.TargetPath
    } finally { Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue }
}
$legacyNames = @()
foreach ($codePage in @(1252, 936)) {
    $legacyNames += [Text.Encoding]::GetEncoding($codePage).GetString([Text.Encoding]::UTF8.GetBytes('聊天话术助手'))
}
$links = @(Get-ChildItem -LiteralPath $desktop -Filter '*.lnk' -File -ErrorAction SilentlyContinue)
$links += @(Get-ChildItem -LiteralPath $programs -Filter '*.lnk' -File -Recurse -ErrorAction SilentlyContinue)
foreach ($file in $links) {
    if ($file.FullName -ieq $expectedDesktop -or $file.FullName -ieq $expectedStart -or $file.FullName -ieq $expectedUninstall) { continue }
    try {
        $target = Read-LinkTarget $file.FullName
        $isOurTarget = $target -and $target.StartsWith($installRoot, [StringComparison]::OrdinalIgnoreCase)
        $isKnownBrokenName = $legacyNames -contains $file.BaseName
        $isKnownBrokenFolder = $legacyNames -contains $file.Directory.Name
        if ($isOurTarget -or $isKnownBrokenName -or $isKnownBrokenFolder) {
            Remove-Item -LiteralPath $file.FullName -Force
        }
    } catch { Write-Warning ('Could not inspect legacy shortcut: ' + $file.FullName) }
}
foreach ($linkPath in @($expectedDesktop, $expectedStart, $expectedUninstall)) {
    $isUninstall = $linkPath -ieq $expectedUninstall
    $target = if ($isUninstall) { Join-Path $InstallDir 'Uninstall.exe' } else { Join-Path $InstallDir 'ChatDraft.exe' }
    if (-not (Test-Path -LiteralPath $target)) { throw ('Shortcut target missing: ' + $target) }
    $temp = Join-Path $env:TEMP ([Guid]::NewGuid().ToString('N') + '.lnk')
    try {
        $link = $shell.CreateShortcut($temp)
        $link.TargetPath = $target
        $link.WorkingDirectory = $InstallDir
        $link.IconLocation = $target + ',0'
        $link.Save()
        New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($linkPath)) -Force | Out-Null
        Move-Item -LiteralPath $temp -Destination $linkPath -Force
        $savedTarget = Read-LinkTarget $linkPath
        if ($savedTarget -ine $target) { throw ('Saved shortcut target mismatch: ' + $linkPath + '; actual=[' + $savedTarget + ']; expected=[' + $target + ']') }
    } finally { Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue }
}
