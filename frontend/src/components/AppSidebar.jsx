import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import ProfileMenu from './ProfileMenu'
import { useAuth } from './AuthContext'

export default function AppSidebar({ isMobileOpen, setIsMobileOpen, collapsed, setCollapsed }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const navItemClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
      isActive
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30'
        : 'text-slate-400 hover:bg-slate-850 hover:bg-slate-800/70 hover:text-white'
    }`

  const iconClass = (isActive) =>
    `w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`

  const navigationSections = [
    {
      title: 'Decision Engines',
      items: [
        {
          name: 'Career & Talent',
          path: '/dashboard/career',
          badge: 'ATS 2.0',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          name: 'Finance & Credit',
          path: '/dashboard/finance',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          name: 'Startup & Venture',
          path: '/dashboard/startup',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
        },
        {
          name: 'Government Policy',
          path: '/dashboard/policy',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Platform Studio',
      items: [
        {
          name: 'Saved Workspace',
          path: '/dashboard/workspace',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          name: 'Developer Hub',
          path: '/dashboard/developer',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          ),
        },
        {
          name: 'Audit Trail',
          path: '/dashboard/audit',
          hasDot: true,
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
  ]

  const sidebarBody = (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <Link
            to="/dashboard/career"
            onClick={() => setIsMobileOpen?.(false)}
            className="flex items-center gap-3 transition hover:opacity-90"
          >
            <img
              src="/logo.jpeg"
              alt="DeciXAI logo"
              className="h-9 w-9 rounded-xl border border-sky-100 object-cover shadow-xs"
            />
            {!collapsed && (
              <div>
                <div className="text-base font-black tracking-tight text-white">
                  DeciXAI
                </div>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Decision Intelligence
                </div>
              </div>
            )}
          </Link>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation Links by Section */}
        <nav className="space-y-5">
          {navigationSections.map((section, idx) => (
            <div key={idx} className="space-y-1.5">
              {!collapsed && (
                <span className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  {section.title}
                </span>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen?.(false)}
                    className={navItemClass}
                    title={item.name}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <div className="flex flex-1 items-center justify-between">
                        <span className="truncate">{item.name}</span>
                        {item.badge && (
                          <span className="rounded-md bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-300">
                            {item.badge}
                          </span>
                        )}
                        {item.hasDot && (
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        )}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Profile / User Section */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2">
        {!collapsed ? (
          <>
            {/* User info row */}
            <div className="flex items-center gap-2.5 px-1 truncate">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-xs shrink-0">
                {(user?.name || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="truncate flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {user?.name || 'Authorized User'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {user?.email || 'Enterprise Pro Tier'}
                </div>
              </div>
              {/* Profile dropdown for settings/upgrade */}
              <ProfileMenu />
            </div>

            {/* Direct Sign Out button */}
            <button
              type="button"
              onClick={handleLogout}
              className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-400 transition-all hover:bg-rose-500/10 hover:text-rose-400 border border-transparent hover:border-rose-500/20"
            >
              <svg className="h-4 w-4 shrink-0 transition-colors group-hover:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          /* Collapsed mode — avatar + compact logout icon */
          <div className="flex flex-col items-center gap-2">
            <ProfileMenu />
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="group flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-[#0B1120] border-r border-slate-800/80 shadow-2xl transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarBody}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex w-72 max-w-xs flex-1 flex-col bg-[#0B1120] pt-5 pb-4 shadow-2xl z-10 border-r border-slate-800">
            <div className="absolute top-3 right-3">
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="h-8 w-8 rounded-lg border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            {sidebarBody}
          </div>
        </div>
      )}
    </>
  )
}
