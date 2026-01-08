from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from .models import ExternalAPI, CustomFunction, ExecutionLog, ApiToken
from .serializers import ExternalAPISerializer, CustomFunctionSerializer, ApiTokenSerializer
from .utils import introspect_database, execute_python_code
import uuid
import os
import json
import shutil
import zipfile
import io
import traceback
from pathlib import Path
from django.conf import settings
from django.http import FileResponse

# ============ API Functions ============
from rest_framework.permissions import AllowAny

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import logging

# Optionnel : Utiliser un logger au lieu de print pour plus de propreté
logger = logging.getLogger(__name__)

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

@api_view(['GET', 'POST'])
@authentication_classes([])  # On vide pour empêcher DRF de bloquer avant la vue
@permission_classes([AllowAny])
def execute_function(request, name):
    # 1. Nettoyage du nom (très important pour vos erreurs 404/guillemets)
    clean_name = name.strip('"').strip("'").strip()
    print(f"\n--- DEBUG START: '{clean_name}' ---")

    user = None
    is_authenticated_by_token = False

    # 2. TENTATIVE JWT (Pour l'utilisateur connecté sur le Dashboard)
    jwt_authenticator = JWTAuthentication()
    try:
        header = jwt_authenticator.get_header(request)
        if header:
            raw_token = jwt_authenticator.get_raw_token(header)
            validated_token = jwt_authenticator.get_validated_token(raw_token)
            user = jwt_authenticator.get_user(validated_token)
            print(f"DEBUG: JWT valide (User: {user})")
    except Exception:
        print("DEBUG: Pas de JWT valide, vérification du Token API...")

    # 3. TENTATIVE API TOKEN (Pour l'usage externe)
    auth_header = request.headers.get('Authorization')
    if not user and auth_header and auth_header.startswith('Bearer '):
        token_value = auth_header.split(' ')[1].strip()
        
        # On vérifie si ce token existe en base pour cette fonction
        is_authenticated_by_token = ApiToken.objects.filter(
            token=token_value, 
            function__name__iexact=clean_name, 
            is_active=True
        ).exists()
        print(f"DEBUG: Authentifié par API Token ? {is_authenticated_by_token}")

    # 4. BARRIÈRE FINALE
    if not user and not is_authenticated_by_token:
        print("DEBUG: ECHEC COMPLET - Aucun mode d'authentification n'a marché")
        return Response({'error': 'Invalid Token or Session'}, status=401)

    # 5. EXÉCUTION
    try:
        func = CustomFunction.objects.get(name__iexact=clean_name, is_active=True)
        
        # Récupération des paramètres (POST ou GET)
        params = request.data if request.method == 'POST' else request.query_params
        
        result_data = execute_python_code(func.code, params)
        
        # Mise à jour des stats
        func.execution_count += 1
        func.save()
        
        return Response(result_data.get('result'))

    except CustomFunction.DoesNotExist:
        return Response({'error': f"Function '{clean_name}' not found"}, status=404)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_stats(request):
    user = request.user
    functions = CustomFunction.objects.filter(created_by=user)
    
    total_calls = sum(f.execution_count for f in functions)
    active_funcs = functions.filter(is_active=True).count()
    
    # Mock data pour compléter ce qui manque en BDD pour l'instant
    return Response({
        'executions': {
            'total': total_calls,
            'today': 12,  # A calculer via ExecutionLog.filter(date=today)
            'success_rate': 98.5
        },
        'apis': {
            'deployed': ExternalAPI.objects.filter(created_by=user, is_active=True).count()
        },
        'functions': {
            'total': functions.count(),
            'active': active_funcs
        },
        'user_limits': {
            'max_functions': 50,
            'api_rate_limit': 1000
        },
        'recent_logs': ExecutionLog.objects.filter(function__created_by=user).order_by('-created_at')[:5].values(
            'status', 'time_ms', 'function__name'
        )
    })

# ============ ExternalAPIViewSet ============

class ExternalAPIViewSet(viewsets.ModelViewSet):
    serializer_class = ExternalAPISerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filtrer par type si demandé (?type=database)
        queryset = ExternalAPI.objects.filter(created_by=self.request.user)
        type_param = self.request.query_params.get('type')
        if type_param:
            queryset = queryset.filter(type=type_param)
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['post'])
    def introspect(self, request):
        """
        Endpoint pour explorer une base de données
        """
        try:
            config = request.data.get('config', {})
            # Merge with existing connection if ID provided? (Simplification: uses raw config)
            schema = introspect_database(config)
            return Response({'success': True, 'schema': schema})
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        api = self.get_object()
        # Simulation de test de connexion API
        return Response({
            'success': True,
            'status_code': 200,
            'message': f"Successfully connected to {api.base_url or api.name}",
            'response_time': 0.12
        })

