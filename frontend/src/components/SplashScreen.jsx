import { ArrowRight, ShieldCheck, Sparkles, Workflow, WalletCards } from 'lucide-react'

const HIGHLIGHTS = [
  {
    icon: Workflow,
    title: 'Add what you pay for',
    text: 'Start with a few subscriptions, a CSV upload, or a quick sample list so the audit begins with real recurring costs.',
  },
  {
    icon: ShieldCheck,
    title: 'See what gets analyzed',
    text: 'Orchestro checks price, category, overlap, and last-used signals to spot waste, downgrade chances, and duplicate spend.',
  },
  {
    icon: WalletCards,
    title: 'Leave with an action plan',
    text: 'Get flagged subscriptions, projected savings, and ready-to-use next steps instead of a vague financial summary.',
  },
]

export default function SplashScreen({ onStartSession, authVisible = false }) {
  return (
    <div className={`relative min-h-screen overflow-hidden bg-[#050816] text-white transition-all duration-700 ${authVisible ? 'scale-[1.03] blur-[2px] opacity-60 pointer-events-none' : 'scale-100 blur-0 opacity-100'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_28%),radial-gradient(circle_at_85%_18%,_rgba(59,130,246,0.18),_transparent_26%),radial-gradient(circle_at_50%_85%,_rgba(245,158,11,0.12),_transparent_30%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-between px-6 py-8 sm:px-10 lg:px-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 ring-1 ring-emerald-400/30 backdrop-blur">
              <Sparkles size={18} className="text-emerald-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">Orchestro AI</p>
              <p className="text-sm text-slate-400">Guided multi-agent command center</p>
            </div>
          </div>

          <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-slate-300 backdrop-blur sm:block">
            Sessions start clean. Data enters after sign-in.
          </div>
        </div>

        <div className="grid items-center gap-12 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-emerald-300">
              <ShieldCheck size={12} />
              Subscription savings audit
            </div>

            <h1 className="max-w-4xl text-5xl font-black tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              Show the user exactly
              <span className="block bg-gradient-to-r from-emerald-300 via-sky-300 to-amber-200 bg-clip-text text-transparent">
                where their money leaks.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Orchestro turns a list of subscriptions into a clear savings plan. The user adds what they pay for,
              Orchestro audits cost and usage signals, then recommends what to cancel, downgrade, or review first.
            </p>

            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Input</p>
                <p className="mt-2 text-sm font-semibold text-white">Subscriptions, price, category, last used</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Analysis</p>
                <p className="mt-2 text-sm font-semibold text-white">Waste, overlap, downgrade paths, renewal risk</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Outcome</p>
                <p className="mt-2 text-sm font-semibold text-white">Savings estimate plus next actions the user can take now</p>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                onClick={onStartSession}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                Start Session
                <ArrowRight size={16} />
              </button>
              <p className="text-sm text-slate-400">
                Sign in, add a few services, and let Orchestro return a ranked savings plan.
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-emerald-400/20 via-sky-400/10 to-amber-300/10 blur-2xl" />
            <div className={`relative rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-xl transition ${authVisible ? 'scale-[0.98] opacity-60' : 'opacity-100'}`}>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Live flow</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">What the judges will understand fast</h2>
                </div>
                <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                  Demo ready
                </div>
              </div>

              <div className="space-y-4">
                {HIGHLIGHTS.map(({ icon: Icon, title, text }, index) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-white/10">
                        <Icon size={16} className={index === 0 ? 'text-sky-300' : index === 1 ? 'text-emerald-300' : 'text-amber-200'} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{title}</p>
                        <p className="text-xs text-slate-500">Step {index + 1}</p>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-white/10 pt-6 text-sm text-slate-400 sm:grid-cols-3">
          <p>Lead with a single promise: find waste and recover savings.</p>
          <p>Make the data entry feel lightweight and obviously useful.</p>
          <p>Turn every analysis into a concrete action the user can take.</p>
        </div>
      </div>
    </div>
  )
}