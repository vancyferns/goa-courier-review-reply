"""Google OAuth 2.0 Client and Token Lifecycle Manager."""

import time
import secrets
from typing import Optional, Dict, Any, Tuple
import httpx
from security.secrets import AppSecrets
from security.token_store import TokenStore

AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
REQUIRED_SCOPE = "https://www.googleapis.com/auth/business.manage"

class GoogleOAuthService:
    def __init__(self, token_store: Optional[TokenStore] = None):
        self.token_store = token_store or TokenStore()

    def generate_authorization_url(self) -> Tuple[str, str]:
        """
        Generate OAuth authorization URL with a secure random state parameter to prevent CSRF.
        Returns (authorization_url, state).
        """
        client_id = AppSecrets.google_client_id()
        redirect_uri = AppSecrets.google_redirect_uri()
        if not client_id:
            raise ValueError("GOOGLE_CLIENT_ID is not configured in secrets/environment.")

        state = secrets.token_urlsafe(32)
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": REQUIRED_SCOPE,
            "access_type": "offline",
            "prompt": "consent",
            "state": state
        }
        query_string = "&".join(f"{k}={httpx.URL('', params={k: v}).query.decode('utf-8')}" for k, v in params.items())
        return f"{AUTH_ENDPOINT}?{query_string}", state

    def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens."""
        client_id = AppSecrets.google_client_id()
        client_secret = AppSecrets.google_client_secret()
        redirect_uri = AppSecrets.google_redirect_uri()

        if not client_id or not client_secret:
            raise ValueError("OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) missing.")

        payload = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }

        with httpx.Client(timeout=15.0) as client:
            response = client.post(TOKEN_ENDPOINT, data=payload)
            if response.status_code != 200:
                raise RuntimeError(f"Token exchange failed: {response.text}")
            data = response.json()

        # Add expiry timestamp
        expires_in = data.get("expires_in", 3600)
        data["expires_at"] = time.time() + expires_in

        # Preserve existing refresh token if not returned on refresh
        existing = self.token_store.load_tokens()
        if not data.get("refresh_token") and existing and existing.get("refresh_token"):
            data["refresh_token"] = existing["refresh_token"]

        self.token_store.save_tokens(data)
        return data

    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh expired access token using the stored refresh token."""
        client_id = AppSecrets.google_client_id()
        client_secret = AppSecrets.google_client_secret()

        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }

        with httpx.Client(timeout=15.0) as client:
            response = client.post(TOKEN_ENDPOINT, data=payload)
            if response.status_code != 200:
                raise RuntimeError(f"Token refresh failed: {response.text}")
            data = response.json()

        data["refresh_token"] = refresh_token
        data["expires_at"] = time.time() + data.get("expires_in", 3600)
        self.token_store.save_tokens(data)
        return data

    def get_valid_access_token(self) -> Optional[str]:
        """Retrieve valid access token, auto-refreshing if expired."""
        tokens = self.token_store.load_tokens()
        if not tokens or "access_token" not in tokens:
            return None

        # Check if expired (or within 60-second window)
        expires_at = tokens.get("expires_at", 0)
        if time.time() >= (expires_at - 60):
            refresh_tok = tokens.get("refresh_token")
            if not refresh_tok:
                return None
            tokens = self.refresh_access_token(refresh_tok)

        return tokens.get("access_token")

    def is_connected(self) -> bool:
        """Check if an active token or refresh token is available."""
        return self.get_valid_access_token() is not None
