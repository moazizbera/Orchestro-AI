import asyncio
import logging
import time
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException

from agents.action_agent import ActionAgent
from agents.calendar_agent import CalendarAgent
from agents.finance_agent import FinanceAgent
from agents.negotiation_agent import NegotiationAgent
from agents.orchestrator import OrchestratorAgent
from agents.scenario_agent import ScenarioAgent
from config import settings
from database.mongo import get_execution, save_execution
from models.schemas import OrchestrationRequest
from providers.model_provider import ModelProvider, ModelProviderError

logger = logging.getLogger(__name__)
router = APIRouter()

# Instantiated once at startup
_orchestrator: OrchestratorAgent | None = None
_finance_agent: FinanceAgent | None = None
_action_agent: ActionAgent | None = None
_negotiation_agent: NegotiationAgent | None = None
_calendar_agent: CalendarAgent | None = None
_scenario_agent: ScenarioAgent | None = None
_provider: ModelProvider | None = None


def _should_use_deterministic_fallback(exc: Exception) -> bool:
    if not isinstance(exc, ModelProviderError):
        return False
    if _provider is not None and not _provider.available_providers:
        return True
    return "No AI provider is configured" in str(exc)


def get_provider_status() -> dict:
    if _provider is None:
        preferred = (settings.preferred_provider or "gemini").strip().lower() or "gemini"
        available: list[str] = []
        return {
            "provider": preferred,
            "preferred_provider": preferred,
            "model": settings.ollama_model or settings.gemini_model,
            "available_providers": available,
            "ai_mode": settings.ai_mode,
        }

    available = _provider.available_providers
    active_provider = _provider.preferred_provider if _provider.preferred_provider in available else (available[0] if available else _provider.preferred_provider)

    return {
        "provider": active_provider,
        "preferred_provider": _provider.preferred_provider,
        "model": _provider.configured_model,
        "available_providers": available,
        "ai_mode": _provider.ai_mode,
    }


def init_agents() -> None:
    global _orchestrator, _finance_agent, _action_agent, _negotiation_agent, _calendar_agent, _scenario_agent, _provider
    _provider = ModelProvider(
        gemini_key=settings.gemini_api_key,
        gemini_model=settings.gemini_model,
        gemini_backend=settings.gemini_backend,
        ollama_api_key=settings.ollama_api_key,
        ollama_base_url=settings.ollama_base_url,
        ollama_model=settings.ollama_model,
        preferred_provider=settings.preferred_provider,
        google_cloud_project=settings.google_cloud_project,
        google_cloud_location=settings.google_cloud_location,
        ai_mode=settings.ai_mode,
        ai_request_timeout_seconds=settings.ai_request_timeout_seconds,
        ai_max_output_tokens=settings.ai_max_output_tokens,
        ai_retry_attempts=settings.ai_retry_attempts,
    )
    _orchestrator = OrchestratorAgent(_provider)
    _finance_agent = FinanceAgent(_provider)
    _action_agent = ActionAgent(_provider)
    _negotiation_agent = NegotiationAgent(_provider)
    _calendar_agent = CalendarAgent(_provider)
    _scenario_agent = ScenarioAgent(_provider)
    logger.info(
        "All agents initialised | mode=%s | available=%s",
        "GEMINI", _provider.available_providers,
    )


def _is_agent_permitted(permissions: dict | None, agent_key: str) -> bool:
    if not permissions:
        return True
    if agent_key not in permissions:
        return True
    return bool(permissions.get(agent_key))


def _expand_support_agents(agents_required: list[str], permissions: dict | None) -> list[str]:
    expanded = list(agents_required)
    if "finance_agent" in expanded and _is_agent_permitted(permissions, "negotiationAgent") and "negotiation_agent" not in expanded:
        expanded.append("negotiation_agent")
    if "finance_agent" in expanded and _is_agent_permitted(permissions, "calendarAgent") and "calendar_agent" not in expanded:
        expanded.append("calendar_agent")
    if "finance_agent" in expanded and _is_agent_permitted(permissions, "scenarioAgent") and "scenario_agent" not in expanded:
        expanded.append("scenario_agent")
    return expanded


