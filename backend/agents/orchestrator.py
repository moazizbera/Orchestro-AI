import logging
import re
from providers.model_provider import ModelProvider

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Orchestro AI — an intelligent orchestration system that routes user requests to specialized agents.

Available agents:
  • finance_agent  — Analyzes financial data, subscriptions, recurring charges, spending waste
  • action_agent   — Executes actions: drafts cancellation emails, creates reminders, negotiation scripts
    • negotiation_agent — Prepares retention and downgrade talking points for provider conversations
    • calendar_agent — Schedules follow-up reminders so savings actions happen on time
    • scenario_agent — Builds conservative, balanced, and aggressive savings plans from the agent outputs

Analyze the user request and return ONLY valid JSON with this exact structure:
{
  "intent": "FINANCE" | "TASK" | "FINANCE_AND_ACTION" | "GENERAL",
  "confidence": 0.95,
  "primary_agent": "finance_agent",
    "agents_required": ["finance_agent", "action_agent", "negotiation_agent", "calendar_agent", "scenario_agent"],
  "execution_plan": [
    {"step": 1, "agent": "finance_agent", "task": "Identify wasteful subscriptions", "input": "User financial context"},
        {"step": 2, "agent": "action_agent", "task": "Generate cancellation emails for flagged services", "input": "Finance agent findings"},
        {"step": 3, "agent": "negotiation_agent", "task": "Prepare downgrade and retention scripts", "input": "Finance and action outputs"},
        {"step": 4, "agent": "calendar_agent", "task": "Schedule follow-up reminders", "input": "Action outputs and deadlines"},
        {"step": 5, "agent": "scenario_agent", "task": "Build conservative, balanced, and aggressive savings paths", "input": "Finance, action, and negotiation outputs"}
  ],
  "reasoning": "User wants to reduce subscription waste — requires financial analysis then action execution",
  "expected_outcome": "List of wasteful subscriptions with ready-to-send cancellation emails and estimated monthly savings"
}

Rules:
- If the request involves money, subscriptions, expenses, waste → include finance_agent
- If actions need to be taken (emails, tasks, cancellations) → include action_agent
- Most finance requests should also include action_agent for follow-through
- When finance work is present, negotiation_agent, calendar_agent, and scenario_agent usually add follow-through value
- Always return valid JSON, nothing else"""


class OrchestratorAgent:
    def __init__(self, provider: ModelProvider) -> None:
        self._provider = provider

    @staticmethod
    def _is_agent_permitted(permissions: dict | None, agent_key: str) -> bool:
        if not permissions:
            return True
        if agent_key not in permissions:
            return True
        caps = permissions.get(agent_key)
        return bool(caps)

    def fallback_decision(self, user_request: str, permissions: dict | None = None) -> dict:
        request_text = (user_request or "").strip()
        normalized = request_text.lower()
        has_finance = bool(re.search(r"\b(subscription|subscriptions|cancel|downgrade|bill|billing|spend|spending|expense|expenses|waste|finance|financial|save|savings)\b", normalized))
        wants_action = bool(re.search(r"\b(cancel|downgrade|email|draft|send|review|remind|pause|negotiate|action)\b", normalized))

        agents_required: list[str] = []
        execution_plan: list[dict] = []

        finance_allowed = self._is_agent_permitted(permissions, "financeAgent")
        action_allowed = self._is_agent_permitted(permissions, "actionAgent")
        negotiation_allowed = self._is_agent_permitted(permissions, "negotiationAgent")
        calendar_allowed = self._is_agent_permitted(permissions, "calendarAgent")
        scenario_allowed = self._is_agent_permitted(permissions, "scenarioAgent")

        if has_finance and finance_allowed:
            agents_required.append("finance_agent")
            execution_plan.append(
                {
                    "step": 1,
                    "agent": "finance_agent",
                    "task": "Identify wasteful subscriptions",
                    "input": "User subscription and spending context",
                }
            )

        if (wants_action or has_finance) and action_allowed:
            agents_required.append("action_agent")
            execution_plan.append(
                {
                    "step": len(execution_plan) + 1,
                    "agent": "action_agent",
                    "task": "Generate concrete follow-up actions",
                    "input": "Finance findings or user request context",
                }
            )

        if has_finance and negotiation_allowed:
            agents_required.append("negotiation_agent")
            execution_plan.append(
                {
                    "step": len(execution_plan) + 1,
                    "agent": "negotiation_agent",
                    "task": "Prepare downgrade and retention scripts",
                    "input": "Finance findings and action context",
                }
            )

        if has_finance and calendar_allowed:
            agents_required.append("calendar_agent")
            execution_plan.append(
                {
                    "step": len(execution_plan) + 1,
                    "agent": "calendar_agent",
                    "task": "Schedule follow-up reminders",
                    "input": "Action outputs and priority timing",
                }
            )

        if has_finance and scenario_allowed:
            agents_required.append("scenario_agent")
            execution_plan.append(
                {
                    "step": len(execution_plan) + 1,
                    "agent": "scenario_agent",
                    "task": "Build conservative, balanced, and aggressive savings scenarios",
                    "input": "Finance findings, actions, and negotiation context",
                }
            )

        if not agents_required:
            return {
                "intent": "GENERAL",
                "confidence": 0.55,
                "primary_agent": "orchestrator",
                "agents_required": [],
                "execution_plan": [],
                "reasoning": "The live model exceeded the demo response budget, so Orchestro switched to its deterministic routing path to keep the workflow responsive.",
                "expected_outcome": "A concise guidance response without specialized agent execution.",
            }

        primary_agent = agents_required[0]
        intent = "FINANCE_AND_ACTION" if "finance_agent" in agents_required and "action_agent" in agents_required else "FINANCE"
        return {
            "intent": intent,
            "confidence": 0.7,
            "primary_agent": primary_agent,
            "agents_required": agents_required,
            "execution_plan": execution_plan,
            "reasoning": "The live model exceeded the demo response budget, so Orchestro switched to its deterministic routing path to deliver a complete recommendation set quickly.",
            "expected_outcome": "A prioritized subscription review with ready-to-use follow-up actions, negotiation scripts, reminders, and scenario plans.",
        }

    async def process(self, user_request: str, preferred: str | None = None, permissions: dict | None = None) -> tuple[dict, str]:
        """Returns (decision_dict, provider_name_used)."""
        perm_context = ""
        if permissions:
            lines = []
            for agent_key, caps in permissions.items():
                if caps:
                    lines.append(f"  • {agent_key} is ONLY permitted to access: {', '.join(caps)}")
                else:
                    lines.append(f"  • {agent_key} has NO active permissions — do not invoke it")
            perm_context = "\n\nAgent permissions — you MUST respect these constraints:\n" + "\n".join(lines)

        prompt = f'User request: "{user_request}"\n\nAnalyze and produce the execution plan.{perm_context}'
        result, used = await self._provider.generate_json(prompt, SYSTEM_PROMPT, preferred=preferred)
        logger.info(
            "Orchestrator → intent=%s agents=%s [provider=%s]",
            result.get("intent"), result.get("agents_required"), used,
        )
        if not result:
            raise RuntimeError("Orchestrator returned empty result from all providers")
        return result, used
