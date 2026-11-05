"""Data and Log Redaction utilities for security and privacy compliance."""

import re
from typing import Any, Dict

TOKEN_PATTERNS = [
    re.compile(r'(?i)(bearer\s+)[a-zA-Z0-9_\-\.]+'),
    re.compile(r'(?i)(api[_-]?key[\s:=]+)["\']?([a-zA-Z0-9_\-\.]{8,})["\']?'),
    re.compile(r'(?i)(client[_-]?secret[\s:=]+)["\']?([a-zA-Z0-9_\-\.]{8,})["\']?'),
    re.compile(r'(?i)(refresh[_-]?token[\s:=]+)["\']?([a-zA-Z0-9_\-\.]{8,})["\']?'),
]

PII_PATTERNS = [
    re.compile(r'\b(?:\+?91[\-\s]?)?[6-9]\d{9}\b'),  # Indian phone numbers
    re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b'),  # Email addresses
]

def redact_sensitive_text(text: str) -> str:
    """Mask credentials and sensitive PII from string text."""
    if not isinstance(text, str):
        return text
        
    result = text
    for pattern in TOKEN_PATTERNS:
        result = pattern.sub(r'\1[REDACTED_CREDENTIAL]', result)
        
    for pattern in PII_PATTERNS:
        result = pattern.sub('[REDACTED_PII]', result)
        
    return result

def redact_log_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively scrub sensitive keys from log dictionaries."""
    sensitive_keys = {"token", "secret", "api_key", "password", "authorization", "code"}
    scrubbed = {}
    for k, v in data.items():
        if any(s in k.lower() for s in sensitive_keys):
            scrubbed[k] = "[REDACTED]"
        elif isinstance(v, dict):
            scrubbed[k] = redact_log_dict(v)
        elif isinstance(v, str):
            scrubbed[k] = redact_sensitive_text(v)
        else:
            scrubbed[k] = v
    return scrubbed
