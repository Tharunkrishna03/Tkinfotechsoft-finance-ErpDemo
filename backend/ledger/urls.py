from django.urls import path
from . import views

urlpatterns = [
    path('csrf/', views.csrf_token_view, name='csrf-token'),
    path('login/', views.login_view, name='login'),
    path('login/demo/', views.login_demo_accounts_view, name='login-demo'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
    path('settings/', views.workspace_settings_view, name='workspace-settings'),
    path('customers/', views.create_customer_view, name='create-customer'),
    path('customers/<int:pk>/', views.customer_detail_view, name='customer-detail'),
    path('market-data/', views.market_data_view, name='market-data'),
]
