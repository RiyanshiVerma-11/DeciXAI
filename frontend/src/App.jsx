import { Routes, Route, Link, Navigate } from 'react-router-dom'
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_28%),radial-gradient(circle_at_right,_rgba(34,197,94,0.12),_transparent_22%),linear-gradient(180deg,_#f8fbff_0%,_#eef6ff_100%)]">
      <header className="border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="DeciXAI logo"
              className="h-12 w-12 rounded-2xl border border-sky-100 object-cover shadow-sm"
            />
            <div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">DeciXAI</div>
              <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Your AI partner for better decisions</div>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
            <Link to="/dashboard/career" className="transition hover:text-cyan-700">Career</Link>
            <Link to="/dashboard/finance" className="transition hover:text-emerald-700">Finance</Link>
            <Link to="/dashboard/startup" className="transition hover:text-fuchsia-700">Startup</Link>
            <Link to="/dashboard/policy" className="transition hover:text-orange-700">Policy</Link>
            <Link to="/dashboard/audit" className="ml-4 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 transition hover:bg-slate-100 hover:text-slate-900">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              Audit
            </Link>
            <div className="ml-2">
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
