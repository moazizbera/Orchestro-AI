import asyncio
import logging
import hashlib
import uuid
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING

from config import settings
from services.mongodb_mcp import MongoMCPClient

logger = logging.getLogger(__name__)


def _hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def _public_user(doc: dict) -> dict:
    return {
        "user_id": doc["user_id"],
        "email": doc["email"],
        "name": doc["name"],
    }


class _Database:
    client: Optional[AsyncIOMotorClient] = None
    db = None
    connected: bool = False
    database_name: str = ""
    mcp: MongoMCPClient | None = None
    mcp_connected: bool = False
    mcp_status: str = "disabled"
    mcp_reason: str | None = None


db = _Database()


async def connect_to_mongo(uri: str, db_name: str) -> None:
    db.database_name = db_name

    try:
        db.client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
        # Verify connection
        await db.client.admin.command("ping")
        db.db = db.client[db_name]
        db.connected = True

        await db.db.executions.create_index([("timestamp", DESCENDING)])
        await db.db.executions.create_index([("user_id", ASCENDING)])
        await db.db.executions.create_index(
            [("request_id", ASCENDING)], unique=True
        )
        await db.db.users.create_index([("email", ASCENDING)], unique=True)
        await db.db.users.create_index([("user_id", ASCENDING)], unique=True)
        logger.info("Connected to MongoDB: %s / %s", uri, db_name)
    except Exception as exc:
        db.connected = False
        logger.warning("MongoDB unavailable (%s). Persistence disabled.", exc)

    if settings.mongodb_mcp_enabled:
        db.mcp = MongoMCPClient(
            command=settings.mongodb_mcp_command,
            connection_string=uri,
            read_only=settings.mongodb_mcp_read_only,
            disabled_tools=settings.mongodb_mcp_disabled_tools,
        )
        db.mcp_connected = False
        db.mcp_status = "starting"
        db.mcp_reason = None

        async def _warmup_mcp() -> None:
            db.mcp_connected = await db.mcp.warmup()
            if db.mcp_connected:
                db.mcp_status = "connected"
                db.mcp_reason = None
                logger.info("MongoDB MCP connected for partner-track operations.")
            else:
                db.mcp_status = "fallback"
                db.mcp_reason = db.mcp.last_error

        asyncio.create_task(_warmup_mcp())
    else:
        db.mcp_status = "disabled"
        db.mcp_reason = None


async def close_mongo_connection() -> None:
    if db.mcp:
        await db.mcp.close()
    if db.client:
        db.client.close()
        logger.info("MongoDB connection closed.")


def _mcp_available() -> bool:
    return bool(db.mcp_connected and db.mcp is not None and db.database_name)


async def _mcp_find_one(collection: str, filter_query: dict, projection: Optional[dict] = None) -> Optional[dict]:
    if not _mcp_available():
        return None

    docs = await db.mcp.find(
        db.database_name,
        collection,
        filter_query=filter_query,
        projection=projection,
        limit=1,
    )
    return docs[0] if docs else None


async def _mcp_aggregate(collection: str, pipeline: list[dict]) -> list[dict]:
    if not _mcp_available():
        return []
    return await db.mcp.aggregate(db.database_name, collection, pipeline)


def _log_mcp_fallback(operation: str, exc: Exception) -> None:
    logger.warning("MongoDB MCP %s failed (%s). Falling back to direct driver.", operation, exc)


async def save_execution(doc: dict) -> Optional[str]:
    if _mcp_available():
        try:
            await db.mcp.insert_many(db.database_name, "executions", [doc])
            return doc.get("request_id")
        except Exception as exc:
            _log_mcp_fallback("insert-many executions", exc)

    if not db.connected:
        logger.warning("MongoDB not connected — skipping persistence.")
        return None
    result = await db.db.executions.insert_one(doc)
    return str(result.inserted_id)


async def create_user(name: str, email: str, secret: str) -> dict:
    if not db.connected and not _mcp_available():
        raise RuntimeError("Database unavailable.")

    normalized_email = email.strip().lower()
    existing = None
    if _mcp_available():
        try:
            existing = await _mcp_find_one("users", {"email": normalized_email})
        except Exception as exc:
            _log_mcp_fallback("find user by email", exc)

    if existing is None and db.connected:
        existing = await db.db.users.find_one({"email": normalized_email})
    if existing:
        raise ValueError("An account with this email already exists.")

    user_doc = {
        "user_id": str(uuid.uuid4()),
        "email": normalized_email,
        "name": name.strip() if name and name.strip() else normalized_email.split("@")[0],
        "secret_hash": _hash_secret(secret.strip()),
        "subscriptions": [],
    }

    if _mcp_available():
        try:
            await db.mcp.insert_many(db.database_name, "users", [user_doc])
            return _public_user(user_doc)
        except Exception as exc:
            _log_mcp_fallback("insert-many users", exc)

    await db.db.users.insert_one(user_doc)
    return _public_user(user_doc)


