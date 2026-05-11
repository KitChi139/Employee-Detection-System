@echo off
TITLE Pasig Attendance System Launcher
echo ==========================================
echo    STARTING PASIG ATTENDANCE SYSTEM
echo ==========================================
echo.

:: Change directory to the application folder
cd attendance_application

:: Run the dev script which starts both React and Electron
echo Launching React and Electron...
npm run dev

echo.
echo System stopped.
pause
