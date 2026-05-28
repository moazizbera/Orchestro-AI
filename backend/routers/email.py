"""
backend/routers/email.py

POST /api/send-email  — sends a cancellation email via Resend.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from services.email_service import send_cancellation_email

logger = logging.getLogger(__name__)
router = APIRouter()


class SendEmailRequest(BaseModel):
    subscription_name: str
    to_email: Optional[str] = None   # if omitted, falls back to RESEND_TEST_EMAIL in .env


class SendEmailResponse(BaseModel):
    success: bool
    message_id: Optional[str] = None


@router.post("/send-email", response_model=SendEmailResponse)
async def send_email(request: SendEmailRequest):
    """Send a cancellation email for the given subscription via Resend."""
    try:
        data = await send_cancellation_email(
            subscription_name=request.subscription_name,
            to_email=request.to_email,
        )
        return SendEmailResponse(success=True, message_id=data.get("id"))

    except ValueError as exc:
        # Missing API key or recipient — configuration error, not a 500
        raise HTTPException(status_code=422, detail=str(exc))

    except Exception as exc:
        logger.error("Email send failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Email delivery failed: {exc}")
