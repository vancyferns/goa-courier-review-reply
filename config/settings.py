"""Goa Courier Services™ - Application and Model Configuration."""

from dataclasses import dataclass

@dataclass(frozen=True)
class ModelConfig:
    repo_id: str = "Qwen/Qwen3-4B-Instruct-2507"
    display_name: str = "Qwen3-4B-Instruct-2507"
    temperature: float = 0.35
    top_p: float = 0.85
    max_output_tokens: int = 220
    request_timeout_seconds: int = 45
    retry_count: int = 1
    
    # Word count limits
    target_min_words: int = 35
    target_max_words: int = 75
    hard_max_words: int = 100

MODEL_CONFIG = ModelConfig()

LOCATIONS = [
    "Margao – Head Office",
    "Agassaim",
    "Porvorim",
    "Canacona"
]
