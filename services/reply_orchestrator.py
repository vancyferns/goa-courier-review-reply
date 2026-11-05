"""Reply Orchestrator coordinating PromptBuilder, InferenceProvider, and OutputValidator."""

from typing import Dict, Any, Tuple, List, Optional
from config.settings import MODEL_CONFIG
from config.company_facts import SYSTEM_INSTRUCTION
from services.prompt_builder import PromptBuilder, simulate_local_draft
from services.output_validator import OutputValidator
from services.inference.configured_provider import ConfiguredInferenceProvider
from services.inference.base import InferenceProvider

class ReplyOrchestrator:
    def __init__(self, provider: Optional[InferenceProvider] = None):
        self.provider = provider or ConfiguredInferenceProvider()

    def generate_draft(self, review: Dict[str, Any]) -> Tuple[str, bool, List[str]]:
        """
        Generates a validated draft reply for the review.
        Returns: (draft_text, is_valid, list_of_warning_issues)
        """
        # Step 1: Build prompts
        system_content = SYSTEM_INSTRUCTION
        user_content = PromptBuilder.build_user_prompt(review)
        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content}
        ]

        draft = None
        # Step 2: Try inference provider if configured
        provider_status = self.provider.health_check()
        if provider_status.available:
            try:
                draft = self.provider.generate(
                    model_id=MODEL_CONFIG.repo_id,
                    messages=messages,
                    max_tokens=MODEL_CONFIG.max_output_tokens,
                    temperature=MODEL_CONFIG.temperature,
                    timeout=MODEL_CONFIG.request_timeout_seconds
                )
            except Exception:
                # Fallback to local simulation if live call encounters errors
                draft = None

        # Fallback to local simulation if no live provider
        if not draft:
            draft = simulate_local_draft(review)

        # Step 3: Validate output against corporate policy
        is_valid, issues = OutputValidator.validate(draft)

        return draft, is_valid, issues
