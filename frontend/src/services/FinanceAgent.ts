/**
 * FinanceAgent.ts
 *
 * Pure client-side subscription analysis engine.
 * No API calls — runs entirely in the browser.
 *
 * Used as a deterministic subscription pre-check alongside
 * the Gemini-backed backend analysis flow.
 */

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000

// ── Types ──────────────────────────────────────────────────────────────────

export interface Subscription {
  id: string
  name: string
  monthlyCost: number
  category: string
  lastUsed?: string
}

export type Problem = 'unused' | 'overlap' | 'high_cost'

export interface Issue {
  id: string
  name: string
  problem: Problem
  monthlyCost: number
  potentialSavings: number
}

export interface AnalysisResult {
  issues: Issue[]
  totalSavings: number
}

// ── Rule helpers ───────────────────────────────────────────────────────────

/** Returns true if lastUsed is a valid date more than 30 days in the past. */
function isUnused(lastUsed?: string): boolean {
  if (!lastUsed) return false
  const parsed = Date.parse(lastUsed)
  return !isNaN(parsed) && Date.now() - parsed > DAYS_30_MS
}

/**
 * Determine which problems apply to a single subscription.
 * A sub can match multiple rules; all are reported as separate Issue entries.
 */
function detectProblems(
  sub: Subscription,
  streamingCount: number
): Problem[] {
  const problems: Problem[] = []

  if (isUnused(sub.lastUsed)) {
    problems.push('unused')
  }

  if (sub.category === 'streaming' && streamingCount > 2) {
    problems.push('overlap')
  }

  if (sub.monthlyCost > 20) {
    problems.push('high_cost')
  }

  return problems
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Analyse a list of subscriptions and return flagged issues + total savings.
 *
 * @param subscriptions  Array of user-provided subscriptions
 * @returns              { issues, totalSavings }
 *
 * Rules applied per subscription:
 *   unused    — lastUsed is older than 30 days
 *   overlap   — category is "streaming" and there are more than 2 streaming subs
 *   high_cost — monthlyCost > $20
 *
 * potentialSavings per issue = monthlyCost (cancellation saves the full amount).
 * totalSavings deduplicates: each subscription is counted once regardless of
 * how many problems it has.
 */
export function analyzeSubscriptions(subscriptions: Subscription[]): AnalysisResult {
  const streamingCount = subscriptions.filter((s) => s.category === 'streaming').length

  const issues: Issue[] = []
  // Track which subscription IDs already contribute to totalSavings
  const countedIds = new Set<string>()

  for (const sub of subscriptions) {
    const problems = detectProblems(sub, streamingCount)

    for (const problem of problems) {
      issues.push({
        id: sub.id,
        name: sub.name,
        problem,
        monthlyCost: sub.monthlyCost,
        potentialSavings: sub.monthlyCost,
      })
      countedIds.add(sub.id)
    }
  }

  // Sum the monthly cost of each unique flagged subscription (avoid double-counting)
  const totalSavings = parseFloat(
    subscriptions
      .filter((s) => countedIds.has(s.id))
      .reduce((sum, s) => sum + s.monthlyCost, 0)
      .toFixed(2)
  )

  return { issues, totalSavings }
}
