import { useState, useEffect, useRef } from 'react'
import { ArrowRight, BarChart3, CreditCard, Sparkles, Wand2 } from 'lucide-react'
import Header from './components/Header'
import SplashScreen from './components/SplashScreen'
import AuthDialog from './components/AuthDialog'
import ProcessingDialog from './components/ProcessingDialog'
import RequestPanel from './components/RequestPanel'
import ResultsPanel from './components/ResultsPanel'
import ResultViewerModal from './components/ResultViewerModal'
import ImpactPanel from './components/ImpactPanel'
import AgentPermissionsPanel from './components/AgentPermissionsPanel'
import SubscriptionInputPanel from './components/SubscriptionInputPanel'
import CSVUpload from './components/CSVUpload'
import DataFlowBar from './components/DataFlowBar'
import WhyItWinsPanel from './components/WhyItWinsPanel'
import SubmissionChecklistPanel from './components/SubmissionChecklistPanel'
import {
  runOrchestration,
  getDashboardMetrics,
  getExecutionHistory,
  getHealth,
  signIn,
  signUp,
  getUserSubscriptions,
  saveUserSubscriptions,
} from './services/api'

const SESSION_STORAGE_KEY = 'orchestro.session'

const LOADING_STEPS = [
  'Orchestrator analyzing intent…',
  'Routing to Finance Intelligence Agent…',
  'Finance Agent scanning subscriptions…',
  'Action Agent generating email drafts…',
  'Negotiation Agent preparing provider scripts…',
  'Calendar Agent scheduling follow-ups…',
  'Scenario Agent shaping savings paths…',
  'Storing results to database…',
]

const WORKSPACE_SECTIONS = [
  {
    id: 'setup',
    title: 'Setup',
    description: 'Add subscriptions and import source data.',
    icon: CreditCard,
  },
  {
    id: 'run',
    title: 'Run Audit',
    description: 'Ask for savings analysis and review the latest result.',
    icon: Wand2,
  },
  {
    id: 'impact',
    title: 'History',
    description: 'Review saved impact and recent audits.',
    icon: BarChart3,
  },
]

const JUDGE_DEMO_SUBSCRIPTIONS = [
  {
    id: 'demo-netflix',
    name: 'Netflix Premium',
    monthlyCost: 22.99,
    category: 'streaming',
    lastUsed: '2026-05-18',
  },
  {
    id: 'demo-spotify',
    name: 'Spotify Family',
    monthlyCost: 19.99,
    category: 'streaming',
    lastUsed: '2026-05-09',
  },
  {
    id: 'demo-adobe',
    name: 'Adobe Creative Cloud',
    monthlyCost: 59.99,
    category: 'software',
    lastUsed: '2026-03-02',
  },
  {
    id: 'demo-notion',
    name: 'Notion Plus',
    monthlyCost: 12.0,
    category: 'software',
    lastUsed: '2026-02-14',
  },
  {
    id: 'demo-gym',
    name: 'City Gym Membership',
    monthlyCost: 45.0,
    category: 'gym',
    lastUsed: '2026-01-11',
  },
]

const JUDGE_DEMO_PROMPT = 'Find the subscriptions I should cancel or downgrade first, explain the waste clearly, and prepare the actions I can take this week.'

