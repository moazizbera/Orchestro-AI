import { BadgeCheck, Bot, DatabaseZap, Presentation, Trophy } from 'lucide-react'

const PILLARS = [
  {
    icon: DatabaseZap,
    title: 'Partner fit',
    description: 'MongoDB MCP is visible in-product through the runtime proof card, so the integration is not just claimed in the README.',
    accent: 'emerald',
  },
  {
    icon: Bot,
    title: 'Agent depth',
    description: 'The flow goes beyond chat with finance, action, negotiation, calendar, and scenario agents working together on one user problem.',
    accent: 'cyan',
  },
  {
    icon: Presentation,
    title: 'Judge-ready demo',
    description: 'Submission mode, full-screen reports, judge export, and demo script generation make the product easy to understand quickly.',
    accent: 'violet',
  },
]

const ACCENTS = {
  emerald: 'border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-300',
  cyan: 'border-cyan-400/15 bg-cyan-400/[0.08] text-cyan-300',
  violet: 'border-violet-400/15 bg-violet-400/[0.08] text-violet-300',
}

export default function WhyItWinsPanel({ healthStatus, result }) {
  const runtimeProvider = healthStatus?.provider ?? 'local runtime'
  const preferredProvider = healthStatus?.preferred_provider ?? runtimeProvider
  const mcpStatus = healthStatus?.mongodb_mcp_connected
    ? 'MongoDB MCP connected live'
    : healthStatus?.mongodb_mcp_enabled
      ? 'MongoDB MCP fallback path visible'
      : 'MongoDB MCP disabled in this runtime'
  const agentsUsed = result?.orchestrator_decision?.agents_required?.length ?? 5

  return (
    <div className="rounded-[22px] border border-violet-400/14 bg-[linear-gradient(135deg,rgba(18,12,34,0.92),rgba(10,16,31,0.95),rgba(8,11,25,0.98))] p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.26em] text-violet-300">Why this wins</p>
          <h3 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
            <Trophy size={20} className="text-violet-300" />
            The judging story is visible inside the product
          </h3>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Orchestro shows a real partner integration, a multi-step agent workflow, and concrete user action instead of stopping at a chat response.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
          <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Active runtime</p>
            <p className="mt-2 text-sm font-semibold text-white">{runtimeProvider}</p>
            <p className="text-xs text-slate-500">Preferred: {preferredProvider}</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Partner evidence</p>
            <p className="mt-2 text-sm font-semibold text-white">{mcpStatus}</p>
            <p className="text-xs text-slate-500">No log-diving required</p>
          </div>
          <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Agent span</p>
            <p className="mt-2 text-sm font-semibold text-white">{agentsUsed} agents in flow</p>
            <p className="text-xs text-slate-500">From analysis to follow-through</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {PILLARS.map(({ icon: Icon, title, description, accent }) => (
          <div key={title} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${ACCENTS[accent]}`}>
              <Icon size={13} />
              {title}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">
        <BadgeCheck size={13} className="text-violet-300" />
        The strongest demo sequence is: runtime proof, agent trace, action plan, scenario recommendation.
      </div>
    </div>
  )
}