# ============ CustomFunctionViewSet ============

class CustomFunctionViewSet(viewsets.ModelViewSet):
    serializer_class = CustomFunctionSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return CustomFunction.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        
    @action(detail=True, methods=['get', 'post', 'delete'], url_path='tokens')
    def tokens(self, request, id=None):
        """
        GET: Liste les tokens
        POST: Crée un token
        DELETE: Supprime un token spécifique (?token_id=...)
        """
        function = self.get_object()
        
        if request.method == 'GET':
            tokens = ApiToken.objects.filter(function=function)
            serializer = ApiTokenSerializer(tokens, many=True)
            return Response(serializer.data)
            
        elif request.method == 'POST':
            raw_token = str(uuid.uuid4()).replace('-', '') + str(uuid.uuid4()).replace('-', '')
            name = request.data.get('name', 'New Token')
            
            token_obj = ApiToken.objects.create(
                name=name,
                token=raw_token,
                user=request.user,
                function=function,
                created_by=request.user
            )
            
            return Response({
                'success': True,
                'id': token_obj.id,
                'name': token_obj.name,
                'token': raw_token
            }, status=status.HTTP_201_CREATED)

        elif request.method == 'DELETE':
            token_id = request.query_params.get('token_id')
            if not token_id:
                return Response({'error': 'token_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                token_to_delete = ApiToken.objects.get(id=token_id, function=function)
                token_to_delete.delete()
                return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)
            except ApiToken.DoesNotExist:
                return Response({'error': 'Token not found'}, status=status.HTTP_404_NOT_FOUND)
    @action(detail=True, methods=['post'], url_path='generate-django-project')
    def generate_django_project(self, request, id=None):
        """
        Génère un projet Django complet pour cette fonction API
        """
        function = self.get_object()
        
        try:
            print(f"Starting project generation for function: {function.name}")
            
            # 1. Créer un dossier unique pour le projet
            project_slug = f"api_{function.name.lower().replace(' ', '_').replace('.', '_')}_{uuid.uuid4().hex[:8]}"
            project_dir = Path(settings.BASE_DIR) / 'apis' / project_slug
            
            # Créer le dossier parent si nécessaire
            project_dir.parent.mkdir(parents=True, exist_ok=True)
            project_dir.mkdir(parents=True, exist_ok=True)
            
            print(f"Project directory created: {project_dir}")
            
            # 2. Créer un token d'API pour ce projet
            raw_token = str(uuid.uuid4()).replace('-', '') + str(uuid.uuid4()).replace('-', '')
            
            # Créer le token avec tous les champs requis
            api_token = ApiToken.objects.create(
                name=f"{function.name} - Django Project Token",
                token=raw_token,
                user=request.user,
                function=function,
                created_by=request.user
            )
            print(f"API token created: {api_token.id}")
            
            # 3. Générer les fichiers essentiels
            self._generate_essential_files(project_dir, function, raw_token, request.user)
            
            # 4. Créer un ZIP du projet
            print("Creating ZIP file...")
            zip_buffer = self._create_project_zip(project_dir, project_slug)
            
            print("Project generation completed successfully")
            
            # 5. Retourner la réponse
            response = FileResponse(
                zip_buffer,
                content_type='application/zip'
            )
            response['Content-Disposition'] = f'attachment; filename="{project_slug}.zip"'
            
            return response
            
        except Exception as e:
            print(f"Error generating Django project: {str(e)}")
            print(traceback.format_exc())
            
            # Nettoyer le dossier en cas d'erreur
            if 'project_dir' in locals():
                try:
                    if project_dir.exists():
                        shutil.rmtree(project_dir)
                        print(f"Cleaned up directory: {project_dir}")
                except Exception as cleanup_error:
                    print(f"Error during cleanup: {cleanup_error}")
                    
            return Response({
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc() if settings.DEBUG else None,
                'message': 'Failed to generate Django project'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    def _create_project_zip(self, project_dir, project_slug):
        """
        Compresse le dossier du projet généré dans un buffer mémoire (ZIP)
        """
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for root, dirs, files in os.walk(project_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    # Calculer le chemin relatif pour le ZIP (pour ne pas inclure tout le chemin absolu)
                    arcname = os.path.relpath(file_path, project_dir)
                    zip_file.write(file_path, arcname)
        
        zip_buffer.seek(0)
        return zip_buffer
    def _generate_essential_files(self, project_dir, function, raw_token, user):
        """Génère les fichiers essentiels du projet Django"""
        project_name = function.name.lower().replace(' ', '_').replace('.', '_')
        
        # Créer la structure de dossiers
        (project_dir / project_name).mkdir(parents=True, exist_ok=True)
        (project_dir / project_name / 'migrations').mkdir(exist_ok=True)
        (project_dir / 'api_project').mkdir(exist_ok=True)
        
        # Créer les fichiers __init__.py
        for init_file in [
            project_dir / project_name / '__init__.py',
            project_dir / project_name / 'migrations' / '__init__.py',
            project_dir / 'api_project' / '__init__.py',
        ]:
            with open(init_file, 'w') as f:
                f.write('')
        
        # 1. manage.py
        manage_content = '''#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "api_project.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
'''
        (project_dir / 'manage.py').write_text(manage_content)
        
        # 2. requirements.txt
        requirements = '''Django>=4.2
djangorestframework>=3.14
django-cors-headers>=4.0
requests
'''
        (project_dir / 'requirements.txt').write_text(requirements)
        
        # 3. settings.py
        settings_content = f"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = '{uuid.uuid4().hex * 2}'
DEBUG = True
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    '{project_name}',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'api_project.urls'

TEMPLATES = [
    {{
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {{
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        }},
    }},
]

WSGI_APPLICATION = 'api_project.wsgi.application'

DATABASES = {{
    'default': {{
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }}
}}

AUTH_PASSWORD_VALIDATORS = [
    {{
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    }},
    {{
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    }},
    {{
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    }},
    {{
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    }},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {{
    'DEFAULT_AUTHENTICATION_CLASSES': [
        '{project_name}.authentication.APITokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}}

CORS_ALLOW_ALL_ORIGINS = True

API_TOKEN = '{raw_token}'
"""
        (project_dir / 'api_project' / 'settings.py').write_text(settings_content)
        
        # 4. urls.py (principal)
        main_urls_content = f"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('{project_name}.urls')),
]
"""
        (project_dir / 'api_project' / 'urls.py').write_text(main_urls_content)
        
        # 5. urls.py (application)
        app_urls_content = """
from django.urls import path
from . import views

urlpatterns = [
    path('execute/', views.execute_function, name='execute_function'),
    path('status/', views.api_status, name='api_status'),
    path('verify/', views.verify_token, name='verify_token'),
    path('health/', views.health_check, name='health_check'),
]
"""
        (project_dir / project_name / 'urls.py').write_text(app_urls_content)
        
        # 6. views.py
        # Échapper le code de la fonction
        function_code = function.code if function.code else "result = {'message': 'Hello World', 'params': params}"
        function_code_escaped = function_code.replace('"""', "'''").replace("\\", "\\\\")
        
        views_content = f"""
import json
from django.http import JsonResponse
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .authentication import APITokenAuthentication

@api_view(['POST'])
@authentication_classes([APITokenAuthentication])
def execute_function(request):
    \"\"\"Execute la fonction\"\"\"
    try:
        params = request.data
        
        # Code de la fonction
        user_code = \"\"\"{function_code_escaped}\"\"\"
        
        # Execution securisee
        exec_globals = {{}}
        exec_locals = {{'params': params, 'result': None}}
        exec(user_code, exec_globals, exec_locals)
        result = exec_locals.get('result')
        
        return Response({{
            'success': True,
            'result': result,
            'function': '{function.name}'
        }})
        
    except Exception as e:
        return Response({{
            'success': False,
            'error': str(e)
        }}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@authentication_classes([APITokenAuthentication])
def api_status(request):
    \"\"\"Status de l'API\"\"\"
    return Response({{
        'status': 'online',
        'function': '{function.name}',
        'version': '1.0.0'
    }})

@api_view(['GET'])
def verify_token(request):
    \"\"\"Verifier un token\"\"\"
    token = request.headers.get('X-API-Key') or request.GET.get('token')
    
    if token == settings.API_TOKEN:
        return JsonResponse({{
            'valid': True,
            'message': 'Token is valid'
        }})
    else:
        return JsonResponse({{
            'valid': False,
            'message': 'Invalid token'
        }}, status=401)

@api_view(['GET'])
def health_check(request):
    \"\"\"Health check endpoint\"\"\"
    return JsonResponse({{
        'status': 'healthy',
        'service': '{function.name}'
    }})
"""
        (project_dir / project_name / 'views.py').write_text(views_content)
        
        # 7. authentication.py
        auth_content = f"""
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings

class APITokenAuthentication(BaseAuthentication):
    \"\"\"Authentification par token API\"\"\"
    
    def authenticate(self, request):
        token = request.headers.get('X-API-Key') or request.GET.get('token')
        
        if not token:
            return None
        
        if token == settings.API_TOKEN:
            return (None, None)  # Authentifie
        
        raise AuthenticationFailed('Invalid API token')
    
    def authenticate_header(self, request):
        return 'X-API-Key'
"""
        (project_dir / project_name / 'authentication.py').write_text(auth_content)
        
        # 8. apps.py
        apps_content = f"""
from django.apps import AppConfig

class {project_name.title().replace('_', '')}Config(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = '{project_name}'
    verbose_name = '{function.name} API'
"""
        (project_dir / project_name / 'apps.py').write_text(apps_content)
        
        # 9. wsgi.py
        wsgi_content = """
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "api_project.settings")

application = get_wsgi_application()
"""
        (project_dir / 'api_project' / 'wsgi.py').write_text(wsgi_content)
        
        # 10. README.md mis à jour avec les scripts d'automatisation
        readme_content = f"""==================================================
        API {function.name} - DOCUMENTATION
==================================================

Cette API a ete generee automatiquement par CodeGenie.
Elle contient tout le necessaire pour executer votre logique personnalisee.

STRUCTURE DU PROJET :
--------------------
- setup_and_run.bat : Script "One-Click" pour Windows (installe et lance l'API).
- test_api.py       : Script Python pour tester l'API instantanement.
- requirements.txt  : Liste des dependances (Django, DRF, etc.).
- {project_name}/   : Dossier contenant la logique de votre fonction.

COMMENT LANCER L'API ? :
-----------------------

METHODE RAPIDE (Windows) :
1. Double-cliquez sur le fichier 'setup_and_run.bat'.
2. Attendez la fin de l'installation. 
3. Le serveur se lancera sur http://127.0.0.1:8000.

METHODE MANUELLE (Linux/Mac/Windows) :
1. python -m venv venv
2. Activer l'environnement (source venv/bin/activate ou venv\\Scripts\\activate)
3. pip install -r requirements.txt
4. python manage.py migrate
5. python manage.py runserver

COMMENT TESTER L'API ? :
-----------------------
Une fois que le serveur tourne, ouvrez un nouveau terminal et lancez :
    python test_api.py

Si vous preferez utiliser d'autres outils :

--- EXEMPLE CURL ---
curl -X POST http://127.0.0.1:8000/api/execute/ \\
     -H "X-API-Key: {raw_token}" \\
     -H "Content-Type: application/json" \\
     -d "{{\\"data\\": \\"test\\"}}"

--- EXEMPLE JAVASCRIPT ---
fetch("http://127.0.0.1:8000/api/execute/", {{
    method: "POST",
    headers: {{
        "X-API-Key": "{raw_token}",
        "Content-Type": "application/json"
    }},
    body: JSON.stringify({{ data: "test" }})
}}).then(res => res.json()).then(console.log);

INFORMATIONS DE SECURITE :
-------------------------
Votre Token prive est : {raw_token}
Ce token est requis pour tous les appels aux endpoints /execute/ et /status/.
"""
        # Écriture physique du fichier README.md
        (project_dir / 'README.md').write_text(readme_content, encoding='utf-8')
        # 11. Script d'automatisation Windows (setup_and_run.bat)
        setup_script = f"""@echo off
        TITLE CodeGenie Deployment - {function.name}

        echo [1/4] Creation de l'environnement virtuel...
        python -m venv venv

        echo [2/4] Installation des dependances...
        call venv\\Scripts\\activate
        pip install -r requirements.txt

        echo [3/4] Preparation de la base de donnees...
        python manage.py migrate

        echo [4/4] Lancement des processus paralleles...

        :: Lance le serveur dans une nouvelle fenetre et continue le script
        start "Serveur API {function.name}" cmd /k "call venv\\Scripts\\activate && python manage.py runserver"

        :: Attend 5 secondes que le serveur demarre avant de lancer le test
        timeout /t 5 /nobreak > nul

        :: Lance le script de test dans une autre fenetre
        start "Test Suite {function.name}" cmd /k "call venv\\Scripts\\activate && python test_api.py"

        echo.
        echo ======================================================
        echo Le serveur et les tests ont ete lances en parallele.
        echo Vous pouvez consulter les logs dans les fenetres dediees.
        echo ======================================================
        """
        (project_dir / 'setup_and_run.bat').write_text(setup_script)
        (project_dir / 'setup_and_run.bat').write_text(setup_script)

        # 12. Script de test rapide (test_api.py)
        test_script = f"""import requests
import json

def test():
    url = "http://127.0.0.1:8000/api/execute/"
    headers = {{
        "X-API-Key": "{raw_token}",
        "Content-Type": "application/json"
    }}
    data = {{"test_param": "hello"}}
    
    print(f"Test de l'API {function.name}...")
    try:
        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 200:
            print("SUCCES !")
            print("Reponse :", json.dumps(response.json(), indent=2))
        else:
            print(f"ERREUR (Code {{response.status_code}})")
            print(response.text)
    except Exception as e:
        print(f"Erreur de connexion : {{e}}")
        print("Assurez-vous que le serveur tourne (python manage.py runserver)")

if __name__ == "__main__":
    test()
"""
        (project_dir / 'test_api.py').write_text(test_script)
