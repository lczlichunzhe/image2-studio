@echo off
setlocal
cd /d "%~dp0"
start "" "http://localhost:4173"
npm start
