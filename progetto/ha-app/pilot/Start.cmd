@echo off
title ACA SYSTEM - Preparazione centrale
powershell.exe -NoProfile -File "%~dp0pilot\Start-AcaVirtualBoxSetup.ps1" %*
if errorlevel 1 (
  echo.
  echo Setup interrotto. Leggere l errore sopra: file e checkpoint sono conservati.
  echo Usare questo kit sul PC destinatario con VirtualBox gia installato e VM creata manualmente.
  echo Se Windows blocca gli script, far verificare firma, provenienza e criteri locali.
  echo Questo avvio non modifica i criteri di esecuzione PowerShell.
)
pause
