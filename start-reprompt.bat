@echo off
title RePrompt Server

echo Checking for existing processes on ports 4200 and 5144...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4200" ^| findstr "LISTENING"') do (
    echo [CLEANUP] Killing ghost process PID %%a on port 4200 [Angular]...
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5144" ^| findstr "LISTENING"') do (
    echo [CLEANUP] Killing ghost process PID %%a on port 5144 [C# API]...
    taskkill /F /PID %%a >nul 2>&1
)

echo Starting Backend (.NET API)...
cd backend\RePrompt.Api
start /B "" dotnet run
cd ..\..

echo Starting Frontend (Angular)...
cd frontend
start /B "" npm.cmd start
cd ..

echo Waiting for Angular to finish compiling...
set /a retrycount=0

:waitloop
if %retrycount% geq 30 (
    echo.
    echo [WARNING] Angular is taking too long to compile or build failed.
    echo Please check the output logs above for any compile-time errors.
    goto finished
)
timeout /t 3 /nobreak > NUL
set /a retrycount=%retrycount%+1
curl -s http://localhost:4200 > NUL
if %errorlevel% neq 0 goto waitloop

echo Frontend is ready! Opening Web Browser...
start http://localhost:4200

:finished
echo.
echo ====================================================
echo All services are running in this window.
echo To stop the servers, simply close this window.
echo ====================================================
echo.
pause