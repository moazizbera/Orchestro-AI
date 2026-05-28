import { DollarSign, Zap, Clock, Cpu } from 'lucide-react'

const RISK_META = {
  high: {
    emoji: '🚨',
    label: 'High Risk',
    verdict: 'Significant Subscription Waste Detected',
    topBg: 'bg-gradient-to-r from-red-950/80 via-gray-900/90 to-gray-900',
    border: 'border-red-900/60',
    badge: 'bg-red-500/15 border border-red-500/40 text-red-300',
    bar: 'bg-red-500',
    savingsColor: 'text-red-400',
  },
  medium: {
    emoji: '⚠️',
    label: 'Medium Risk',
    verdict: 'Moderate Spending Inefficiencies Found',
    topBg: 'bg-gradient-to-r from-amber-950/60 via-gray-900/90 to-gray-900',
    border: 'border-amber-900/50',
    badge: 'bg-amber-500/15 border border-amber-500/40 text-amber-300',
    bar: 'bg-amber-500',
    savingsColor: 'text-amber-400',
  },
  low: {
    emoji: '✅',
    label: 'Low Risk',
    verdict: 'Minor Optimization Opportunities Identified',
    topBg: 'bg-gradient-to-r from-emerald-950/50 via-gray-900/90 to-gray-900',
    border: 'border-emerald-900/40',
    badge: 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300',
    bar: 'bg-emerald-500',
    savingsColor: 'text-emerald-400',
  },
}

export default function VerdictCard({ result }) {
  if (!result) return null

  const finance = result.finance_agent_output
  const action  = result.action_agent_output
  const decision = result.orchestrator_decision

  const riskLevel     = finance?.risk_level || 'medium'
  const meta          = RISK_META[riskLevel] || RISK_META.medium
  const confidence    = Math.round((decision?.confidence || 0.85) * 100)
  const monthlySavings = action?.estimated_monthly_savings ?? finance?.monthly_loss_estimate ?? 0
  const actionsCount  = action?.total_actions ?? 0
  const itemsCount    = finance?.detected_items?.length ?? 0
  const timeSavedMin  = result.impact_metrics?.time_saved_minutes ?? 0
  const execSec       = (result.execution_time_ms / 1000).toFixed(1)
  return (
    <div className={`rounded-xl border ${meta.border} overflow-hidden animate-fade-up`}>

      {/* ── Top verdict band ─────────────────────────────────────────── */}
      <div className={`${meta.topBg} px-6 pt-5 pb-4`}>

        {/* Mode chip */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 rounded-full px-2.5 py-0.5">
            <Cpu size={10} /> Gemini agent analysis
          </span>
        </div>

        {/* Verdict + confidence */}
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-bold ${meta.badge}`}>
              <span>{meta.emoji}</span>
              <span>{meta.label}: {meta.verdict}</span>
            </div>
            <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
              {decision?.reasoning || 'Multi-agent analysis complete.'}
            </p>
          </div>

          {/* Confidence circle */}
          <div className="text-right shrink-0">
            <p className="text-4xl font-extrabold text-white tabular-nums">{confidence}%</p>
            <p className="text-xs text-gray-500 mt-0.5">confidence</p>
            <div className="mt-2 w-20 h-1.5 bg-gray-800 rounded-full ml-auto overflow-hidden">
              <div className={`h-full ${meta.bar} rounded-full transition-all duration-700`} style={{ width: `${confidence}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────── */}
      <div className="bg-gray-900/80 border-t border-gray-800/50 grid grid-cols-3 divide-x divide-gray-800/50">

        {/* Savings */}
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
            <DollarSign size={16} className="text-red-400" />
          </div>
          <div>
            <p className={`text-xl font-bold ${meta.savingsColor} tabular-nums`}>
              ${monthlySavings.toFixed(0)}
              <span className="text-xs font-normal text-gray-500">/mo</span>
            </p>
            <p className="text-xs text-gray-500">
              ${(monthlySavings * 12).toFixed(0)}/yr potential savings
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
            <Zap size={16} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white tabular-nums">{actionsCount}</p>
            <p className="text-xs text-gray-500">
              {actionsCount === 1 ? 'action' : 'actions'} ready · {itemsCount} subscriptions scanned
            </p>
          </div>
        </div>

        {/* Time */}
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Clock size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white tabular-nums">
              {timeSavedMin > 0 ? `${timeSavedMin}m` : `${execSec}s`}
            </p>
            <p className="text-xs text-gray-500">
              {timeSavedMin > 0 ? 'manual work saved' : 'analysis time'}
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
