"""Abstract Base Class for AI Inference Provider Adapter."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Optional

@dataclass
class ProviderStatus:
    available: bool
    message: str
    model_id: str

class InferenceProvider(ABC):
    """Contract for AI model providers."""

    @abstractmethod
    def health_check(self) -> ProviderStatus:
        """Check provider connectivity, authentication, and model availability."""
        pass

    @abstractmethod
    def generate(
        self,
        model_id: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 220,
        temperature: float = 0.35,
        timeout: int = 45
    ) -> str:
        """
        Generate text response.
        Invariant: model_id must equal 'Qwen/Qwen3-4B-Instruct-2507'.
        """
        pass
