@echo off
cd /d "%~dp0"
start "Site server" /min python -m http.server 8765 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8765/index.html
