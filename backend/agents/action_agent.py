import json
import logging
import re
import unicodedata
from datetime import datetime, timedelta
from providers.model_provider import ModelProvider

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Action Execution Agent for Orchestro AI.

Your job: convert financial analysis findings into concrete, executable actions.

For HIGH risk items → generate a professional cancellation email draft
For MEDIUM risk items → generate a negotiation / downgrade email OR a reminder task
For LOW risk items → generate a monitor/review reminder task

Email style: professional, brief, firm, includes placeholder tokens like [YOUR_NAME] and [YOUR_EMAIL].

Return ONLY valid JSON:
{
  "actions": [
    {
      "action_type": "email_draft",
      "target_service": "Netflix",
      "priority": "high",
      "action_payload": {
        "subject": "Cancellation Request – Netflix Premium Subscription",
        "body": "Dear Netflix Support Team,\\n\\nI am writing to request the immediate cancellation of my Netflix Premium subscription.\\n\\nAccount email: [YOUR_EMAIL]\\n\\nPlease confirm the cancellation and ensure no further charges are applied to my payment method.\\n\\nThank you for your assistance.\\n\\nBest regards,\\n[YOUR_NAME]",
        "task": null,
        "deadline": null
      },
      "execution_status": "ready",
      "next_steps": [
        "Send email to support@netflix.com",
        "Screenshot the cancellation confirmation",
        "Check your bank statement in 7 days to confirm no charge"
      ]
    },
    {
      "action_type": "reminder",
      "target_service": "Planet Fitness",
      "priority": "medium",
      "action_payload": {
        "subject": null,
        "body": null,
        "task": "Review gym membership usage for Planet Fitness. If not visiting 4x/month, call to cancel.",
        "deadline": "2025-06-01"
      },
      "execution_status": "ready",
      "next_steps": [
        "Check gym visit log or app for last 30 days",
        "Call member services: 1-800-xxx-xxxx",
        "Request cancellation in writing"
      ]
    }
  ],
  "total_actions": 2,
  "estimated_monthly_savings": 37.98,
  "execution_summary": "Generated 1 cancellation email and 1 review reminder. Estimated savings: $37.98/month ($455.76/year)."
}

