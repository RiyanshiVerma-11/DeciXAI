import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const [isRegister, setIsRegister] = useState(searchParams.get('mode') === 'register')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login, register, isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        await register(email, name, password)
      } else {
        await login(email, password)
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsRegister(!isRegister)
    setError('')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 overflow-hidden">
      {/* Ambient effects */}
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

      {/* Auth card */}
      <div className="relative z-10 w-full max-w-md landing-fade-in">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl shadow-2xl">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
              <img src="/logo.jpeg" alt="DeciXAI" className="h-12 w-12 rounded-xl object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {isRegister
                ? 'Start making better decisions with DeciXAI'
                : 'Sign in to continue to your dashboard'}
            </p>
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name field (register only) */}
            {isRegister && (
              <div className="auth-field-enter">
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  minLength={2}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-600 outline-none transition-all focus:border-cyan-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-600 outline-none transition-all focus:border-cyan-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? 'Min 6 characters' : '••••••••'}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder-slate-600 outline-none transition-all focus:border-cyan-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-cyan-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                  tabIndex={-1}
                >
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

              {/* Password strength (register only) */}
              {isRegister && password && (
                <div className="mt-3">
                  <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${strength.color} transition-all duration-500`}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <p className={`mt-1 text-xs ${strength.color.replace('bg-', 'text-')}`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {isRegister ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                isRegister ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={toggleMode}
                className="font-medium text-cyan-400 transition hover:text-cyan-300"
              >
                {isRegister ? 'Sign In' : 'Create one'}
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
