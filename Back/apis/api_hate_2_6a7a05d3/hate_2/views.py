
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
    """Execute la fonction"""
    try:
        params = request.data
        
        # Code de la fonction
        user_code = """def main(**params):
    import os
    import requests
    import json

    # Retrieve input parameters safely
    text_content = params.get("text", "")

    # External API Configuration
    base_url = "http://localhost:8000/api/execute/nettoyer/"
    # Retrieve API key from environment variables
    api_key = os.environ.get("NETTOYAGE_API_KEY", "42859f40575a4b6a9e52c0ca2fd73278dd60906de30d46d9ac6ca6ceb46b458f")

    # Construct Headers
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Construct Payload
    # Sending the text to the cleaning endpoint
    payload = {
        "text": text_content,
        "occurence": '2'
    }

    try:
        # Execute the HTTP Request
        response = requests.post(
            base_url, 
            headers=headers, 
            json=payload, 
            timeout=15
        )

        # Raise an exception for 4xx and 5xx status codes
        response.raise_for_status()

        # Return the JSON response from the API
        return response.json()

    except requests.exceptions.HTTPError as http_err:
        # Handle HTTP errors (4xx, 5xx)
        return {
            "status": "error",
            "type": "HTTPError",
            "code": response.status_code,
            "message": response.text
        }
    except requests.exceptions.ConnectionError:
        # Handle connection errors
        return {
            "status": "error",
            "type": "ConnectionError",
            "message": "Failed to connect to the external service."
        }
    except requests.exceptions.Timeout:
        # Handle timeouts
        return {
            "status": "error",
            "type": "Timeout",
            "message": "The request to the external service timed out."
        }
    except requests.exceptions.RequestException as err:
        # Handle other request exceptions
        return {
            "status": "error",
            "type": "RequestException",
            "message": str(err)
        }
    except json.JSONDecodeError:
        # Handle cases where response is not JSON
        return {
            "status": "success",
            "raw_response": response.text
        }"""
        
        # Execution securisee
        exec_globals = {}
        exec_locals = {'params': params, 'result': None}
        exec(user_code, exec_globals, exec_locals)
        result = exec_locals.get('result')
        
        return Response({
            'success': True,
            'result': result,
            'function': 'hate_2'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@authentication_classes([APITokenAuthentication])
def api_status(request):
    """Status de l'API"""
    return Response({
        'status': 'online',
        'function': 'hate_2',
        'version': '1.0.0'
    })

@api_view(['GET'])
def verify_token(request):
    """Verifier un token"""
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
        'service': 'hate_2'
    })
