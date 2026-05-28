import { useState } from 'react'
import {
  Zap,
  Mail,
  Bell,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCheck,
  ExternalLink,
  Lock,
  Loader2,
} from 'lucide-react'
import { sendCancellationEmail } from '../services/sendEmail'

const ACTION_CONFIG = {
  email_draft: {
    icon: <Mail size={13} />,
    label: 'Email Draft',
    cls: 'badge-info',
  },
  reminder: {
    icon: <Bell size={13} />,
    label: 'Reminder',
    cls: 'badge-medium',
  },
  cancellation: {
    icon: <Mail size={13} />,
    label: 'Cancellation',
    cls: 'badge-high',
  },
  negotiation: {
    icon: <Mail size={13} />,
    label: 'Negotiation',
    cls: 'badge-medium',
  },
}

const PRIORITY_DOT = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-gray-500',
}

function ActionItem({ action, emailPermitted = true }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [emailStatus, setEmailStatus] = useState(null) // null | 'sent' | 'error'
  const cfg = ACTION_CONFIG[action.action_type] || ACTION_CONFIG.email_draft
  const hasEmailBody = !!action.action_payload?.body
  const isEmailAction = action.action_type === 'email_draft' || action.action_type === 'cancellation'

  const handleCopy = () => {
    const content = action.action_payload?.body || action.action_payload?.task || ''
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleSendEmail = async () => {
    if (!emailPermitted) return
    setSending(true)
    setEmailStatus(null)
    try {
      const res = await sendCancellationEmail(action.target_service)
      setEmailStatus(res.success ? 'sent' : 'error')
    } catch {
      setEmailStatus('error')
    } finally {
      setSending(false)
      setTimeout(() => setEmailStatus(null), 4000)
    }
  }

  return (
    <div className="bg-gray-950 rounded-lg overflow-hidden border border-gray-800/50">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800/30 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[action.priority] || 'bg-gray-500'}`} />
          <span className="text-sm font-medium text-gray-100">{action.target_service}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.cls}`}>
            {cfg.icon}
            {cfg.label}
          </span>
          {action.execution_status === 'ready' && (
            <span className="text-xs text-emerald-400 badge-low px-2 py-0.5 rounded-full">
              Ready
            </span>
          )}
          {/* Permission lock badge */}
          {isEmailAction && !emailPermitted && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Lock size={10} /> Email disabled
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          {action.action_payload?.deadline && (
            <span className="text-xs">Due {action.action_payload.deadline}</span>
          )}
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-800/50 px-4 py-4 space-y-3">
          {/* Email subject */}
          {action.action_payload?.subject && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Subject</p>
              <p className="text-sm text-gray-200 bg-gray-900 rounded px-3 py-2">
                {action.action_payload.subject}
              </p>
            </div>
          )}

          {/* Email body */}
          {hasEmailBody && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Email Body</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition"
                  >
                    {copied ? (
                      <><CheckCheck size={12} className="text-emerald-400" /> Copied</>
                    ) : (
                      <><Copy size={12} /> Copy</>
                    )}
                  </button>
                  {/* Send via Resend — gated by emailPermitted */}
                  {emailStatus === 'sent' ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <CheckCheck size={12} /> Sent
                    </span>
                  ) : emailStatus === 'error' ? (
                    <span className="text-xs text-red-400">Failed</span>
                  ) : emailPermitted ? (
                    <button
                      onClick={handleSendEmail}
                      disabled={sending}
                      className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-200 transition disabled:opacity-50"
                    >
                      {sending ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                      {sending ? 'Sending…' : 'Send Email'}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      <Lock size={11} /> Email off
                    </span>
                  )}
                </div>
              </div>
              <pre className="text-xs text-gray-300 bg-gray-900 rounded px-3 py-3 whitespace-pre-wrap leading-relaxed font-mono-code overflow-x-auto">
                {action.action_payload.body}
              </pre>
            </div>
          )}

          {/* Reminder task */}
          {action.action_payload?.task && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Task</p>
              <p className="text-sm text-gray-200 bg-gray-900 rounded px-3 py-2">
                {action.action_payload.task}
              </p>
            </div>
          )}

          {/* Next steps */}
          {action.next_steps?.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Next Steps</p>
              <ol className="space-y-1.5">
                {action.next_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-xs text-gray-600 font-mono-code mt-0.5 w-4 shrink-0">
                      {i + 1}.
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ActionCard({ data, emailPermitted = true }) {
  if (!data) return null

  return (
    <div className="card p-5 space-y-4 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Zap size={14} className="text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Action Execution Agent</h3>
        </div>
        <span className="badge-low text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
          <CheckCheck size={11} />
          {data.total_actions} actions ready
        </span>
      </div>

      {/* Savings summary */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-emerald-400 font-medium">Estimated Monthly Savings</p>
          <p className="text-2xl font-bold text-emerald-400 mt-0.5">
            ${data.estimated_monthly_savings?.toFixed(2)}
            <span className="text-sm font-normal text-emerald-500">/mo</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Annually</p>
          <p className="text-lg font-bold text-emerald-500">
            ${((data.estimated_monthly_savings || 0) * 12).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Actions list */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Generated Actions — click to expand
        </p>
        <div className="space-y-2">
          {(data.actions || []).map((action, i) => (
            <ActionItem key={i} action={action} emailPermitted={emailPermitted} />
          ))}
        </div>
      </div>

      {/* Explainability — why these actions */}
      <div className="bg-gray-950/80 border border-gray-800/60 rounded-lg p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          ⚡ Why these actions were recommended
        </p>
        <ul className="space-y-1">
          {[
            `Each high-risk item received a ready-to-send cancellation email draft`,
            `Medium-risk items got a timed reminder to review before cancelling`,
            `Email templates use professional language and include your placeholder details`,
            `Confidence: ${data.confidence_label || 'high'} — actions are templated, not speculative`,
          ].map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
              <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
