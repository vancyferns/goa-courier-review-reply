"""Output Validator for AI generated review replies."""

import re
from typing import Tuple, List
from config.settings import MODEL_CONFIG

FORBIDDEN_PROMISES = [
    r'\brefund\b',
    r'\bcompensation\b',
    r'\bfree shipping\b',
    r'\bfree courier\b',
    r'\bwe admit fault\b',
    r'\bour liability\b',
    r'\bguarantee a full refund\b',
]

FORBIDDEN_CLAIMS = [
    r'\bfrozen seafood\b',
    r'\bfresh seafood\b',
    r'\bfish export\b',
]

LEAKAGE_PATTERNS = [
    r'<\|im_start\|>',
    r'<\|im_end\|>',
    r'<think>',
    r'</think>',
    r'\[insert\s+[^\]]+\]',
    r'\[reviewer\s+name\]',
    r'\[your\s+name\]',
    r'as an ai\b',
    r'system\s+prompt',
]

class OutputValidator:
    @staticmethod
    def validate(text: str) -> Tuple[bool, List[str]]:
        """
        Validate generated reply text against corporate guidelines.
        Returns (is_valid, list_of_warning_messages).
        """
        issues = []
        if not text or not text.strip():
            return False, ["Reply is empty."]
            
        words = text.strip().split()
        word_count = len(words)
        
        # Word limits
        if word_count > MODEL_CONFIG.hard_max_words:
            issues.append(f"Length violation: Reply has {word_count} words (Hard limit: {MODEL_CONFIG.hard_max_words}).")
        elif word_count < MODEL_CONFIG.target_min_words:
            issues.append(f"Length notice: Reply has {word_count} words (Target: {MODEL_CONFIG.target_min_words}-{MODEL_CONFIG.target_max_words}).")
            
        # Check prompt leakage and placeholder markers
        text_lower = text.lower()
        for pattern in LEAKAGE_PATTERNS:
            if re.search(pattern, text_lower):
                issues.append(f"Prompt leakage or template placeholder detected matching '{pattern}'.")
                
        # Check forbidden promises
        for pattern in FORBIDDEN_PROMISES:
            if re.search(pattern, text_lower):
                issues.append(f"Policy violation: Unsupported promise or legal admission found ('{pattern}').")
                
        # Check forbidden seafood claims
        for pattern in FORBIDDEN_CLAIMS:
            if re.search(pattern, text_lower):
                issues.append("Policy violation: International fresh/frozen seafood shipment is not permitted.")
                
        is_valid = not any("violation" in iss.lower() or "leakage" in iss.lower() or "limit" in iss.lower() for iss in issues)
        return is_valid, issues

    @staticmethod
    def get_stats(text: str) -> dict:
        """Returns word and character count stats."""
        trimmed = text.strip() if text else ""
        words = trimmed.split() if trimmed else []
        return {
            "word_count": len(words),
            "char_count": len(trimmed),
            "in_target_range": MODEL_CONFIG.target_min_words <= len(words) <= MODEL_CONFIG.target_max_words,
            "exceeds_hard_limit": len(words) > MODEL_CONFIG.hard_max_words
        }
