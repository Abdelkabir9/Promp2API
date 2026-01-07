==================================================
        API nettoyer - DOCUMENTATION
==================================================

Cette API a ete generee automatiquement par CodeGenie.
Elle contient tout le necessaire pour executer votre logique personnalisee.

STRUCTURE DU PROJET :
--------------------
- setup_and_run.bat : Script "One-Click" pour Windows (installe et lance l'API).
- test_api.py       : Script Python pour tester l'API instantanement.
- requirements.txt  : Liste des dependances (Django, DRF, etc.).
- nettoyer/   : Dossier contenant la logique de votre fonction.

COMMENT LANCER L'API ? :
-----------------------

METHODE RAPIDE (Windows) :
1. Double-cliquez sur le fichier 'setup_and_run.bat'.
2. Attendez la fin de l'installation. 
3. Le serveur se lancera sur http://127.0.0.1:8000.

METHODE MANUELLE (Linux/Mac/Windows) :
1. python -m venv venv
2. Activer l'environnement (source venv/bin/activate ou venv\Scripts\activate)
3. pip install -r requirements.txt
4. python manage.py migrate
5. python manage.py runserver

COMMENT TESTER L'API ? :
-----------------------
Une fois que le serveur tourne, ouvrez un nouveau terminal et lancez :
    python test_api.py

Si vous preferez utiliser d'autres outils :

--- EXEMPLE CURL ---
curl -X POST http://127.0.0.1:8000/api/execute/ \
     -H "X-API-Key: df0ce3bc26374a8194b013edab63f4a2e69bcaa8cd5647dfb9d18ecefdebaa1a" \
     -H "Content-Type: application/json" \
     -d "{\"data\": \"test\"}"

--- EXEMPLE JAVASCRIPT ---
fetch("http://127.0.0.1:8000/api/execute/", {
    method: "POST",
    headers: {
        "X-API-Key": "df0ce3bc26374a8194b013edab63f4a2e69bcaa8cd5647dfb9d18ecefdebaa1a",
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ data: "test" })
}).then(res => res.json()).then(console.log);

INFORMATIONS DE SECURITE :
-------------------------
Votre Token prive est : df0ce3bc26374a8194b013edab63f4a2e69bcaa8cd5647dfb9d18ecefdebaa1a
Ce token est requis pour tous les appels aux endpoints /execute/ et /status/.
