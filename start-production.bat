@echo off
echo =======================================
echo   AlmacenApp - Modo Produccion
echo =======================================
echo.

REM Verificar si existe el build
if not exist "server\public\index.html" (
    echo ERROR: No se encontro el build de produccion.
    echo.
    echo Por favor ejecuta primero: build-production.bat
    echo.
    pause
    exit /b 1
)

REM Verificar .env
if not exist "server\.env" (
    echo ADVERTENCIA: No se encontro archivo .env
    echo Copiando .env.example...
    copy server\.env.example server\.env
    echo.
    echo IMPORTANTE: Edita server\.env y cambia el JWT_SECRET
    echo.
    pause
)

echo Iniciando servidor en modo produccion...
echo.
echo La aplicacion estara disponible en:
echo   http://localhost:3001
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

cd server
node src/index.js