Rules:
- estimated_monthly_savings = sum of costs for high + medium risk actions only
- Generate one action per detected item
- For email_draft: body must be a concise professional email (2-3 short sentences max, under 60 words)
- Deadlines for reminders: 7-14 days from today
- execution_status is always "ready" for drafts, "pending" for reminders"""


class ActionAgent:
    def __init__(self, provider: ModelProvider) -> None:
        self._provider = provider

    def fallback_result(self, finance_findings: dict | None = None) -> dict:
        reminder_deadline = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
        return self._sanitize_result({}, finance_findings or {}, reminder_deadline)

    @staticmethod
    def _canonical_name(value: str | None) -> str:
        if not value:
            return ""
        return re.sub(r"[^a-z0-9]+", "", value.lower())

    @staticmethod
    def _clean_text(value: object) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        if not text:
            return None

        if any(marker in text for marker in ("â", "Â", "Ã")):
            try:
                repaired = text.encode("latin-1").decode("utf-8")
                if repaired:
                    text = repaired
            except (UnicodeEncodeError, UnicodeDecodeError):
                pass

        replacements = {
            "â€”": "-",
            "â€“": "-",
            "â€˜": "'",
            "â€™": "'",
            'â€œ': '"',
            'â€\x9d': '"',
            "—": "-",
            "–": "-",
            "‘": "'",
            "’": "'",
            "“": '"',
            "”": '"',
            "…": "...",
            "−": "-",
            "Â": "",
        }
        for bad, good in replacements.items():
            text = text.replace(bad, good)

        text = unicodedata.normalize("NFKD", text)
        text = text.encode("ascii", "ignore").decode("ascii")
        text = text.replace("\r\n", "\n")
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @staticmethod
    def _clean_steps(value: object) -> list[str]:
        if not isinstance(value, list):
            return []
        cleaned: list[str] = []
        for item in value:
            text = ActionAgent._clean_text(item)
            if text:
                cleaned.append(text)
        return cleaned[:4]

    @staticmethod
    def _coerce_deadline(value: object, fallback: str) -> str:
        text = ActionAgent._clean_text(value)
        if text and re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
            return text
        return fallback

    @staticmethod
    def _extract_actions(result: dict) -> list[dict]:
        actions = result.get("actions") if isinstance(result, dict) else None
        if isinstance(actions, list):
            return [item for item in actions if isinstance(item, dict)]
        if isinstance(actions, dict):
            return [actions]
        if isinstance(result, dict):
            if isinstance(result.get("action"), dict):
                return [result["action"]]
            if isinstance(result.get("action_items"), list):
                return [item for item in result["action_items"] if isinstance(item, dict)]
        return []

    @staticmethod
    def _default_email_subject(service: str) -> str:
        return f"Subscription Review Request - {service}"

    @staticmethod
    def _default_email_body(service: str, reason: str) -> str:
        return (
            f"Hello {service} Support,\n\n"
            f"I would like to review or cancel my current subscription for {service}. {reason} "
            "Please confirm the next steps and the effective date for any change.\n\n"
            "Regards,\n[YOUR_NAME]\n[YOUR_EMAIL]"
        )

    @staticmethod
    def _default_task(service: str, priority: str, reason: str) -> str:
        if priority == "low":
            return f"Review recent {service} usage and decide whether the subscription still earns a place in the budget. {reason}"
        return f"Contact {service} to review downgrade or cancellation options before the next billing cycle. {reason}"

    def _build_action_from_item(
        self,
        item: dict,
        raw_action: dict | None,
        reminder_deadline: str,
    ) -> dict:
        service = self._clean_text(item.get("service")) or "Subscription"
        priority = str(item.get("risk_level") or "low").lower()
        if priority not in {"high", "medium", "low"}:
            priority = "low"
        reason = self._clean_text(item.get("reason")) or "Recent usage suggests this subscription should be reviewed."

        raw_payload = raw_action.get("action_payload") if isinstance(raw_action, dict) else {}
        if not isinstance(raw_payload, dict):
            raw_payload = {}

        raw_type = self._clean_text(raw_action.get("action_type")) if isinstance(raw_action, dict) else None
        action_type = raw_type.lower() if raw_type else None
        if action_type not in {"email_draft", "reminder"}:
            action_type = "email_draft" if priority == "high" else "reminder"
        if priority == "high":
            action_type = "email_draft"

        subject = self._clean_text(raw_payload.get("subject"))
        body = self._clean_text(raw_payload.get("body"))
        task = self._clean_text(raw_payload.get("task"))
        deadline = self._coerce_deadline(raw_payload.get("deadline"), reminder_deadline)

        if action_type == "email_draft":
            subject = subject or self._default_email_subject(service)
            body = body or self._default_email_body(service, reason)
            task = None
            deadline = None
            execution_status = "ready"
        else:
            subject = None
            body = None
            task = task or self._default_task(service, priority, reason)
            execution_status = "pending"

        next_steps = self._clean_steps(raw_action.get("next_steps")) if isinstance(raw_action, dict) else []
        if not next_steps:
            if action_type == "email_draft":
                next_steps = [
                    f"Review the draft for {service}",
                    "Send it from the account email tied to the subscription",
                    "Save the provider confirmation for your records",
                ]
            else:
                next_steps = [
                    f"Check the latest usage details for {service}",
                    "Decide whether to keep, downgrade, or cancel before renewal",
                    "Set a short follow-up after the reminder date",
                ]

        return {
            "action_type": action_type,
            "target_service": service,
            "priority": priority,
            "action_payload": {
                "subject": subject,
                "body": body,
                "task": task,
                "deadline": deadline,
            },
            "execution_status": execution_status,
            "next_steps": next_steps,
        }

    def _summarize_actions(self, actions: list[dict], estimated_monthly_savings: float) -> str:
        email_count = sum(1 for action in actions if action.get("action_type") == "email_draft")
        reminder_count = sum(1 for action in actions if action.get("action_type") == "reminder")
        parts: list[str] = []
        if email_count:
            parts.append(f"{email_count} email draft{'s' if email_count != 1 else ''}")
        if reminder_count:
            parts.append(f"{reminder_count} reminder{'s' if reminder_count != 1 else ''}")
        if not parts:
            parts.append("0 actions")
        summary = "Prepared " + " and ".join(parts)
        summary += f". Estimated savings: ${estimated_monthly_savings:.2f}/month."
        return summary

    def _sanitize_result(self, result: dict, finance_findings: dict, reminder_deadline: str) -> dict:
        detected_items = finance_findings.get("detected_items") or []
        if not isinstance(detected_items, list):
            detected_items = []

        raw_actions = self._extract_actions(result if isinstance(result, dict) else {})
        actions_by_service: dict[str, dict] = {}
        for raw_action in raw_actions:
            candidates = [
                raw_action.get("target_service"),
                raw_action.get("service"),
            ]
            payload = raw_action.get("action_payload")
            if isinstance(payload, dict):
                candidates.append(payload.get("service"))
            key = ""
            for candidate in candidates:
                key = self._canonical_name(self._clean_text(candidate))
                if key:
                    break
            if key and key not in actions_by_service:
                actions_by_service[key] = raw_action

        sanitized_actions: list[dict] = []
        estimated_monthly_savings = 0.0

        for item in detected_items:
            if not isinstance(item, dict):
                continue
            service = self._clean_text(item.get("service"))
            key = self._canonical_name(service)
            raw_action = actions_by_service.get(key)
            sanitized_action = self._build_action_from_item(item, raw_action, reminder_deadline)
            sanitized_actions.append(sanitized_action)

            priority = sanitized_action.get("priority")
            if priority in {"high", "medium"}:
                try:
                    estimated_monthly_savings += float(item.get("monthly_cost") or 0)
                except (TypeError, ValueError):
                    pass

        if not sanitized_actions:
            for raw_action in raw_actions:
                if not isinstance(raw_action, dict):
                    continue
                fallback_item = {
                    "service": raw_action.get("target_service") or raw_action.get("service") or "Subscription",
                    "risk_level": raw_action.get("priority") or "low",
                    "reason": "Review this subscription decision before making account changes.",
                    "monthly_cost": 0,
                }
                sanitized_actions.append(self._build_action_from_item(fallback_item, raw_action, reminder_deadline))

        estimated_monthly_savings = round(estimated_monthly_savings, 2)
        return {
            "actions": sanitized_actions,
            "total_actions": len(sanitized_actions),
            "estimated_monthly_savings": estimated_monthly_savings,
            "execution_summary": self._summarize_actions(sanitized_actions, estimated_monthly_savings),
        }

    async def execute(self, finance_findings: dict, orchestrator_context: dict) -> tuple[dict, str]:
        """Returns (action_output_dict, provider_name_used)."""
        today = datetime.now().strftime("%Y-%m-%d")
        reminder_deadline = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")

        prompt = (
            f"Today's date: {today}\n"
            f"Reminder deadline target: {reminder_deadline}\n\n"
            f"Finance Agent findings:\n{json.dumps(finance_findings, indent=2)}\n\n"
            "Generate one specific action per detected item. "
            "For HIGH risk → full cancellation email. "
            "For MEDIUM risk → downgrade/negotiation email or reminder task. "
            "For LOW risk → review reminder task."
        )
        result, used = await self._provider.generate_json(prompt, SYSTEM_PROMPT)
        result = self._sanitize_result(result, finance_findings, reminder_deadline)
        logger.info(
            "Action Agent → %d actions, savings=$%.2f [provider=%s]",
            result.get("total_actions", 0),
            result.get("estimated_monthly_savings", 0),
            used,
        )
        return result, used
