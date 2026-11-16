Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "WinVer.nsh"
Name "聊天话术助手"
OutFile "..\release\ChatDraft-Setup-1.0.0-x64.exe"
InstallDir "$LOCALAPPDATA\Programs\ChatDraftAssistant"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 32
BrandingText "聊天话术助手 · 本地保存，只拟稿不代发"
Icon "icon.ico"
UninstallIcon "icon.ico"
VIProductVersion "1.0.0.0"
VIAddVersionKey /LANG=2052 "ProductName" "聊天话术助手"
VIAddVersionKey /LANG=2052 "FileDescription" "聊天话术助手安装程序"
VIAddVersionKey /LANG=2052 "FileVersion" "1.0.0"
VIAddVersionKey /LANG=2052 "LegalCopyright" "Chat Draft"
!define MUI_ABORTWARNING
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\聊天话术助手.exe"
!define MUI_FINISHPAGE_RUN_TEXT "启动聊天话术助手"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"
Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_OK|MB_ICONSTOP "本安装包需要 64 位 Windows 10 或更新版本。"
    Abort
  ${EndIf}
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_OK|MB_ICONSTOP "本安装包需要 Windows 10 或更新版本。"
    Abort
  ${EndIf}
  StrCpy $INSTDIR "$LOCALAPPDATA\Programs\ChatDraftAssistant"
  FindWindow $0 "" "聊天话术助手"
  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONEXCLAMATION "请先关闭聊天话术助手，再运行安装程序。"
    Abort
  ${EndIf}
FunctionEnd
Section "安装"
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  File /r "..\release\win-unpacked\*.*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\聊天话术助手"
  CreateShortcut "$SMPROGRAMS\聊天话术助手\聊天话术助手.lnk" "$INSTDIR\聊天话术助手.exe" "" "$INSTDIR\聊天话术助手.exe"
  CreateShortcut "$SMPROGRAMS\聊天话术助手\卸载.lnk" "$INSTDIR\Uninstall.exe"
  CreateShortcut "$DESKTOP\聊天话术助手.lnk" "$INSTDIR\聊天话术助手.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChatDraftAssistant" "DisplayName" "聊天话术助手"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChatDraftAssistant" "DisplayVersion" "1.0.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChatDraftAssistant" "Publisher" "Chat Draft"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChatDraftAssistant" "UninstallString" '$\"$INSTDIR\Uninstall.exe$\"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChatDraftAssistant" "DisplayIcon" "$INSTDIR\聊天话术助手.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChatDraftAssistant" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChatDraftAssistant" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChatDraftAssistant" "NoRepair" 1
SectionEnd
Function un.onInit
  FindWindow $0 "" "聊天话术助手"
  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONEXCLAMATION "请先关闭聊天话术助手，再卸载。"
    Abort
  ${EndIf}
FunctionEnd
Section "Uninstall"
  SetShellVarContext current
  ; Never touch APPDATA/ChatDraftAssistant. Only remove our fixed installation path.
  StrCmp $INSTDIR "$LOCALAPPDATA\Programs\ChatDraftAssistant" 0 keepFiles
  RMDir /r "$INSTDIR"
  keepFiles:
  Delete "$DESKTOP\聊天话术助手.lnk"
  RMDir /r "$SMPROGRAMS\聊天话术助手"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ChatDraftAssistant"
SectionEnd
