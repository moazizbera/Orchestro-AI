from __future__ import annotations


class ScenarioAgent:
    def __init__(self, provider=None) -> None:
        self._provider = provider

    @staticmethod
    def _scenario_slice(items: list[dict], limit: int) -> list[dict]:
        ranked = sorted(
            (item for item in items if isinstance(item, dict)),
            key=lambda item: (
                {"high": 0, "medium": 1, "low": 2}.get(str(item.get("risk_level") or "medium").lower(), 1),
                -float(item.get("monthly_cost") or 0),
            ),
        )
        return ranked[:limit]

    @staticmethod
    def _annual(monthly: float) -> float:
        return round(monthly * 12, 2)

    def fallback_result(
        self,
        finance_findings: dict | None = None,
        action_findings: dict | None = None,
        negotiation_findings: dict | None = None,
    ) -> dict:
        detected_items = (finance_findings or {}).get("detected_items") or []
        total_monthly_loss = float((finance_findings or {}).get("monthly_loss_estimate") or 0.0)
        total_actions = int((action_findings or {}).get("total_actions") or 0)
        total_playbooks = int((negotiation_findings or {}).get("total_playbooks") or 0)

        conservative_items = self._scenario_slice(detected_items, 1)
        balanced_items = self._scenario_slice(detected_items, min(3, len(detected_items)))
        aggressive_items = self._scenario_slice(detected_items, len(detected_items))

        conservative_monthly = round(sum(float(item.get("monthly_cost") or 0) for item in conservative_items), 2)
        balanced_monthly = round(min(total_monthly_loss, conservative_monthly + max(total_monthly_loss - conservative_monthly, 0) * 0.6), 2)
        aggressive_monthly = round(total_monthly_loss, 2)

        scenarios = [
            {
                "name": "Conservative",
                "monthly_savings": conservative_monthly,
                "annual_savings": self._annual(conservative_monthly),
                "services": [item.get("service") or "Subscription" for item in conservative_items],
                "actions": [
                    "Cancel only the highest-risk subscription first.",
                    "Send one provider message and confirm the billing stop date.",
                ],
                "timeline": "This week",
                "risk_level": "low",
                "summary": "Focus on the clearest cancellation candidate to secure an immediate win with minimal disruption.",
            },
            {
                "name": "Balanced",
                "monthly_savings": balanced_monthly,
                "annual_savings": self._annual(balanced_monthly),
                "services": [item.get("service") or "Subscription" for item in balanced_items],
                "actions": [
                    "Cancel the highest-risk subscriptions and downgrade one medium-risk service.",
                    "Use the negotiation playbooks before the next billing cycle.",
                    "Follow the generated reminders to keep the plan on track.",
                ],
                "timeline": "7 to 10 days",
                "risk_level": "medium",
                "summary": "Combine fast cancellations with one downgrade to recover most of the waste without overcorrecting.",
            },
            {
                "name": "Aggressive",
                "monthly_savings": aggressive_monthly,
                "annual_savings": self._annual(aggressive_monthly),
                "services": [item.get("service") or "Subscription" for item in aggressive_items],
                "actions": [
                    "Act on every flagged subscription in this audit.",
                    "Use cancellation drafts, negotiation playbooks, and reminders as a coordinated savings sprint.",
                    "Review the new baseline spend after all provider confirmations arrive.",
                ],
                "timeline": "Two weeks",
                "risk_level": "high",
                "summary": "Execute the full cost-cutting plan now to reset the subscription stack and capture the maximum modeled upside.",
            },
        ]

        recommended = "Balanced"
        if len(detected_items) <= 1:
            recommended = "Conservative"
        elif total_monthly_loss >= 100 and total_actions >= 3:
            recommended = "Aggressive"

        return {
            "scenarios": scenarios,
            "recommended_scenario": recommended,
            "scenario_summary": (
                f"Built 3 savings scenarios from {len(detected_items)} flagged subscription(s), "
                f"{total_actions} action(s), and {total_playbooks} negotiation playbook(s)."
            ),
        }

    async def execute(
        self,
        finance_findings: dict | None = None,
        action_findings: dict | None = None,
        negotiation_findings: dict | None = None,
    ) -> tuple[dict, str]:
        return self.fallback_result(finance_findings, action_findings, negotiation_findings), "rule_based"