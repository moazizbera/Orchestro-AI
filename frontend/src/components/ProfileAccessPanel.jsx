import { useState } from 'react'
import { Shield, Lock, CheckCircle2 } from 'lucide-react'

export default function ProfileAccessPanel({ hasProfileSecret, onUnlock }) {
  const [secret, setSecret] = useState('')

  const handleSubmit = () => {
    if (!secret.trim()) return
    onUnlock(secret.trim())
    setSecret('')
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield size={14} className="text-gray-400" />
          Profile Access
        </h3>
        {hasProfileSecret && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
            <CheckCircle2 size={10} />
            Verified
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Set your private profile secret first. Subscription entry stays locked until your
        profile is verified in this session.
      </p>

      <div className="space-y-2.5">
        <div className="relative">
          <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={hasProfileSecret ? 'Profile secret saved for this session' : 'Enter profile secret'}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!secret.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          {hasProfileSecret ? 'Update Profile Secret' : 'Verify Profile'}
        </button>
      </div>
    </div>
  )
}