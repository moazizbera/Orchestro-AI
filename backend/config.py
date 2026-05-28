from pathlib import Path

from pydantic_settings import BaseSettings

_ENV_FILE = Path(__file__).parent / ".env"


class Settings(BaseSettings):
    # ── Primary AI provider (Gemini) ─────────────────────────────────────────
    gemini_api_key: str = ""
    gemini_backend: str = "developer"
    ai_mode: str = "gemini"
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    google_application_credentials: str = ""

    # ── Legacy provider env compatibility (unused in submission mode) ───────
    ollama_api_key: str = ""
    ollama_base_url: str = "https://ollama.com"
    ollama_model: str = ""
    openrouter_api_key: str = ""
    groq_api_key: str = ""
    huggingface_api_key: str = ""
    preferred_provider: str = ""
    ai_request_timeout_seconds: int = 25
    ai_max_output_tokens: int = 900
    ai_retry_attempts: int = 1

    # ── Database ─────────────────────────────────────────────────────────────
    mongodb_uri:    str = "mongodb://localhost:27017"
    database_name:  str = "orchestro_ai"
    mongodb_mcp_enabled: bool = True
    mongodb_mcp_command: str = "npx -y mongodb-mcp-server@latest"
    mongodb_mcp_read_only: bool = False
    mongodb_mcp_disabled_tools: str = ""

    # ── Misc ─────────────────────────────────────────────────────────────────
    gemini_model: str = "gemini-2.0-flash"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ]
    # ── Email (Resend) ────────────────────────────────────────────
    resend_api_key:    str = ""  # https://resend.com/api-keys
    resend_test_email: str = ""  # recipient for test sends
    model_config = {
        "env_file": str(_ENV_FILE),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
