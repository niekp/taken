@echo off
echo Dit script maakt de GitHub repo en pushed de code
echo.

cd /d "%~dp0divide-chores"

echo Stap 1: Git initialiseren...
git init

echo Stap 2: Bestanden toevoegen...
git add .

echo Stap 3: Commit maken...
git commit -m "First commit - Divide/Chores app"

echo Stap 4: Main branch aanmaken...
git branch -M main

echo Stap 5: Remote toevoegen...
git remote add origin https://github.com/bijanamirhojat/divide-chores.git

echo Stap 6: Pushen naar GitHub...
git push -u origin main

echo.
echo Klaar! Je app is nu op GitHub.
echo.
echo Nu moet je nog GitHub Pages activeren:
echo 1. Ga naar https://github.com/bijanamirhojat/divide-chores/settings/pages
echo 2. Select "Deploy from main branch"
echo 3. Wacht even en je app is live op: https://bijanamirhojat.github.io/divide-chores/
pause
