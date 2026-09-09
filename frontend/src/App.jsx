import { useState } from 'react'
import { Routes, Route, Link, NavLink, Navigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import DomainPage from './pages/DomainPage'
import AuditTrail from './pages/AuditTrail'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import SavedProjects from './pages/SavedProjects'
import DeveloperHub from './pages/DeveloperHub'
import PublicReport from './pages/PublicReport'
import Chatbot from './components/Chatbot'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import ProfileMenu from './components/ProfileMenu'
import { useAuth } from './components/AuthContext'

import AppSidebar from './components/AppSidebar'

function DashboardLayout() {
  return (
    <ProtectedRoute>
      <DashboardShell />
    </ProtectedRoute>
  )
}

function DashboardShell() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const location = useLocation()

  // Generate clean section name from path
  const currentPath = location.pathname.replace('/dashboard', '').replace('/', '') || 'Overview'
  const sectionTitle = currentPath.charAt(0).toUpperCase() + currentPath.slice(1)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_28%),radial-gradient(circle_at_right,_rgba(34,197,94,0.10),_transparent_22%),linear-gradient(180deg,_#f8fbff_0%,_#eef6ff_100%)]">
      {/* Global Left Application Sidebar */}
      <AppSidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      {/* Main Workspace Stage */}
      <div className="md:pl-64 flex flex-col min-h-screen transition-all duration-300">
        
        {/* Minimalist Top Utility Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-6 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Breadcrumb trail */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link to="/dashboard/career" className="hover:text-slate-700 transition">
                DeciXAI
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-bold uppercase tracking-wider text-[11px]">
                {sectionTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ML Decision Engine Live
            </span>
          </div>
        </header>

        {/* Dashboard Routes Container */}
        <div className="flex-1">
          <Routes>
            <Route index element={<Navigate to="career" replace />} />
            <Route path="workspace" element={<SavedProjects />} />
            <Route path="developer" element={<DeveloperHub />} />
            <Route path="audit" element={<AuditTrail />} />
            <Route path=":domain" element={<DomainPage />} />
          </Routes>
        </div>
      </div>

      <Chatbot />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/share/:token" element={<PublicReport />} />
        <Route path="/shared/:token" element={<PublicReport />} />

        {/* Protected dashboard routes */}
        <Route path="/dashboard/*" element={<DashboardLayout />} />

        {/* Legacy routes redirect to dashboard */}
        <Route path="/career" element={<Navigate to="/dashboard/career" replace />} />
        <Route path="/finance" element={<Navigate to="/dashboard/finance" replace />} />
        <Route path="/startup" element={<Navigate to="/dashboard/startup" replace />} />
        <Route path="/policy" element={<Navigate to="/dashboard/policy" replace />} />
        <Route path="/audit" element={<Navigate to="/dashboard/audit" replace />} />
        <Route path="/workspace" element={<Navigate to="/dashboard/workspace" replace />} />
        <Route path="/developer" element={<Navigate to="/dashboard/developer" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
