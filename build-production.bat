@echo off
echo =======================================
echo   AlmacenApp - Build de Produccion
echo =======================================
echo.

REM Verificar si Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Construyendo Frontend...
echo.
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Fallo la construccion del frontend.
    pause
    exit /b 1
)

echo.
echo [2/4] Copiando archivos a server/public...
echo.
if exist server\public rmdir /s /q server\public
xcopy /E /I /Y dist server\public
if %errorlevel% neq 0 (
    echo ERROR: Fallo la copia de archivos.
    pause
    exit /b 1
)

echo.
echo [3/4] Instalando dependencias del servidor...
echo.
cd server
call npm install --production
if %errorlevel% neq 0 (
    echo ERROR: Fallo la instalacion de dependencias.
    pause
    exit /b 1
)
cd ..

echo.
echo [4/4] Verificando configuracion...
echo.

REM Verificar si existe .env
if not exist server\.env (
    echo ADVERTENCIA: No se encontro archivo .env en server/
    echo Se recomienda crear uno con:
    echo   PORT=3001
    echo   JWT_SECRET=tu_secreto_seguro_aqui
    echo   NODE_ENV=production
    echo.
)

echo.
echo =======================================
echo   Build completado exitosamente!
echo =======================================
echo.
echo Para iniciar la aplicacion en produccion:
echo   1. cd server
echo   2. node src/index.js
echo.
echo O con PM2 (recomendado):
echo   1. npm install -g pm2
echo   2. cd server
echo   3. pm2 start src/index.js --name almacen-api
echo.
echo La aplicacion estara disponible en:
echo   http://localhost:3001
echo.
pause
