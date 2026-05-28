import { Check, Lock } from 'lucide-react'

const AGENTS = [
  {
    name: 'Finance Agent',
    enabled: true,
    color: 'emerald',
    capabilities: ['Subscriptions', 'Transactions'],
  },
  {
    name: 'Action Agent',
    enabled: true,
    color: 'indigo',
    capabilities: ['Email', 'Calendar'],
  },
  {
    name: 'Growth Agent',
    enabled: false,
    color: 'gray',
    capabilities: [],
  },
]

const colorMap = {
  emerald: {
    ring:  'border-emerald-500/30 bg-emerald-500/8',
    check: 'bg-emerald-500/20 text-emerald-400',
    dot:   'bg-emerald-500',
    cap:   'bg-emerald-500/10 text-emerald-400',
  },
  indigo: {
    ring:  'border-indigo-500/30 bg-indigo-500/8',
    check: 'bg-indigo-500/20 text-indigo-400',
    dot:   'bg-indigo-500',
    cap:   'bg-indigo-500/10 text-indigo-400',
  },
  gray: {
    ring:  'border-gray-800 bg-gray-900/40',
    check: 'bg-gray-800 text-gray-600',
    dot:   'bg-gray-700',
    cap:   'bg-gray-800/60 text-gray-600',
  },
}

export default function AgentsPanel() {
  return (
    <div className="card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-white">Agents Access Control</h3>

      <div className="space-y-2">
        {AGENTS.map((agent) => {
          const c = colorMap[agent.color]
          return (
            <div
              key={agent.name}
              className={`rounded-xl border p-3.5 transition-colors ${c.ring}`}
            >
              {/* Agent header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Checkbox indicator */}
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${c.check}`}>
                    {agent.enabled
                      ? <Check size={11} strokeWidth={3} />
                      : <Lock size={10} strokeWidth={2.5} />
                    }
                  </div>
                  <span className={`text-sm font-medium ${agent.enabled ? 'text-white' : 'text-gray-500'}`}>
                    {agent.name}
                  </span>
                </div>

                {/* Status pill */}
                {agent.enabled ? (
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    Active
                  </span>
                ) : (
                  <span className="text-xs text-gray-700 italic">soon</span>
                )}
              </div>

              {/* Capabilities */}
              {agent.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5 ml-7">
                  {agent.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.cap}`}
                    >
                      → {cap}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
