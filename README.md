#  Mon Projet Fullstack (Django & React)

Bienvenue dans ce projet ! Ce dépôt contient une application avec un **Backend Django** et un **Frontend React**.

A full-stack application that allows users to generate Django REST APIs dynamically through a React interface.

## Features

- **User Authentication**: JWT-based authentication with refresh tokens
- **Function Generator**: Create Python functions and expose them as APIs
- **Model Generator**: Define data models and generate complete Django models with CRUD APIs
- **API Management**: Deploy, monitor, and manage generated APIs
- **External API Integration**: Configure and use external APIs in your functions
- **Security**: Sandboxed code execution, rate limiting, audit logging

## Tech Stack

### Backend
- Django 4.2
- Django REST Framework
- PostgreSQL/Redis (with SQLite for development)
- JWT Authentication
- Celery for async tasks

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Query
- Monaco Editor

## Quick Start


##  Prérequis

Avant de commencer, assurez-vous d'avoir installé :
* [Python 3.x](https://www.python.org/downloads/)
* [Node.js & npm](https://nodejs.org/)
* [Git](https://git-scm.com/) (optionnel)

---
##  Téléchargement
1. Déplacer vers votre répertoire souhaité
2. Taper  git clone https://github.com/Abdelkabir9/Promp2API.git (si vous avez Git)

##  Installation Rapide (Automatique)

Si vous êtes sous **Windows**, vous pouvez configurer et lancer l'ensemble du projet en un seul clic grâce au script fourni.

1. Ouvrez le dossier racine du projet.
2. Double-cliquez sur le fichier `You_dont_have_time_to_read_Readme_files_just_double_click_me_hhhhh.bat`.
3. Le script va :
   * Créer l'environnement virtuel (`venv`).
   * Installer les dépendances Python.
   * Appliquer les migrations de base de données.
   * Installer les modules Node.js.
   * Lancer le serveur Backend et le serveur Frontend dans deux fenêtres séparées.

---

##  Installation Manuelle

Si vous préférez installer le projet étape par étape ou si vous n'êtes pas sous Windows :

### 1. Configuration du Backend (Django)
Ouvrez un terminal dans le dossier racine :

```bash
# Entrer dans le dossier backend
cd Back

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Sur Windows :
venv\Scripts\activate
# Sur macOS/Linux :
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Appliquer les migrations
python manage.py migrate

# Lancer le serveur
python manage.py runserver

Le backend sera disponible sur : http://127.0.0.1:8000

2. Configuration du Frontend (React)

Ouvrez un deuxième terminal dans le dossier racine :

Bash
# Entrer dans le dossier frontend
cd Front
# Installer les dépendances npm
npm install
# Lancer le serveur de développement
npm run dev

Le frontend sera généralement disponible sur : http://localhost:5173 (ou l'URL affichée dans votre terminal).

**Structure du Projet**
/Back : Code source de l'API Django, modèles de données et logique métier.

/Front : Code source de l'interface utilisateur React (Vite/TypeScript).

setup_dev.bat : Script d'automatisation pour Windows.

 ##  Remarque
J'ai laissé ma base de données Et aussi le repertoire Back/apis  pour voire mes examples
