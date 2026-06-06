@echo off
title Tevel Tribe Engine
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is required. Install from https://nodejs.org/
  pause
  exit /b 1
)
node applet/launch.js
pause
