from rest_framework import serializers
from .models import ExternalAPI, CustomFunction, ApiToken

class ExternalAPISerializer(serializers.ModelSerializer):
    class Meta:
        model = ExternalAPI
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at', 'request_count', 'success_count', 'error_count')

class CustomFunctionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomFunction
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at', 'execution_count', 'total_execution_time')

class ApiTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiToken
        fields = '__all__'
        read_only_fields = ('token', 'created_by', 'created_at')