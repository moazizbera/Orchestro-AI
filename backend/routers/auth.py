from fastapi import APIRouter, HTTPException

from database.mongo import (
    authenticate_user,
    create_user,
    get_user_subscriptions,
    save_user_subscriptions,
)
from models.schemas import AuthRequest, AuthResponse, SubscriptionSyncRequest

router = APIRouter()


@router.post("/signup", response_model=AuthResponse)
async def sign_up(request: AuthRequest):
    try:
        user = await create_user(request.name or "", request.email, request.secret)
        return {"user": user}
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/signin", response_model=AuthResponse)
async def sign_in(request: AuthRequest):
    try:
        user = await authenticate_user(request.email, request.secret)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or secret.")
    return {"user": user}


@router.get("/subscriptions/{user_id}")
async def list_user_subscriptions(user_id: str):
    try:
        subscriptions = await get_user_subscriptions(user_id)
        return {"subscriptions": subscriptions}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.put("/subscriptions/{user_id}")
async def update_user_subscriptions(user_id: str, request: SubscriptionSyncRequest):
    try:
        await save_user_subscriptions(user_id, request.subscriptions)
        return {"saved": len(request.subscriptions)}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc