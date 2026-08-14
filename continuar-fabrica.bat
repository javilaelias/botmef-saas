@echo off
REM continuar-fabrica.bat -- continua el trabajo headless de JuvinFactory sobre este proyecto.
REM Resumible: si se corta (limite de cuota, cierre de PC), solo vuelve a correr este archivo.
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\JuvinFactory\run-rollout.ps1" -Proyecto "botmef-saas"
echo.
echo ===== Termino. Revisa el mensaje de arriba (DONE / BLOCKED / limite de cuota). =====
pause
