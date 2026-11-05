"""Unit tests for TokenStore encryption and persistence."""

import tempfile
from pathlib import Path
from security.token_store import TokenStore

def test_token_save_and_load():
    with tempfile.TemporaryDirectory() as tmpdir:
        token_file = Path(tmpdir) / ".credentials.enc"
        store = TokenStore(token_file=token_file)

        sample_data = {
            "access_token": "ya29.sample_test_token",
            "refresh_token": "1//04sample_refresh_token",
            "expires_in": 3600
        }

        store.save_tokens(sample_data)
        assert token_file.exists()

        # Verify decrypted content matches
        loaded = store.load_tokens()
        assert loaded == sample_data
        assert loaded["access_token"] == "ya29.sample_test_token"

        # Verify raw file is encrypted (not plain text)
        raw_bytes = token_file.read_bytes()
        assert b"ya29.sample_test_token" not in raw_bytes

        # Verify clear
        store.clear()
        assert not token_file.exists()
        assert store.load_tokens() is None
