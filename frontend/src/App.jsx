import { useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import DomainPage from './pages/DomainPage'
import Chatbot from './components/Chatbot'

export default function App() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false)
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [])

  if (showSplash) {
    return (
      <div className="relative flex min-h-screen items-end justify-center overflow-hidden bg-slate-950 px-4 py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(180deg,_rgba(2,6,23,0.94),_rgba(2,6,23,1))]" />
        <img
          src="/logo.jpeg"
          alt="deciXAI logo"
          className="relative z-10 max-h-[78vh] w-full max-w-5xl object-contain"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/20 to-slate-950/80" />
        <div className="relative z-10 w-full px-6 pb-14 text-center text-white md:pb-20">
          <p className="mx-auto max-w-3xl text-xl font-medium leading-8 md:text-3xl md:leading-10">
            Your AI partner for better decisions
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_28%),radial-gradient(circle_at_right,_rgba(34,197,94,0.12),_transparent_22%),linear-gradient(180deg,_#f8fbff_0%,_#eef6ff_100%)]">
      <header className="border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="deciXAI logo"
              className="h-12 w-12 rounded-2xl border border-sky-100 object-cover shadow-sm"
            />
            <div>
              <div className="text-2xl font-bold tracking-tight text-slate-900">deciXAI</div>
              <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Your AI partner for better decisions</div>
            </div>
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm font-medium text-slate-600">
            <Link to="/career" className="transition hover:text-cyan-700">Career</Link>
            <Link to="/finance" className="transition hover:text-emerald-700">Finance</Link>
            <Link to="/startup" className="transition hover:text-fuchsia-700">Startup</Link>
            <Link to="/policy" className="transition hover:text-orange-700">Policy</Link>
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:domain" element={<DomainPage />} />
      </Routes>

      <Chatbot />
    </div>
  )
}
