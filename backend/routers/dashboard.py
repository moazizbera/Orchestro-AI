from fastapi import APIRouter, Query

from database.mongo import get_all_executions, get_impact_metrics

router = APIRouter()


@router.get("/executions")
async def list_executions(
    limit: int = Query(default=10, ge=1, le=50),
    user_id: str | None = Query(default=None),
):
    executions = await get_all_executions(limit, user_id=user_id)
    return {"executions": executions, "count": len(executions)}


@router.get("/metrics")
async def get_metrics(user_id: str | None = Query(default=None)):
    return await get_impact_metrics(user_id=user_id)
