"""Configured Inference Provider Adapter for Qwen/Qwen3-4B-Instruct-2507."""

from typing import List, Dict, Optional
import httpx
from services.inference.base import InferenceProvider, ProviderStatus
from security.secrets import AppSecrets
from config.settings import MODEL_CONFIG

EXPECTED_MODEL_ID = MODEL_CONFIG.repo_id

class ConfiguredInferenceProvider(InferenceProvider):
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        provider_name: Optional[str] = None
    ):
        self.api_key = api_key or AppSecrets.ai_provider_api_key()
        self.base_url = base_url or AppSecrets.ai_provider_base_url()
        self.provider_name = provider_name or AppSecrets.ai_provider_name()

    def health_check(self) -> ProviderStatus:
        """Check provider status without incurring billing."""
        if not self.api_key:
            return ProviderStatus(
                available=False,
                message="No API key configured (running in local simulation mode).",
                model_id=EXPECTED_MODEL_ID
            )
        
        # Test endpoint connectivity
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(self.base_url, headers=headers)
                if resp.status_code == 401:
                    return ProviderStatus(available=False, message="Provider authentication failed (401 Invalid Key).", model_id=EXPECTED_MODEL_ID)
                elif resp.status_code == 429:
                    return ProviderStatus(available=False, message="Provider free quota exhausted (429 Rate Limit).", model_id=EXPECTED_MODEL_ID)
                elif resp.status_code in (200, 404, 405): # Endpoint reachable
                    return ProviderStatus(available=True, message="Provider online and reachable.", model_id=EXPECTED_MODEL_ID)
                else:
                    return ProviderStatus(available=True, message=f"Provider responded with status {resp.status_code}.", model_id=EXPECTED_MODEL_ID)
        except Exception as e:
            return ProviderStatus(available=False, message=f"Provider unreachable: {str(e)}", model_id=EXPECTED_MODEL_ID)

    def generate(
        self,
        model_id: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 220,
        temperature: float = 0.35,
        timeout: int = 45
    ) -> str:
        """
        Executes text generation using Qwen/Qwen3-4B-Instruct-2507.
        Strictly enforces invariant: model_id == 'Qwen/Qwen3-4B-Instruct-2507'.
        """
        # Invariant check (SRS Section 13.1)
        if model_id != EXPECTED_MODEL_ID:
            raise ValueError(
                f"Safety Invariant Violation: model_id must be '{EXPECTED_MODEL_ID}', got '{model_id}'."
            )

        if not self.api_key:
            raise RuntimeError("MODEL_API_KEY is not configured.")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # Format payload depending on whether base_url is an OpenAI-compatible /v1/chat endpoint or standard HF endpoint
        if "/v1/chat" in self.base_url or "openrouter" in self.base_url:
            payload = {
                "model": model_id,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
        else:
            # Hugging Face chat completion / text generation format
            # Combine system + user message
            prompt_parts = []
            for m in messages:
                role = m.get("role", "user")
                content = m.get("content", "")
                prompt_parts.append(f"<|im_start|>{role}\n{content}<|im_end|>")
            prompt_parts.append("<|im_start|>assistant\n")
            full_prompt = "\n".join(prompt_parts)

            payload = {
                "inputs": full_prompt,
                "parameters": {
                    "max_new_tokens": max_tokens,
                    "temperature": temperature,
                    "return_full_text": False
                }
            }

        # Execute with retry count of 1
        last_error = None
        for attempt in range(MODEL_CONFIG.retry_count + 1):
            try:
                with httpx.Client(timeout=float(timeout)) as client:
                    resp = client.post(self.base_url, headers=headers, json=payload)
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        # Extract response text
                        if isinstance(data, list) and len(data) > 0:
                            generated = data[0].get("generated_text", "")
                        elif isinstance(data, dict):
                            if "choices" in data:
                                generated = data["choices"][0]["message"]["content"]
                            else:
                                generated = data.get("generated_text", "")
                        else:
                            generated = str(data)

                        # Clean any leftover assistant tags
                        cleaned = generated.replace("<|im_start|>assistant", "").replace("<|im_end|>", "").strip()
                        return cleaned

                    elif resp.status_code == 429:
                        # Free-tier hard stop policy (SRS Section 13.2)
                        raise RuntimeError("AI Provider Free Quota Exhausted / Rate Limited (429). Generation stopped per policy.")
                    elif resp.status_code == 401:
                        raise RuntimeError("AI Provider Authentication Failed (401): Check MODEL_API_KEY.")
                    else:
                        raise RuntimeError(f"AI Provider error ({resp.status_code}): {resp.text}")

            except httpx.TimeoutException:
                last_error = RuntimeError(f"AI Provider request timed out after {timeout} seconds.")
            except Exception as e:
                last_error = e

        raise last_error