async def authenticate_user(email: str, secret: str) -> Optional[dict]:
    if not db.connected and not _mcp_available():
        raise RuntimeError("Database unavailable.")

    normalized_email = email.strip().lower()
    user_doc = None
    if _mcp_available():
        try:
            user_doc = await _mcp_find_one("users", {"email": normalized_email})
        except Exception as exc:
            _log_mcp_fallback("authenticate user", exc)

    if user_doc is None and db.connected:
        user_doc = await db.db.users.find_one({"email": normalized_email})
    if not user_doc:
        return None
    if user_doc.get("secret_hash") != _hash_secret(secret.strip()):
        return None
    return _public_user(user_doc)


async def get_user_subscriptions(user_id: str) -> list:
    if not db.connected and not _mcp_available():
        raise RuntimeError("Database unavailable.")

    user_doc = None
    if _mcp_available():
        try:
            user_doc = await _mcp_find_one("users", {"user_id": user_id}, {"subscriptions": 1})
        except Exception as exc:
            _log_mcp_fallback("get subscriptions", exc)

    if user_doc is None and db.connected:
        user_doc = await db.db.users.find_one({"user_id": user_id}, {"subscriptions": 1})
    if not user_doc:
        return []
    return user_doc.get("subscriptions", [])


async def save_user_subscriptions(user_id: str, subscriptions: list) -> None:
    if not db.connected and not _mcp_available():
        raise RuntimeError("Database unavailable.")

    if _mcp_available():
        try:
            await db.mcp.update_many(
                db.database_name,
                "users",
                {"user_id": user_id},
                {"$set": {"subscriptions": subscriptions}},
            )
            return
        except Exception as exc:
            _log_mcp_fallback("update subscriptions", exc)

    await db.db.users.update_one(
        {"user_id": user_id},
        {"$set": {"subscriptions": subscriptions}},
    )


async def get_execution(request_id: str) -> Optional[dict]:
    doc = None
    if _mcp_available():
        try:
            doc = await _mcp_find_one("executions", {"request_id": request_id})
        except Exception as exc:
            _log_mcp_fallback("get execution", exc)

    if doc is None:
        if not db.connected:
            return None
        doc = await db.db.executions.find_one({"request_id": request_id})
    if doc:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
    return doc


async def get_all_executions(limit: int = 10, user_id: Optional[str] = None) -> list:
    if _mcp_available():
        try:
            pipeline = []
            if user_id:
                pipeline.append({"$match": {"user_id": user_id}})
            pipeline.extend([
                {"$sort": {"timestamp": -1}},
                {"$limit": limit},
            ])
            docs = await _mcp_aggregate("executions", pipeline)
            for doc in docs:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
            return docs
        except Exception as exc:
            _log_mcp_fallback("list executions", exc)

    if not db.connected:
        return []
    query = {"user_id": user_id} if user_id else {}
    cursor = db.db.executions.find(query).sort("timestamp", DESCENDING).limit(limit)
    docs = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        docs.append(doc)
    return docs


async def get_impact_metrics(user_id: Optional[str] = None) -> dict:
    empty_metrics = {
        "total_requests": 0,
        "total_actions": 0,
        "total_monthly_savings": 0.0,
        "avg_execution_time": 0.0,
    }

    pipeline = []
    if user_id:
        pipeline.append({"$match": {"user_id": user_id}})
    pipeline.extend([
        {
            "$group": {
                "_id": None,
                "total_requests": {"$sum": 1},
                "total_actions": {"$sum": "$impact_metrics.actions_executed"},
                "total_monthly_savings": {
                    "$sum": "$impact_metrics.monthly_savings_estimate"
                },
                "avg_execution_time": {"$avg": "$execution_time_ms"},
            }
        }
    ])

    if _mcp_available():
        try:
            results = await _mcp_aggregate("executions", pipeline)
            if results:
                row = results[0]
                row.pop("_id", None)
                return row
            return empty_metrics
        except Exception as exc:
            _log_mcp_fallback("aggregate impact metrics", exc)

    if not db.connected:
        return empty_metrics

    cursor = db.db.executions.aggregate(pipeline)
    results = await cursor.to_list(length=1)
    if results:
        row = results[0]
        row.pop("_id", None)
        return row
    return empty_metrics
