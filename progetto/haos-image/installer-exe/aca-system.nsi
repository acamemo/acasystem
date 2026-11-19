; Installatore Windows di ACA SYSTEM (REP-20261118-001).
; Installa per l'utente corrente, senza diritti di amministratore:
;  - la centrale ACA in VirtualBox (disco scaricato da GitHub con impronta fissata, supervisore all'accesso);
;  - l'app Acasystem per PC.
; Non installa VirtualBox e non cambia protezioni, firewall o piano energetico del PC.
; Compilato da crea-installer.ps1, che passa VERSIONE, USCITA, URL_DISCO, IMPRONTA_DISCO, SCRIPT_DIR, CLIENT_DIR.

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
!define MUI_WELCOMEPAGE_TEXT "Verranno installati su questo PC:$\r$\n$\r$\n  - la centrale ACA, in una macchina virtuale VirtualBox;$\r$\n  - l'app Acasystem per PC.$\r$\n$\r$\nServono VirtualBox, una connessione a Internet e 40 GB liberi sul disco. Il PC deve essere collegato alla rete di casa.$\r$\n$\r$\nLa centrale parte da sola a ogni accesso a Windows e resta accesa finché il PC è acceso."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_TITLE "ACA SYSTEM è installato"
!define MUI_FINISHPAGE_TEXT "Al primo avvio la centrale scarica Home Assistant e Acasystem: servono 10-20 minuti.$\r$\n$\r$\nPoi apri dal menu Start la voce $\"Mostra la schermata della centrale$\": compaiono il codice QR per telefono e tablet e l'indirizzo da inserire nell'app Acasystem per PC."
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Italian"

Section "ACA SYSTEM"
  ${IfNot} ${RunningX64}
    MessageBox MB_OK|MB_ICONSTOP "ACA SYSTEM richiede Windows a 64 bit." /SD IDOK
    Abort "Windows a 32 bit non supportato."
  ${EndIf}
  ${IfNot} ${FileExists} "$PROGRAMFILES64\Oracle\VirtualBox\VBoxManage.exe"
    MessageBox MB_OK|MB_ICONEXCLAMATION "VirtualBox non è installato.$\r$\n$\r$\nInstallarlo dal sito ufficiale che si apre ora, poi rilanciare questa installazione." /SD IDOK
    ExecShell "open" "https://www.virtualbox.org/wiki/Downloads"
    Abort "VirtualBox non installato."
  ${EndIf}
  ${If} ${FileExists} "$INSTDIR\Centrale\installazione.json"
    MessageBox MB_OK|MB_ICONEXCLAMATION "ACA SYSTEM è già installato su questo PC.$\r$\nPer reinstallarlo usare prima $\"Disinstalla ACA SYSTEM$\" dal menu Start." /SD IDOK
    Abort "ACA SYSTEM già installato."
  ${EndIf}

  SetOutPath "$INSTDIR\Installatore"
  File /r "${SCRIPT_DIR}\*"
  DetailPrint "Installazione della centrale: seguire la finestra che si apre (download di circa 600 MB)..."
  ; Cartella di lavoro fuori da $INSTDIR: VBoxSVC, avviato qui per la prima volta, la erediterebbe e la terrebbe occupata.
  SetOutPath "$TEMP"
  ExecWait '${PS} -File "$INSTDIR\Installatore\Installa-Centrale.ps1" -Cartella "$INSTDIR\Centrale" -UrlDisco "${URL_DISCO}" -ImprontaDisco ${IMPRONTA_DISCO} -Conferma' $0
  ${If} $0 != 0
    RMDir /r "$INSTDIR\Installatore"
    RMDir "$INSTDIR"
    MessageBox MB_OK|MB_ICONSTOP "Installazione della centrale non riuscita (codice $0). Il PC non è stato modificato: correggere il problema indicato e riprovare." /SD IDOK
    Abort "Installazione della centrale non riuscita."
  ${EndIf}

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
