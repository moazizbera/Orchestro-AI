from pydantic import BaseModel, Field
from typing import Optional, List, Any
from enum import Enum


# ── Orchestrator models ─────────────────────────────────────────────────────

class ExecutionStep(BaseModel):
    step: int
    agent: str
    task: str
    input: str


class OrchestratorDecision(BaseModel):
    intent: str
    confidence: float
    primary_agent: str
    agents_required: List[str]
    execution_plan: List[ExecutionStep]
    reasoning: str
    expected_outcome: str


# ── Finance Agent models ─────────────────────────────────────────────────────

class DetectedItem(BaseModel):
    service: str
    category: str
    monthly_cost: float
    risk_level: str
    reason: str


class FinanceAgentOutput(BaseModel):
    detected_items: List[DetectedItem]
    risk_level: str
    monthly_loss_estimate: float
    annual_loss_estimate: float
    priority_actions: List[str]
    reasoning: str


# ── Action Agent models ──────────────────────────────────────────────────────

class ActionPayload(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    task: Optional[str] = None
    deadline: Optional[str] = None


class Action(BaseModel):
    action_type: str
    target_service: str
    priority: str
    action_payload: ActionPayload
    execution_status: str
    next_steps: List[str]


class ActionAgentOutput(BaseModel):
    actions: List[Action]
    total_actions: int
    estimated_monthly_savings: float
    execution_summary: str


class NegotiationPlaybook(BaseModel):
    service: str
    priority: str
    channel: str
    strategy: str
    opening_line: str
    talking_points: List[str]
    target_outcome: str
    estimated_monthly_savings: float


class NegotiationAgentOutput(BaseModel):
    playbooks: List[NegotiationPlaybook]
    total_playbooks: int
    estimated_monthly_savings: float
    negotiation_summary: str


class CalendarReminder(BaseModel):
    service: str
    priority: str
    title: str
    due_date: str
    channel: str
    note: str


class CalendarAgentOutput(BaseModel):
    reminders: List[CalendarReminder]
    total_reminders: int
    schedule_summary: str


class SavingsScenario(BaseModel):
    name: str
    monthly_savings: float
    annual_savings: float
    services: List[str]
    actions: List[str]
    timeline: str
    risk_level: str
    summary: str


class ScenarioAgentOutput(BaseModel):
    scenarios: List[SavingsScenario]
    recommended_scenario: str
    scenario_summary: str


# ── API Request / Response models ────────────────────────────────────────────

class OrchestrationRequest(BaseModel):
    request: str = Field(..., min_length=5, max_length=2000)
    user_id: Optional[str] = "anonymous"
    ai_mode: Optional[str] = None   # legacy override field; submission path uses Gemini mode
    agent_permissions: Optional[dict] = None  # e.g. {"financeAgent": ["subscriptions"], "actionAgent": ["email", "calendar"], "negotiationAgent": ["subscriptions", "email"], "calendarAgent": ["calendar"], "scenarioAgent": ["subscriptions"]}
    subscriptions: Optional[List[Any]] = None  # user-provided subscription list from SubscriptionInputPanel


class ImpactMetrics(BaseModel):
    monthly_savings_estimate: float
    annual_savings_estimate: float
    actions_executed: int
    agents_used: int
    time_saved_minutes: int


class OrchestrationResponse(BaseModel):
    request_id: str
    status: str
    user_request: str
    orchestrator_decision: dict
    finance_agent_output: Optional[dict] = None
    action_agent_output: Optional[dict] = None
    negotiation_agent_output: Optional[dict] = None
    calendar_agent_output: Optional[dict] = None
    scenario_agent_output: Optional[dict] = None
    final_summary: str
    impact_metrics: dict
    execution_time_ms: float
    timestamp: str


class AuthRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    secret: str = Field(..., min_length=6, max_length=255)
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)


class SessionUser(BaseModel):
    user_id: str
    email: str
    name: str


class AuthResponse(BaseModel):
    user: SessionUser


class SubscriptionSyncRequest(BaseModel):
    subscriptions: List[Any] = Field(default_factory=list)
