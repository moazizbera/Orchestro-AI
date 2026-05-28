import json
import logging
import re
from datetime import datetime

from providers.model_provider import ModelProvider

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Finance Intelligence Agent for Orchestro AI.

Your job: analyze the user's financial situation and identify wasteful or risky spending.

Focus on:
1. Recurring subscriptions that overlap or are low-usage
2. Services with recent price increases
3. Duplicate entertainment / software / cloud services
4. Gym / wellness memberships that may be unused
5. Premium tiers that can be downgraded

Generate REALISTIC detected items using real market prices:
- Netflix Standard with Ads: $7.99 | Standard: $15.49 | Premium: $22.99
- Spotify Individual: $10.99 | Duo: $14.99 | Family: $17.99
- Disney+: $7.99 / $13.99
- Hulu: $7.99 / $17.99
- Apple TV+: $9.99
- Amazon Prime: $14.99/mo
- Gym memberships: $30–$80/mo
- Adobe Creative Cloud: $54.99/mo
- Microsoft 365 Personal: $9.99/mo
- iCloud+ 200GB: $2.99/mo

Return ONLY valid JSON:
{
  "detected_items": [
    {
      "service": "Netflix Premium",
      "category": "streaming",
      "monthly_cost": 22.99,
      "risk_level": "high",
      "reason": "3 overlapping streaming services; Premium tier unnecessary for 1 user"
    }
  ],
  "risk_level": "high",
  "monthly_loss_estimate": 67.48,
  "annual_loss_estimate": 809.76,
  "priority_actions": [
    "Downgrade Netflix to Standard ($7.50 saved/mo)",
    "Cancel Hulu — content overlap with Disney+"
  ],
  "reasoning": "Identified 4 services with high waste potential totaling $67.48/month"
}

