/**
 * SubscriptionInputPanel
 *
 * Lets users enter their real subscriptions before running orchestration.
 * State is owned by the parent (App.jsx) and forwarded to the backend so
 * the Finance Agent analyses actual data instead of generic examples.
 *
 * Props:
 *   subscriptions  – SubscriptionItem[]
 *   onChange       – (next: SubscriptionItem[]) => void
 *
 * SubscriptionItem shape:
 *   { id, name, monthlyCost, category, lastUsed? }
 */

import { useState } from 'react'
import { Plus, Trash2, CreditCard, SearchCheck } from 'lucide-react'

const CATEGORIES = [
  { value: 'streaming', label: 'Streaming' },
  { value: 'software',  label: 'Software'  },
  { value: 'gym',       label: 'Gym'       },
  { value: 'other',     label: 'Other'     },
]

const CATEGORY_STYLE = {
  streaming: 'bg-purple-500/15 text-purple-400',
  software:  'bg-blue-500/15   text-blue-400',
  gym:       'bg-emerald-500/15 text-emerald-400',
  other:     'bg-gray-500/15   text-gray-400',
}

const EMPTY_FORM = { name: '', monthlyCost: '', category: 'streaming', lastUsed: '' }

export default function SubscriptionInputPanel({ subscriptions, onChange, locked = false }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const panelClass = 'card rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(8,13,25,0.96))] p-4 sm:p-5'
  const fieldClass = 'bg-[#050b19] border border-white/10 rounded-[16px] px-3 py-2.5 text-sm text-white placeholder-slate-600 transition-colors focus:outline-none focus:border-cyan-400/35'

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const add = () => {
    if (locked) {
      setError('Verify your profile secret first.')
      return
    }
    if (!form.name.trim()) { setError('Name is required.'); return }
    const cost = parseFloat(form.monthlyCost)
    if (!form.monthlyCost || isNaN(cost) || cost <= 0) { setError('Enter a valid monthly cost.'); return }

    const item = {
      id:           crypto.randomUUID(),
      name:         form.name.trim(),
      monthlyCost:  cost,
      category:     form.category,
      ...(form.lastUsed ? { lastUsed: form.lastUsed } : {}),
    }
    const next = [...subscriptions, item]
    onChange(next)
    setForm(EMPTY_FORM)
  }

  const remove = (id) => onChange(subscriptions.filter((s) => s.id !== id))

  const totalMonthly = subscriptions.reduce((sum, s) => sum + s.monthlyCost, 0)

  return (
    <div className={`${panelClass} space-y-4`}>
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CreditCard size={14} className="text-gray-400" />
            Your Subscriptions
          </h3>
          {subscriptions.length > 0 && (
            <span className="text-xs text-gray-500">
              {subscriptions.length} · <span className="text-emerald-400 font-medium">${totalMonthly.toFixed(2)}/mo</span>
            </span>
          )}
        </div>

        <div className="rounded-[20px] border border-sky-500/18 bg-sky-500/[0.08] p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/12 text-sky-300">
              <SearchCheck size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">What matters most</p>
              <p className="mt-1 text-xs leading-6 text-gray-400">
                Service name, monthly cost, category, and last-used date are enough for the audit to surface waste and overlap.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-2.5">
        {/* Row 1: name + cost */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Netflix Premium"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            disabled={locked}
            className={`col-span-1 ${fieldClass}`}
          />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">$</span>
            <input
              type="number"
              placeholder="22.99"
              min="0"
              step="0.01"
              value={form.monthlyCost}
              onChange={(e) => set('monthlyCost', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              disabled={locked}
              className={`w-full pl-6 pr-3 ${fieldClass}`}
            />
          </div>
        </div>

        {/* Row 2: category + lastUsed */}
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            disabled={locked}
            className={`${fieldClass} appearance-none`}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={form.lastUsed}
            onChange={(e) => set('lastUsed', e.target.value)}
            title="Last used (optional)"
            disabled={locked}
            className={`${fieldClass} text-gray-400`}
          />
        </div>

        <p className="text-[11px] leading-5 text-gray-500">
          Start with 3 to 5 subscriptions. That is usually enough to show duplicates, overpay, and unused renewals.
        </p>

        {locked && (
          <p className="text-xs text-amber-400">
            Verify your profile secret first to unlock subscription entry.
          </p>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="button"
          onClick={add}
          disabled={locked}
          className="w-full flex items-center justify-center gap-1.5 rounded-[16px] bg-cyan-400 py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-300 active:bg-cyan-500 disabled:opacity-50"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Subscription
        </button>
      </div>

      {/* List */}
      {subscriptions.length > 0 && (
        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between gap-2 rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-white font-medium truncate">{sub.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 ${CATEGORY_STYLE[sub.category]}`}>
                    {sub.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                  <span className="text-emerald-400 font-medium">${sub.monthlyCost.toFixed(2)}/mo</span>
                  {sub.lastUsed && <span>last used {sub.lastUsed}</span>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(sub.id)}
                className="flex-shrink-0 rounded-md p-1.5 text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                aria-label={`Remove ${sub.name}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {subscriptions.length === 0 && (
        <p className="py-2 text-center text-xs leading-5 text-gray-600">
          {locked
            ? 'Profile verification is required before adding subscriptions.'
            : 'Add subscriptions to show what looks wasteful, what overlaps, and what should be canceled or downgraded first.'}
        </p>
      )}
    </div>
  )
}
