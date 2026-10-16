@echo off
rem Arranque en un comando: botmef-saas.bat [dev]
cd /d "%~dp0"
if /i "%~1"=="dev" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CERO.ps1" -Dev
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0CERO.ps1"
)
exit /b %errorlevel%
