@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Down, Down, Down
rem launcher v3 - opens the self-contained game file, no server and no URL

set "GAME=%~dp0DownDownDown.html"
set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
set "CHROME_X86=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

if not exist "%GAME%" (
  echo.
  echo   DownDownDown.html is missing from this folder.
  echo.
  "%SystemRoot%\System32\ping.exe" -n 10 127.0.0.1 >nul
  exit /b 1
)

echo   Opening the game from:
echo   %GAME%
echo.
if exist "%CHROME%" (
  start "" "%CHROME%" "%GAME%"
  exit /b 0
)
if exist "%CHROME_X86%" (
  start "" "%CHROME_X86%" "%GAME%"
  exit /b 0
)
if exist "%EDGE%" (
  start "" "%EDGE%" "%GAME%"
  exit /b 0
)
explorer.exe "%GAME%"
exit /b 0
