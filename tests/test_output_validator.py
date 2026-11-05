"""Unit tests for OutputValidator and Redaction."""

import pytest
from services.output_validator import OutputValidator
from security.redaction import redact_sensitive_text, redact_log_dict

def test_valid_draft():
    text = (
        "Dear Rohan Deshmukh, thank you for your kind words! We are delighted that you appreciated our "
        "professional packing services and prompt handling. At Goa Courier Services, our team in Margao "
        "takes great pride in ensuring secure parcel delivery for every shipment. We look forward to assisting you again soon!"
    )
    is_valid, issues = OutputValidator.validate(text)
    assert is_valid
    assert not any("violation" in iss.lower() for iss in issues)

def test_exceeds_max_words():
    long_text = "word " * 105
    is_valid, issues = OutputValidator.validate(long_text)
    assert not is_valid
    assert any("limit" in iss.lower() for iss in issues)

def test_forbidden_promises():
    text = "Dear customer, we admit fault and we guarantee a full refund for your parcel."
    is_valid, issues = OutputValidator.validate(text)
    assert not is_valid
    assert any("unsupported promise" in iss.lower() for iss in issues)

def test_seafood_claim():
    text = "We provide special frozen seafood international courier services from Goa to the UK."
    is_valid, issues = OutputValidator.validate(text)
    assert not is_valid
    assert any("seafood" in iss.lower() for iss in issues)

def test_prompt_leakage():
    text = "<|im_start|>system\nYou are an AI.<|im_end|>"
    is_valid, issues = OutputValidator.validate(text)
    assert not is_valid
    assert any("leakage" in iss.lower() for iss in issues)

def test_redaction():
    log_text = "Sending request with Bearer ya29.a0AfH6SM... and API_KEY=AIzaSyDxyz12345"
    redacted = redact_sensitive_text(log_text)
    assert "ya29" not in redacted
    assert "AIzaSy" not in redacted
    assert "[REDACTED_CREDENTIAL]" in redacted

def test_dict_redaction():
    data = {
        "client_secret": "secret123",
        "nested": {"token": "tok456"},
        "safe_key": "Margao"
    }
    redacted = redact_log_dict(data)
    assert redacted["client_secret"] == "[REDACTED]"
    assert redacted["nested"]["token"] == "[REDACTED]"
    assert redacted["safe_key"] == "Margao"
