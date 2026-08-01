@echo off
setlocal
title RePrompt Launcher
cd /d "%~dp0"

echo ================================================
echo  RePrompt
echo ================================================
echo.

REM ---------- dependency checks ----------
where dotnet >NUL 2>&1
if errorlevel 1 (
    echo [ERROR] .NET SDK not found on PATH.
    echo         Install it from https://dotnet.microsoft.com/download
    goto fail
)

where npm >NUL 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js / npm not found on PATH.
    echo         Install it from https://nodejs.org/
    goto fail
)

where curl >NUL 2>&1
if errorlevel 1 (
    echo [ERROR] curl not found on PATH.
    goto fail
)

if not exist "frontend\node_modules" (
    echo [SETUP] Installing frontend dependencies. This can take a few minutes...
    call npm install --prefix frontend
    if errorlevel 1 goto fail
)

REM ---------- free the ports ----------
REM The trailing space in ":4200 " anchors the end of the port number, so this
REM does not also match 14200, 42000, or an address on another host.
REM Keep these lines free of parentheses: a literal ) would close the for block.
echo [CLEAN] Releasing ports 4200 and 5144 if anything is still listening...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr "LISTENING" ^| findstr /C:":4200 "') do taskkill /F /PID %%p >NUL 2>&1
for /f "tokens=5" %%p in ('netstat -aon ^| findstr "LISTENING" ^| findstr /C:":5144 "') do taskkill /F /PID %%p >NUL 2>&1

REM ---------- start the servers ----------
REM /D sets each new window's working directory. Doing it this way avoids
REM nesting quotes inside the cmd /k argument, which silently breaks the command.
echo [START] Backend   http://localhost:5144
start "RePrompt API" /D "%~dp0backend\RePrompt.Api" cmd /k dotnet run

echo [START] Frontend  http://localhost:4200
start "RePrompt Web" /D "%~dp0frontend" cmd /k npm start

echo.
echo [WAIT]  Waiting for the Angular app to finish compiling...

set retries=0

:waitloop
timeout /t 3 /nobreak >NUL
set /a retries+=1
curl -s -o NUL http://localhost:4200
if not errorlevel 1 goto ready
if %retries% geq 60 goto timedout
goto waitloop

:ready
echo [READY] Opening the browser...
start "" http://localhost:4200
goto done

:timedout
echo.
echo [WARNING] The frontend did not respond in time.
echo           Check the "RePrompt Web" window for build errors.

:done
echo.
echo ================================================
echo  API : http://localhost:5144
echo  Web : http://localhost:4200
echo.
echo  Two server windows were opened.
echo  Close BOTH of them to stop RePrompt.
echo  Closing this launcher window alone does not stop them.
echo ================================================
echo.
pause
exit /b 0

:fail
echo.
echo Startup aborted.
pause
exit /b 1
