## Tareas
- [x] Escribir `run.bat`
- [x] Correrlo: web 3012 -> 200, API 3011 responde (404 en /api/health, ruta inexistente), BD y Redis healthy; detener solo lo levantado

## Cierre
Puerta de salida: modo degradado — `/code-review low` no pudo cubrir `run.bat` (el diff contra upstream era de 645KB, solo vio `.env.example` y `ci.yml`); revisión manual: 1 hallazgo propio (el filtro `LISTENING` de netstat no coincide en Windows en español) corregido con `Get-NetTCPConnection` y verificado (5438 libre → 0, 4532 ocupado → 1). QA juvinqa: APROBADO, sin bloqueantes; observaciones menores descartadas (ruta sin espacios, `.env` de ejemplo aceptable en dev). Flujo manejado: la web respondió 200 en 3012; no se hizo captura de pantalla.