export default function App() {
  const [sessionStage, setSessionStage] = useState('splash')
  const [authMode, setAuthMode] = useState('signin')
  const [sessionUser, setSessionUser] = useState(null)
  const [request, setRequest] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [history, setHistory] = useState([])
  const [apiHealthy, setApiHealthy] = useState(true)
  const [healthStatus, setHealthStatus] = useState(null)
  const [aiMode] = useState(null)
  const [permissions, setPermissions] = useState({
    financeAgent: ['subscriptions'],
    actionAgent:  ['email'],
    negotiationAgent: ['subscriptions', 'email'],
    calendarAgent: ['calendar', 'subscriptions'],
    scenarioAgent: ['subscriptions'],
  })
  const [profileSecret, setProfileSecret] = useState('')
  const [subscriptions, setSubscriptions] = useState([])
  const [subscriptionsHydrated, setSubscriptionsHydrated] = useState(false)
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState('setup')
  const [viewerResult, setViewerResult] = useState(null)
  const [viewerSource, setViewerSource] = useState('latest')
  const [submissionMode, setSubmissionMode] = useState(false)

  // Merge CSV-imported subs — skip names already in the list
  const handleAddFromCSV = (newSubs) => {
    setSubscriptions((prev) => {
      const existing = new Set(prev.map((s) => s.name.toLowerCase()))
      return [...prev, ...newSubs.filter((s) => !existing.has(s.name.toLowerCase()))]
    })
  }
  const stepIntervalRef = useRef(null)
  const resultsRef = useRef(null)

  // Load dashboard data on mount
  useEffect(() => {
    checkHealth()
    restoreSession()
  }, [])

  useEffect(() => {
    const intervalId = setInterval(() => {
      checkHealth()
    }, 15000)

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!sessionUser) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return
    }

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser))
  }, [sessionUser])

  useEffect(() => {
    if (!sessionUser || !subscriptionsHydrated) return

    saveUserSubscriptions(sessionUser.user_id, subscriptions).catch((err) => {
      console.error('Subscription sync failed:', err)
    })
  }, [subscriptions, sessionUser, subscriptionsHydrated])

  useEffect(() => {
    if (isLoading || result) {
      setActiveWorkspaceSection('run')
      return
    }

    if (subscriptions.length > 0) {
      setActiveWorkspaceSection((current) => (current === 'impact' ? current : 'run'))
      return
    }

    setActiveWorkspaceSection('setup')
  }, [isLoading, result, subscriptions.length])

  const checkHealth = async () => {
    try {
      const health = await getHealth()
      setHealthStatus(health)
      setApiHealthy(true)
    } catch {
      setHealthStatus(null)
      setApiHealthy(false)
    }
  }

  const restoreSession = async () => {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return

    try {
      const savedUser = JSON.parse(raw)
      setSessionUser(savedUser)
      setSessionStage('workspace')
      setProfileSecret('verified')
      setSubscriptionsHydrated(false)

      const [savedSubscriptions] = await Promise.all([
        getUserSubscriptions(savedUser.user_id),
        loadDashboard(savedUser.user_id),
      ])
      setSubscriptions(savedSubscriptions)
      setSubscriptionsHydrated(true)
    } catch (err) {
      console.error('Session restore failed:', err)
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }

  const loadDashboard = async (userId = null) => {
    try {
      const [metricsData, historyData] = await Promise.all([
        getDashboardMetrics(userId),
        getExecutionHistory(5, userId),
      ])
      setMetrics(metricsData)
      setHistory(historyData.executions || [])
    } catch (err) {
      console.error('Dashboard load failed:', err)
    }
  }

  // Progress step animation while loading
  useEffect(() => {
    if (!isLoading) {
      clearInterval(stepIntervalRef.current)
      return
    }
    let idx = 0
    setLoadingStep(LOADING_STEPS[0])
    stepIntervalRef.current = setInterval(() => {
      idx = Math.min(idx + 1, LOADING_STEPS.length - 1)
      setLoadingStep(LOADING_STEPS[idx])
    }, 3500)
    return () => clearInterval(stepIntervalRef.current)
  }, [isLoading])

  const [runWarning, setRunWarning] = useState(null)

  const hasProfileSecret = !!sessionUser && profileSecret.trim().length > 0
  const runBlockReason = subscriptions.length === 0
      ? 'subscriptions'
      : null
  const latestSavings = result?.impact_metrics?.monthly_savings_estimate ?? 0
  const latestActions = result?.impact_metrics?.actions_executed ?? 0
  const workspaceCardClass = 'rounded-[22px] border border-white/8 bg-slate-950/64 backdrop-blur'
  const workspaceSectionCardClass = `${workspaceCardClass} p-4 sm:p-5`

  const handleAuthenticate = async ({ mode, name, email, secret }) => {
    const user = mode === 'signup'
      ? await signUp({ name, email, secret })
      : await signIn({ email, secret })

    const savedSubscriptions = await getUserSubscriptions(user.user_id)
    setProfileSecret('verified')
    setSessionUser(user)
    setSubscriptions(savedSubscriptions)
    setSubscriptionsHydrated(true)
    setSessionStage('workspace')
    await loadDashboard(user.user_id)
  }

  const handleEndSession = () => {
    setSessionStage('splash')
    setAuthMode('signin')
    setSessionUser(null)
    setProfileSecret('')
    setSubscriptions([])
    setSubscriptionsHydrated(false)
    setRequest('')
    setResult(null)
    setViewerResult(null)
    setError(null)
    setRunWarning(null)
  }

  const openResultViewer = (nextResult, source = 'latest') => {
    setViewerResult(nextResult)
    setViewerSource(source)
  }

  const closeResultViewer = () => {
    setViewerResult(null)
  }

  const handleOpenHistoryItem = (item) => {
    openResultViewer(item, 'history')
  }

  const loadJudgeScenario = () => {
    setSubscriptions(JUDGE_DEMO_SUBSCRIPTIONS)
    setSubscriptionsHydrated(true)
    setRequest(JUDGE_DEMO_PROMPT)
    setRunWarning(null)
    setError(null)
    setActiveWorkspaceSection('run')
  }

  const toggleSubmissionMode = () => {
    setSubmissionMode((current) => {
      const next = !current
      if (next) {
        loadJudgeScenario()
        setResult(null)
        setViewerResult(null)
        setError(null)
        setActiveWorkspaceSection('run')
      }
      return next
    })
  }

  const visibleWorkspaceSections = submissionMode
    ? WORKSPACE_SECTIONS.filter(({ id }) => id === 'run' || (id === 'impact' && !!result))
    : WORKSPACE_SECTIONS

  const handleRun = async () => {
    if (!request.trim() || isLoading) return
    if (runBlockReason) {
      setActiveWorkspaceSection('setup')
      setRunWarning(runBlockReason)
      setTimeout(() => setRunWarning(null), 4000)
      return
    }

    setIsLoading(true)
    setResult(null)
    setError(null)

    try {
      const orchestrationData = await runOrchestration(
        request,
        aiMode,
        permissions,
        subscriptions,
        sessionUser?.user_id || null,
      )
      setResult(orchestrationData)
      openResultViewer(orchestrationData, 'latest')
      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
      // Refresh dashboard metrics
      await loadDashboard(sessionUser?.user_id || null)
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail
      const msg =
        detail ||
        (status === 429 ? 'The current AI provider is rate-limited or out of quota. Check the configured provider account, then try again.' : null) ||
        (status === 503 ? 'The configured AI provider is unavailable or not configured right now. Check backend provider settings and connectivity, then retry.' : null) ||
        (err.code === 'ECONNABORTED' ? 'Request timed out. The AI is processing — try again.' : null) ||
        'Orchestration failed. Ensure the backend is running and the configured AI provider is available.'
      setError(msg)
    } finally {
      setIsLoading(false)
      setLoadingStep('')
    }
  }

  if (sessionStage !== 'workspace') {
    return (
      <>
        <SplashScreen
          onStartSession={() => setSessionStage('auth')}
          authVisible={sessionStage === 'auth'}
        />
        <AuthDialog
          open={sessionStage === 'auth'}
          mode={authMode}
          onModeChange={setAuthMode}
          onAuthenticate={handleAuthenticate}
          onClose={() => setSessionStage('splash')}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[#030712]">
      <ProcessingDialog open={isLoading} request={request} loadingStep={loadingStep} />

      <ResultViewerModal
        open={!!viewerResult}
        result={viewerResult}
        onClose={closeResultViewer}
        title={viewerSource === 'history' ? 'Saved result view' : 'Latest savings report'}
        subtitle={viewerSource === 'history'
          ? 'This is a previously saved audit from history, reopened in a full-screen reading view.'
          : 'The audit is complete. Review the full request, findings, and next actions without interruption.'}
        subscriptions={viewerSource === 'latest' ? subscriptions : []}
        permissions={viewerSource === 'latest' ? permissions : {}}
      />

      <Header
        apiHealthy={apiHealthy}
        healthStatus={healthStatus}
        sessionUser={sessionUser}
        onEndSession={handleEndSession}
        submissionMode={submissionMode}
        onToggleSubmissionMode={toggleSubmissionMode}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
        <div className="animate-rise-in relative mb-7 overflow-hidden rounded-[30px] border border-white/8 bg-[linear-gradient(135deg,rgba(8,15,32,0.96),rgba(12,24,42,0.94),rgba(18,18,32,0.96))] p-5 shadow-[0_24px_90px_rgba(2,6,23,0.42)] sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.15),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.12),transparent_34%)]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.09)_1px,transparent_1px)] [background-size:80px_80px]" />

          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-cyan-300">
                  <Sparkles size={12} />
                  <span>Audit command center</span>
                </div>
                <h2 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">
                  Turn subscription clutter into a clear savings story in under a minute.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  {submissionMode
                    ? 'Submission mode is active: the workspace is narrowed to the judge scenario, live audit flow, and presentation-ready outputs.'
                    : 'Stage the data, launch the audit, then reopen evidence in a focused review surface. The flow stays explicit without repeating itself.'}
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-300">
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">Gemini-preferred runtime</span>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1">MongoDB MCP partner track</span>
                  {submissionMode && <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1">Judge presentation mode</span>}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceSection(submissionMode || subscriptions.length > 0 ? 'run' : 'setup')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  >
                    {submissionMode ? 'Open Judge Audit Flow' : subscriptions.length > 0 ? 'Continue to Run Audit' : 'Start with Setup'}
                    <ArrowRight size={15} />
                  </button>
                  {submissionMode && (
                    <button
                      type="button"
                      onClick={loadJudgeScenario}
                      className="inline-flex items-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-400/10 px-4 py-3 text-sm font-semibold text-violet-200 transition hover:border-violet-400/35 hover:text-white"
                    >
                      Reload judge scenario
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[300px]">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-3.5 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Data staged</p>
                  <p className="mt-2.5 text-3xl font-semibold text-white">{subscriptions.length}</p>
                  <p className="text-xs text-slate-400">subscriptions ready for inspection</p>
                </div>
                <div className="rounded-[22px] border border-emerald-400/12 bg-emerald-400/[0.06] px-4 py-3.5 backdrop-blur">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-emerald-200/70">Latest monthly upside</p>
                  <p className="mt-2.5 text-3xl font-semibold text-emerald-300">{result ? `$${latestSavings.toFixed(0)}` : '—'}</p>
                  <p className="text-xs text-emerald-100/55">savings surfaced in the current session</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="animate-rise-in-delayed rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,16,30,0.9),rgba(8,13,25,0.86))] p-3 backdrop-blur">
            <div className="flex flex-wrap gap-2">
              {visibleWorkspaceSections.map(({ id, title, description, icon: Icon }) => {
                const active = activeWorkspaceSection === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveWorkspaceSection(id)}
                    className={`flex min-w-[220px] flex-1 items-start gap-3 rounded-[20px] border px-4 py-3 text-left transition ${active ? 'border-cyan-400/32 bg-cyan-400/[0.08] shadow-[0_10px_24px_rgba(34,211,238,0.06)]' : 'border-white/8 bg-white/[0.03] hover:border-white/12 hover:bg-white/[0.045]'}`}
                  >
                    <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl ${active ? 'bg-cyan-400/15 text-cyan-300' : 'bg-slate-900 text-slate-400'}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-200'}`}>{title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <section className="animate-rise-in-soft min-w-0">
            {activeWorkspaceSection === 'setup' && (
              <div className="space-y-4">
                {submissionMode && (
                  <div className="rounded-[22px] border border-violet-400/14 bg-violet-400/[0.06] px-4 py-4 text-sm text-violet-100">
                    Submission mode keeps the demo focused on the judge path. Turn it off in the header to return to the full setup workspace.
                  </div>
                )}
                <div className={workspaceSectionCardClass}>
                  <p className="text-[11px] uppercase tracking-[0.26em] text-cyan-300">Setup</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Prepare the audit inputs</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                    Add a few subscriptions manually or import recurring charges from CSV. Keep this section focused on data entry, then move to Run Audit when the user is ready.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={loadJudgeScenario}
                      className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:border-cyan-400/35 hover:bg-cyan-400/15 hover:text-white"
                    >
                      Load judge demo scenario
                    </button>
                    <span className="text-xs text-slate-500">Preloads 5 realistic subscriptions plus a strong savings prompt.</span>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <SubscriptionInputPanel
                    subscriptions={subscriptions}
                    onChange={setSubscriptions}
                    locked={!hasProfileSecret}
                  />
                  <div className="space-y-4">
                    <CSVUpload onAdd={handleAddFromCSV} locked={!hasProfileSecret} />
                    <AgentPermissionsPanel permissions={permissions} onChange={setPermissions} />
                  </div>
                </div>
              </div>
            )}

            {activeWorkspaceSection === 'run' && (
              <div className="space-y-4">
                {submissionMode && (
                  <>
                    <WhyItWinsPanel healthStatus={healthStatus} result={result} />
                    <SubmissionChecklistPanel
                      healthStatus={healthStatus}
                      subscriptions={subscriptions}
                      request={request}
                      result={result}
                    />
                  </>
                )}

                <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(135deg,rgba(12,20,38,0.92),rgba(15,23,42,0.82))] p-4 backdrop-blur sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[11px] uppercase tracking-[0.26em] text-cyan-300">Run Audit</p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">{submissionMode ? 'Run the judge scenario from one focused canvas' : 'Command the savings narrative from one focused canvas'}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-400">
                        {submissionMode
                          ? 'This mode keeps the demo tight: one strong prompt, one staged subscription set, the live orchestration flow, and presentation-ready outputs.'
                          : 'The run stage is now stripped down to the prompt, the live orchestration flow, and a clean handoff into the full-screen report. That keeps the demo feeling premium instead of crowded.'}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[300px]">
                      <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Prompt</p>
                        <p className="mt-2 text-sm font-semibold text-white">{request.trim() ? 'Drafted and ready' : 'Waiting for direction'}</p>
                      </div>
                      <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Data</p>
                        <p className="mt-2 text-sm font-semibold text-white">{subscriptions.length > 0 ? `${subscriptions.length} subscriptions loaded` : 'No subscriptions yet'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <DataFlowBar isLoading={isLoading} loadingStep={loadingStep} result={result} />

                <RequestPanel
                  request={request}
                  setRequest={setRequest}
                  isLoading={isLoading}
                  loadingStep={loadingStep}
                  onRun={handleRun}
                  error={error}
                  canRun={!runBlockReason}
                  blockReason={runBlockReason}
                />

                {runWarning && (
                  <div className="flex items-center gap-3 rounded-[20px] border border-amber-500/24 bg-amber-500/10 px-4 py-3 text-sm animate-pulse">
                    <span className="text-amber-400 text-base">⚠️</span>
                    <div>
                      <p className="text-amber-300 font-semibold">Add subscriptions before generating the audit</p>
                      <p className="text-amber-400/70 text-xs mt-0.5">
                        Move back to Setup and add a few recurring services so Orchestro has real charges to inspect.
                      </p>
                    </div>
                  </div>
                )}

                <div ref={resultsRef}>
                  {result && (
                    <div className={workspaceSectionCardClass}>
                      <p className="text-[11px] uppercase tracking-[0.26em] text-cyan-300">Latest result</p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">The full report opened in a dedicated reading view.</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                        Keep this workspace uncluttered while still preserving the latest result. Open the report again any time to read the full findings and actions.
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openResultViewer(result, 'latest')}
                          className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                        >
                          Open Full Report
                        </button>
                        <span className="text-xs text-slate-500">
                          Request {result.request_id?.slice(0, 8)}… saved to history
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeWorkspaceSection === 'impact' && (
              <div className="space-y-4">
                <div className={workspaceSectionCardClass}>
                  <p className="text-[11px] uppercase tracking-[0.26em] text-cyan-300">History</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Review previous audits without cluttering the main flow</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                    Past impact and recent runs live here so the judge can inspect evidence and metrics without competing with setup or prompt-entry panels.
                  </p>
                </div>

                <ImpactPanel
                  metrics={metrics}
                  history={history}
                  result={result}
                  healthStatus={healthStatus}
                  onOpenHistoryItem={handleOpenHistoryItem}
                />
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-900 py-6 text-center text-xs text-gray-700">
        Orchestro AI — subscription savings audit demo for judge-facing review
      </footer>
    </div>
  )
}
