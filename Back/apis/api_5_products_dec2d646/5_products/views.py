
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
    import sqlalchemy
    from sqlalchemy import create_engine, text

    # Extract parameters
    db_password = params.get('db_password')
    if not db_password:
        raise ValueError("db_password is required")
    
    limit = params.get('limit', 5)

    # Connection String Construction
    db_url = "postgresql://ai_user:" + db_password + "@localhost:5432/AbdoZaki"

    try:
        # Create engine and connect
        engine = create_engine(db_url)
        
        query = text('''
            SELECT 
                p.product_name,
                p.product_code,
                SUM(f.quantity) as total_quantity,
                SUM(f.total_amount) as total_revenue
            FROM fact_sales f
            JOIN dim_product p ON f.product_id = p.product_id
            JOIN dim_date d ON f.date_id = d.date_id
            WHERE d.year = 2025
            GROUP BY p.product_id, p.product_name, p.product_code
            ORDER BY total_quantity DESC
            LIMIT :limit
        ''')

        with engine.connect() as connection:
            result = connection.execute(query, {"limit": limit})
            # Convert results to a list of dictionaries
            records = [dict(row._mapping) for row in result]
            return records

    except Exception as e:
        return {"error": str(e)}"""
        
        # Exécution sécurisée
        exec_globals = {}
        exec_locals = {'params': params, 'result': None}
        exec(user_code, exec_globals, exec_locals)
        result = exec_locals.get('result')
        
        return Response({
            'success': True,
            'result': result,
            'function': '5_products'
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
        'function': '5_products',
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
        'service': '5_products'
    })
