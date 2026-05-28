import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import DataFlowBar from './DataFlowBar'
import { useState, useEffect } from 'react'

export default function ProcessingDialog({ open, request, loadingStep }) {
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    // Detect completion when loadingStep reaches the final step
    if (open && loadingStep?.includes('Storing results')) {
      setIsComplete(true)
    } else if (!open) {
      setIsComplete(false)
    }
  }, [loadingStep, open])

  if (!open) return null

  return (
    <div className={`fixed inset-0 z-[90] flex items-center justify-center px-4 transition-all duration-700 ${isComplete ? 'bg-slate-950/40 backdrop-blur-none' : 'bg-slate-950/90 backdrop-blur-xl'} animate-fade-in`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.12),transparent_28%)]" />

      <div className={`relative w-full max-w-4xl rounded-[2rem] border border-white/10 bg-[#07101f]/95 p-6 shadow-[0_30px_120px_rgba(2,6,23,0.55)] sm:p-8 transition-all duration-700 ${isComplete ? 'scale-[1.05] opacity-0' : 'scale-100 opacity-100'}`}>
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.26em] transition-colors duration-500 ${
                isComplete
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                  : 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
              }`}>
                {isComplete ? <CheckCircle2 size={12} /> : <Sparkles size={12} />}
                {isComplete ? 'Audit complete' : 'Generating savings plan'}
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                {isComplete ? 'Your savings plan is ready.' : 'Orchestro is analyzing the request now.'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                {isComplete
                  ? 'The report is opening with your full findings and next steps. Review the executive summary, then dive into the details.'
                  : 'The screen is paused on purpose so the user can follow a single guided flow from analysis to the final recommendation.'}
              </p>
            </div>

            <div className={`rounded-2xl border p-4 transition-all duration-500 ${
              isComplete
                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                : 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300'
            }`}>
              {isComplete ? (
                <CheckCircle2 size={22} className="animate-pulse" />
              ) : (
                <Loader2 size={22} className="animate-spin" />
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-4 sm:p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Current request</p>
            <p className="mt-3 text-sm leading-7 text-white sm:text-base">
              {request || 'Preparing request…'}
            </p>
          </div>

          <DataFlowBar isLoading loadingStep={loadingStep || 'Processing…'} result={null} />

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Step 1</p>
              <p className="mt-2 text-sm font-semibold text-white">Read subscription signals</p>
              <p className="mt-1 text-xs leading-6 text-slate-500">Cost, category, and recent usage are prepared for analysis.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Step 2</p>
              <p className="mt-2 text-sm font-semibold text-white">Find waste and overlap</p>
              <p className="mt-1 text-xs leading-6 text-slate-500">The audit looks for low-value services, duplicates, and downgrade paths.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Step 3</p>
              <p className="mt-2 text-sm font-semibold text-white">Prepare actions</p>
              <p className="mt-1 text-xs leading-6 text-slate-500">The app turns findings into a readable savings plan and next steps.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
