"""Secure persistent storage for OAuth credentials using Fernet symmetric encryption."""

import json
import os
from pathlib import Path
from typing import Optional, Dict, Any
from cryptography.fernet import Fernet
from security.secrets import AppSecrets

TOKEN_FILE_PATH = Path(".credentials.enc")
LOCAL_KEY_PATH = Path(".token_secret.key")

class TokenStore:
    """Manages encrypted persistence of OAuth tokens."""

    def __init__(self, token_file: Path = TOKEN_FILE_PATH):
        self.token_file = token_file
        self.fernet = self._init_fernet()

    def _init_fernet(self) -> Fernet:
        """Initialize or load encryption key."""
        env_key = AppSecrets.token_encryption_key()
        if env_key:
            return Fernet(env_key.encode("utf-8"))
        
        # Local key file fallback for development
        if LOCAL_KEY_PATH.exists():
            key = LOCAL_KEY_PATH.read_bytes()
        else:
            key = Fernet.generate_key()
            LOCAL_KEY_PATH.write_bytes(key)
        return Fernet(key)

    def save_tokens(self, token_data: Dict[str, Any]) -> None:
        """Encrypt and persist token dictionary."""
        raw_json = json.dumps(token_data).encode("utf-8")
        encrypted = self.fernet.encrypt(raw_json)
        self.token_file.write_bytes(encrypted)

    def load_tokens(self) -> Optional[Dict[str, Any]]:
        """Decrypt and return persisted tokens if present."""
        if not self.token_file.exists():
            return None
        try:
            encrypted = self.token_file.read_bytes()
            decrypted = self.fernet.decrypt(encrypted)
            return json.loads(decrypted.decode("utf-8"))
        except Exception:
            # Corrupted or unreadable token
            return None

    def clear(self) -> None:
        """Delete stored credentials."""
        if self.token_file.exists():
            self.token_file.unlink()
