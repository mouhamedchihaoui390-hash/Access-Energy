@echo off
title Access ERP Commercial
cd /d "%~dp0"

if not exist "node_modules" (
    echo Premiere installation en cours, merci de patienter...
    call npm install
)

if not exist ".env" (
    echo.
    echo ATTENTION : le fichier .env est introuvable.
    echo Copiez .env.example vers .env et renseignez vos cles Supabase avant de continuer.
    echo.
    pause
    exit /b
)

start "" http://localhost:3000
call npm run dev
pause
