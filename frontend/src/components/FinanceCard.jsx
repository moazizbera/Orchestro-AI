import { useState } from 'react'
import {
  TrendingDown,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Mail,
  Loader2,
} from 'lucide-react'
import { sendCancellationEmail } from '../services/sendEmail'

const CATEGORY_ICONS = {
  streaming: '📺',
  music: '🎵',
  fitness: '💪',
  software: '💻',
  cloud: '☁️',
  gaming: '🎮',
  news: '📰',
  other: '📦',
}

const RISK_CONFIG = {
  high: {
    cls: 'badge-high',
    icon: <AlertTriangle size={11} />,
    label: 'High Risk',
  },
  medium: {
    cls: 'badge-medium',
    icon: <TrendingDown size={11} />,
    label: 'Medium',
  },
  low: {
    cls: 'badge-low',
    icon: <Info size={11} />,
    label: 'Low',
  },
}

function SubscriptionItem({ item }) {
  const risk = RISK_CONFIG[item.risk_level] || RISK_CONFIG.low
  const icon = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.other
  const [sending, setSending] = useState(false)
  const [emailStatus, setEmailStatus] = useState(null) // null | 'sent' | 'error'

  const handleSendEmail = async (e) => {
    e.stopPropagation()
    setSending(true)
    setEmailStatus(null)
    try {
      const res = await sendCancellationEmail(item.service)
      setEmailStatus(res.success ? 'sent' : 'error')
    } catch {
      setEmailStatus('error')
    } finally {
      setSending(false)
      setTimeout(() => setEmailStatus(null), 4000)
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-gray-800/60 last:border-0">
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">{icon}</span>
        <div>
          <p className="text-sm font-medium text-gray-100">{item.service}</p>
          <p className="text-xs text-gray-500 mt-0.5 max-w-xs">{item.reason}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-sm font-semibold text-white">
          ${item.monthly_cost?.toFixed(2)}<span className="text-xs text-gray-500 font-normal">/mo</span>
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${risk.cls}`}>
          {risk.icon}
          {risk.label}
        </span>
        {/* Send cancellation email */}
        {emailStatus === 'sent' ? (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={11} /> Email sent
          </span>
        ) : emailStatus === 'error' ? (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <AlertTriangle size={11} /> Failed
          </span>
        ) : (
          <button
            onClick={handleSendEmail}
            disabled={sending}
            className="text-xs flex items-center gap-1 text-gray-400 hover:text-indigo-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 size={11} className="animate-spin" /> : <Mail size={11} />}
            {sending ? 'Sending…' : 'Send Email'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function FinanceCard({ data }) {
  if (!data) return null

  const overallRisk = RISK_CONFIG[data.risk_level] || RISK_CONFIG.low

  return (
    <div className="card p-5 space-y-4 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <TrendingDown size={14} className="text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">Finance Intelligence Agent</h3>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${overallRisk.cls}`}>
          {overallRisk.icon}
          {overallRisk.label} Risk
        </span>
      </div>

      {/* Summary numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-950 rounded-lg p-3">
          <p className="text-xs text-gray-500">Monthly Waste</p>
          <p className="text-xl font-bold text-red-400 mt-1">
            ${data.monthly_loss_estimate?.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-950 rounded-lg p-3">
          <p className="text-xs text-gray-500">Annual Waste</p>
          <p className="text-xl font-bold text-red-400 mt-1">
            ${data.annual_loss_estimate?.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Detected items */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Detected Items ({data.detected_items?.length || 0})
        </p>
        <div>
          {(data.detected_items || []).map((item, i) => (
            <SubscriptionItem key={i} item={item} />
          ))}
        </div>
      </div>

      {/* Priority actions */}
      {data.priority_actions?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Priority Actions
          </p>
          <ul className="space-y-1.5">
            {data.priority_actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Explainability — why this analysis was made */}
      {data.reasoning && (
        <div className="bg-gray-950/80 border border-gray-800/60 rounded-lg p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            🔍 Why this analysis was made
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">{data.reasoning}</p>
          <ul className="space-y-1 pt-1">
            {[
              `Scanned ${data.detected_items?.length ?? 0} active subscriptions for overlap and waste`,
              `Flagged services where you’re paying for unused or redundant features`,
              `Calculated potential savings if high & medium risk items are addressed`,
              `Confidence: ${data.confidence_label || 'high'} — based on category pricing benchmarks`,
            ].map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="text-indigo-500 mt-0.5 shrink-0">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
