"""
Secret Manager integration for Google Cloud deployments.

When GOOGLE_CLOUD_PROJECT is set (Cloud Run / GKE), this module attempts to
load the application's secrets from GCP Secret Manager, satisfying Phase 4 of
the Google Cloud Rapid Agent Hackathon requirements.

In local development (no GCP project), it silently falls back to .env values
so developer experience is unaffected.

Usage
-----
Call ``apply_secret_manager_overrides()`` once at startup (before Settings is
read by the rest of the application).  It injects any discovered secret values
directly into ``os.environ`` so Pydantic-Settings picks them up transparently.
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

# ─── Secret name → env-var mapping ──────────────────────────────────────────
# Add new secrets here as the project grows.  The key is the Secret Manager
# secret ID; the value is the environment variable that should be populated.
SECRET_ENV_MAP: dict[str, str] = {
    "orchestro-gemini-api-key":   "GEMINI_API_KEY",
    "orchestro-mongodb-uri":      "MONGODB_URI",
    "orchestro-ollama-api-key":   "OLLAMA_API_KEY",
    "orchestro-resend-api-key":   "RESEND_API_KEY",
}


def apply_secret_manager_overrides(project_id: str | None = None) -> None:
    """
    Load secrets from GCP Secret Manager and inject them into os.environ.

    Parameters
    ----------
    project_id:
        GCP project ID.  Defaults to the ``GOOGLE_CLOUD_PROJECT`` env var.
        If neither is set, this function is a no-op.
    """
    resolved_project = project_id or os.environ.get("GOOGLE_CLOUD_PROJECT", "")
    if not resolved_project:
        logger.debug("Secret Manager: no GOOGLE_CLOUD_PROJECT — using local .env")
        return

    try:
        from google.cloud import secretmanager  # type: ignore
    except ImportError:
        logger.warning(
            "Secret Manager: google-cloud-secret-manager not installed. "
            "Run `pip install google-cloud-secret-manager` or add it to requirements.txt."
        )
        return

    client = secretmanager.SecretManagerServiceClient()
    loaded: list[str] = []
    skipped: list[str] = []

    for secret_id, env_var in SECRET_ENV_MAP.items():
        # Don't override a value that was already explicitly set in the environment
        if os.environ.get(env_var):
            skipped.append(env_var)
            continue

        resource = f"projects/{resolved_project}/secrets/{secret_id}/versions/latest"
        try:
            response = client.access_secret_version(request={"name": resource})
            value = response.payload.data.decode("utf-8").strip()
            if value:
                os.environ[env_var] = value
                loaded.append(env_var)
        except Exception as exc:  # noqa: BLE001 — best-effort, log and continue
            logger.debug("Secret Manager: could not load %s (%s)", secret_id, exc)

    if loaded or skipped:
        logger.info(
            "Secret Manager: loaded=%s  skipped(already-set)=%s  project=%s",
            loaded,
            skipped,
            resolved_project,
        )
