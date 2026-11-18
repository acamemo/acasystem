@echo off
title ACA SYSTEM - Installa la centrale
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Installa-Centrale.ps1" %*
pause
