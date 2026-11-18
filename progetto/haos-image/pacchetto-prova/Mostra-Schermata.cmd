@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Mostra-Schermata.ps1" %*
if errorlevel 1 pause
