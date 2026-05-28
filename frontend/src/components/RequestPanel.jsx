import { Loader2, PlayCircle, Lightbulb, AlertTriangle, ArrowRight, CheckCircle2, Sparkles, WandSparkles } from 'lucide-react'

const EXAMPLE_PROMPTS = [
  'Find waste and rank what I should cancel first',
  'Show me which subscriptions are safe to downgrade',
  'Tell me where I have overlapping services',
  'Help me cut $100/month from recurring charges',
]

export default function RequestPanel({
  request,
  setRequest,
  isLoading,
  loadingStep,
  onRun,
  error,
  canRun = true,
  blockReason = null,
}) {
  const shellCardClass = 'rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,13,25,0.94))]'

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      onRun()
    }
  }

  const handleRunClick = () => {
    onRun()
  }

  return (
    <div className={`${shellCardClass} overflow-hidden p-0`}>
      <div className="border-b border-white/8 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-cyan-300">
              <WandSparkles size={12} />
              Audit prompt
            </div>
            <h2 className="mt-4 text-xl font-semibold text-white sm:text-2xl">Ask for a clear savings outcome</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Lead with one concrete goal. Orchestro turns it into ranked waste findings, savings estimates, and actions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[280px]">
            <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Question</p>
              <p className="mt-2 text-sm font-semibold text-white">{request.trim() ? 'Prompt drafted' : 'Waiting for a goal'}</p>
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Run state</p>
              <p className="mt-2 text-sm font-semibold text-white">{isLoading ? 'Analyzing now' : 'Ready to launch'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="space-y-4">
          <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3.5 text-sm leading-6 text-slate-300">
            Orchestro ranks waste, overlap, and downgrade opportunities, then returns actions you can take this week.
          </div>

          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Example: Find my most wasteful subscriptions and tell me what to cancel first. (Ctrl+Enter to run)"
            rows={5}
            className="w-full rounded-[22px] border border-white/10 bg-[#050b19] px-5 py-4 text-sm text-gray-100 placeholder-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition resize-none focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          />

          <div className="flex flex-wrap gap-2.5">
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => setRequest(p)}
                disabled={isLoading}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-slate-300 transition hover:border-cyan-400/35 hover:bg-cyan-400/10 hover:text-white disabled:opacity-40 flex items-center gap-1.5"
              >
                <Lightbulb size={11} className="text-amber-300" />
                {p}
              </button>
            ))}
          </div>
          <div className="rounded-[20px] border border-cyan-400/15 bg-cyan-400/[0.08] px-4 py-3.5">
            <div className="flex items-center gap-2 text-cyan-300">
              <Sparkles size={15} />
              <p className="text-sm font-semibold">Best prompt pattern</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Ask for ranked cancellations or downgrades, then request the next action for each one.
            </p>
          </div>
        </div>
      </div>

      {/* No-subscriptions warning */}
      {!canRun && (
        <div className="mx-5 mb-5 flex items-start gap-3 rounded-[20px] border border-amber-500/24 bg-amber-500/10 px-4 py-3 text-sm sm:mx-6 sm:mb-6">
          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-300 font-medium">
              {blockReason === 'profile' ? 'Profile verification required' : 'No subscriptions added yet'}
            </p>
            {blockReason === 'profile' ? (
              <p className="text-amber-400/70 mt-0.5">
                Use the <span className="text-amber-300 font-medium">Profile Access</span> panel on the right first.
                After your profile secret is verified, subscription entry will unlock.
              </p>
            ) : (
              <p className="text-amber-400/70 mt-0.5">
                Add your recurring services using the{' '}
                <span className="text-amber-300 font-medium">Your Subscriptions</span> panel
                {' '}or <span className="text-amber-300 font-medium">Upload CSV</span> on the right before running your audit.
              </p>
            )}
            <div className="mt-2 flex items-center gap-1 text-amber-400/60 text-xs">
              <ArrowRight size={11} />
              {blockReason === 'profile'
                ? 'Verify profile access, then add subscriptions'
                : 'Add 3 to 5 subscriptions first so the analysis has something real to inspect'}
            </div>
          </div>
        </div>
      )}

      {/* Run button */}
      <div className="flex flex-col gap-3 border-t border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-white">Launch the audit when the prompt feels sharp.</p>
          <p className="mt-1 text-xs text-slate-500">Ctrl+Enter submits immediately.</p>
        </div>

        <button
          onClick={handleRunClick}
          disabled={isLoading || !request.trim() || !canRun}
          className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-cyan-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {loadingStep || 'Processing…'}
            </>
          ) : (
            <>
              <PlayCircle size={16} />
              Generate Savings Plan
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mx-5 mb-5 rounded-[20px] border border-red-500/24 bg-red-500/10 px-4 py-3 text-sm text-red-400 sm:mx-6 sm:mb-6">
          {error}
        </div>
      )}
    </div>
  )
}
