import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function ProfileMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
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

  const handleLogout = () => {
    logout()
    navigate('/')
    setOpen(false)
  }

  return (
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
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-[100] animate-[profileDropIn_0.2s_ease-out]">
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

          {/* Profile info */}
          <div className="px-3 py-3 border-b border-slate-100">
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Account</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className="truncate">{user.email}</span>
              </div>
              {user.created_at && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <span>Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-1 mt-1">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
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
  )
}
