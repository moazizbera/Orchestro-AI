/**
 * AgentPermissionsPanel.tsx
 *
 * Checkbox-based access control for each agent.
 * State is owned by the parent (App.jsx) so permissions
 * are forwarded to every orchestration request.
 *
 * Props:
 *   permissions  – { financeAgent: string[], actionAgent: string[], negotiationAgent: string[], calendarAgent: string[], scenarioAgent: string[] }
 *   onChange     – (next: Permissions) => void
 */

export interface Permissions {
  financeAgent: string[]
  actionAgent:  string[]
  negotiationAgent: string[]
  calendarAgent: string[]
  scenarioAgent: string[]
}

interface Props {
  permissions: Permissions
  onChange:    (next: Permissions) => void
}

type AgentKey = keyof Permissions

// ── Static config ──────────────────────────────────────────────────────────

const AGENTS: { key: AgentKey; label: string; accent: string }[] = [
  { key: 'financeAgent', label: 'Finance Agent', accent: 'emerald' },
  { key: 'actionAgent',  label: 'Action Agent',  accent: 'indigo'  },
  { key: 'negotiationAgent', label: 'Negotiation Agent', accent: 'amber' },
  { key: 'calendarAgent', label: 'Calendar Agent', accent: 'sky' },
  { key: 'scenarioAgent', label: 'Scenario Agent', accent: 'violet' },
]

const ALL_PERMISSIONS = ['subscriptions', 'transactions', 'email', 'calendar'] as const
type Permission = typeof ALL_PERMISSIONS[number]

const ACCENT_STYLES: Record<string, { badge: string; check: string; border: string }> = {
  emerald: {
    badge:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    check:  'accent-emerald-500',
    border: 'border-emerald-900/40',
  },
  indigo: {
    badge:  'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
    check:  'accent-indigo-500',
    border: 'border-indigo-900/40',
  },
  amber: {
    badge:  'bg-amber-500/15 text-amber-400 border-amber-500/25',
    check:  'accent-amber-500',
    border: 'border-amber-900/40',
  },
  sky: {
    badge:  'bg-sky-500/15 text-sky-400 border-sky-500/25',
    check:  'accent-sky-500',
    border: 'border-sky-900/40',
  },
  violet: {
    badge:  'bg-violet-500/15 text-violet-300 border-violet-500/25',
    check:  'accent-violet-500',
    border: 'border-violet-900/40',
  },
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface CheckRowProps {
  label:    Permission
  checked:  boolean
  onChange: () => void
  accent:   string
}

function CheckRow({ label, checked, onChange, accent }: CheckRowProps) {
  const id = `perm-${Math.random().toString(36).slice(2)}`
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2.5 cursor-pointer select-none group py-0.5 ${
        checked ? 'text-gray-300' : 'text-gray-600'
      } hover:text-gray-400 transition-colors`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className={`w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 ${ACCENT_STYLES[accent].check} cursor-pointer`}
      />
      <span className="text-xs">
        → {label}
      </span>
    </label>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AgentPermissionsPanel({ permissions, onChange }: Props) {
  const toggle = (agentKey: AgentKey, perm: Permission) => {
    const current = permissions[agentKey] ?? []
    const next = current.includes(perm)
      ? current.filter((p) => p !== perm)
      : [...current, perm]
    onChange({ ...permissions, [agentKey]: next })
  }

  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-white">Agent Access Control</h3>

      <div className="space-y-4">
        {AGENTS.map(({ key, label, accent }) => {
          const s      = ACCENT_STYLES[accent]
          const active = permissions[key] ?? []

          return (
            <div key={key}>
              {/* Agent header */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${s.badge}`}>
                  {label}
                </span>
                <span className="text-xs text-gray-600">
                  {active.length}/{ALL_PERMISSIONS.length}
                </span>
              </div>

              {/* Checkboxes */}
              <div className={`space-y-1.5 pl-3 border-l-2 ${s.border}`}>
                {ALL_PERMISSIONS.map((perm) => (
                  <CheckRow
                    key={perm}
                    label={perm}
                    checked={active.includes(perm)}
                    onChange={() => toggle(key, perm)}
                    accent={accent}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
