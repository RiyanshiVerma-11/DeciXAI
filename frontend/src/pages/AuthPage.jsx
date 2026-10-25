import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8002`

// ── Helper: call backend auth endpoints directly (no JWT needed here) ──────
async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Something went wrong.')
  return data
}

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState(searchParams.get('mode') === 'register' ? 'register' : 'login')
  // mode: 'login' | 'register' | 'otp-email' | 'otp-code'

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { login, register, loginWithToken, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  // ── Password strength ───────────────────────────────────────────────────
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: '', color: '', width: '0%' }
    let score = 0
    if (pwd.length >= 6) score++
    if (pwd.length >= 10) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' }
    if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%' }
    if (score <= 3) return { label: 'Good', color: 'bg-yellow-500', width: '60%' }
    if (score <= 4) return { label: 'Strong', color: 'bg-emerald-500', width: '80%' }
    return { label: 'Excellent', color: 'bg-cyan-400', width: '100%' }
  }
  const strength = getPasswordStrength(password)

  // ── Submit handlers ─────────────────────────────────────────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(email, name, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!email.trim()) { setError('Please enter your registered email.'); return }
    setLoading(true)
    try {
      const res = await apiPost('/api/v1/auth/send-login-otp', { email })
      setInfo(res.message || 'OTP sent to your email.')
      setMode('otp-code')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (!otp.trim() || otp.trim().length !== 6) { setError('Please enter the 6-digit OTP.'); return }
    setLoading(true)
    try {
      const data = await apiPost('/api/v1/auth/verify-login-otp', { email, otp: otp.trim() })
      if (data.access_token) {
        if (loginWithToken) {
          loginWithToken(data.access_token, data.user)
        } else {
          localStorage.setItem('decixai_token', data.access_token)
        }
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetToLogin = () => {
    setMode('login'); setError(''); setInfo(''); setOtp('')
  }

  // ── Input class ─────────────────────────────────────────────────────────
  const inputCls = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-600 outline-none transition-all focus:border-cyan-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-500/20'

  // ── Title / subtitle per mode ────────────────────────────────────────────
  const titles = {
    login: ['Welcome back', 'Sign in to continue to your dashboard'],
    register: ['Create your account', 'Start making better decisions with DeciXAI'],
    'otp-email': ['Login with OTP', 'Enter your registered email to receive a one-time code'],
    'otp-code': ['Check your inbox', `We sent a 6-digit OTP to ${email}`],
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[120px] landing-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/8 rounded-full blur-[120px] landing-float-delayed" />
      </div>

      {/* Back to home */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-50 flex items-center gap-2 text-sm text-slate-500 transition hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to home
      </button>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md landing-fade-in">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl shadow-2xl">

          {/* Logo + header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
              <img src="/logo.jpeg" alt="DeciXAI" className="h-12 w-12 rounded-xl object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-white">{titles[mode][0]}</h1>
            <p className="mt-2 text-sm text-slate-500">{titles[mode][1]}</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 auth-shake">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Info banner (OTP sent) */}
          {info && !error && (
            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
              <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {info}
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {mode === 'login' && (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className={inputCls} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-500">Password</label>
                  <button type="button" onClick={() => { setMode('otp-email'); setError(''); setInfo('') }}
                    className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition">
                    Forgot password? Login with OTP
                  </button>
                </div>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required minLength={6} className={`${inputCls} pr-12`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white" tabIndex={-1}>
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <span className="flex items-center justify-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Signing in...</span> : 'Sign In'}
              </button>

              {/* Divider */}
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-white/10" />
                <span className="mx-3 text-xs text-slate-600 font-medium">or</span>
                <div className="flex-1 border-t border-white/10" />
              </div>

              {/* Login with OTP button */}
              <button type="button" onClick={() => { setMode('otp-email'); setError(''); setInfo('') }}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:border-cyan-500/30 hover:text-white flex items-center justify-center gap-2">
                <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Login with Email OTP
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="auth-field-enter">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe"
                  required minLength={2} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters" required minLength={6} className={`${inputCls} pr-12`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white" tabIndex={-1}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
                {password && (
                  <div className="mt-3">
                    <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full rounded-full ${strength.color} transition-all duration-500`} style={{ width: strength.width }} />
                    </div>
                    <p className={`mt-1 text-xs ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</p>
                  </div>
                )}
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <span className="flex items-center justify-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Creating account...</span> : 'Create Account'}
              </button>
            </form>
          )}

          {/* ── OTP STEP 1 — Enter email ── */}
          {mode === 'otp-email' && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">Registered Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoFocus className={inputCls} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <span className="flex items-center justify-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Sending OTP...</span> : 'Send OTP to Email'}
              </button>
              <button type="button" onClick={resetToLogin} className="w-full text-xs text-slate-500 hover:text-slate-300 transition">
                ← Back to password login
              </button>
            </form>
          )}

          {/* ── OTP STEP 2 — Enter code ── */}
          {mode === 'otp-code' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">6-Digit OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  autoFocus
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-white placeholder-slate-600 outline-none transition-all focus:border-cyan-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-500/20 text-center text-2xl font-mono font-bold tracking-[0.5em]"
                />
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  OTP sent to <span className="font-semibold text-slate-400">{email}</span> · valid for 10 minutes
                </p>
              </div>
              <button type="submit" disabled={loading || otp.length !== 6}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <span className="flex items-center justify-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Verifying...</span> : 'Verify & Sign In'}
              </button>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { setMode('otp-email'); setError(''); setOtp('') }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition">
                  ← Change email
                </button>
                <button type="button" onClick={handleSendOtp} disabled={loading}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition disabled:opacity-40">
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          {/* Toggle login / register */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); setInfo('') }}
                className="font-medium text-cyan-400 transition hover:text-cyan-300"
              >
                {mode === 'register' ? 'Sign In' : 'Create one'}
              </button>
            </p>
          </div>
        </div>

        {/* Decorative ring */}
        <div className="absolute -z-10 inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-transparent to-violet-500/20 blur-xl opacity-40" />
      </div>
    </div>
  )
}
