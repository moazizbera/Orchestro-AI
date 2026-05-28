import { useEffect, useState } from 'react'
import { LockKeyhole, Mail, UserRound, X } from 'lucide-react'

const EMPTY_FORM = {
  name: '',
  email: '',
  secret: '',
}

export default function AuthDialog({ open, mode, onModeChange, onAuthenticate, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setError('')
      setIsSubmitting(false)
      setForm(EMPTY_FORM)
    }
  }, [open, mode])


  // Animate in/out
  if (!open) return null

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (mode === 'signup' && !form.name.trim()) {
      setError('Name is required.')
      return
    }
    if (!form.email.trim()) {
      setError('Email is required.')
      return
    }
    if (!form.secret.trim() || form.secret.trim().length < 6) {
      setError('Use a private access secret with at least 6 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      await onAuthenticate({
        mode,
        name: form.name.trim(),
        email: form.email.trim(),
        secret: form.secret.trim(),
      })
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Authentication failed.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b1223] shadow-2xl shadow-emerald-950/30">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-300 via-sky-300 to-amber-200" />

        <div className="flex items-start justify-between px-6 pb-2 pt-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Start session</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {mode === 'signin' ? 'Sign in to Orchestro' : 'Create your workspace access'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
            <button
              type="button"
              onClick={() => onModeChange('signin')}
              className={`rounded-full px-4 py-2 transition ${mode === 'signin' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onModeChange('signup')}
              className={`rounded-full px-4 py-2 transition ${mode === 'signup' ? 'bg-emerald-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <label className="block space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Full name</span>
                <div className="auth-field">
                  <UserRound size={15} className="text-slate-500" />
                  <input
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Ada Lovelace"
                    className="auth-input"
                  />
                </div>
              </label>
            )}

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Email</span>
              <div className="auth-field">
                <Mail size={15} className="text-slate-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="you@company.com"
                  className="auth-input"
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Private access secret</span>
              <div className="auth-field">
                <LockKeyhole size={15} className="text-slate-500" />
                <input
                  type="password"
                  value={form.secret}
                  onChange={(e) => set('secret', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="At least 6 characters"
                  className="auth-input"
                />
              </div>
            </label>

            {error && (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              {isSubmitting
                ? 'Starting session…'
                : mode === 'signin'
                  ? 'Sign In and Start Session'
                  : 'Create Account and Start Session'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}