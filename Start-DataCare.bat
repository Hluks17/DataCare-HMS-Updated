
@echo off
title DataCare HMS Launcher

echo =================================
echo       DATACARE HMS
echo =================================
echo Starting API server...

cd /d "%~dp0api"

start "DataCare HMS API" cmd /k "npm.cmd start"

timeout /t 3 /nobreak >nul

echo Opening DataCare HMS...
start "" "%~dp0web\index.html"

echo.
echo DataCare HMS has been launched.
pause
