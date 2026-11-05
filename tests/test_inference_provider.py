"""Unit tests for ConfiguredInferenceProvider invariants and behaviors."""

import pytest
from services.inference.configured_provider import ConfiguredInferenceProvider

def test_invariant_model_id_enforcement():
    provider = ConfiguredInferenceProvider(api_key="mock_key")
    # Passing any model other than Qwen/Qwen3-4B-Instruct-2507 must fail per SRS Section 13.1
    with pytest.raises(ValueError, match="Safety Invariant Violation"):
        provider.generate(
            model_id="gpt-4o",
            messages=[{"role": "user", "content": "hi"}]
        )

def test_missing_api_key_health_check():
    provider = ConfiguredInferenceProvider(api_key="")
    status = provider.health_check()
    assert not status.available
    assert "No API key configured" in status.message
