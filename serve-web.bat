@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Down, Down, Down web server

set "PY="
where /Q python && set "PY=python"
if not defined PY (
  where /Q py && set "PY=py -3"
)
if not defined PY (
  echo.
  echo   Python 3 is needed only for this optional web-server mode.
  echo   To play, just run start_server.bat or open DownDownDown.html.
  echo.
  "%SystemRoot%\System32\ping.exe" -n 10 127.0.0.1 >nul
  exit /b 1
)

echo   Serving the multi-file version at http://localhost:8080/
echo   Open that address in any browser. Close this window to stop.
echo.
"%PY%" -u -m http.server 8080
