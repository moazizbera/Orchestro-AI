import { Zap, Activity, LogOut, Presentation } from 'lucide-react'

export default function Header({ apiHealthy, healthStatus, sessionUser, onEndSession, submissionMode, onToggleSubmissionMode }) {
  const runtimeProvider = healthStatus?.provider ?? '—'
  const runtimeModel = healthStatus?.model ?? '—'
  const runtimeLabel = `${runtimeProvider} · ${runtimeModel}`
  const mcpStatus = healthStatus?.mongodb_mcp_connected
    ? 'MongoDB MCP live'
    : healthStatus?.mongodb_mcp_enabled
      ? 'MongoDB MCP fallback'
      : 'MongoDB MCP off'

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#020817]/78 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-cyan-400 text-slate-950 shadow-[0_10px_24px_rgba(34,211,238,0.2)]">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">
              Orchestro AI
            </h1>
            <p className="mt-0.5 text-xs leading-none text-slate-500">
              Subscription savings audit workspace
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2.5 text-sm">
          <div className={`hidden items-center gap-2 rounded-full border px-2.5 py-1 text-xs md:inline-flex ${apiHealthy ? 'border-emerald-400/18 bg-emerald-400/10 text-emerald-300' : 'border-red-400/18 bg-red-400/10 text-red-300'}`}>
            <Activity size={13} />
            <span>{apiHealthy ? 'Ready' : 'Offline'}</span>
          </div>
          <button
            type="button"
            onClick={onToggleSubmissionMode}
            className={`hidden items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition md:inline-flex ${submissionMode ? 'border-violet-400/24 bg-violet-400/10 text-violet-200' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/18 hover:text-white'}`}
          >
            <Presentation size={13} />
            <span>{submissionMode ? 'Submission Mode on' : 'Submission Mode'}</span>
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-cyan-400/18 bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-300 md:inline-flex">
            <span>Gemini track</span>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-amber-400/18 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200 xl:inline-flex">
            <span>{mcpStatus}</span>
          </div>
          <span className="hidden text-xs text-slate-500 lg:inline">{runtimeLabel}</span>
          {sessionUser && (
            <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1.5">
                <span className="hidden text-xs text-slate-300 sm:inline">{sessionUser.name}</span>
                <button
                  onClick={onEndSession}
                  className="flex items-center gap-1 text-xs text-slate-400 transition hover:text-white"
                >
                  <LogOut size={11} />
                  End Session
                </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
