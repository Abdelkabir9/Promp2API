
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
    """Exécute la fonction"""
    try:
        params = request.data
        
        # Code de la fonction
        user_code = """def main(**params):
    try:
        # Retrieve input parameters safely
        principal = params.get("principal")
        rate = params.get("rate")

        # Validate required parameters exist
        if principal is None or rate is None:
            return {
                "error": "Missing required parameters: 'principal' and 'rate' are required."
            }

        # Validate parameter types
        if not isinstance(principal, (int, float)) or not isinstance(rate, (int, float)):
            return {
                "error": "Invalid parameter type: 'principal' and 'rate' must be numbers."
            }

        # Task: somme of tow variable (Sum of two variables)
        result = principal + rate

        # Return JSON-serializable dictionary
        return {
            "result": result,
            "principal": principal,
            "rate": rate
        }

    except Exception as e:
        return {
            "error": str(e)
        }"""
        
        # Exécution sécurisée
        exec_globals = {}
        exec_locals = {'params': params, 'result': None}
        exec(user_code, exec_globals, exec_locals)
        result = exec_locals.get('result')
        
        return Response({
            'success': True,
            'result': result,
            'function': 'somme'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@authentication_classes([APITokenAuthentication])
def api_status(request):
    """Statut de l'API"""
    return Response({
        'status': 'online',
        'function': 'somme',
        'version': '1.0.0'
    })

@api_view(['GET'])
def verify_token(request):
    """Vérifier un token"""
    token = request.headers.get('X-API-Key') or request.GET.get('token')
    
    if token == settings.API_TOKEN:
        return JsonResponse({
            'valid': True,
            'message': 'Token is valid'
        })
    else:
        return JsonResponse({
            'valid': False,
            'message': 'Invalid token'
        }, status=401)

@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return JsonResponse({
        'status': 'healthy',
        'service': 'somme'
    })
