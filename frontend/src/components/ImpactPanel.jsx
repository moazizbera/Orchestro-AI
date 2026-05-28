import { ArrowUpRight, BadgeCheck, Cpu, DatabaseZap, DollarSign, History, Layers3, Radar, Sparkles, TrendingDown, Zap, Clock, BarChart3 } from 'lucide-react'

function MetricCard({ icon, label, value, sub, accent = 'indigo' }) {
  const accentMap = {
    indigo:  'text-indigo-300 bg-indigo-500/15 border-indigo-400/15',
    emerald: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/15',
    amber:   'text-amber-200 bg-amber-500/15 border-amber-300/15',
    blue:    'text-sky-300 bg-sky-500/15 border-sky-400/15',
    red:     'text-rose-300 bg-rose-500/15 border-rose-400/15',
  }
  return (
    <div className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.95))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${accentMap[accent]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      {sub && <p className="mt-2 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function HistoryItem({ item, onOpen }) {
  const savings = item.impact_metrics?.monthly_savings_estimate || 0
  const actions = item.impact_metrics?.actions_executed || 0
  const ts = item.timestamp
    ? new Date(item.timestamp).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—'

  return (
    <button
      type="button"
      onClick={() => onOpen?.(item)}
      className="w-full rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.05]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">{item.user_request}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="font-medium text-emerald-400">${savings.toFixed(2)} saved</span>
            <span>{actions} actions</span>
            <span>{ts}</span>
          </div>
        </div>
        <ArrowUpRight size={15} className="mt-0.5 shrink-0 text-cyan-300" />
      </div>
      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-cyan-300">
        Open saved result
      </div>
    </button>
  )
}

export default function ImpactPanel({ metrics, history, result, healthStatus, onOpenHistoryItem }) {
  const panelClass = 'card space-y-4 rounded-[22px] border border-white/8 p-4 sm:p-5'
  const totalRequests = metrics?.total_requests ?? 0
  const totalActions  = metrics?.total_actions ?? 0
  const totalSavings  = metrics?.total_monthly_savings ?? 0
  const avgMs         = metrics?.avg_execution_time ?? 0

  // Current-run stats
  const runSavings  = result?.impact_metrics?.monthly_savings_estimate ?? 0
  const runActions  = result?.impact_metrics?.actions_executed ?? 0
  const runItems    = result?.finance_agent_output?.detected_items?.length ?? 0
  const runMs       = result?.execution_time_ms ?? 0
  const mcpEnabled = healthStatus?.mongodb_mcp_enabled
  const mcpConnected = healthStatus?.mongodb_mcp_connected
  const mcpStatus = healthStatus?.mongodb_mcp_status ?? 'disabled'
  const mcpReason = healthStatus?.mongodb_mcp_reason ?? null
  const runtimeProvider = healthStatus?.provider ?? '—'
  const preferredProvider = healthStatus?.preferred_provider ?? runtimeProvider
  const runtimeModel = healthStatus?.model ?? '—'
  const geminiBackend = healthStatus?.gemini_backend ?? 'developer'

  return (
    <div className="space-y-4">
      <div className={`${panelClass} border-cyan-400/12 bg-[linear-gradient(135deg,rgba(8,18,33,0.97),rgba(10,24,38,0.95),rgba(8,12,24,0.98))]`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-300">Runtime proof</p>
            <h3 className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
              <BadgeCheck size={15} className="text-cyan-300" />
              MongoDB track evidence in-product
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Shows the live provider and MongoDB MCP path without sending the judge to logs or docs.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              <DatabaseZap size={14} className="text-emerald-300" />
              Partner track
            </div>
            <p className="mt-3 text-lg font-semibold text-white">MongoDB MCP Server</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {mcpEnabled ? 'Partner integration is enabled in the runtime configuration.' : 'Partner integration is not enabled in this runtime.'}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-300 border-emerald-400/20 bg-emerald-400/10">
              {mcpConnected ? 'MCP connected' : mcpEnabled ? 'MCP fallback active' : 'MCP disabled'}
            </div>
            {mcpStatus === 'fallback' && mcpReason && (
              <p className="mt-3 text-xs leading-5 text-amber-300/80">
                Local fallback reason: {mcpReason}
              </p>
            )}
          </div>

          <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              <Cpu size={14} className="text-indigo-300" />
              Runtime brain
            </div>
            <p className="mt-3 text-lg font-semibold text-white">{runtimeProvider} · {runtimeModel}</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Preferred provider: {preferredProvider}. Gemini backend mode: {geminiBackend}.
            </p>
          </div>
        </div>
      </div>

      {result && (
        <div className={`${panelClass} border-indigo-900/30 bg-[linear-gradient(135deg,rgba(14,19,34,0.96),rgba(9,14,26,0.96))]`}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <TrendingDown size={15} className="text-indigo-400" />
            This Run
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.07] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">Savings Found</p>
              <p className="mt-2 text-xl font-bold text-emerald-300 tabular-nums">
                ${runSavings.toFixed(0)}<span className="text-xs text-gray-500 font-normal">/mo</span>
              </p>
              <p className="text-xs text-emerald-100/60">${(runSavings * 12).toFixed(0)}/year</p>
            </div>
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.07] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Actions Ready</p>
              <p className="mt-2 text-xl font-bold text-cyan-300 tabular-nums">{runActions}</p>
              <p className="text-xs text-cyan-100/55">{runItems} items scanned</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-0.5 text-xs text-gray-500">
            <span>Analysed in {(runMs / 1000).toFixed(1)}s</span>
            <span className="font-mono-code">{result.request_id?.slice(0, 8)}…</span>
          </div>
        </div>
      )}

      <div className={`${panelClass} bg-[linear-gradient(135deg,rgba(10,17,30,0.96),rgba(10,10,20,0.96))]`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <BarChart3 size={15} className="text-indigo-400" />
              System Impact
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">A compact view of repeated savings outcomes across runs.</p>
          </div>
          <div className="hidden rounded-full border border-indigo-400/15 bg-indigo-400/[0.08] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-indigo-300 sm:block">
            Live value trail
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={<DollarSign size={15} className="text-emerald-400" />}
            label="Monthly Savings"
            value={`$${totalSavings.toFixed(0)}`}
            sub={`$${(totalSavings * 12).toFixed(0)}/yr`}
            accent="emerald"
          />
          <MetricCard
            icon={<Zap size={15} className="text-amber-400" />}
            label="Actions Executed"
            value={totalActions}
            sub="across all runs"
            accent="amber"
          />
          <MetricCard
            icon={<BarChart3 size={15} className="text-indigo-400" />}
            label="Requests Processed"
            value={totalRequests}
            accent="indigo"
          />
          <MetricCard
            icon={<Clock size={15} className="text-blue-400" />}
            label="Avg Response"
            value={avgMs > 0 ? `${(avgMs / 1000).toFixed(1)}s` : '—'}
            accent="blue"
          />
        </div>
      </div>

      {history?.length > 0 && (
        <div className={`${panelClass} bg-[linear-gradient(135deg,rgba(11,18,31,0.96),rgba(8,12,24,0.98))]`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <History size={15} className="text-gray-400" />
                Recent Runs
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Reopen any saved audit as a focused evidence view.</p>
            </div>
            <div className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400 sm:block">
              {history.length} saved
            </div>
          </div>
          <div className="space-y-3">
            {history.map((item, i) => (
              <HistoryItem key={item.request_id || i} item={item} onOpen={onOpenHistoryItem} />
            ))}
          </div>
        </div>
      )}

      {!history?.length && !result && (
        <div className="card rounded-[22px] border-dashed border-white/8 bg-white/[0.02] p-5 text-center">
          <p className="text-sm font-semibold text-white">Run the first audit to populate this view</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">Impact metrics and saved reports appear here after the first result.</p>
        </div>
      )}
    </div>
  )
}
