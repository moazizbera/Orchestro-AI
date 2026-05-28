import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── GCP Secret Manager: inject cloud secrets into env before Settings loads ──
# This satisfies Phase 4 of the Google Cloud Rapid Agent Hackathon.
# No-op when GOOGLE_CLOUD_PROJECT is not set (local dev falls back to .env).
from services.secret_manager import apply_secret_manager_overrides
apply_secret_manager_overrides(os.environ.get("GOOGLE_CLOUD_PROJECT"))

# ── Arize Phoenix: OpenTelemetry tracing for all LLM + agent calls ───────────
# Phase 3 partner integration. No-op when packages are not installed.
from services.observability import setup_tracing
setup_tracing()

from config import settings
from database.mongo import close_mongo_connection, connect_to_mongo
from routers.auth import router as auth_router
from routers.dashboard import router as dashboard_router
from routers.email import router as email_router
from routers.orchestration import get_provider_status, init_agents, router as orchestration_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ─────────────────────────────────────────────────────────────
    logger.info("Orchestro AI starting up…")
    await connect_to_mongo(settings.mongodb_uri, settings.database_name)
    init_agents()
    logger.info("Orchestro AI ready.")
    yield
    # ── Shutdown ─────────────────────────────────────────────────────────────
    await close_mongo_connection()
    logger.info("Orchestro AI shut down.")


app = FastAPI(
    title="Orchestro AI",
    description="Production-grade AI Agent Orchestration System — Google Cloud Rapid Agent Hackathon",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orchestration_router, prefix="/api", tags=["Orchestration"])
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(email_router, prefix="/api", tags=["Email"])


@app.get("/health", tags=["System"])
async def health_check():
    from database.mongo import db as _db
    provider_status = get_provider_status()

    gemini_backend = settings.gemini_backend or "developer"
    gcp_project    = settings.google_cloud_project or None

    return {
        "status": "healthy",
        "service": "Orchestro AI",
        "version": "1.0.0",
        # ── AI provider ──────────────────────────────────────────────────────
        "provider":           provider_status["provider"],
        "preferred_provider": provider_status["preferred_provider"],
        "model":              provider_status["model"],
        "available_providers": provider_status["available_providers"],
        "ai_mode":            provider_status["ai_mode"],
        # ── Google Cloud integration ─────────────────────────────────────────
        "gemini_backend":     gemini_backend,          # developer | vertex
        "gcp_project":        gcp_project,             # None when using AI Studio
        "gcp_location":       settings.google_cloud_location,
        "secret_manager":     gemini_backend == "vertex" and bool(gcp_project),
        # ── Infrastructure ───────────────────────────────────────────────────
        "db_connected":       _db.connected,
        "mongodb_mcp_enabled": settings.mongodb_mcp_enabled,
        "mongodb_mcp_connected": getattr(_db, "mcp_connected", False),
        "mongodb_mcp_status": getattr(_db, "mcp_status", "disabled"),
        "mongodb_mcp_reason": getattr(_db, "mcp_reason", None),
    }
