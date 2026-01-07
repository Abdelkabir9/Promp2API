import requests
import json

def test():
    url = "http://127.0.0.1:8000/api/execute/"
    headers = {
        "X-API-Key": "059b4e121e004b40a4860f74cf2813414dbba173f6da4de99cdcd2c76d1d7b81",
        "Content-Type": "application/json"
    }
    data = {"test_param": "hello"}
    
    print(f"Test de l'API 5_products...")
    try:
        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 200:
            print("SUCCES !")
            print("Reponse :", json.dumps(response.json(), indent=2))
        else:
            print(f"ERREUR (Code {response.status_code})")
            print(response.text)
    except Exception as e:
        print(f"Erreur de connexion : {e}")
        print("Assurez-vous que le serveur tourne (python manage.py runserver)")

if __name__ == "__main__":
    test()
