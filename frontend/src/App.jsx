import { Routes, Route, Link, NavLink, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import DomainPage from './pages/DomainPage'
import AuditTrail from './pages/AuditTrail'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import Chatbot from './components/Chatbot'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import ProfileMenu from './components/ProfileMenu'
import { useAuth } from './components/AuthContext'

function DashboardLayout() {
  return (
    <ProtectedRoute>
      <DashboardShell />
    </ProtectedRoute>
  )
}

function DashboardShell() {
  const { user } = useAuth()

  const getLinkClass = ({ isActive }) => 
    `transition-all duration-200 font-bold text-xs tracking-wider uppercase px-3 py-1.5 rounded-lg ${
      isActive 
        ? 'bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.15)] scale-[1.02]' 
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
    }`

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_28%),radial-gradient(circle_at_right,_rgba(34,197,94,0.12),_transparent_22%),linear-gradient(180deg,_#f8fbff_0%,_#eef6ff_100%)]">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/75 backdrop-blur-md px-5 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.02)] transition-all">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 transition hover:opacity-90">
            <img
              src="/logo.jpeg"
              alt="DeciXAI logo"
              className="h-10 w-10 rounded-xl border border-sky-100 object-cover shadow-sm"
            />
            <div>
              <div className="text-xl font-black tracking-tight text-slate-950">DeciXAI</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-400">Your AI partner for better decisions</div>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
            <NavLink to="/dashboard/career" className={getLinkClass}>Career</NavLink>
            <NavLink to="/dashboard/finance" className={getLinkClass}>Finance</NavLink>
            <NavLink to="/dashboard/startup" className={getLinkClass}>Startup</NavLink>
            <NavLink to="/dashboard/policy" className={getLinkClass}>Policy</NavLink>
            <NavLink to="/dashboard/audit" className={({ isActive }) => 
              `ml-3 flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/50 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider transition hover:bg-slate-100 hover:text-slate-900 ${
                isActive ? 'border-sky-300 bg-sky-50/50 text-sky-700 active-indicator-pulse' : 'text-slate-500'
              }`
            }>
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              Audit
            </NavLink>
            <div className="ml-2 border-l border-slate-200 pl-3">
              <ProfileMenu />
            </div>
          </nav>
        </div>
      </header>

      <Routes>
        <Route index element={<Home />} />
        <Route path="audit" element={<AuditTrail />} />
        <Route path=":domain" element={<DomainPage />} />
      </Routes>

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

        {/* Protected dashboard routes */}
        <Route path="/dashboard/*" element={<DashboardLayout />} />

        {/* Legacy routes redirect to dashboard */}
        <Route path="/career" element={<Navigate to="/dashboard/career" replace />} />
        <Route path="/finance" element={<Navigate to="/dashboard/finance" replace />} />
        <Route path="/startup" element={<Navigate to="/dashboard/startup" replace />} />
        <Route path="/policy" element={<Navigate to="/dashboard/policy" replace />} />
        <Route path="/audit" element={<Navigate to="/dashboard/audit" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
