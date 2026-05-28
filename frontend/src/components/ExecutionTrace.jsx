import { CheckCircle2, ArrowRight } from 'lucide-react'

const STEP_META = {
  orchestrator: { emoji: '🧠', label: 'Orchestrator',   role: 'Intent Router',    color: 'indigo' },
  finance_agent: { emoji: '📊', label: 'Finance Agent',  role: 'Waste Detector',   color: 'amber'  },
  action_agent:  { emoji: '⚡', label: 'Action Agent',   role: 'Task Generator',   color: 'emerald' },
  negotiation_agent: { emoji: '🤝', label: 'Negotiation Agent', role: 'Retention Playbooks', color: 'rose' },
  calendar_agent: { emoji: '🗓️', label: 'Calendar Agent', role: 'Follow-up Scheduler', color: 'sky' },
  scenario_agent: { emoji: '🧭', label: 'Scenario Agent', role: 'Savings Planner', color: 'violet' },
  complete:      { emoji: '✅', label: 'Complete',        role: 'All done',         color: 'emerald' },
}

const COLOR = {
  indigo:  { pill: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',   text: 'text-indigo-400'  },
  amber:   { pill: 'bg-amber-500/15  text-amber-300  border-amber-500/30',    text: 'text-amber-400'   },
  emerald: { pill: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', text: 'text-emerald-400' },
  rose:    { pill: 'bg-rose-500/15 text-rose-300 border-rose-500/30', text: 'text-rose-400' },
  sky:     { pill: 'bg-sky-500/15 text-sky-300 border-sky-500/30', text: 'text-sky-400' },
  violet:  { pill: 'bg-violet-500/15 text-violet-300 border-violet-500/30', text: 'text-violet-400' },
}

function stepSummary(key, result) {
  const d = result?.orchestrator_decision
  const f = result?.finance_agent_output
  const a = result?.action_agent_output
  const n = result?.negotiation_agent_output
  const c = result?.calendar_agent_output
  const s = result?.scenario_agent_output
  switch (key) {
    case 'orchestrator':
      return d
        ? `${(d.intent || '').replace(/_/g, ' ')} · ${Math.round((d.confidence || 0.85) * 100)}% confidence`
        : 'Routing complete'
    case 'finance_agent':
      return f
        ? `${f.detected_items?.length ?? 0} subscriptions · $${f.monthly_loss_estimate?.toFixed(2) ?? '0'}/mo waste`
        : 'Analysis complete'
    case 'action_agent':
      return a
        ? `${a.total_actions ?? 0} actions generated · $${a.estimated_monthly_savings?.toFixed(2) ?? '0'}/mo savings`
        : 'Actions ready'
    case 'negotiation_agent':
      return n
        ? `${n.total_playbooks ?? 0} provider playbooks · $${n.estimated_monthly_savings?.toFixed(2) ?? '0'}/mo target`
        : 'Negotiation plan ready'
    case 'calendar_agent':
      return c
        ? `${c.total_reminders ?? 0} reminders scheduled`
        : 'Schedule ready'
    case 'scenario_agent':
      return s
        ? `${s.recommended_scenario ?? 'Balanced'} scenario recommended · ${s.scenarios?.length ?? 0} plans built`
        : 'Scenario plans ready'
    default:
      return result ? `Finished in ${(result.execution_time_ms / 1000).toFixed(1)}s` : 'Done'
  }
}

function providerLabel(key, result) {
  const used = result?.providers_used
  const map = {
    orchestrator:  used?.orchestrator,
    finance_agent: result?.finance_agent_output?.confidence_label,
    action_agent:  result?.action_agent_output?.confidence_label,
    negotiation_agent: result?.negotiation_agent_output?.confidence_label,
    calendar_agent: result?.calendar_agent_output?.confidence_label,
    scenario_agent: result?.scenario_agent_output?.confidence_label,
  }
  return map[key] || null
}

export default function ExecutionTrace({ result }) {
  // Accept either result (new) or decision (legacy) for backwards compat
  const decision = result?.orchestrator_decision ?? result
  if (!decision) return null

  const steps = [
    'orchestrator',
    ...(decision.agents_required || []),
    'complete',
  ]

  const hasFullResult = !!result?.orchestrator_decision

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Execution Pipeline</h3>
        {hasFullResult && (
          <span className="text-xs text-gray-600">
            {steps.length - 1} agent{steps.length - 1 !== 1 ? 's' : ''} · {(result.execution_time_ms / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Pipeline bubbles */}
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((key, i) => {
          const meta = STEP_META[key] || { emoji: '◆', label: key, color: 'indigo' }
          const c = COLOR[meta.color]
          return (
            <div key={i} className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1.5 rounded-full border font-medium flex items-center gap-1.5 ${c.pill}`}>
                <span>{meta.emoji}</span>
                <CheckCircle2 size={10} />
                {meta.label}
              </span>
              {i < steps.length - 1 && <ArrowRight size={13} className="text-gray-700" />}
            </div>
          )
        })}
      </div>

      {/* Per-step detail cards */}
      <div className="space-y-2">
        {steps.filter((k) => k !== 'complete').map((key) => {
          const meta = STEP_META[key] || { emoji: '◆', label: key, role: '', color: 'indigo' }
          const c = COLOR[meta.color]
          const summary = hasFullResult ? stepSummary(key, result) : null
          const badge   = hasFullResult ? providerLabel(key, result) : null

          return (
            <div key={key} className="flex items-center gap-3 bg-gray-950 rounded-lg px-4 py-3">
              <span className="text-base shrink-0">{meta.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-100">{meta.label}</p>
                  <span className="text-xs text-gray-600">·</span>
                  <span className="text-xs text-gray-500">{meta.role}</span>
                </div>
                {summary && <p className="text-xs text-gray-500 mt-0.5">{summary}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {badge && (
                  <span className="text-xs text-gray-600 border border-gray-800 rounded px-1.5 py-0.5">
                    {badge}
                  </span>
                )}
                <span className={`text-xs font-medium ${c.text}`}>✓ Done</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
