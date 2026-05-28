import { useState } from 'react'
import { CalendarDays, Clock3, Copy, Download, FileText, History, Mic, Sparkles, Target, TrendingDown, X, Zap } from 'lucide-react'
import ResultsPanel from './ResultsPanel'

function buildJudgeReport(result) {
  const monthlySavings = result.impact_metrics?.monthly_savings_estimate ?? 0
  const annualSavings = result.impact_metrics?.annual_savings_estimate ?? monthlySavings * 12
  const actionsReady = result.impact_metrics?.actions_executed ?? result.action_agent_output?.total_actions ?? 0
  const agentsUsed = result.orchestrator_decision?.agents_required || []
  const financeItems = result.finance_agent_output?.detected_items || []
  const scenarios = result.scenario_agent_output?.scenarios || []
  const lines = [
    'Orchestro AI Judge Report',
    '',
    `Request ID: ${result.request_id || 'N/A'}`,
    `User request: ${result.user_request || 'N/A'}`,
    `Intent: ${result.orchestrator_decision?.intent || 'N/A'}`,
    `Agents used: ${agentsUsed.join(', ') || 'N/A'}`,
    `Monthly savings estimate: $${monthlySavings.toFixed(2)}`,
    `Annual savings estimate: $${annualSavings.toFixed(2)}`,
    `Actions prepared: ${actionsReady}`,
    '',
    'Executive summary:',
    result.final_summary || 'No summary available.',
  ]

  if (financeItems.length > 0) {
    lines.push('', 'Flagged subscriptions:')
    financeItems.forEach((item) => {
      lines.push(`- ${item.service}: $${Number(item.monthly_cost || 0).toFixed(2)}/mo | ${item.risk_level} risk | ${item.reason}`)
    })
  }

  if (result.action_agent_output?.actions?.length) {
    lines.push('', 'Prepared actions:')
    result.action_agent_output.actions.forEach((action) => {
      lines.push(`- ${action.target_service}: ${action.action_type} (${action.priority})`)
    })
  }

  if (result.negotiation_agent_output?.playbooks?.length) {
    lines.push('', 'Negotiation playbooks:')
    result.negotiation_agent_output.playbooks.forEach((playbook) => {
      lines.push(`- ${playbook.service}: ${playbook.strategy}`)
    })
  }

  if (result.calendar_agent_output?.reminders?.length) {
    lines.push('', 'Follow-up reminders:')
    result.calendar_agent_output.reminders.forEach((reminder) => {
      lines.push(`- ${reminder.title} by ${reminder.due_date}`)
    })
  }

  if (scenarios.length > 0) {
    lines.push('', `Recommended scenario: ${result.scenario_agent_output?.recommended_scenario || 'N/A'}`, 'Savings scenarios:')
    scenarios.forEach((scenario) => {
      lines.push(`- ${scenario.name}: $${Number(scenario.monthly_savings || 0).toFixed(2)}/mo | ${scenario.timeline} | ${scenario.summary}`)
    })
  }

  return lines.join('\n')
}

function buildDemoScript(result) {
  const monthlySavings = result.impact_metrics?.monthly_savings_estimate ?? 0
  const actionsReady = result.impact_metrics?.actions_executed ?? result.action_agent_output?.total_actions ?? 0
  const topItem = result.finance_agent_output?.detected_items?.[0]
  const recommendedScenario = result.scenario_agent_output?.recommended_scenario
  const steps = [
    'Start by framing Orchestro as a multi-agent subscription savings assistant built for the MongoDB partner track and Gemini-ready deployment.',
    monthlySavings > 0
      ? `Point to the headline value first: this run surfaced about $${monthlySavings.toFixed(0)} per month in recoverable subscription spend.`
      : 'Explain that the audit completed and prepared a clear next-step plan from the provided subscription data.',
    topItem
      ? `Call out the top flagged service: ${topItem.service} was ranked as a ${topItem.risk_level} risk because ${topItem.reason}`
      : 'Explain that the finance agent ranks the most likely waste before any actions are suggested.',
    actionsReady > 0
      ? `Move to actionability: Orchestro prepared ${actionsReady} concrete actions so the user can act immediately instead of just reading analysis.`
      : 'Explain that the action layer is designed to turn findings into concrete next steps.',
    result.negotiation_agent_output?.total_playbooks
      ? `Show the negotiation layer next: ${result.negotiation_agent_output.total_playbooks} provider playbooks were created for downgrade or retention conversations.`
      : 'Mention that negotiation playbooks appear whenever the audit finds services worth downgrading or renegotiating.',
    result.calendar_agent_output?.total_reminders
      ? `Then show follow-through: ${result.calendar_agent_output.total_reminders} reminders keep the savings plan from stalling after the audit.`
      : 'Explain that reminder scheduling helps prevent the audit from turning into a dead-end report.',
    recommendedScenario
      ? `Close on decision support: the scenario agent recommends the ${recommendedScenario} plan so users can choose between a cautious or aggressive savings path.`
      : 'Close by explaining that Orchestro can summarize the audit into simple execution paths for the user.',
  ]

  return steps.map((step, index) => `${index + 1}. ${step}`).join('\n\n')
}

