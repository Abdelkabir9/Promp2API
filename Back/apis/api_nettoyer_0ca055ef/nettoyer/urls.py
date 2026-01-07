
from django.urls import path
from . import views

urlpatterns = [
    path('execute/', views.execute_function, name='execute_function'),
    path('status/', views.api_status, name='api_status'),
    path('verify/', views.verify_token, name='verify_token'),
    path('health/', views.health_check, name='health_check'),
]
