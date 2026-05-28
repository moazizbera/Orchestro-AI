/**
 * CSVUpload.tsx
 *
 * Upload a bank/transaction CSV → detect recurring charges → add to subscriptions.
 *
 * Expected CSV columns (case-insensitive, flexible names):
 *   name    — name | service | description | merchant
 *   amount  — amount | cost | price | charge
 *   date    — date | date_charged | transaction_date | charged_at
 *
 * Recurring detection: any service name that appears 2+ times in the file.
 *
 * Props:
 *   onAdd  (subs: Subscription[]) => void   — called with deduplicated recurring items
 */

import { useRef, useState } from 'react'
import { Upload, FileText, Check, X, Plus, Lock } from 'lucide-react'
import type { Subscription } from '../services/FinanceAgent'

// ── Category inference ─────────────────────────────────────────────────────

const CATEGORY_PATTERNS: [RegExp, string][] = [
  [/netflix|hulu|disney|hbo|peacock|paramount|apple\s*tv|youtube\s*premium|crunchyroll/i, 'streaming'],
  [/spotify|apple\s*music|tidal|pandora|deezer|amazon\s*music/i,                          'streaming'],
  [/gym|fitness|peloton|planet\s*fitness|equinox|orangetheory|crossfit/i,                 'gym'],
  [/adobe|microsoft|office\s*365|github|figma|slack|notion|dropbox|google\s*workspace/i,  'software'],
]

function inferCategory(name: string): string {
  for (const [re, cat] of CATEGORY_PATTERNS) {
    if (re.test(name)) return cat
  }
  return 'other'
}

// ── CSV parser ─────────────────────────────────────────────────────────────

type Row = Record<string, string>

function parseCSV(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  // Parse a single CSV line respecting quoted fields
  const parseLine = (line: string): string[] => {
    const fields: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { fields.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    fields.push(cur.trim())
    return fields
  }

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z_]/g, ''))
  return lines.slice(1).map((line) => {
    const vals = parseLine(line)
    const row: Row = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  })
}

// Map flexible column names to canonical keys
const COL_ALIASES: Record<string, string[]> = {
  name:   ['name', 'service', 'description', 'merchant', 'payee', 'vendor'],
  amount: ['amount', 'cost', 'price', 'charge', 'value', 'total'],
  date:   ['date', 'datecharged', 'transactiondate', 'chargedat', 'billeddate'],
}

function resolveColumns(row: Row): { name: string; amount: string; date: string } | null {
  const keys = Object.keys(row)
  const find = (aliases: string[]) => keys.find((k) => aliases.includes(k)) ?? ''
  const nameCol   = find(COL_ALIASES.name)
  const amountCol = find(COL_ALIASES.amount)
  const dateCol   = find(COL_ALIASES.date)
  if (!nameCol || !amountCol) return null
  return { name: row[nameCol], amount: row[amountCol], date: row[dateCol] ?? '' }
}

// ── Recurring detection ────────────────────────────────────────────────────

interface RecurringEntry {
  key:         string          // normalised name
  name:        string          // display name (first occurrence)
  amounts:     number[]
  dates:       string[]
  occurrences: number
}

function detectRecurring(rows: Row[]): RecurringEntry[] {
  const map = new Map<string, RecurringEntry>()

  for (const row of rows) {
    const cols = resolveColumns(row)
    if (!cols || !cols.name) continue
    const key  = cols.name.trim().toLowerCase()
    const amt  = parseFloat(cols.amount.replace(/[$,]/g, ''))
    if (!key || isNaN(amt) || amt <= 0) continue

    if (!map.has(key)) {
      map.set(key, { key, name: cols.name.trim(), amounts: [], dates: [], occurrences: 0 })
    }
    const entry = map.get(key)!
    entry.amounts.push(amt)
    if (cols.date) entry.dates.push(cols.date)
    entry.occurrences++
  }

  // Recurring = appears 2+ times
  return [...map.values()].filter((e) => e.occurrences >= 2)
}

function toSubscription(entry: RecurringEntry): Subscription {
  const avgCost = entry.amounts.reduce((s, a) => s + a, 0) / entry.amounts.length
  const lastUsed = entry.dates.length
    ? entry.dates.sort().at(-1)
    : undefined

  return {
    id:          crypto.randomUUID(),
    name:        entry.name,
    monthlyCost: parseFloat(avgCost.toFixed(2)),
    category:    inferCategory(entry.name),
    ...(lastUsed ? { lastUsed } : {}),
  }
}

// ── Component ──────────────────────────────────────────────────────────────

type Stage = 'idle' | 'preview'

interface ParsedItem {
  sub:      Subscription
  entry:    RecurringEntry
  selected: boolean
}

