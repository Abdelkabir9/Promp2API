
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings

class APITokenAuthentication(BaseAuthentication):
    """Authentification par token d'API"""
    
    def authenticate(self, request):
        token = request.headers.get('X-API-Key') or request.GET.get('token')
        
        if not token:
            return None
        
        if token == settings.API_TOKEN:
            return (None, None)  # Authentifié
        
        raise AuthenticationFailed('Invalid API token')
    
    def authenticate_header(self, request):
        return 'X-API-Key'
