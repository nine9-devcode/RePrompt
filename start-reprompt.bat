@echo off
setlocal EnableDelayedExpansion
title RePrompt Launcher

REM Always run relative to this script, not to wherever it was invoked from.
pushd "%~dp0"

echo ====================================================
echo  RePrompt
echo ====================================================
echo.

REM ---- dependency checks -------------------------------------------------
where dotnet >NUL 2>&1 || (echo [ERROR] dotnet SDK not found on PATH. Install .NET 10 SDK. & goto :fail)
where npm    >NUL 2>&1 || (echo [ERROR] npm not found on PATH. Install Node.js.          & goto :fail)
where curl   >NUL 2>&1 || (echo [ERROR] curl not found on PATH.                          & goto :fail)

if not exist "frontend\node_modules" (
    echo [SETUP] Installing frontend dependencies, this takes a minute...
    call npm install --prefix frontend || goto :fail
)

REM ---- free the ports ----------------------------------------------------
REM The trailing space in ":4200 " matters: it anchors the end of the port so
REM this does not also match 14200, 42000, or an address on another host.
call :killport 4200 Angular
call :killport 5144 "C# API"

REM ---- start the servers -------------------------------------------------
echo [START] Backend  -> http://localhost:5144
start "RePrompt API" cmd /k "cd /d "%~dp0backend\RePrompt.Api" && dotnet run"

echo [START] Frontend -> http://localhost:4200
start "RePrompt Web" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo [WAIT]  Compiling the Angular app...
set /a retries=0
:waitloop
if !retries! geq 40 (
    echo.
    echo [WARNING] The frontend did not come up in time.
    echo           Check the "RePrompt Web" window for compile errors.
    goto :finished
)
timeout /t 3 /nobreak >NUL
set /a retries=!retries!+1
curl -s -o NUL http://localhost:4200
if errorlevel 1 goto waitloop

echo [READY] Opening browser...
start "" http://localhost:4200

:finished
echo.
echo ====================================================
echo  API : http://localhost:5144   (window "RePrompt API")
echo  Web : http://localhost:4200   (window "RePrompt Web")
echo.
echo  Close BOTH server windows to stop RePrompt.
echo  Closing this launcher window alone does not stop them.
echo ====================================================
echo.
popd
pause
exit /b 0

:fail
echo.
echo Startup aborted.
popd
pause
exit /b 1

REM ---- helpers -----------------------------------------------------------
:killport
for /f "tokens=5" %%p in ('netstat -aon ^| findstr "LISTENING" ^| findstr /C:":%~1 "') do (
    echo [CLEANUP] Freeing port %~1 (%~2) - stopping PID %%p
    taskkill /F /PID %%p >NUL 2>&1
)
exit /b 0
