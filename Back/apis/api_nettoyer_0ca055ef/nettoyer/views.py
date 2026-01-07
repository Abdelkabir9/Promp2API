
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
        user_code = """import re

def main(**params):
    '''
    Removes the first occurrence of a specified substring from a given text.

    Parameters:
    text (str): The initial text from which to remove an occurrence.
    occurence (str): The substring to be removed.

    Returns:
    dict: A dictionary containing the modified text under the key 'result'.
          Returns the original text if the occurrence is not found or is empty.
    '''
    text = params.get('text', '')
    occurence = params.get('occurence', '')

    if not isinstance(text, str):
        return {"error": "Input 'text' must be a string."}
    if not isinstance(occurence, str):
        return {"error": "Input 'occurence' must be a string."}

    if occurence == "":
        # If occurence is an empty string, replacing it with an empty string
        # at most once results in no change to the text.
        # Or, if we strictly interpret "remove an occurrence", an empty string
        # doesn't have a visible occurrence to remove.
        modified_text = text
    else:
        # The str.replace(old, new, count) method replaces the first 'count'
        # occurrences of 'old' with 'new'. Setting count to 1 ensures
        # only the first one is replaced.
        modified_text = text.replace(occurence, '', 1)
        
    return {"result": modified_text}"""
        
        # Exécution sécurisée
        exec_globals = {}
        exec_locals = {'params': params, 'result': None}
        exec(user_code, exec_globals, exec_locals)
        result = exec_locals.get('result')
        
        return Response({
            'success': True,
            'result': result,
            'function': 'nettoyer'
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
        'function': 'nettoyer',
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
        'service': 'nettoyer'
    })
