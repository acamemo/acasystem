; Installatore Windows di ACA SYSTEM (REP-20261118-001, semplificato da REP-20261120-001).
; Installa per l'utente corrente, senza diritti di amministratore:
;  - l'app Acasystem per PC (cartella Client);
;  - gli script della centrale (cartella Installatore), usati dall'app al primo avvio.
; La centrale (download del disco, VirtualBox, creazione della macchina) la prepara l'app, non l'installatore:
; la cartella Centrale non viene mai toccata da installazione o aggiornamento.
; Non installa VirtualBox e non cambia protezioni, firewall o piano energetico del PC.
; Compilato da crea-installer.ps1, che passa VERSIONE, USCITA, SCRIPT_DIR, CLIENT_DIR.

Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

Name "ACA SYSTEM"
OutFile "${USCITA}"
InstallDir "$LOCALAPPDATA\ACA-System"
RequestExecutionLevel user
SetCompressor /SOLID lzma
BrandingText "ACA SYSTEM ${VERSIONE}"
VIProductVersion "1.0.0.0"
VIAddVersionKey /LANG=1040 "ProductName" "ACA SYSTEM"
VIAddVersionKey /LANG=1040 "CompanyName" "MeMo Srl"
VIAddVersionKey /LANG=1040 "FileDescription" "Installazione di ACA SYSTEM"
VIAddVersionKey /LANG=1040 "FileVersion" "${VERSIONE}"
VIAddVersionKey /LANG=1040 "LegalCopyright" "MeMo Srl - GPL-3.0"

; NSIS è a 32 bit: senza Sysnative partirebbe PowerShell a 32 bit, che non vede Program Files a 64 bit.
!define PS '"$WINDIR\Sysnative\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass'
!define CHIAVE "Software\Microsoft\Windows\CurrentVersion\Uninstall\ACA-System"

!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Installazione di ACA SYSTEM"
!define MUI_WELCOMEPAGE_TEXT "Verrà installata l'app Acasystem. Al primo avvio ti guida nella preparazione della centrale di casa."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_TITLE "ACA SYSTEM è installato"
!define MUI_FINISHPAGE_TEXT "Acasystem ti guida nella preparazione della centrale di casa: servono circa 30 minuti, quasi tutti di attesa."
!define MUI_FINISHPAGE_RUN "$INSTDIR\Client\Acasystem.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Apri Acasystem"
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Italian"

Section "ACA SYSTEM"
  ${IfNot} ${RunningX64}
    MessageBox MB_OK|MB_ICONSTOP "ACA SYSTEM richiede Windows a 64 bit." /SD IDOK
    Abort "Windows a 32 bit non supportato."
  ${EndIf}
  SetOutPath "$INSTDIR\Installatore"
  DetailPrint "Copia degli script della centrale..."
  File /r "${SCRIPT_DIR}\*"
  DetailPrint "Installazione dell'app Acasystem per PC..."
  SetOutPath "$INSTDIR\Client"
  File /r "${CLIENT_DIR}\*"

  SetOutPath "$INSTDIR"
  WriteUninstaller "$INSTDIR\Disinstalla.exe"
  CreateShortcut "$DESKTOP\Acasystem.lnk" "$INSTDIR\Client\Acasystem.exe"
  CreateDirectory "$SMPROGRAMS\ACA SYSTEM"
  CreateShortcut "$SMPROGRAMS\ACA SYSTEM\Acasystem.lnk" "$INSTDIR\Client\Acasystem.exe"
  CreateShortcut "$SMPROGRAMS\ACA SYSTEM\Mostra la schermata della centrale.lnk" "$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\Installatore\Mostra-Schermata.ps1" -Cartella "$INSTDIR\Centrale"'
  CreateShortcut "$SMPROGRAMS\ACA SYSTEM\Disinstalla ACA SYSTEM.lnk" "$INSTDIR\Disinstalla.exe"
  WriteRegStr HKCU "${CHIAVE}" "DisplayName" "ACA SYSTEM"
  WriteRegStr HKCU "${CHIAVE}" "DisplayVersion" "${VERSIONE}"
  WriteRegStr HKCU "${CHIAVE}" "Publisher" "MeMo Srl"
  WriteRegStr HKCU "${CHIAVE}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${CHIAVE}" "DisplayIcon" "$INSTDIR\Client\Acasystem.exe"
  WriteRegStr HKCU "${CHIAVE}" "UninstallString" '"$INSTDIR\Disinstalla.exe"'
  WriteRegDWORD HKCU "${CHIAVE}" "NoModify" 1
  WriteRegDWORD HKCU "${CHIAVE}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  MessageBox MB_YESNO|MB_ICONEXCLAMATION "Verranno eliminati la centrale ACA e tutti i suoi dati (account, dispositivi, impostazioni) e l'app Acasystem per PC.$\r$\n$\r$\nContinuare?" /SD IDYES IDYES +2
  Abort "Disinstallazione annullata."
  SetOutPath "$TEMP"
  ${If} ${FileExists} "$INSTDIR\Centrale\installazione.json"
    ExecWait '${PS} -File "$INSTDIR\Installatore\Disinstalla-Centrale.ps1" -Cartella "$INSTDIR\Centrale" -Conferma' $0
    ${If} $0 != 0
      MessageBox MB_OK|MB_ICONSTOP "Rimozione della centrale non riuscita (codice $0). Riprovare dopo aver riavviato il PC." /SD IDOK
      Abort "Rimozione della centrale non riuscita."
    ${EndIf}
  ${EndIf}
  Delete "$DESKTOP\Acasystem.lnk"
  RMDir /r "$SMPROGRAMS\ACA SYSTEM"
  RMDir /r "$INSTDIR\Client"
  RMDir /r "$INSTDIR\Installatore"
  Delete "$INSTDIR\Disinstalla.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${CHIAVE}"
SectionEnd
