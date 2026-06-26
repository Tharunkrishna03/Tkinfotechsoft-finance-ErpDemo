import os
from pathlib import Path

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, True))
env_file = BASE_DIR / ".env"
if env_file.exists():
    environ.Env.read_env(env_file)

DEBUG = env.bool("DEBUG", default=True)

SECRET_KEY = env(
    "SECRET_KEY",
    default="django-insecure-local-dev-only-change-me" if DEBUG else None,
)
if not SECRET_KEY:
    raise ImproperlyConfigured("SECRET_KEY must be set when DEBUG=False.")

ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=["localhost", "127.0.0.1"] if DEBUG else [],
)
if not DEBUG and not ALLOWED_HOSTS:
    raise ImproperlyConfigured("ALLOWED_HOSTS must be set when DEBUG=False.")

DATABASE_ENGINE = env("DATABASE_ENGINE", default="sqlite").lower()
SQLITE_DATABASE_PATH = Path(env("SQLITE_DATABASE_PATH", default=str(BASE_DIR / "db.sqlite3")))
if not SQLITE_DATABASE_PATH.is_absolute():
    SQLITE_DATABASE_PATH = BASE_DIR / SQLITE_DATABASE_PATH

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'ledger',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'jewel_finance.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'jewel_finance.wsgi.application'

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(SQLITE_DATABASE_PATH),
        "OPTIONS": {
            "timeout": 20,
        },
    }
}
LEDGER_DATABASE_ALIAS = "default"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

if DATABASE_ENGINE == "mongodb":
    MONGODB_URI = env("MONGODB_URI", default="")
    if not MONGODB_URI:
        raise ImproperlyConfigured("MONGODB_URI must be set when DATABASE_ENGINE=mongodb.")
    DATABASES["mongodb"] = {
        "ENGINE": "django_mongodb_backend",
        "NAME": env("MONGODB_NAME", default="jewel_finance"),
        "HOST": MONGODB_URI,
        "OPTIONS": {
            "serverSelectionTimeoutMS": env.int(
                "MONGODB_SERVER_SELECTION_TIMEOUT_MS",
                default=10000,
            ),
        },
    }
    LEDGER_DATABASE_ALIAS = "mongodb"
    DATABASE_ROUTERS = ["jewel_finance.db_routers.LedgerDatabaseRouter"]

AUTH_PASSWORD_VALIDATORS = [] # Simplified for dev

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=DEBUG)
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:3000", "http://127.0.0.1:3000"],
)
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=["http://localhost:3000", "http://127.0.0.1:3000"],
)
CSRF_COOKIE_NAME = "jewel_finance_csrf"
CSRF_HEADER_NAME = "HTTP_X_CSRFTOKEN"
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=not DEBUG)
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=not DEBUG)
CSRF_COOKIE_SAMESITE = env("CSRF_COOKIE_SAMESITE", default="None" if not DEBUG else "Lax")
SESSION_COOKIE_SAMESITE = env("SESSION_COOKIE_SAMESITE", default="None" if not DEBUG else "Lax")
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
