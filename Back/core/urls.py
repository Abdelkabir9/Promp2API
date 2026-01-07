from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExternalAPIViewSet, CustomFunctionViewSet, execute_function, dashboard_stats

router = DefaultRouter()
router.register(r'external-apis', ExternalAPIViewSet, basename='external-api')
router.register(r'functions', CustomFunctionViewSet, basename='function')

urlpatterns = [
    path('', include(router.urls)),
    path('execute/<str:name>/', execute_function, name='execute-function'),
    path('dashboard/', dashboard_stats, name='dashboard-stats'),
]