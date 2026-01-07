==================================================
        API 5_products - DOCUMENTATION
==================================================

Cette API a ete generee automatiquement. Elle permet d'executer 
la fonction logique '5_products' via un serveur Django securise.

lNSTALLATION :
--------------
1. Creer un environnement virtuel : python -m venv venv
2. Activer l'environnement :
   - Windows : venv\Scripts\activate
   - Mac/Linux : source venv/bin/activate
3. Installer les dependances : pip install -r requirements.txt
4. Appliquer les migrations : python manage.py migrate
5. Lancer le serveur : python manage.py runserver

UTILISATION :
-------------
URL : http://127.0.0.1:8000/api/execute/
TOKEN : 21342eb5f5c34c20938a9a1f1565d381a8a73ce5c8634f83bc0087dafe2d0edc
HEADER : X-API-Key

--- EXEMPLE 1 : CURL ---
curl -X POST http://127.0.0.1:8000/api/execute/ \
     -H "X-API-Key: 21342eb5f5c34c20938a9a1f1565d381a8a73ce5c8634f83bc0087dafe2d0edc" \
     -H "Content-Type: application/json" \
     -d "{\"param1\": \"valeur1\"}"

--- EXEMPLE 2 : PYTHON ---
import requests
url = "http://127.0.0.1:8000/api/execute/"
headers = {"X-API-Key": "21342eb5f5c34c20938a9a1f1565d381a8a73ce5c8634f83bc0087dafe2d0edc"}
response = requests.post(url, json={"data": "test"}, headers=headers)
print(response.json())

--- EXEMPLE 3 : JAVASCRIPT (FETCH) ---
fetch("http://127.0.0.1:8000/api/execute/", {
    method: "POST",
    headers: {
        "X-API-Key": "21342eb5f5c34c20938a9a1f1565d381a8a73ce5c8634f83bc0087dafe2d0edc",
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ data: "test" })
}).then(res => res.json()).then(console.log);

--- AUTRES ENDPOINTS ---
- Health Check : GET http://127.0.0.1:8000/api/health/
- Status : GET http://127.0.0.1:8000/api/status/
