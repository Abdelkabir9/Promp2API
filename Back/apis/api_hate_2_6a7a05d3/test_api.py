import requests
import json

def test():
    url = "http://127.0.0.1:8000/api/execute/"
    headers = {
        "X-API-Key": "510895c01a3941ce9a5e38c1177d8e74d0406891db484d6fb8976e01226cb889",
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
