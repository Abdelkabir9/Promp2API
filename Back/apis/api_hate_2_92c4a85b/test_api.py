import requests
import json

def test():
    url = "http://127.0.0.1:8000/api/execute/"
    headers = {
        "X-API-Key": "e027a956d5d14088ba04552241f44bf6690ee7bb3c9b402e9d077920cf771357",
        "Content-Type": "application/json"
    }
    data = {"test_param": "hello"}
    
    print(f"Test de l'API hate_2...")
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
