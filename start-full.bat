@echo off
echo ================================================
echo        ALMACENAPP - SERVIDOR DE DESARROLLO
echo ================================================
echo.

echo Instalando dependencias del backend...
cd /d "c:\Users\Michael Gomez - MS4M\Documents\Proyectos React\AlmacenApp\AlmacenApp\server"
call npm install
if %errorlevel% neq 0 (
    echo Error al instalar dependencias del backend
    pause
    exit /b 1
)

echo.
echo Instalando dependencias del frontend...
cd /d "c:\Users\Michael Gomez - MS4M\Documents\Proyectos React\AlmacenApp\AlmacenApp"
call npm install
if %errorlevel% neq 0 (
    echo Error al instalar dependencias del frontend
    pause
    exit /b 1
)

echo.
echo ================================================
echo    INICIANDO SERVIDORES EN VENTANAS SEPARADAS
echo ================================================
echo.
echo Backend: http://localhost:3001/api
echo Frontend: http://localhost:5173
echo.
echo Usuario admin: admin@demo.com / admin123
echo.

echo Iniciando servidor backend...
cd /d "c:\Users\Michael Gomez - MS4M\Documents\Proyectos React\AlmacenApp\AlmacenApp\server"
start "AlmacenApp Backend (Puerto 3001)" cmd /k "npm run dev"

timeout /t 3 >nul

echo Iniciando servidor frontend...
cd /d "c:\Users\Michael Gomez - MS4M\Documents\Proyectos React\AlmacenApp\AlmacenApp"
start "AlmacenApp Frontend (Puerto 5173)" cmd /k "npm run dev"

echo.
echo ================================================
echo ¡Ambos servidores están iniciando!
echo ================================================
echo.
echo Espera unos segundos y luego abre:
echo http://localhost:5173
echo.
pause