def _build_summary(
    orchestrator_decision: dict,
    finance_output: dict | None,
    action_output: dict | None,
    negotiation_output: dict | None,
    calendar_output: dict | None,
    scenario_output: dict | None,
) -> str:
    parts: list[str] = []
    intent = orchestrator_decision.get("intent", "GENERAL")
    parts.append(f"Intent: {intent}")

    if finance_output:
        items = len(finance_output.get("detected_items", []))
        monthly = finance_output.get("monthly_loss_estimate", 0.0)
        parts.append(
            f"Finance Agent detected {items} wasteful subscription(s) "
            f"costing ${monthly:.2f}/month"
        )

    if action_output:
        n = action_output.get("total_actions", 0)
        savings = action_output.get("estimated_monthly_savings", 0.0)
        parts.append(
            f"Action Agent generated {n} executable action(s); "
            f"estimated savings ${savings:.2f}/month (${savings * 12:.2f}/year)"
        )

    if negotiation_output:
        parts.append(
            f"Negotiation Agent prepared {negotiation_output.get('total_playbooks', 0)} provider save playbook(s)"
        )

    if calendar_output:
        parts.append(
            f"Calendar Agent scheduled {calendar_output.get('total_reminders', 0)} follow-up reminder(s)"
        )

    if scenario_output:
        parts.append(
            f"Scenario Agent recommended the {scenario_output.get('recommended_scenario', 'Balanced')} savings path"
        )

    return " | ".join(parts)


