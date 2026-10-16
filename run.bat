@echo off
rem Lanzador: BD (docker compose, espera a que este sana) + API + Web, cada uno en su ventana, y abre el navegador.
rem No destructivo: sin down -v, seeds ni reset de BD. Para parar: cerrar las ventanas api/web y "docker compose down".
setlocal
cd /d "%~dp0"

set "DBPORT=5438"
if defined POSTGRES_HOST_PORT set "DBPORT=%POSTGRES_HOST_PORT%"

where docker >nul 2>&1 || (echo [ERROR] Falta docker en el PATH. & goto :fail)
where npm >nul 2>&1 || (echo [ERROR] Falta npm en el PATH. & goto :fail)

if not exist "apps\api\.env" (
  copy ".env.example" "apps\api\.env" >nul
  echo [INFO] Creado apps\api\.env desde .env.example
)
if not exist "node_modules" (
  call npm ci || (echo [ERROR] npm ci fallo. & goto :fail)
)

rem Puerto de la BD ocupado por algo que no es nuestro contenedor: avisar y no matar nada.
docker ps --filter "name=botmef-saas-postgres" --filter "status=running" --format "{{.Names}}" | findstr /c:"botmef-saas-postgres" >nul
if errorlevel 1 (
  powershell -NoProfile -Command "if(Get-NetTCPConnection -LocalPort %DBPORT% -State Listen -ErrorAction SilentlyContinue){exit 1}"
  if errorlevel 1 (
    echo [ERROR] El puerto %DBPORT% de la BD esta ocupado por otro proceso. No se mato nada; liberalo o cambia POSTGRES_HOST_PORT.
    goto :fail
  )
)

echo [INFO] Levantando BD y Redis ^(espera healthcheck^)...
docker compose up -d --wait || (echo [ERROR] docker compose up fallo o la BD no quedo sana. & goto :fail)

start "botmef-saas api" cmd /k "cd /d %~dp0 && npm run dev:api"
start "botmef-saas web" cmd /k "cd /d %~dp0 && npm run dev:web"

echo [INFO] Esperando a la web en http://localhost:3012 ...
powershell -NoProfile -Command "for($i=0;$i -lt 90;$i++){try{Invoke-WebRequest http://localhost:3012 -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0}catch{Start-Sleep 2}}; exit 1"
if errorlevel 1 (echo [ERROR] La web no respondio a tiempo; mira la ventana "botmef-saas web". & goto :fail)

start "" "http://localhost:3012"
echo [OK] Web http://localhost:3012 ^| API http://localhost:3011
exit /b 0

:fail
pause
exit /b 1
