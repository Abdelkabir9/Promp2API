from django.db import models
from django.conf import settings
import uuid
from django.contrib.auth import get_user_model  # Ajoutez cette importation
from django.utils import timezone

# Obtenez le modèle d'utilisateur
User = get_user_model()

class ApiToken(models.Model):
    """Token d'API pour authentification"""
    TOKEN_TYPES = [
        ('function', 'Function Token'),
        ('project', 'Project Token'),
        ('api', 'API Token'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    token = models.CharField(max_length=255, unique=True)
    token_type = models.CharField(max_length=20, choices=TOKEN_TYPES, default='function')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='api_tokens')
    function = models.ForeignKey('CustomFunction', on_delete=models.CASCADE, null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_tokens')
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    expires_at = models.DateTimeField(null=True, blank=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=dict, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.token_type})"
    
    def is_expired(self):
        """Vérifie si le token a expiré"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

class ExternalAPI(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    base_url = models.URLField(blank=True, null=True) # Peut être null pour une Database
    type = models.CharField(max_length=50, default='api') # 'api' ou 'database'
    
    # Auth Config
    auth_type = models.CharField(max_length=50, default='none')
    auth_config = models.JSONField(default=dict, blank=True)
    
    # Extra Config
    default_headers = models.JSONField(default=dict, blank=True)
    default_params = models.JSONField(default=dict, blank=True)
    
    # Database Specific Config (engine, host, port...)
    config = models.JSONField(default=dict, blank=True)
    
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Stats
    request_count = models.IntegerField(default=0)
    success_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)

class CustomFunction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    language = models.CharField(max_length=50, default='python')
    code = models.TextField()
    parameters_schema = models.JSONField(default=dict) # JSON Schema
    
    is_active = models.BooleanField(default=False)
    function_type = models.CharField(max_length=50, default='script') # 'script' ou 'database_query'
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    execution_count = models.IntegerField(default=0)
    total_execution_time = models.FloatField(default=0.0) # en secondes

class ExecutionLog(models.Model):
    function = models.ForeignKey(CustomFunction, on_delete=models.CASCADE, related_name='logs', null=True)
    status = models.IntegerField()
    time_ms = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