@router.post("/orchestrate")
async def orchestrate(request: OrchestrationRequest):
    if _orchestrator is None:
        raise HTTPException(status_code=503, detail="Agents not initialised. Check GEMINI_API_KEY.")

    start_ms = time.time() * 1000
    request_id = str(uuid.uuid4())
    deadline = time.monotonic() + max(settings.ai_request_timeout_seconds, 5)

    req_mode = (request.ai_mode or "").strip().lower()
    preferred_override = "gemini" if req_mode == "gemini" else None

    def remaining_timeout() -> float:
        return max(deadline - time.monotonic(), 0.1)

    try:
        # ── Step 1: Orchestrator ────────────────────────────────────────────
        logger.info("[%s] Starting orchestration: %r (ai_mode=%s)", request_id, request.request[:80], req_mode or "server-default")
        try:
            orchestrator_decision, orch_prov = await asyncio.wait_for(
                _orchestrator.process(
                    request.request,
                    preferred=preferred_override,
                    permissions=request.agent_permissions,
                ),
                timeout=remaining_timeout(),
            )
        except TimeoutError:
            logger.warning("[%s] Orchestrator exceeded %.1fs budget; using fallback route", request_id, settings.ai_request_timeout_seconds)
            orchestrator_decision = _orchestrator.fallback_decision(request.request, request.agent_permissions, mode="timeout")
            orch_prov = "fallback"
        except ModelProviderError as exc:
            if not _should_use_deterministic_fallback(exc):
                raise
            logger.warning("[%s] Orchestrator provider unavailable; using fallback route", request_id)
            orchestrator_decision = _orchestrator.fallback_decision(request.request, request.agent_permissions, mode="no_provider")
            orch_prov = "fallback"

        agents_required: list[str] = _expand_support_agents(orchestrator_decision.get("agents_required", []), request.agent_permissions)
        orchestrator_decision["agents_required"] = agents_required

        finance_output: dict | None = None
        action_output: dict | None = None
        negotiation_output: dict | None = None
        calendar_output: dict | None = None
        scenario_output: dict | None = None
        fin_prov = ""
        act_prov = ""
        neg_prov = ""
        cal_prov = ""
        scn_prov = ""

        # ── Step 2: Finance Agent ───────────────────────────────────────────
        if "finance_agent" in agents_required:
            try:
                finance_output, fin_prov = await asyncio.wait_for(
                    _finance_agent.analyze(
                        request.request,
                        orchestrator_decision,
                        subscriptions=request.subscriptions,
                    ),
                    timeout=remaining_timeout(),
                )
            except TimeoutError:
                logger.warning("[%s] Finance Agent exceeded remaining budget; using deterministic fallback", request_id)
                finance_output = _finance_agent.fallback_result(request.subscriptions)
                fin_prov = "fallback"
            except ModelProviderError as exc:
                if not _should_use_deterministic_fallback(exc):
                    raise
                logger.warning("[%s] Finance Agent provider unavailable; using deterministic fallback", request_id)
                finance_output = _finance_agent.fallback_result(request.subscriptions)
                fin_prov = "fallback"

        # ── Step 3: Action Agent ────────────────────────────────────────────
        if "action_agent" in agents_required:
            findings = finance_output or {}
            try:
                action_output, act_prov = await asyncio.wait_for(
                    _action_agent.execute(findings, orchestrator_decision),
                    timeout=remaining_timeout(),
                )
            except TimeoutError:
                logger.warning("[%s] Action Agent exceeded remaining budget; using deterministic fallback", request_id)
                action_output = _action_agent.fallback_result(findings)
                act_prov = "fallback"
            except ModelProviderError as exc:
                if not _should_use_deterministic_fallback(exc):
                    raise
                logger.warning("[%s] Action Agent provider unavailable; using deterministic fallback", request_id)
                action_output = _action_agent.fallback_result(findings)
                act_prov = "fallback"

        if "negotiation_agent" in agents_required:
            negotiation_output, neg_prov = await _negotiation_agent.execute(finance_output or {}, action_output or {})

        if "calendar_agent" in agents_required:
            calendar_output, cal_prov = await _calendar_agent.execute(finance_output or {}, action_output or {})

        if "scenario_agent" in agents_required:
            scenario_output, scn_prov = await _scenario_agent.execute(finance_output or {}, action_output or {}, negotiation_output or {})

        # ── Impact metrics ──────────────────────────────────────────────────
        monthly_savings = 0.0
        actions_executed = 0

        if finance_output:
            monthly_savings = finance_output.get("monthly_loss_estimate", 0.0)
        if action_output:
            monthly_savings = action_output.get("estimated_monthly_savings", monthly_savings)
            actions_executed = action_output.get("total_actions", 0)
        # ── Confidence labels (current provider) ──────────────────────────────
        orchestrator_decision["confidence_label"] = ModelProvider.confidence_label(orch_prov)
        if finance_output:
            finance_output["confidence_label"] = ModelProvider.confidence_label(fin_prov)
        if action_output:
            action_output["confidence_label"] = ModelProvider.confidence_label(act_prov)
        if negotiation_output:
            negotiation_output["confidence_label"] = ModelProvider.confidence_label(neg_prov)
        if calendar_output:
            calendar_output["confidence_label"] = ModelProvider.confidence_label(cal_prov)
        if scenario_output:
            scenario_output["confidence_label"] = ModelProvider.confidence_label(scn_prov)

        offline_mode = _provider.is_offline if _provider else False
        execution_time_ms = time.time() * 1000 - start_ms
        final_summary = _build_summary(orchestrator_decision, finance_output, action_output, negotiation_output, calendar_output, scenario_output)

        execution_doc = {
            "request_id": request_id,
            "user_id": request.user_id,
            "user_request": request.request,
            "timestamp": datetime.utcnow().isoformat(),
            "offline_mode": offline_mode,
            "orchestrator_decision": orchestrator_decision,
            "finance_agent_output": finance_output,
            "action_agent_output": action_output,
            "negotiation_agent_output": negotiation_output,
            "calendar_agent_output": calendar_output,
            "scenario_agent_output": scenario_output,
            "final_summary": final_summary,
            "providers_used": {
                "orchestrator": orch_prov,
                "finance_agent": fin_prov or None,
                "action_agent": act_prov or None,
                "negotiation_agent": neg_prov or None,
                "calendar_agent": cal_prov or None,
                "scenario_agent": scn_prov or None,
            },
            "impact_metrics": {
                "monthly_savings_estimate": round(monthly_savings, 2),
                "annual_savings_estimate": round(monthly_savings * 12, 2),
                "actions_executed": actions_executed,
                "agents_used": len(agents_required),
                "time_saved_minutes": 45 * actions_executed,
            },
            "execution_time_ms": round(execution_time_ms, 1),
            "status": "completed",
            "agent_permissions": request.agent_permissions or {},
            "subscriptions_provided": len(request.subscriptions or []),
        }

        await save_execution(execution_doc)
        execution_doc.pop("_id", None)   # remove MongoDB ObjectId (not JSON-serialisable)
        logger.info(
            "[%s] Completed in %.0fms | savings=$%.2f | actions=%d",
            request_id,
            execution_time_ms,
            monthly_savings,
            actions_executed,
        )
        return execution_doc

    except HTTPException:
        raise
    except ModelProviderError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("[%s] Orchestration error: %s", request_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/execution/{request_id}")
async def get_execution_result(request_id: str):
    doc = await get_execution(request_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Execution not found.")
    return doc
