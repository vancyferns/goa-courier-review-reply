"""Secrets and configuration loader reading dynamically from SQLite Database with environment fallback."""

import os
from typing import Optional
from dotenv import load_dotenv
from database.db import DatabaseService

load_dotenv()

class AppSecrets:
    @staticmethod
    def get(key: str, default: Optional[str] = None) -> Optional[str]:
        """Fetch from SQLite DB first, then fallback to environment variables."""
        db_val = DatabaseService.get_config(key.lower(), "")
        if db_val:
            return db_val
        return os.environ.get(key, default)

    @classmethod
    def google_client_id(cls) -> str:
        return cls.get("GOOGLE_CLIENT_ID", "")

    @classmethod
    def google_client_secret(cls) -> str:
        return cls.get("GOOGLE_CLIENT_SECRET", "")

    @classmethod
    def google_redirect_uri(cls) -> str:
        return cls.get("GOOGLE_REDIRECT_URI", "http://127.0.0.1:7860/oauth2callback")

    @classmethod
    def token_encryption_key(cls) -> str:
        return cls.get("TOKEN_ENCRYPTION_KEY", "")

    @classmethod
    def ai_provider_api_key(cls) -> str:
        return cls.get("MODEL_API_KEY", "")

    @classmethod
    def ai_provider_base_url(cls) -> str:
        return cls.get("MODEL_API_BASE_URL", "https://api-inference.huggingface.co/models/Qwen/Qwen3-4B-Instruct-2507")

    @classmethod
    def ai_provider_name(cls) -> str:
        return cls.get("MODEL_PROVIDER", "huggingface")

    @classmethod
    def company_facts(cls) -> dict:
        return {
            "name": cls.get("company_name", "Goa Courier Services™"),
            "email": cls.get("company_email", "inquiry@goacourierservices.com"),
            "website": cls.get("company_website", "www.goacourierservices.com"),
            "seo_phrases": [s.strip() for s in cls.get("seo_phrases", "").split(",") if s.strip()]
        }
