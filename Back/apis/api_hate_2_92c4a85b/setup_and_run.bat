@echo off
        TITLE CodeGenie Deployment - hate_2

        echo [1/4] Creation de l'environnement virtuel...
        python -m venv venv

        echo [2/4] Installation des dependances...
        call venv\Scripts\activate
        pip install -r requirements.txt

        echo [3/4] Preparation de la base de donnees...
        python manage.py migrate

        echo [4/4] Lancement des processus paralleles...

        :: Lance le serveur dans une nouvelle fenetre et continue le script
        start "Serveur API hate_2" cmd /k "call venv\Scripts\activate && python manage.py runserver"

        :: Attend 5 secondes que le serveur demarre avant de lancer le test
        timeout /t 5 /nobreak > nul

        :: Lance le script de test dans une autre fenetre
        start "Test Suite hate_2" cmd /k "call venv\Scripts\activate && python test_api.py"

        echo.
        echo ======================================================
        echo Le serveur et les tests ont ete lances en parallele.
        echo Vous pouvez consulter les logs dans les fenetres dediees.
        echo ======================================================
        