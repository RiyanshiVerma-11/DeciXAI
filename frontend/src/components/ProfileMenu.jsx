import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import UpgradeModal from './UpgradeModal'

export default function ProfileMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase()

  const tier = (user.tier || 'free').toUpperCase()
  const isPro = tier === 'PRO' || tier === 'ENTERPRISE'
  const creditsUsed = user.credits_used || 0
  const creditsLimit = isPro ? 'Unlimited' : 25

  const handleLogout = () => {
    logout()
    navigate('/')
    setOpen(false)
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        {/* Avatar button */}
        <button
          onClick={() => setOpen(!open)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-xs font-bold text-white ring-2 ring-white/10 transition-all hover:ring-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/20"
          title={user.name || user.email}
        >
          {initials}
        </button>

        {/* Dropdown menu */}
        {open && (
          <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-[100] animate-[profileDropIn_0.2s_ease-out]">
            {/* User info */}
            <div className="px-3 py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-sm font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
                  <div className="truncate text-xs text-slate-500">{user.email}</div>
                </div>
              </div>
            </div>

            {/* SaaS Subscription & Usage Meter */}
            <div className="px-3 py-3 border-b border-slate-100 bg-slate-50/50 rounded-xl m-1">
              <div className="flex items-center justify-between">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                  isPro ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tier} PLAN
                </span>

                <button
                  onClick={() => {
                    setOpen(false)
                    setIsUpgradeOpen(true)
                  }}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-800 hover:underline"
                >
                  {isPro ? 'Manage Plan' : '⚡ Upgrade'}
                </button>
              </div>

              {/* Credits progress */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                  <span>Monthly Quota</span>
                  <span>{creditsUsed} / {creditsLimit}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, isPro ? (creditsUsed * 5) : (creditsUsed / 25) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="p-1 space-y-0.5 border-b border-slate-100">
              <Link
                to="/dashboard/workspace"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <span>📁</span>
                <span>Saved Workspaces</span>
              </Link>

              <Link
                to="/dashboard/developer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <span>🔌</span>
                <span>Developer & API Keys</span>
              </Link>

              <Link
                to="/dashboard/audit"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                <span>🛡️</span>
                <span>Compliance Audit Trail</span>
              </Link>
            </div>

            {/* Actions */}
            <div className="p-1 mt-1">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
      />
    </>
  )
}
