@echo off
rem Double-click this file to start Puatc Ground and open the browser.
rem Keep the console window open while using the site; close it to stop the server.
cd /d "%~dp0"
start "open-browser" /min cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:5173"
call npm run dev