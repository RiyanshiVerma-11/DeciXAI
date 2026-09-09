import React, { useState } from 'react'
import { updateUserTier } from '../api'
import { useAuth } from './AuthContext'

export default function UpgradeModal({ isOpen, onClose }) {
  const { user, token, setUser } = useAuth()
  const [selectedTier, setSelectedTier] = useState('pro')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const updatedUser = await updateUserTier(selectedTier, token)
      setUser(updatedUser)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1400)
    } catch (e) {
      alert(e.message || 'Failed to update plan')
    } finally {
      setLoading(false)
    }
  }

  const currentTier = (user?.tier || 'free').toLowerCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-700">
              💎 Flexible SaaS Subscription
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              Select Your DeciXAI Plan
            </h2>
            <p className="text-sm text-slate-500">
              Unlock higher monthly decision quotas, priority LLM warmup, and custom developer API keys.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tiers Grid */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          
          {/* Pro Plan */}
          <div
            onClick={() => setSelectedTier('pro')}
            className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
              selectedTier === 'pro'
                ? 'border-sky-500 bg-sky-50/50 shadow-md ring-2 ring-sky-200'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-sky-100 px-2.5 py-1 text-xs font-extrabold uppercase text-sky-700">
                PRO BUILDER
              </span>
              <span className="text-xl font-black text-slate-900">$29<span className="text-xs font-medium text-slate-500">/mo</span></span>
            </div>
            <div className="mt-3 text-xs text-slate-600">Ideal for researchers, solo founders, and career professionals.</div>
            
            <ul className="mt-4 space-y-2 text-xs font-medium text-slate-700">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Unlimited Decision Evaluations
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Full SHAP Waterfall Visuals
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> 5 Developer API Keys
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Unlimited Shareable Public Dossiers
              </li>
            </ul>

            {currentTier === 'pro' && (
              <div className="mt-4 rounded-lg bg-emerald-100/70 p-2 text-center text-xs font-bold text-emerald-800">
                Current Active Plan
              </div>
            )}
          </div>

          {/* Enterprise Plan */}
          <div
            onClick={() => setSelectedTier('enterprise')}
            className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
              selectedTier === 'enterprise'
                ? 'border-indigo-500 bg-indigo-50/50 shadow-md ring-2 ring-indigo-200'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-extrabold uppercase text-indigo-700">
                ENTERPRISE
              </span>
              <span className="text-xl font-black text-slate-900">$99<span className="text-xs font-medium text-slate-500">/mo</span></span>
            </div>
            <div className="mt-3 text-xs text-slate-600">For policy departments, venture funds, and banking teams.</div>
            
            <ul className="mt-4 space-y-2 text-xs font-medium text-slate-700">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Everything in Pro Plan
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Immutable Compliance Audit Trail
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Unlimited High-Rate API Keys
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">✓</span> Dedicated O*NET & Policy RAG Indexes
              </li>
            </ul>

            {currentTier === 'enterprise' && (
              <div className="mt-4 rounded-lg bg-indigo-100/70 p-2 text-center text-xs font-bold text-indigo-800">
                Current Active Plan
              </div>
            )}
          </div>

        </div>

        {/* Demo simulation notice */}
        <div className="mt-5 rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-800 flex items-center gap-2">
          <span>🎓</span>
          <span><strong>Academic & Demo Sandbox:</strong> Instant plan activation is completely free for evaluators and demonstration purposes.</span>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading || success || currentTier === selectedTier}
            className={`rounded-xl px-6 py-2 text-sm font-bold text-white shadow-md transition-all ${
              success
                ? 'bg-emerald-600'
                : currentTier === selectedTier
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-slate-950 hover:bg-sky-600 hover:shadow-lg'
            }`}
          >
            {success ? '✓ Activated Successfully!' : loading ? 'Updating...' : currentTier === selectedTier ? 'Currently Active' : `Activate ${selectedTier.toUpperCase()} Plan`}
          </button>
        </div>

      </div>
    </div>
  )
}
