@echo off
echo [1/4] Creation de l'environnement virtuel...
python -m venv venv
echo [2/4] Installation des dependances...
call venv\Scripts\activate
pip install -r requirements.txt
echo [3/4] Preparation de la base de donnees...
python manage.py migrate
echo [4/4] Lancement du serveur sur http://127.0.0.1:8000
echo L'API est prête !
python manage.py runserver
