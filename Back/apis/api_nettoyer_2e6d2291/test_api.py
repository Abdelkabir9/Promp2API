import requests
import json

def test():
    url = "http://127.0.0.1:8000/api/execute/"
    headers = {
        "X-API-Key": "441cb5fcc9264317b54cc7bdb7a3dad189697b145b9a4a77b679a0686ea21a23",
        "Content-Type": "application/json"
    }
    data = {"test_param": "hello"}
    
    print(f"Test de l'API nettoyer...")
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
