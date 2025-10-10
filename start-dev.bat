@echo off
echo Starting AlmacenApp development servers...

echo.
echo Starting backend server...
cd /d "c:\Users\Michael Gomez - MS4M\Documents\Proyectos React\AlmacenApp\AlmacenApp\server"
start "Backend Server" cmd /k npm run dev

echo.
echo Starting frontend server...
cd /d "c:\Users\Michael Gomez - MS4M\Documents\Proyectos React\AlmacenApp\AlmacenApp"
start "Frontend Server" cmd /k npm run dev

echo.
echo Both servers are starting in separate windows...
pause
