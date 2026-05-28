import VerdictCard from './VerdictCard'
import ExecutionTrace from './ExecutionTrace'
import FinanceCard from './FinanceCard'
import ActionCard from './ActionCard'
import { Cpu, Database, ScanSearch, TrendingDown, CheckCircle2 } from 'lucide-react'
import { analyzeSubscriptions } from '../services/FinanceAgent'

const PROBLEM_CONFIG = {
  unused:    { label: 'Unused 30+ days',          cls: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/25'  },
  overlap:   { label: 'Streaming overlap',         cls: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/25' },
  high_cost: { label: 'High cost (>$20/mo)',       cls: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/25'       },
}

function LocalIssueCard({ issue }) {
  const cfg = PROBLEM_CONFIG[issue.problem] || PROBLEM_CONFIG.high_cost
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${cfg.bg}`}>
      <div className="flex items-center gap-2.5">
        <TrendingDown size={13} className={cfg.cls} />
        <div>
          <span className="text-sm font-medium text-gray-100">{issue.name}</span>
          <span className={`ml-2 text-xs ${cfg.cls}`}>{cfg.label}</span>
        </div>
      </div>
      <span className="text-xs font-semibold text-emerald-400">-${issue.potentialSavings.toFixed(2)}/mo</span>
    </div>
  )
}

function ConfidenceBadge({ label }) {
  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-indigo-500/10 border-indigo-500/30 text-indigo-400">
      <Cpu size={10} />
      {label}
    </span>
  )
}

function InsightList({ items, renderItem }) {
  if (!items?.length) return null
  return <div className="space-y-2">{items.map(renderItem)}</div>
}

export default function ResultsPanel({ result, subscriptions = [], permissions = {} }) {
  if (!result) return null

  const localAnalysis = subscriptions.length > 0 ? analyzeSubscriptions(subscriptions) : null
  const emailPermitted = permissions?.actionAgent?.includes('email') !== false

  return (
    <div className="space-y-4">
      <div className="card animate-fade-in rounded-[24px] border-white/10 bg-[linear-gradient(135deg,rgba(10,18,33,0.96),rgba(7,12,24,0.98))] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Report guide</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Read this in three moves</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Start with the verdict, verify how the agents reached it, then review the financial findings and ready-to-use actions.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              '1. Verdict',
              '2. Agent trace',
              '3. Finance, action, and scenario plan',
            ].map((step) => (
              <div key={step} className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-200">
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User-data badge — top-right of the panel */}
      {subscriptions.length > 0 && (
        <div className="flex justify-end animate-fade-in-delayed">
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
            <Database size={10} />
            Using User-Provided Data
          </span>
        </div>
      )}

      {/* Subscription snapshot — deterministic helper, shown before Gemini output */}
      {localAnalysis && localAnalysis.issues.length > 0 && (
        <div className="card animate-fade-in-delayed p-5 space-y-3 border border-indigo-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <ScanSearch size={13} className="text-indigo-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Subscription Snapshot</h3>
              <span className="text-xs text-gray-500 bg-gray-800/80 px-2 py-0.5 rounded-full border border-gray-700/50">
                pre-check · deterministic
              </span>
            </div>
            <span className="text-xs font-semibold text-emerald-400">
              Save up to ${localAnalysis.totalSavings.toFixed(2)}/mo
            </span>
          </div>
          <div className="space-y-2">
            {localAnalysis.issues.map((issue) => (
              <LocalIssueCard key={issue.id} issue={issue} />
            ))}
          </div>
          {localAnalysis.issues.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 size={13} /> No issues detected in your subscriptions
            </div>
          )}
        </div>
      )}

      {/* 1. VERDICT — first thing the user sees */}
      <VerdictCard result={result} />

      {/* 2. EXECUTION PIPELINE */}
      <ExecutionTrace result={result} />

      {/* 3. FINANCE AGENT output */}
      {result.finance_agent_output && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Finance Agent</span>
            <ConfidenceBadge label={result.finance_agent_output.confidence_label} />
          </div>
          <FinanceCard data={result.finance_agent_output} />
        </div>
      )}

      {/* 4. ACTION AGENT output */}
      {result.action_agent_output && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Action Agent</span>
            <ConfidenceBadge label={result.action_agent_output.confidence_label} />
          </div>
          <ActionCard data={result.action_agent_output} emailPermitted={emailPermitted} />
        </div>
      )}

      {result.negotiation_agent_output && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Negotiation Agent</span>
            <ConfidenceBadge label={result.negotiation_agent_output.confidence_label} />
          </div>
          <div className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Provider negotiation playbooks</h3>
                <p className="mt-1 text-sm text-slate-400">{result.negotiation_agent_output.negotiation_summary}</p>
              </div>
              <span className="text-xs font-semibold text-rose-400">{result.negotiation_agent_output.total_playbooks ?? 0} playbooks</span>
            </div>
            <InsightList
              items={result.negotiation_agent_output.playbooks || []}
              renderItem={(playbook) => (
                <div key={playbook.service} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{playbook.service}</p>
                      <p className="text-xs text-slate-500">{playbook.strategy}</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-400">Up to ${Number(playbook.estimated_monthly_savings || 0).toFixed(2)}/mo</span>
                  </div>
                  <p className="text-sm text-slate-300">{playbook.opening_line}</p>
                  <ul className="space-y-1 text-xs text-slate-400 list-disc pl-4">
                    {(playbook.talking_points || []).map((point) => <li key={point}>{point}</li>)}
                  </ul>
                </div>
              )}
            />
          </div>
        </div>
      )}

      {result.calendar_agent_output && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Calendar Agent</span>
            <ConfidenceBadge label={result.calendar_agent_output.confidence_label} />
          </div>
          <div className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Follow-up schedule</h3>
                <p className="mt-1 text-sm text-slate-400">{result.calendar_agent_output.schedule_summary}</p>
              </div>
              <span className="text-xs font-semibold text-sky-400">{result.calendar_agent_output.total_reminders ?? 0} reminders</span>
            </div>
            <InsightList
              items={result.calendar_agent_output.reminders || []}
              renderItem={(reminder) => (
                <div key={`${reminder.service}-${reminder.due_date}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{reminder.title}</p>
                      <p className="text-xs text-slate-500">{reminder.service}</p>
                    </div>
                    <span className="text-xs font-semibold text-sky-400">Due {reminder.due_date}</span>
                  </div>
                  <p className="text-sm text-slate-300">{reminder.note}</p>
                </div>
              )}
            />
          </div>
        </div>
      )}

      {result.scenario_agent_output && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Scenario Agent</span>
            <ConfidenceBadge label={result.scenario_agent_output.confidence_label} />
          </div>
          <div className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Savings scenario planner</h3>
                <p className="mt-1 text-sm text-slate-400">{result.scenario_agent_output.scenario_summary}</p>
              </div>
              <span className="text-xs font-semibold text-violet-300">Recommended: {result.scenario_agent_output.recommended_scenario}</span>
            </div>
            <InsightList
              items={result.scenario_agent_output.scenarios || []}
              renderItem={(scenario) => (
                <div key={scenario.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{scenario.name}</p>
                      <p className="text-xs text-slate-500">{scenario.timeline} · {scenario.risk_level} execution intensity</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-emerald-400">${Number(scenario.monthly_savings || 0).toFixed(2)}/mo</p>
                      <p className="text-xs text-slate-500">${Number(scenario.annual_savings || 0).toFixed(2)}/yr</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300">{scenario.summary}</p>
                  <p className="text-xs text-slate-500">Focus services: {(scenario.services || []).join(', ') || 'None'}</p>
                  <ul className="space-y-1 text-xs text-slate-400 list-disc pl-4">
                    {(scenario.actions || []).map((action) => <li key={action}>{action}</li>)}
                  </ul>
                </div>
              )}
            />
          </div>
        </div>
      )}
    </div>
  )
}
