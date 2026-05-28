"""
backend/services/email_service.py

Resend API integration — sends transactional emails from the backend.
API key is read from settings (server-side only, never exposed to the browser).

Resend docs: https://resend.com/docs/api-reference/emails/send-email
"""

import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"

# Resend's shared test sender — works without a verified domain.
# Switch to "Orchestro AI <you@yourdomain.com>" once your domain is verified.
DEFAULT_FROM = "Orchestro AI <onboarding@resend.dev>"


async def send_cancellation_email(
    subscription_name: str,
    to_email: str | None = None,
) -> dict:
    """
    Send a plain-text cancellation request email via Resend.

    Args:
        subscription_name: Human-readable service name, e.g. "Netflix Premium".
        to_email: Recipient address; falls back to settings.resend_test_email.

    Returns:
        Resend API response dict, e.g. {"id": "abc123"}.

    Raises:
        httpx.HTTPStatusError: if the Resend API returns a non-2xx status.
        ValueError: if no recipient address is configured.
    """
    recipient = to_email or settings.resend_test_email
    if not recipient:
        raise ValueError(
            "No recipient email configured. "
            "Set RESEND_TEST_EMAIL in .env or pass to_email explicitly."
        )

    if not settings.resend_api_key:
        raise ValueError(
            "RESEND_API_KEY is not set. "
            "Get a key at https://resend.com/api-keys and add it to .env."
        )

    payload = {
        "from":    DEFAULT_FROM,
        "to":      [recipient],
        "subject": "Cancel Subscription",
        "text":    f"Please cancel my subscription to {subscription_name}",
    }

    logger.info(
        "Sending cancellation email | service=%r | to=%s",
        subscription_name, recipient,
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type":  "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    logger.info("Email sent | message_id=%s", data.get("id"))
    return data
