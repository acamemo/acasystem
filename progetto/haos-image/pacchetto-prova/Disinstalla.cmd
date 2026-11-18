@echo off
title ACA SYSTEM - Disinstalla la centrale
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Disinstalla-Centrale.ps1" %*
pause