export default function ResultViewerModal({
  open,
  result,
  onClose,
  title,
  subtitle,
  subscriptions = [],
  permissions = {},
}) {
  const [copyState, setCopyState] = useState('idle')
  const [scriptCopyState, setScriptCopyState] = useState('idle')

  if (!open || !result) return null

  const judgeReport = buildJudgeReport(result)
  const demoScript = buildDemoScript(result)

  const timestamp = result.timestamp
    ? new Date(result.timestamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const monthlySavings = result.impact_metrics?.monthly_savings_estimate ?? 0
  const annualSavings = result.impact_metrics?.annual_savings_estimate ?? monthlySavings * 12
  const actionsReady = result.impact_metrics?.actions_executed ?? result.action_agent_output?.total_actions ?? 0
  const executionSeconds = result.execution_time_ms ? (result.execution_time_ms / 1000).toFixed(1) : null
  const intent = result.orchestrator_decision?.intent?.replaceAll('_', ' ') || 'SAVINGS REVIEW'

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(judgeReport)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1800)
    } catch {
      setCopyState('failed')
      window.setTimeout(() => setCopyState('idle'), 1800)
    }
  }

  const handleDownloadReport = () => {
    const blob = new Blob([judgeReport], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `orchestro-judge-report-${result.request_id?.slice(0, 8) || 'latest'}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(demoScript)
      setScriptCopyState('copied')
      window.setTimeout(() => setScriptCopyState('idle'), 1800)
    } catch {
      setScriptCopyState('failed')
      window.setTimeout(() => setScriptCopyState('idle'), 1800)
    }
  }

  return (
    <div className="fixed inset-0 z-[95] bg-slate-950/92 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.1),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.08),transparent_24%)]" />

      <div className="relative flex h-full flex-col animate-rise-in-soft">
        <div className="border-b border-white/10 bg-[#07101f]/92 px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-cyan-300">
                <Sparkles size={12} />
                {title || 'Full savings report'}
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {subtitle || 'Review the full request, findings, and next actions without interruption.'}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                  <FileText size={12} />
                  Request {result.request_id?.slice(0, 8) || '—'}
                </span>
                {timestamp && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                    <CalendarDays size={12} />
                    {timestamp}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                  <History size={12} />
                  Saved in history
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyReport}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-300 transition hover:border-cyan-400/35 hover:text-white"
              >
                <Copy size={14} />
                {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy judge report'}
              </button>
              <button
                type="button"
                onClick={handleDownloadReport}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300 transition hover:border-emerald-400/35 hover:text-white"
              >
                <Download size={14} />
                Download report
              </button>
              <button
                type="button"
                onClick={handleCopyScript}
                className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-xs text-violet-300 transition hover:border-violet-400/35 hover:text-white"
              >
                <Mic size={14} />
                {scriptCopyState === 'copied' ? 'Script copied' : scriptCopyState === 'failed' ? 'Copy failed' : 'Copy demo script'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/[0.04] p-3 text-slate-400 transition hover:border-white/20 hover:text-white"
                aria-label="Close result viewer"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,15,32,0.98),rgba(12,24,42,0.96),rgba(14,14,28,0.96))] p-6 shadow-[0_30px_120px_rgba(2,6,23,0.55)] sm:p-7">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.14),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.1),transparent_30%)]" />

              <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-emerald-300">
                    <Target size={12} />
                    Executive summary
                  </div>
                  <h3 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                    {monthlySavings > 0
                      ? `Orchestro surfaced $${monthlySavings.toFixed(0)}/month in recoverable value.`
                      : 'Orchestro completed the audit and prepared the next-step plan.'}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                    {result.final_summary || 'This report combines waste detection, savings estimates, and action guidance into a single review surface.'}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
                      <Sparkles size={12} />
                      {intent}
                    </span>
                    {executionSeconds && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
                        <Clock3 size={12} />
                        Completed in {executionSeconds}s
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
                      <History size={12} />
                      Saved for replay
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[430px]">
                  <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/[0.08] px-4 py-4 backdrop-blur">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200/70">Monthly upside</p>
                    <p className="mt-3 text-3xl font-semibold text-emerald-300">${monthlySavings.toFixed(0)}</p>
                    <p className="text-xs text-emerald-100/60">${annualSavings.toFixed(0)}/year opportunity</p>
                  </div>
                  <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-400/[0.08] px-4 py-4 backdrop-blur">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">Actions prepared</p>
                    <p className="mt-3 text-3xl font-semibold text-cyan-300">{actionsReady}</p>
                    <p className="text-xs text-cyan-100/60">drafts, reminders, and next steps</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.05] px-4 py-4 backdrop-blur">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Report tone</p>
                    <p className="mt-3 text-sm font-semibold text-white">Fast executive read</p>
                    <p className="text-xs text-slate-400">Lead with value, then open the evidence below.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-[#07101f]/88 p-5 shadow-[0_30px_90px_rgba(2,6,23,0.45)] sm:p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Original request</p>
              <p className="mt-3 text-sm leading-7 text-white sm:text-base">{result.user_request}</p>
            </div>

            <div className="rounded-[1.75rem] border border-violet-400/12 bg-[linear-gradient(135deg,rgba(18,12,34,0.92),rgba(8,14,28,0.94))] p-5 shadow-[0_30px_90px_rgba(2,6,23,0.35)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-violet-300">Demo script</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Presenter talking points for judges</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    This script follows the current result and keeps the demo focused on problem, value, actionability, and follow-through.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-2 text-xs text-violet-300 transition hover:border-violet-400/35 hover:text-white"
                >
                  <Copy size={14} />
                  {scriptCopyState === 'copied' ? 'Copied' : scriptCopyState === 'failed' ? 'Copy failed' : 'Copy script'}
                </button>
              </div>
              <pre className="mt-4 whitespace-pre-wrap rounded-[1.25rem] border border-white/8 bg-black/20 p-4 text-sm leading-7 text-slate-200">{demoScript}</pre>
            </div>

            <ResultsPanel result={result} subscriptions={subscriptions} permissions={permissions} />
          </div>
        </div>
      </div>
    </div>
  )
}
