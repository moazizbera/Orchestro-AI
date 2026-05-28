import { BadgeCheck, Circle, ClipboardList, PlayCircle } from 'lucide-react'

function ChecklistItem({ done, title, detail }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border ${done ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/[0.03] text-slate-500'}`}>
          {done ? <BadgeCheck size={14} /> : <Circle size={12} />}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
        </div>
      </div>
    </div>
  )
}

export default function SubmissionChecklistPanel({ healthStatus, subscriptions, request, result }) {
  const hasSubscriptions = subscriptions.length > 0
  const promptReady = request.trim().length > 0
  const runtimeVisible = !!healthStatus
  const reportReady = !!result
  const runtimeProvider = healthStatus?.provider ?? 'unknown'
  const mcpLabel = healthStatus?.mongodb_mcp_connected
    ? 'MongoDB MCP connected'
    : healthStatus?.mongodb_mcp_enabled
      ? 'MongoDB MCP fallback visible'
      : 'MongoDB MCP not enabled'

  const checklist = [
    {
      done: hasSubscriptions,
      title: 'Judge scenario loaded',
      detail: hasSubscriptions
        ? `${subscriptions.length} subscriptions are staged for the demo run.`
        : 'Load the built-in judge scenario or add a few subscriptions before presenting.',
    },
    {
      done: promptReady,
      title: 'Prompt sharpened',
      detail: promptReady
        ? 'The run prompt is present and ready to launch.'
        : 'Draft a prompt that asks for ranked cancellations, actions, and savings scenarios.',
    },
    {
      done: runtimeVisible,
      title: 'Runtime proof visible',
      detail: runtimeVisible
        ? `Current runtime is ${runtimeProvider}; ${mcpLabel.toLowerCase()}.`
        : 'Start the backend so the live provider and MongoDB MCP status can be shown in-product.',
    },
    {
      done: reportReady,
      title: 'Report and export path ready',
      detail: reportReady
        ? 'A result exists, so you can open the full report, copy the judge report, and copy the demo script.'
        : 'Run one audit so the full-screen report, judge export, and demo script become available.',
    },
  ]

  return (
    <div className="rounded-[22px] border border-emerald-400/12 bg-[linear-gradient(135deg,rgba(9,24,24,0.94),rgba(8,14,27,0.96))] p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-300">Submission checklist</p>
          <h3 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-white">
            <ClipboardList size={20} className="text-emerald-300" />
            Demo readiness at a glance
          </h3>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Use this as the final pre-judge check. If these items are green, the run path is in good shape for a live presentation.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
          <PlayCircle size={13} />
          {checklist.filter((item) => item.done).length}/{checklist.length} ready
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {checklist.map((item) => (
          <ChecklistItem key={item.title} {...item} />
        ))}
      </div>
    </div>
  )
}