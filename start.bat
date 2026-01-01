@echo off
echo Stopping any existing server on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F 2>nul
)

echo Waiting for port to be released...
timeout /t 2 /nobreak >nul

echo Starting TempLink server...
npm start