Generate 4–7 realistic detected items. Include a mix of high, medium, and low risk items.
Rules: monthly_loss_estimate = sum of high + medium risk items. annual = monthly × 12."""

RISK_ORDER = {"high": 3, "medium": 2, "low": 1}
NEGATING_REASON_PATTERN = re.compile(
  r"\b(no\s+cost\s+savings|no\s+savings|worth\s+it|not\s+(?:a\s+)?(?:significant|major)\s+cost|no\s+issue|keep\s+it)\b",
  re.IGNORECASE,
)


class FinanceAgent:
  def __init__(self, provider: ModelProvider) -> None:
    self._provider = provider

  def fallback_result(self, subscriptions: list[dict] | None = None) -> dict:
    return self._build_fallback_result(subscriptions or [])

  @staticmethod
  def _normalized_category(subscription: dict) -> str:
    return (subscription.get("category") or "uncategorized").strip().lower()

  @staticmethod
  def _subscription_monthly_cost(subscription: dict) -> float:
    value = subscription.get("monthlyCost", subscription.get("amount", 0))
    try:
      return float(value)
    except (TypeError, ValueError):
      return 0.0

  @staticmethod
  def _canonical_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()

  @classmethod
  def _find_subscription_match(cls, service_name: str, subscriptions: list[dict]) -> dict | None:
    target = cls._canonical_name(service_name)
    if not target:
      return None

    exact_match = None
    partial_match = None
    for subscription in subscriptions:
      name = subscription.get("name", "")
      candidate = cls._canonical_name(name)
      if not candidate:
        continue
      if candidate == target:
        exact_match = subscription
        break
      if target in candidate or candidate in target:
        partial_match = partial_match or subscription

    return exact_match or partial_match

  @staticmethod
  def _days_since_last_used(subscription: dict) -> int | None:
    value = subscription.get("lastUsed") or subscription.get("last_used")
    if not value:
      return None
    try:
      return max((datetime.utcnow().date() - datetime.fromisoformat(value).date()).days, 0)
    except ValueError:
      return None

  def _default_reason_for_subscription(self, subscription: dict, risk_level: str) -> str:
    monthly_cost = self._subscription_monthly_cost(subscription)
    category = self._normalized_category(subscription)
    days_since_used = self._days_since_last_used(subscription)

    if days_since_used is not None and days_since_used >= 90:
      return f"No recorded usage for {days_since_used} days, which makes this one of the strongest cancellation candidates in the list."
    if category == "streaming" and monthly_cost >= 15:
      return "This is a high-cost streaming tier, so a downgrade is worth checking before another billing cycle hits."
    if monthly_cost >= 40:
      return "This is one of the more expensive recurring charges, so it deserves a direct value check now."
    if risk_level == "high":
      return "This recurring charge stands out as a strong cancellation candidate based on cost and usage context."
    if risk_level == "medium":
      return "This recurring charge is worth reviewing for a downgrade, pause, or tighter usage check."
    return "This subscription stays below the top savings opportunities, but it is still worth monitoring."

  def _normalize_reason(self, subscription: dict, risk_level: str, reason: str | None) -> str:
    fallback_reason = self._default_reason_for_subscription(subscription, risk_level)
    candidate = (reason or "").strip()
    if not candidate:
      return fallback_reason

    if risk_level in {"high", "medium"} and NEGATING_REASON_PATTERN.search(candidate):
      return fallback_reason

    if len(candidate) < 12:
      return fallback_reason

    return candidate

  def _score_subscription_risk(self, subscription: dict) -> str:
    monthly_cost = self._subscription_monthly_cost(subscription)
    category = self._normalized_category(subscription)
    days_since_used = self._days_since_last_used(subscription)

    score = 0
    if monthly_cost >= 50:
      score += 3
    elif monthly_cost >= 20:
      score += 2
    elif monthly_cost >= 10:
      score += 1

    if days_since_used is not None:
      if days_since_used >= 120:
        score += 4
      elif days_since_used >= 60:
        score += 3
      elif days_since_used >= 30:
        score += 1

    if category in {"streaming", "software", "fitness", "gym", "cloud"}:
      score += 1
    if category == "streaming" and monthly_cost >= 15:
      score += 1

    if score >= 5:
      return "high"
    if score >= 3:
      return "medium"
    return "low"

  def _build_detected_item(self, subscription: dict, reason: str | None = None) -> dict:
    risk_level = self._score_subscription_risk(subscription)
    monthly_cost = self._subscription_monthly_cost(subscription)
    return {
      "service": subscription.get("name", "Unknown subscription"),
      "category": self._normalized_category(subscription),
      "monthly_cost": round(monthly_cost, 2),
      "risk_level": risk_level,
      "reason": self._normalize_reason(subscription, risk_level, reason),
    }

  def _build_fallback_result(self, subscriptions: list[dict]) -> dict:
    ranked: list[dict] = []
    for subscription in subscriptions:
      monthly_cost = self._subscription_monthly_cost(subscription)
      if monthly_cost <= 0:
        continue

      ranked.append(self._build_detected_item(subscription))

    ranked.sort(key=lambda item: (RISK_ORDER.get(item["risk_level"], 0), item["monthly_cost"]), reverse=True)
    detected_items = ranked[: min(4, len(ranked))]
    monthly_loss_estimate = round(
      sum(item["monthly_cost"] for item in detected_items if item["risk_level"] in {"high", "medium"}),
      2,
    )
    priority_actions = []
    for item in detected_items:
      if item["risk_level"] == "high":
        priority_actions.append(f"Start with {item['service']}: it has the clearest savings upside right now.")
      elif item["risk_level"] == "medium":
        priority_actions.append(f"Review {item['service']} for a downgrade or pause this week.")
    if not priority_actions and detected_items:
      priority_actions.append(f"Review {detected_items[0]['service']} first for a quick savings check.")

    return {
      "detected_items": detected_items,
      "risk_level": detected_items[0]["risk_level"] if detected_items else "low",
      "monthly_loss_estimate": monthly_loss_estimate,
      "annual_loss_estimate": round(monthly_loss_estimate * 12, 2),
      "priority_actions": priority_actions,
      "reasoning": f"Built a deterministic review from {len(detected_items)} provided subscription(s) and kept the analysis limited to the services the user actually supplied.",
    }

  def _sanitize_result(self, result: dict, subscriptions: list[dict] | None) -> dict:
    if not subscriptions:
      return result

    sanitized_items: list[dict] = []
    seen_names: set[str] = set()
    for item in result.get("detected_items", []):
      match = self._find_subscription_match(item.get("service", ""), subscriptions)
      if not match:
        continue

      service_name = match.get("name", item.get("service", "Unknown subscription"))
      canonical_name = self._canonical_name(service_name)
      if canonical_name in seen_names:
        continue
      seen_names.add(canonical_name)

      sanitized_items.append(self._build_detected_item(match, item.get("reason")))

    if not sanitized_items:
      return self._build_fallback_result(subscriptions)

    sanitized_items.sort(key=lambda item: (RISK_ORDER.get(item["risk_level"], 0), item["monthly_cost"]), reverse=True)
    monthly_loss_estimate = round(
      sum(item["monthly_cost"] for item in sanitized_items if item["risk_level"] in {"high", "medium"}),
      2,
    )
    priority_actions = []
    for item in sanitized_items:
      if item["risk_level"] == "high":
        priority_actions.append(f"Start with {item['service']}: it has the clearest savings upside right now.")
      elif item["risk_level"] == "medium":
        priority_actions.append(f"Review {item['service']} for a downgrade or pause next.")
    if not priority_actions and sanitized_items:
      priority_actions.append(f"Review {sanitized_items[0]['service']} first for a quick savings check.")

    highest_risk = max(sanitized_items, key=lambda item: RISK_ORDER.get(item["risk_level"], 0))["risk_level"]
    return {
      "detected_items": sanitized_items,
      "risk_level": highest_risk,
      "monthly_loss_estimate": monthly_loss_estimate,
      "annual_loss_estimate": round(monthly_loss_estimate * 12, 2),
      "priority_actions": priority_actions,
      "reasoning": f"Kept the analysis grounded to {len(sanitized_items)} provided subscription(s) and removed any services that were not in the user's input.",
    }

  async def analyze(
    self,
    user_request: str,
    orchestrator_context: dict,
    subscriptions: list | None = None,
  ) -> tuple[dict, str]:
    """Returns (finance_output_dict, provider_name_used)."""
    sub_context = ""
    if subscriptions:
      lines = ["User's actual subscriptions (analyse THESE specifically):"]
      for subscription in subscriptions:
        name = subscription.get("name", "Unknown subscription")
        category = subscription.get("category", "uncategorized")
        monthly_cost = self._subscription_monthly_cost(subscription)
        last_used = subscription.get("lastUsed") or subscription.get("last_used")
        last = f", last used {last_used}" if last_used else ""
        lines.append(
          f"  • {name} — ${monthly_cost:.2f}/mo [{category}]{last}"
        )
      lines.append(
        "\nFocus your analysis on the services listed above. "
        "Flag overlaps, unused services, and downgrade opportunities. Do not invent services that are not listed."
      )
      sub_context = "\n\n" + "\n".join(lines)

    prompt = (
      f'User context: "{user_request}"\n\n'
      f"Orchestrator plan:\n{json.dumps(orchestrator_context.get('execution_plan', []), indent=2)}"
      f"{sub_context}\n\n"
      "Identify specific wasteful subscriptions. Generate 4–7 realistic detected items with accurate pricing."
    )
    result, used = await self._provider.generate_json(prompt, SYSTEM_PROMPT)
    result = self._sanitize_result(result, subscriptions)
    logger.info(
      "Finance Agent → %d items, risk=%s, monthly_loss=$%.2f [provider=%s]",
      len(result.get("detected_items", [])),
      result.get("risk_level"),
      result.get("monthly_loss_estimate", 0),
      used,
    )
    return result, used
