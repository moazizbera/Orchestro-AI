"""Model provider supporting Gemini and Ollama-backed inference."""

import json
import logging
import re
from enum import Enum
from typing import Optional

import httpx
from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types

logger = logging.getLogger(__name__)


class ModelProviderError(RuntimeError):
    def __init__(self, message: str, status_code: int = 503) -> None:
        super().__init__(message)
        self.status_code = status_code


# ─────────────────────────────────────────────────────────────
# Provider enum
# ─────────────────────────────────────────────────────────────

class Provider(str, Enum):
    GEMINI = "gemini"
    OLLAMA = "ollama"


# ─────────────────────────────────────────────────────────────
# JSON extraction helper
# ─────────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict:
    """Robustly parse JSON from any LLM response."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```\s*$", "", text)
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end   = text.rfind("}") + 1
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

    raise ValueError(f"No valid JSON found in: {text[:300]}")


# ─────────────────────────────────────────────────────────────
# ModelProvider
# ─────────────────────────────────────────────────────────────

class ModelProvider:
    GEMINI_MODEL = "gemini-2.0-flash"

    def __init__(
        self,
        gemini_key: str = "",
        gemini_model: str = "gemini-2.0-flash",
        gemini_backend: str = "developer",
        ollama_api_key: str = "",
        ollama_base_url: str = "https://ollama.com",
        ollama_model: str = "",
        preferred_provider: str = "",
        google_cloud_project: str = "",
        google_cloud_location: str = "us-central1",
        ai_mode: str = "gemini",
        ai_request_timeout_seconds: int = 45,
        ai_max_output_tokens: int = 1200,
        ai_retry_attempts: int = 1,
        **_: object,
    ) -> None:
        self._gemini_key = gemini_key
        self.GEMINI_MODEL = gemini_model or self.GEMINI_MODEL
        self._ollama_key = ollama_api_key
        self._ollama_base_url = (ollama_base_url or "https://ollama.com").rstrip("/")
        self._ollama_model = ollama_model or "ministral-3:14b"
        self._ai_mode = (ai_mode or "gemini").lower()
        self._backend = (gemini_backend or "developer").lower()
        self._project = google_cloud_project
        self._location = google_cloud_location or "us-central1"
        self._request_timeout_seconds = max(int(ai_request_timeout_seconds or 45), 5)
        self._max_output_tokens = max(int(ai_max_output_tokens or 1200), 256)
        self._retry_attempts = max(int(ai_retry_attempts or 1), 1)
        self._preferred = self._resolve_preferred(preferred_provider)
        self._gemini_client = self._build_gemini_client()
        self._available = self._build_available()

        logger.info(
            "ModelProvider ready | ai_mode=%s | backend=%s | available=%s | preferred=%s",
            self._ai_mode,
            self._backend,
            [p.value for p in self._available],
            self._preferred.value,
        )

    # ── Public API ──────────────────────────────────────────────────────────

    async def generate_json(
        self,
        prompt: str,
        system_prompt: str = "",
        preferred: Optional[str] = None,
    ) -> tuple[dict, str]:
        chain = self._build_chain(preferred)

        if not chain:
            detail = "No AI provider is configured. Set OLLAMA_MODEL with OLLAMA_BASE_URL=http://localhost:11434 for local Ollama, or configure Gemini/Vertex credentials."
            raise ModelProviderError(detail, status_code=503)

        last_exc: Exception | None = None
        last_provider: Provider | None = None

        for prov in chain:
            attempts = self._retry_attempts if prov == Provider.OLLAMA else 1
            for attempt in range(attempts):
                try:
                    retry_suffix = (
                        "\n\nReturn ONLY valid JSON. Do not wrap it in markdown or add commentary."
                        if prov == Provider.OLLAMA and attempt > 0
                        else ""
                    )
                    raw = await self._dispatch(prov, prompt, system_prompt + retry_suffix)
                    parsed = _extract_json(raw)
                    logger.info("generate_json: provider=%s succeeded", prov.value)
                    return parsed, prov.value
                except Exception as exc:
                    last_exc = exc
                    last_provider = prov
                    if prov == Provider.OLLAMA and attempt + 1 < attempts:
                        logger.warning(
                            "generate_json: provider=%s failed JSON attempt %d (%s: %s) — retrying same provider",
                            prov.value,
                            attempt + 1,
                            type(exc).__name__,
                            str(exc)[:120],
                        )
                        continue
                    logger.warning(
                        "generate_json: provider=%s failed (%s: %s) — trying next",
                        prov.value, type(exc).__name__, str(exc)[:120],
                    )
                    break

        if self._is_quota_error(last_exc):
            provider_name = last_provider.value if last_provider else "current"
            if last_provider == Provider.OLLAMA:
                message = "Ollama is rate-limited or rejected this request. Check the configured Ollama account or switch to a local Ollama server, then retry."
            elif last_provider == Provider.GEMINI:
                message = "Gemini quota exceeded. Update billing or use a Gemini key with available quota, then retry."
            else:
                message = f"The {provider_name} provider is rate-limited or out of quota. Check the configured account, then retry."
            raise ModelProviderError(
                message,
                status_code=429,
            ) from last_exc

        raise ModelProviderError(
            "AI generation failed. Check the configured provider credentials, model name, and network connectivity, then retry.",
            status_code=503,
        ) from last_exc

    @property
    def available_providers(self) -> list[str]:
        return [p.value for p in self._available]

    @property
    def preferred_provider(self) -> str:
        return self._preferred.value

    @property
    def ai_mode(self) -> str:
        return self._ai_mode

    @property
    def configured_model(self) -> str:
        if self._preferred == Provider.OLLAMA and self._ollama_available():
            return self._ollama_model
        if self._gemini_client is not None:
            return self.GEMINI_MODEL
        if self._ollama_available():
            return self._ollama_model
        return self.GEMINI_MODEL

    @property
    def is_offline(self) -> bool:
        return False

    @staticmethod
    def confidence_label(provider: str) -> str:
        if provider == "fallback":
            return "Fallback"
        return "Ollama" if provider == Provider.OLLAMA.value else "Gemini"

    # ── Internals ───────────────────────────────────────────────────────────

    @staticmethod
    def _valid(key: str) -> bool:
        return bool(key and len(key) > 8 and not key.startswith("your_"))

    def _resolve_preferred(self, preferred_provider: str) -> Provider:
        raw = (preferred_provider or "").strip().lower()
        if raw == Provider.OLLAMA.value:
            return Provider.OLLAMA
        return Provider.GEMINI

    def _build_available(self) -> list[Provider]:
        available: list[Provider] = []
        if self._ollama_available():
            available.append(Provider.OLLAMA)
        if self._gemini_client is not None:
            available.append(Provider.GEMINI)
        return available

    def _ollama_available(self) -> bool:
        if not self._ollama_model:
            return False
        if self._ollama_requires_key():
            return self._valid(self._ollama_key)
        return True

    def _ollama_requires_key(self) -> bool:
        return "ollama.com" in self._ollama_base_url.lower()

    def _ollama_chat_url(self) -> str:
        if self._ollama_base_url.endswith("/api/chat"):
            return self._ollama_base_url
        return f"{self._ollama_base_url}/api/chat"

    def _build_gemini_client(self):
        if self._backend == "vertex":
            if not self._project:
                return None
            return genai.Client(
                vertexai=True,
                project=self._project,
                location=self._location,
                http_options=genai_types.HttpOptions(api_version="v1"),
            )

        if not self._valid(self._gemini_key):
            return None

        return genai.Client(
            api_key=self._gemini_key,
            http_options=genai_types.HttpOptions(api_version="v1alpha"),
        )

    @staticmethod
    def _is_quota_error(exc: Exception | None) -> bool:
        if exc is None:
            return False
        message = f"{type(exc).__name__}: {exc}".lower()
        return "resourceexhausted" in message or "quota" in message or "429" in message

    def _build_chain(self, requested: Optional[str]) -> list[Provider]:
        order: list[Provider] = []
        requested_name = (requested or "").strip().lower()
        if requested_name == Provider.OLLAMA.value:
            return [Provider.OLLAMA] if Provider.OLLAMA in self._available else []
        elif requested_name == Provider.GEMINI.value:
            return [Provider.GEMINI] if Provider.GEMINI in self._available else []
        else:
            order.append(self._preferred)

        for provider in (Provider.OLLAMA, Provider.GEMINI):
            if provider not in order:
                order.append(provider)

        return [provider for provider in order if provider in self._available]

    async def _dispatch(self, provider: Provider, prompt: str, system_prompt: str) -> str:
        if provider == Provider.OLLAMA:
            return await self._ollama(prompt, system_prompt)
        if provider == Provider.GEMINI:
            return await self._gemini(prompt, system_prompt)
        raise RuntimeError(f"Unsupported provider: {provider.value}")

    # ── Gemini ──────────────────────────────────────────────────────────────

    # Phase 5 — Gemini Enterprise Agent Platform Safety Settings
    # Block high-probability harmful content across all categories.
    # See: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-attributes
    _SAFETY_SETTINGS: list[genai_types.SafetySetting] = [
        genai_types.SafetySetting(
            category="HARM_CATEGORY_HARASSMENT",
            threshold="BLOCK_MEDIUM_AND_ABOVE",
        ),
        genai_types.SafetySetting(
            category="HARM_CATEGORY_HATE_SPEECH",
            threshold="BLOCK_MEDIUM_AND_ABOVE",
        ),
        genai_types.SafetySetting(
            category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold="BLOCK_MEDIUM_AND_ABOVE",
        ),
        genai_types.SafetySetting(
            category="HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold="BLOCK_MEDIUM_AND_ABOVE",
        ),
    ]

    async def _gemini(self, prompt: str, system_prompt: str) -> str:
        if self._gemini_client is None:
            raise ModelProviderError("Gemini client is not configured.", status_code=503)

        try:
            response = await self._gemini_client.aio.models.generate_content(
                model=self.GEMINI_MODEL,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    system_instruction=system_prompt or None,
                    response_mime_type="application/json",
                    temperature=0.3,
                    max_output_tokens=self._max_output_tokens,
                    safety_settings=self._SAFETY_SETTINGS,
                ),
            )
            return response.text or ""
        except genai_errors.APIError:
            raise
        except Exception as exc:
            raise RuntimeError(str(exc)) from exc

    async def _ollama(self, prompt: str, system_prompt: str) -> str:
        if not self._ollama_available():
            raise ModelProviderError("Ollama is not configured.", status_code=503)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {"Content-Type": "application/json"}
        if self._valid(self._ollama_key):
            headers["Authorization"] = f"Bearer {self._ollama_key}"
        payload = {
            "model": self._ollama_model,
            "messages": messages,
            "stream": False,
            "format": "json",
            "options": {
                "num_predict": self._max_output_tokens,
                "temperature": 0.2,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=float(self._request_timeout_seconds)) as client:
                response = await client.post(
                    self._ollama_chat_url(),
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(f"Ollama HTTP {exc.response.status_code}: {exc.response.text[:200]}") from exc
        except Exception as exc:
            raise RuntimeError(str(exc)) from exc

        data = response.json()
        return (data.get("message") or {}).get("content", "")
