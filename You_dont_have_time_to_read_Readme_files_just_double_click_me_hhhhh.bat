@echo off
echo ==========================================
echo CONFIGURATION DE L'ENVIRONNEMENT DE TRAVAIL
echo ==========================================

:: --- PARTIE BACKEND ---
echo.
echo [1/2] Configuration du Backend...
cd Back

:: Création de l'environnement virtuel s'il n'existe pas
if not exist venv (
    echo Creation de l'environnement virtuel...
    python -m venv venv
)

:: Activation de l'environnement et installations
echo Activation de venv et installation des dependances...
call venv\Scripts\activate
pip install -r requirements.txt

:: Migrations et lancement
echo Execution des migrations...
python manage.py migrate
echo Lancement du serveur Django dans une nouvelle fenetre...
start cmd /k "call venv\Scripts\activate && python manage.py runserver"

:: --- PARTIE FRONTEND ---
echo.
echo [2/2] Configuration du Frontend...
cd ../Front

echo Installation des modules Node (npm install)...
call npm install

echo Lancement du serveur de developpement (npm run dev)...
start cmd /k "npm run dev"

echo.
echo ==========================================
echo TOUT EST PRET !
echo Backend: http://127.0.0.1:8000
echo Frontend: Verifiez le terminal npm
echo ==========================================
pause