interface Props {
  onAdd: (subs: Subscription[]) => void
  locked?: boolean
}

const CATEGORY_STYLE: Record<string, string> = {
  streaming: 'bg-purple-500/15 text-purple-400',
  software:  'bg-blue-500/15 text-blue-400',
  gym:       'bg-emerald-500/15 text-emerald-400',
  other:     'bg-gray-500/15 text-gray-400',
}

export default function CSVUpload({ onAdd, locked = false }: Props) {
  const [stage, setStage]     = useState<Stage>('idle')
  const [items, setItems]     = useState<ParsedItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [error, setError]     = useState('')
  const inputRef              = useRef<HTMLInputElement>(null)
  const panelClass = 'card rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(8,13,25,0.96))] p-4 sm:p-5'

  const processFile = (file: File) => {
    if (locked) {
      setError('Verify your profile secret first.')
      return
    }
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a .csv file.')
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      const recurring = detectRecurring(rows)

      if (recurring.length === 0) {
        setError('No recurring charges detected. Make sure the CSV has name, amount, and date columns.')
        return
      }

      setItems(recurring.map((entry) => ({ sub: toSubscription(entry), entry, selected: true })))
      setStage('preview')
    }
    reader.readAsText(file)
  }

  const toggle = (idx: number) =>
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it))

  const handleAdd = () => {
    const selected = items.filter((it) => it.selected).map((it) => it.sub)
    if (selected.length) onAdd(selected)
    setStage('idle')
    setItems([])
  }

  const reset = () => { setStage('idle'); setItems([]); setError('') }

  // ── Idle: drop zone ──────────────────────────────────────────────────────
  if (stage === 'idle') {
    return (
      <div className={`${panelClass} space-y-3`}>
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText size={14} className="text-gray-400" />
          Import from CSV
        </h3>

        <div
          onDragOver={(e) => {
            if (locked) return
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (locked) return
            e.preventDefault()
            setDragOver(false)
            processFile(e.dataTransfer.files[0])
          }}
          onClick={() => !locked && inputRef.current?.click()}
          className={`rounded-[20px] border-2 border-dashed p-5 text-center transition-colors ${
            locked
              ? 'cursor-not-allowed border-white/8 bg-white/[0.02] opacity-70'
              : dragOver
              ? 'border-cyan-400/40 bg-cyan-400/[0.06] cursor-pointer'
              : 'cursor-pointer border-white/10 hover:border-white/16 hover:bg-white/[0.03]'
          }`}
        >
          {locked ? <Lock size={20} className="mx-auto mb-2 text-gray-600" /> : <Upload size={20} className="mx-auto mb-2 text-gray-500" />}
          <p className="text-xs font-medium text-gray-300">
            {locked ? 'Verify profile secret to unlock CSV import' : 'Drop CSV or click to browse'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {locked ? 'Profile Access required first' : 'name · amount · date'}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={locked}
            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  // ── Preview: detected recurring items ────────────────────────────────────
  const selectedCount = items.filter((it) => it.selected).length

  return (
    <div className={`${panelClass} space-y-3`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Recurring Charges Detected</h3>
        <button onClick={reset} className="text-gray-600 hover:text-gray-400 transition-colors">
          <X size={14} />
        </button>
      </div>

      <p className="text-xs text-gray-500">
        {items.length} recurring service{items.length !== 1 ? 's' : ''} found. Select to import.
      </p>

      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
        {items.map((it, idx) => (
          <label
            key={it.sub.id}
            className={`flex cursor-pointer items-center gap-3 rounded-[16px] border px-3 py-2.5 transition-colors ${
              it.selected ? 'border-white/8 bg-white/[0.04]' : 'border-white/6 bg-white/[0.02] opacity-55'
            }`}
          >
            <input
              type="checkbox"
              checked={it.selected}
              onChange={() => toggle(idx)}
              className="h-3.5 w-3.5 flex-shrink-0 cursor-pointer accent-cyan-400"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white font-medium truncate">{it.sub.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium flex-shrink-0 ${CATEGORY_STYLE[it.sub.category]}`}>
                  {it.sub.category}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="text-emerald-400 font-medium">${it.sub.monthlyCost.toFixed(2)}/mo</span>
                {' · '}
                {it.entry.occurrences}× in file
              </p>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handleAdd}
        disabled={selectedCount === 0}
        className="w-full flex items-center justify-center gap-1.5 rounded-[16px] bg-cyan-400 py-2.5 text-sm font-medium text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={14} strokeWidth={2.5} />
        Add {selectedCount} Subscription{selectedCount !== 1 ? 's' : ''}
      </button>
    </div>
  )
}
