from __future__ import annotations

from datetime import datetime, timedelta


class CalendarAgent:
    def __init__(self, provider=None) -> None:
        self._provider = provider

    @staticmethod
    def _due_in_days(priority: str) -> int:
        if priority == "high":
            return 3
        if priority == "medium":
            return 7
        return 14

    def fallback_result(self, finance_findings: dict | None = None, action_findings: dict | None = None) -> dict:
        today = datetime.now().date()
        reminders: list[dict] = []
        items = (finance_findings or {}).get("detected_items") or []
        actions_by_service: dict[str, dict] = {}
        for action in (action_findings or {}).get("actions") or []:
            service = action.get("target_service")
            if service and service not in actions_by_service:
                actions_by_service[service] = action

        for item in items:
            if not isinstance(item, dict):
                continue
            service = item.get("service") or "Subscription"
            priority = str(item.get("risk_level") or "medium").lower()
            reason = item.get("reason") or "Review the value of this recurring charge before the next billing cycle."
            due_date = (today + timedelta(days=self._due_in_days(priority))).isoformat()
            action = actions_by_service.get(service, {})
            payload = action.get("action_payload") if isinstance(action.get("action_payload"), dict) else {}
            title = f"Review {service} before renewal"
            note = payload.get("task") or reason
            if action.get("action_type") == "email_draft":
                title = f"Send {service} subscription review request"
                note = "Review the prepared draft, send it from the account email, and save the provider confirmation."

            reminders.append(
                {
                    "service": service,
                    "priority": priority,
                    "title": title,
                    "due_date": due_date,
                    "channel": "calendar",
                    "note": note,
                }
            )

        return {
            "reminders": reminders,
            "total_reminders": len(reminders),
            "schedule_summary": (
                f"Scheduled {len(reminders)} follow-up reminder{'s' if len(reminders) != 1 else ''} "
                "to keep the cancellation and downgrade plan moving."
            ),
        }

    async def execute(self, finance_findings: dict | None = None, action_findings: dict | None = None) -> tuple[dict, str]:
        return self.fallback_result(finance_findings, action_findings), "rule_based"