import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import ProfileMenu from './ProfileMenu'
import { useAuth } from './AuthContext'

export default function AppSidebar({ isMobileOpen, setIsMobileOpen }) {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const navItemClass = ({ isActive }) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
      isActive
        ? 'bg-slate-900 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'
    }`

  const iconClass = (isActive) =>
    `w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'}`

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
                <div className="text-base font-black tracking-tight text-slate-950">
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
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
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
                <span className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 block">
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
                          <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-sky-800">
                            {item.badge}
                          </span>
                        )}
                        {item.hasDot && (
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
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

      {/* Bottom Profile / User Menu */}
      <div className="pt-4 border-t border-slate-100">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-xs shrink-0">
                {(user?.name || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {user?.name || 'Authorized User'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {user?.email || 'Enterprise Pro Tier'}
                </div>
              </div>
            </div>
            <ProfileMenu />
          </div>
        ) : (
          <div className="flex justify-center">
            <ProfileMenu />
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200/90 shadow-xs transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarBody}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex w-72 max-w-xs flex-1 flex-col bg-white pt-5 pb-4 shadow-xl z-10">
            <div className="absolute top-3 right-3">
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500"
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
