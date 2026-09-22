import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  // State for interactive features
  const [activeDomainTab, setActiveDomainTab] = useState('career')
  const [billingInterval, setBillingInterval] = useState('monthly')
  const [openFaq, setOpenFaq] = useState(null)
  
  // Custom Demo Input
  const [demoInput, setDemoInput] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoResult, setDemoResult] = useState(null)

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard')
    } else {
      navigate('/auth')
    }
  }

  // Interactive Demo Handler
  const runDemo = (e) => {
    e.preventDefault()
    if (!demoInput.trim()) return
    setDemoLoading(true)
    setDemoResult(null)
    
    setTimeout(() => {
      setDemoLoading(false)
      const score = Math.floor(Math.random() * 30) + 65 // 65 - 95
      setDemoResult({
        score,
        verdict: score >= 80 ? 'Highly Feasible' : 'Moderately Feasible',
        shap: [
          { name: 'Goal Alignment', value: 12, positive: true },
          { name: 'Market Demand', value: 8, positive: true },
          { name: 'Risk Exposure', value: -5, positive: false },
          { name: 'Resource Availability', value: score > 80 ? 7 : -4, positive: score > 80 },
        ],
        plan: `Based on your goal "${demoInput}", we recommend prioritizing phase 1 execution within 30 days. Focus on securing resource availability to mitigate the negative risk factors identified by the model.`
      })
    }, 1200)
  }

  // Domain Mock Data for the SaaS Dashboard Preview (Google Light Design)
  const dashboardPreviews = {
    career: {
      score: 87,
      scoreLabel: 'Job Fit Score',
      barColor: 'bg-blue-600',
      stats: [
        { label: 'Skills Match', val: '94%' },
        { label: 'Market Demand', val: 'Very High' },
        { label: 'Risk Factor', val: 'Low' }
      ],
      shap: [
        { feature: 'Core Tech Stack', impact: '+18%', pos: true, val: 80 },
        { feature: 'Relevant Projects', impact: '+12%', pos: true, val: 55 },
        { feature: 'Location Match', impact: '-5%', pos: false, val: 20 },
      ],
      llmPlan: 'Strong match for Python ML Engineer. Consider gaining basic cloud infrastructure skills to neutralize location constraints.'
    },
    finance: {
      score: 92,
      scoreLabel: 'Loan Viability Score',
      barColor: 'bg-emerald-600',
      stats: [
        { label: 'DTI Ratio', val: '24%' },
        { label: 'Credit Health', val: 'Excellent' },
        { label: 'Risk Level', val: 'Minimal' }
      ],
      shap: [
        { feature: 'Income Stability', impact: '+22%', pos: true, val: 90 },
        { feature: 'Debt-to-Income', impact: '+15%', pos: true, val: 70 },
        { feature: 'Requested Amount', impact: '-6%', pos: false, val: 25 },
      ],
      llmPlan: 'Approval probability is highly secure. Proceeding with fixed interest options is recommended over variable alternatives.'
    },
    startup: {
      score: 74,
      scoreLabel: 'Funding Readiness',
      barColor: 'bg-violet-600',
      stats: [
        { label: 'Team Experience', val: 'Strong' },
        { label: 'Market Traction', val: 'Early' },
        { label: 'Moat Depth', val: 'Moderate' }
      ],
      shap: [
        { feature: 'Founders Profile', impact: '+16%', pos: true, val: 75 },
        { feature: 'TAM Size', impact: '+11%', pos: true, val: 50 },
        { feature: 'Customer Churn', impact: '-14%', pos: false, val: 65 },
      ],
      llmPlan: 'High founder potential, but market penetration is thin. Focus on lowering user attrition before requesting Seed-A valuation.'
    },
    policy: {
      score: 61,
      scoreLabel: 'Feasibility Score',
      barColor: 'bg-amber-600',
      stats: [
        { label: 'Public Support', val: '68%' },
        { label: 'Regulatory Fit', val: 'Medium' },
        { label: 'Fiscal Impact', val: 'High' }
      ],
      shap: [
        { feature: 'Public Acceptance', impact: '+10%', pos: true, val: 40 },
        { feature: 'Legal Compliance', impact: '+8%', pos: true, val: 35 },
        { feature: 'Estimated Cost', impact: '-18%', pos: false, val: 80 },
      ],
      llmPlan: 'Policy carries solid social support but incurs critical budget deficits. Rework phase 2 cost distribution to ensure stability.'
    }
  }

  const faqData = [
    {
      q: "What is explainable AI (XAI) and why does it matter?",
      a: "Standard AI models act as black boxes—they output a score without explanation. DeciXAI uses SHAP (SHapley Additive exPlanations) values to break down exactly how much weight each individual input factor carried, giving you full transparency and auditability for every prediction."
    },
    {
      q: "How do the underlying machine learning models work?",
      a: "Our backend utilizes highly-tuned Gradient Boosting and Random Forest models trained on curated domain datasets. These models predict the outcomes, which are then passed through SHAP explainer objects and synthesized by an LLM via RAG to provide custom action plans."
    },
    {
      q: "Is my decision data secure on your platform?",
      a: "Yes. All data inputted into DeciXAI is fully encrypted in transit (HTTPS/TLS) and at rest. We do not sell your data, and we provide clean audit trails so that you can view and control access to your decision logs at any time."
    },
    {
      q: "Can I cancel or upgrade my plan at any time?",
      a: "Absolutely. You can toggle between monthly or annual billing and change plans instantly from your account settings. If you cancel a Pro subscription, you will retain access to your Pro features until the end of your current billing cycle."
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-clip font-sans selection:bg-blue-100 selection:text-blue-800">
      {/* Google Ambient Animated floating lights */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/12 rounded-full animate-blob-1" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full animate-blob-2" />
        <div className="absolute top-1/2 left-1/3 w-[450px] h-[450px] bg-amber-500/8 rounded-full animate-blob-3" />
      </div>

      {/* Header / Navbar - Pinned & Sticky (Dark Background) */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/90 bg-[#0B0F19]/95 backdrop-blur-xl shadow-lg shadow-black/20 transition-all">
        <div className="mx-auto max-w-7xl px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img
              src="/logo.jpeg"
              alt="DeciXAI Logo"
              className="h-9 w-9 rounded-lg border border-slate-700 object-cover shadow-sm"
            />
            <span className="text-lg font-bold tracking-tight text-white font-sans">DeciXAI</span>
          </div>
          
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#demo" className="text-sm font-bold text-slate-300 hover:text-cyan-400 transition-colors">Demo</a>
            <a href="#features" className="text-sm font-bold text-slate-300 hover:text-cyan-400 transition-colors">Features</a>
            <a href="#domains" className="text-sm font-bold text-slate-300 hover:text-cyan-400 transition-colors">Domains</a>
            <a href="#pricing" className="text-sm font-bold text-slate-300 hover:text-cyan-400 transition-colors">Pricing</a>
            <a href="#faq" className="text-sm font-bold text-slate-300 hover:text-cyan-400 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2 text-sm font-bold text-white transition-all shadow-sm shadow-blue-500/20 hover:shadow-md"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/auth')}
                  className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/auth?mode=register')}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2 text-sm font-bold text-white transition-all shadow-sm shadow-blue-500/20 hover:shadow-md"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section - 2-Column Split: Content Left & App Logo Right */}
      <section className="relative z-10 px-6 pt-8 pb-14 lg:pt-14 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Headline, Description, CTAs, Trust Bar */}
            <div className="lg:col-span-7 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-700 mb-6 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-ping" />
                Decision Intelligence OS 2.0
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.12] tracking-tight text-slate-950 font-sans">
                Make decisions with
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                  explainable confidence.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-sm sm:text-base leading-relaxed text-slate-700 font-medium">
                Stop treating AI predictions as black boxes. DeciXAI couples advanced ML prediction scoring with live SHAP explainability charts and integrated LLM advisory guidance in one unified SaaS workspace.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <button
                  onClick={handleGetStarted}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 px-7 py-3.5 text-sm font-bold text-white transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:-translate-y-0.5 text-center cursor-pointer"
                >
                  Start For Free
                </button>
                <a
                  href="#demo"
                  className="rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-7 py-3.5 text-sm font-bold text-slate-800 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 text-center"
                >
                  Interactive Demo
                </a>
              </div>

              {/* SaaS Trust Bar */}
              <div className="mt-12 pt-6 border-t border-slate-200/90 max-w-xl">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3.5">
                  TRUSTED BY BUILDERS AND DECISION MAKERS AT
                </p>
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-slate-700 font-extrabold font-mono text-xs sm:text-sm">
                  <span className="hover:text-blue-600 transition-colors">STRIPE</span>
                  <span className="hover:text-blue-600 transition-colors">VERCEL</span>
                  <span className="hover:text-blue-600 transition-colors">LINEAR</span>
                  <span className="hover:text-blue-600 transition-colors">RETOOL</span>
                  <span className="hover:text-blue-600 transition-colors">SUPABASE</span>
                </div>
              </div>
            </div>

            {/* Right Column: App Logo (Clean, No Extra Text) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[380px]">
                {/* Ambient glow behind logo */}
                <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-cyan-400/20 blur-2xl -z-10" />

                {/* Clean Logo Container */}
                <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-2xl transition-all duration-300 hover:shadow-blue-500/15">
                  <img
                    src="/logo.jpeg"
                    alt="DeciXAI App Logo"
                    className="w-full aspect-square object-cover rounded-2xl shadow-sm transition-transform duration-500 hover:scale-[1.02]"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Interactive SaaS Dashboard Mockup Preview */}
      <section id="demo" className="relative z-10 px-6 py-10 bg-slate-100/50 border-t border-slate-200">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <span className="text-xs uppercase tracking-[0.2em] text-blue-600 mb-2.5 font-bold">Product Preview</span>
            <h2 className="text-3xl font-extrabold text-slate-950">Explore the DeciXAI Workspace</h2>
            <p className="text-slate-800 mt-2 text-sm font-semibold max-w-xl mx-auto">Toggle between domains to see how our predictive scoring, SHAP explainers, and action plans update instantly.</p>
          </div>

          {/* Interactive Screen Container */}
          <div className="rounded-2xl border border-slate-300 bg-white p-4 md:p-5 shadow-lg relative overflow-hidden">
            {/* Window header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="text-[11px] text-slate-800 ml-3 font-mono font-bold">dashboard.decixai.io/app</span>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-2.5 py-0.5 text-[10px] text-blue-700 border border-blue-100 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                Active Model Session
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Domain Switcher Sidebar */}
              <div className="lg:col-span-1 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2.5 mb-2">Decision Domains</div>
                {[
                  { id: 'career', label: 'Career Engine', icon: '💼', color: 'hover:bg-slate-100 hover:text-blue-700' },
                  { id: 'finance', label: 'Finance Engine', icon: '📊', color: 'hover:bg-slate-100 hover:text-emerald-700' },
                  { id: 'startup', label: 'Startup Evaluator', icon: '🚀', color: 'hover:bg-slate-100 hover:text-violet-700' },
                  { id: 'policy', label: 'Policy Assessor', icon: '🏛️', color: 'hover:bg-slate-100 hover:text-amber-700' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveDomainTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left text-sm font-bold transition-all border ${
                      activeDomainTab === item.id 
                        ? 'bg-blue-50 text-blue-700 shadow-sm border-blue-200' 
                        : 'text-slate-800 border-transparent hover:border-slate-100'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
                
                <div className="pt-4 mt-4 border-t border-slate-200">
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-center">
                    <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wide">Live Support</span>
                    <p className="text-[11px] text-slate-800 mt-1 font-semibold">Chat directly with the decision model using standard RAG constraints.</p>
                  </div>
                </div>
              </div>

              {/* Mock Dashboard View */}
              <div className="lg:col-span-3 space-y-5">
                {/* Upper metrics row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Score circle / card */}
                  <div className="bg-slate-50 rounded-xl p-4.5 border border-slate-200 flex flex-col justify-center shadow-sm">
                    <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{dashboardPreviews[activeDomainTab].scoreLabel}</span>
                    <div className="flex items-baseline gap-1.5 mt-1.5">
                      <span className="text-3xl font-black text-slate-950">{dashboardPreviews[activeDomainTab].score}%</span>
                      <span className="text-[10px] text-slate-500 font-bold">confidence</span>
                    </div>
                    {/* Score Bar */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2.5 overflow-hidden">
                      <div 
                        className={`h-full ${dashboardPreviews[activeDomainTab].barColor} transition-all duration-500`}
                        style={{ width: `${dashboardPreviews[activeDomainTab].score}%` }}
                      />
                    </div>
                  </div>

                  {/* Dynamic stats */}
                  {dashboardPreviews[activeDomainTab].stats.map((stat, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-4.5 border border-slate-200 flex flex-col justify-between shadow-sm">
                      <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{stat.label}</span>
                      <span className="text-xl font-black text-slate-950 mt-1">{stat.val}</span>
                      <span className="text-[10px] text-emerald-700 flex items-center gap-1 mt-1 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Optimized
                      </span>
                    </div>
                  ))}
                </div>

                {/* Explainer and LLM Plan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* SHAP Explainer Chart */}
                  <div className="bg-slate-50 rounded-xl p-4.5 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-[10px] text-slate-700 font-extrabold uppercase tracking-wider">SHAP Feature Importances</span>
                      <span className="text-[9px] text-slate-500 font-bold">Live Breakdown</span>
                    </div>
                    <div className="space-y-3">
                      {dashboardPreviews[activeDomainTab].shap.map((f, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-800 font-bold">{f.feature}</span>
                            <span className={f.pos ? 'text-emerald-700 font-extrabold' : 'text-rose-700 font-extrabold'}>
                              {f.impact}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${f.pos ? 'bg-emerald-500' : 'bg-rose-500'} transition-all duration-500`}
                              style={{ width: `${f.val}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Action Plan */}
                  <div className="bg-slate-50 rounded-xl p-4.5 border border-slate-200 flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">🤖</span>
                        <span className="text-[10px] text-slate-700 font-extrabold uppercase tracking-wider">AI Recommendation Plan</span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-800 font-semibold italic">
                        "{dashboardPreviews[activeDomainTab].llmPlan}"
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-200 mt-3 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-bold">Models: RF + GPT-4o</span>
                      <button
                        onClick={handleGetStarted}
                        className="text-[11px] text-blue-600 font-extrabold hover:text-blue-700 flex items-center gap-0.5"
                      >
                        Try with your data
                        <span className="text-sm font-bold">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mini Interactive Try It Live Demo Widget */}
      <section className="relative z-10 px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-300 bg-white p-6 md:p-8 shadow-md">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-mono font-bold uppercase">Interactive Demo</span>
            <span className="text-[11px] text-slate-500 font-bold">Evaluate custom outcomes</span>
          </div>
          <h3 className="text-xl font-bold text-slate-950 mb-1.5 font-sans">Test out the decision generator</h3>
          <p className="text-slate-800 text-xs md:text-sm mb-5 font-semibold">Type a quick scenario below (e.g. "Launching a mobile SaaS app for local delivery" or "Moving to Berlin for a mid-level web developer job") to simulate our explainable model breakdown.</p>
          
          <form onSubmit={runDemo} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={demoInput}
              onChange={(e) => setDemoInput(e.target.value)}
              placeholder="e.g. Quitting my job to launch a marketing startup..."
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-xs md:text-sm text-slate-900 font-semibold placeholder-slate-500 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={demoLoading}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs md:text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {demoLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Evaluating...
                </>
              ) : 'Evaluate'}
            </button>
          </form>

          {/* Demo Results Display */}
          {demoResult && (
            <div className="mt-6 pt-5 border-t border-slate-200 space-y-5 animate-[landingSlideUp_0.4s_ease-out_both]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Score */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center shadow-sm">
                  <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Estimated Score</span>
                  <span className="text-3xl font-black text-slate-950 mt-1 block">{demoResult.score}%</span>
                  <span className="text-[10px] text-blue-600 uppercase font-extrabold mt-1 block">{demoResult.verdict}</span>
                </div>
                
                {/* Custom SHAP */}
                <div className="md:col-span-2 bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-700 font-extrabold uppercase tracking-wider block mb-2">Feature Impact Simulation</span>
                  <div className="space-y-2">
                    {demoResult.shap.map((f, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-800 font-bold">{f.name}</span>
                          <span className={f.positive ? 'text-emerald-700 font-extrabold' : 'text-rose-700 font-extrabold'}>
                            {f.positive ? '+' : ''}{f.value}%
                          </span>
                        </div>
                        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${f.positive ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                            style={{ width: `${Math.abs(f.value) * 6}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Plan */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <span className="text-[10px] text-blue-700 font-extrabold uppercase tracking-wider block mb-1">Simulated Advice Plan</span>
                <p className="text-xs text-slate-800 leading-relaxed font-semibold italic">
                  "{demoResult.plan}"
                </p>
                <div className="mt-3.5 flex justify-between items-center text-[10px] text-slate-500 font-bold">
                  <span>Want deeper insights? Sign up to unlock full reports.</span>
                  <button onClick={handleGetStarted} className="text-blue-600 font-extrabold hover:underline">Get Started Free</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feature Value Propositions (Feature Grid) */}
      <section id="features" className="relative z-10 px-6 py-16 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold">Platform Capabilities</span>
            <h2 className="text-3xl font-extrabold text-slate-950 mt-2">
              Full transparency, no black box.
            </h2>
            <p className="text-slate-800 mt-2.5 text-sm font-semibold max-w-2xl mx-auto">DeciXAI comes loaded with enterprise-grade features built directly into every workspace account.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: '📊',
                title: 'Live SHAP Explanations',
                desc: 'See which elements optimized or hindered your decision. Every forecast is outputted with additive values mapping factors instantly.',
              },
              {
                icon: '💬',
                title: 'RAG Conversational Chatbot',
                desc: 'An AI assistant mapped to your decision report. Ask questions like "How can I improve my startup valuation metrics?" and get context-aware plans.',
              },
              {
                icon: '🔐',
                title: 'SaaS Security & Audits',
                desc: 'We store your predictions using encrypted keys and provide detailed auditing reports so you can verify who viewed or updated your items.',
              },
              {
                icon: '📥',
                title: 'Export PDF & JSON Reports',
                desc: 'Generate complete presentation-ready PDF reports with SHAP diagrams and chat transcripts to share with stakeholders or founders.',
              },
              {
                icon: '🚀',
                title: 'Four Domain Modules',
                desc: 'Switch between Career pathways, Startup valuations, Loan viability metrics, and Government Policy feasibility models seamlessly.',
              },
              {
                icon: '🛡️',
                title: 'Rate-Limited & Stable APIs',
                desc: 'Fast, secure endpoints backed by auto-managed databases, protected routes, and customizable API Key headers.',
              }
            ].map((f, i) => (
              <div
                key={f.title}
                className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 duration-300"
              >
                <div className="text-2xl mb-4">{f.icon}</div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-xs leading-relaxed text-slate-800 font-semibold">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Domain Breakdown Section */}
      <section id="domains" className="relative z-10 px-6 py-16 bg-slate-100/30 border-t border-slate-200">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold">Decision Domains</span>
            <h2 className="text-3xl font-extrabold text-slate-950 mt-2">
              One dashboard. Four engines.
            </h2>
            <p className="text-slate-800 mt-2.5 text-sm font-semibold max-w-2xl mx-auto">We designed dedicated machine learning preprocessors and models to optimize variables for every domain.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Career Pathfinder',
                emoji: '💼',
                desc: 'Evaluate tech stack matches, remote availability constraints, and role levels to find your optimal path.',
                color: 'text-blue-600',
              },
              {
                title: 'Finance Viability',
                emoji: '📊',
                desc: 'Calculate loan approvals, debt-to-income targets, and risk scores with detailed explainable parameters.',
                color: 'text-emerald-600',
              },
              {
                title: 'Startup Evaluator',
                emoji: '🚀',
                desc: 'Determine TAM targets, customer growth benchmarks, and capital runway metrics for fundraising pitches.',
                color: 'text-violet-600',
              },
              {
                title: 'Policy Assessor',
                emoji: '🏛️',
                desc: 'Map budgetary impacts, public backing variables, and regulatory constraints for legislative proposals.',
                color: 'text-amber-600',
              }
            ].map((d) => (
              <div
                key={d.title}
                onClick={handleGetStarted}
                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md hover:-translate-y-1 duration-300"
              >
                <div className="text-2xl mb-3.5">{d.emoji}</div>
                <h3 className={`text-sm font-bold ${d.color} mb-1.5`}>
                  {d.title}
                </h3>
                <p className="text-[11px] leading-relaxed text-slate-800 font-semibold group-hover:text-slate-900 transition-colors">{d.desc}</p>
                <span className="mt-3 flex items-center gap-0.5 text-[10px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
                  Explore Engine →
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SaaS Pricing Section */}
      <section id="pricing" className="relative z-10 px-6 py-16 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <span className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold">Billing Options</span>
            <h2 className="text-3xl font-extrabold text-slate-950 mt-2">Simple, predictable plans.</h2>
            
            {/* Toggle monthly / annual */}
            <div className="mt-6 inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-full p-1 shadow-inner">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all ${
                  billingInterval === 'monthly' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-800 hover:text-slate-950'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('annual')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all flex items-center gap-1 ${
                  billingInterval === 'annual' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-800 hover:text-slate-950'
                }`}
              >
                Yearly
                <span className="bg-emerald-50 text-emerald-700 text-[9px] px-1 py-0.5 rounded-full font-bold">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto mt-10">
            {/* Plan 1: Free */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <h3 className="text-base font-bold text-slate-900">Starter</h3>
                <p className="text-slate-800 text-[11px] font-semibold mt-0.5">For basic personal decisions.</p>
                <div className="mt-5 flex items-baseline gap-0.5">
                  <span className="text-3xl font-extrabold text-slate-950">$0</span>
                  <span className="text-slate-800 text-xs font-bold">/month</span>
                </div>
                
                <ul className="mt-6 space-y-3 text-xs text-slate-800 font-semibold border-t border-slate-100 pt-5">
                  <li className="flex items-center gap-1.5">
                    <span className="text-blue-500 font-bold">✓</span> 3 free decision reports
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-blue-500 font-bold">✓</span> Basic SHAP explainers
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-blue-500 font-bold">✓</span> Starter Career & Finance modules
                  </li>
                  <li className="text-slate-400 line-through flex items-center gap-1.5">
                    ✗ Multi-model Chatbot support
                  </li>
                </ul>
              </div>
              <button
                onClick={handleGetStarted}
                className="mt-6 w-full rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 transition-colors shadow-sm"
              >
                Get Started
              </button>
            </div>

            {/* Plan 2: Pro */}
            <div className="rounded-2xl border-2 border-blue-600 bg-white p-7 flex flex-col justify-between relative shadow-md hover:shadow-lg transition-shadow">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-bold text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Most Popular
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Pro</h3>
                <p className="text-slate-800 text-[11px] font-semibold mt-0.5">For professional builders & analysts.</p>
                <div className="mt-5 flex items-baseline gap-0.5">
                  <span className="text-3xl font-extrabold text-slate-950">
                    {billingInterval === 'monthly' ? '$29' : '$23'}
                  </span>
                  <span className="text-slate-800 text-xs font-bold">/month</span>
                </div>
                
                <ul className="mt-6 space-y-3 text-xs text-slate-800 font-semibold border-t border-slate-100 pt-5">
                  <li className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-bold">✓</span> Unlimited decision reports
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-bold">✓</span> Full SHAP feature visualizations
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-bold">✓</span> Active RAG Chatbot advisor
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-bold">✓</span> PDF & CSV Report exporting
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-bold">✓</span> 4 domain engines fully unlocked
                  </li>
                </ul>
              </div>
              <button
                onClick={handleGetStarted}
                className="mt-6 w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-bold text-white transition-all shadow-sm hover:shadow shadow-blue-500/10"
              >
                Upgrade to Pro
              </button>
            </div>

            {/* Plan 3: Enterprise */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <h3 className="text-base font-bold text-slate-900">Enterprise</h3>
                <p className="text-slate-800 text-[11px] font-semibold mt-0.5">For teams requiring custom integrations.</p>
                <div className="mt-5 flex items-baseline gap-0.5">
                  <span className="text-3xl font-extrabold text-slate-950">Custom</span>
                </div>
                
                <ul className="mt-6 space-y-3 text-xs text-slate-800 font-semibold border-t border-slate-100 pt-5">
                  <li className="flex items-center gap-1.5">
                    <span className="text-blue-500 font-bold">✓</span> Dedicated LLM nodes
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-blue-500 font-bold">✓</span> Custom preprocessor pipeline
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-blue-500 font-bold">✓</span> Admin dashboard & API key provisioning
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-blue-500 font-bold">✓</span> SLA response guarantees
                  </li>
                </ul>
              </div>
              <button
                onClick={handleGetStarted}
                className="mt-6 w-full rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-800 transition-colors shadow-sm"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section id="faq" className="relative z-10 px-6 py-16 bg-slate-100/30 border-t border-slate-200">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-10">
            <span className="text-xs uppercase tracking-[0.2em] text-blue-600 font-bold">Frequently Asked Questions</span>
            <h2 className="text-3xl font-extrabold text-slate-950 mt-2">Got questions? We've got answers.</h2>
          </div>

          <div className="space-y-3 max-w-3xl mx-auto">
            {faqData.map((faq, idx) => (
              <div 
                key={idx}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs md:text-sm font-bold text-slate-900 pr-4">{faq.q}</span>
                  <span className={`text-lg text-slate-400 transition-transform duration-300 ${openFaq === idx ? 'rotate-45 text-blue-600' : ''}`}>
                    +
                  </span>
                </button>
                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    openFaq === idx ? 'max-h-60 border-t border-slate-100' : 'max-h-0'
                  } overflow-hidden`}
                >
                  <div className="p-5 text-xs md:text-sm text-slate-800 font-semibold leading-relaxed bg-slate-50/50">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative z-10 px-6 py-16 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50/30 p-10 md:p-12 text-center shadow-md relative overflow-hidden">
            {/* Ambient inner glow */}
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-[80px]" />
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-[80px]" />
            
            <h2 className="text-3xl font-extrabold text-slate-950 mb-4 relative z-10 font-sans">
              Start deciding with absolute clarity.
            </h2>
            <p className="text-slate-800 text-sm md:text-base font-semibold mb-8 max-w-xl mx-auto relative z-10">
              Create an account now to build models, view SHAP explainers, and outline evidence-backed action plans.
            </p>
            <button
              onClick={handleGetStarted}
              className="rounded-full bg-blue-600 hover:bg-blue-700 px-8 py-3.5 text-xs md:text-sm font-bold text-white transition-all shadow-md shadow-blue-500/10 hover:shadow"
            >
              Get Started Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 px-6 pt-12 pb-10 bg-slate-50">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-3.5">
                <img src="/logo.jpeg" alt="DeciXAI logo" className="h-7 w-7 rounded-lg border border-slate-200 object-cover shadow-sm" />
                <span className="font-bold text-slate-900 tracking-tight">DeciXAI</span>
              </div>
              <p className="text-[11px] text-slate-800 font-semibold leading-relaxed">
                Empowering individuals and teams with high-fidelity, explainable decision intelligence modules.
              </p>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3.5">Product</h4>
              <ul className="space-y-2 text-xs text-slate-800 font-bold">
                <li><a href="#demo" className="hover:text-blue-600 transition-colors">Workspace Demo</a></li>
                <li><a href="#features" className="hover:text-blue-600 transition-colors">Features Grid</a></li>
                <li><a href="#domains" className="hover:text-blue-600 transition-colors">Domain Engines</a></li>
                <li><a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing Table</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3.5">Resources</h4>
              <ul className="space-y-2 text-xs text-slate-800 font-bold">
                <li><span className="text-slate-400">Developer API (Soon)</span></li>
                <li><span className="text-slate-400">SHAP Integration Docs</span></li>
                <li><span className="text-slate-400">Model Training Specs</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3.5">Company</h4>
              <ul className="space-y-2 text-xs text-slate-800 font-bold">
                <li><span className="text-slate-400">About Us</span></li>
                <li><span className="text-slate-400">Privacy Policy</span></li>
                <li><span className="text-slate-400">Terms of Service</span></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-200 pt-7 flex flex-col md:flex-row items-center justify-between gap-3">
            <span className="text-[9px] text-slate-500 font-bold">v2.3 — Styled with Material Design Guidelines</span>
            <p className="text-[9px] text-slate-500 font-bold">
              © {new Date().getFullYear()} DeciXAI. All rights reserved. Made with ❤️ for developers and decision makers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
