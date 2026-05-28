from __future__ import annotations

class NegotiationAgent:
    def __init__(self, provider=None) -> None:
        self._provider = provider

    @staticmethod
    def _estimated_savings(priority: str, monthly_cost: float) -> float:
        if priority == "high":
            return round(monthly_cost, 2)
        if priority == "medium":
            return round(monthly_cost * 0.35, 2)
        return round(monthly_cost * 0.15, 2)

    def fallback_result(self, finance_findings: dict | None = None, action_findings: dict | None = None) -> dict:
        detected_items = (finance_findings or {}).get("detected_items") or []
        playbooks: list[dict] = []
        total_savings = 0.0

        for item in detected_items:
            if not isinstance(item, dict):
                continue
            service = item.get("service") or "Subscription"
            priority = str(item.get("risk_level") or "medium").lower()
            if priority not in {"high", "medium", "low"}:
                priority = "medium"
            monthly_cost = float(item.get("monthly_cost") or 0)
            reason = item.get("reason") or "The current plan no longer matches recent usage."
            if priority == "low":
                continue

            estimated_savings = self._estimated_savings(priority, monthly_cost)
            total_savings += estimated_savings
            playbooks.append(
                {
                    "service": service,
                    "priority": priority,
                    "channel": "email" if priority == "high" else "chat_or_phone",
                    "strategy": "Request cancellation unless a materially cheaper plan is available" if priority == "high" else "Ask for a downgrade, retention offer, or temporary discount",
                    "opening_line": f"I am reviewing my {service} subscription because the current monthly cost no longer matches how much I use it.",
                    "talking_points": [
                        reason,
                        "Ask whether there is a lower-cost plan, pause option, or retention promotion available today.",
                        "Request written confirmation of any price change or cancellation effective date before ending the conversation.",
                    ],
                    "target_outcome": "Exit the subscription or move to a cheaper plan this billing cycle" if priority == "high" else "Lower the monthly price without losing essential access",
                    "estimated_monthly_savings": estimated_savings,
                }
            )

        return {
            "playbooks": playbooks,
            "total_playbooks": len(playbooks),
            "estimated_monthly_savings": round(total_savings, 2),
            "negotiation_summary": (
                f"Prepared {len(playbooks)} negotiation playbook{'s' if len(playbooks) != 1 else ''} "
                f"covering up to ${round(total_savings, 2):.2f}/month in potential savings."
            ),
        }

    async def execute(self, finance_findings: dict | None = None, action_findings: dict | None = None) -> tuple[dict, str]:
        return self.fallback_result(finance_findings, action_findings), "rule_based"