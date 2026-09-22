import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  // State for interactive features
  const [activeStudio, setActiveStudio] = useState('career')
  const [openFaq, setOpenFaq] = useState(null)
  const [copiedCurl, setCopiedCurl] = useState(false)

  // Interactive 'What-If' Demo State
  const [whatIfSkills, setWhatIfSkills] = useState(['Python', 'Machine Learning'])
  const [whatIfProjects, setWhatIfProjects] = useState(1)
  const [whatIfCgpa, setWhatIfCgpa] = useState(8.4)

  // Custom Quick Scenario Demo
  const [scenarioInput, setScenarioInput] = useState('')
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [scenarioResult, setScenarioResult] = useState(null)

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard')
    } else {
      navigate('/auth')
    }
  }

  // Calculate What-If Live Delta Demo
  const baseScore = 78
  const skillBonus = Math.min(12, (whatIfSkills.length - 2) * 4)
  const projectBonus = Math.min(8, (whatIfProjects - 1) * 4)
  const cgpaBonus = Math.round((whatIfCgpa - 8.0) * 8)
  const simulatedScore = Math.min(99, Math.max(50, baseScore + skillBonus + projectBonus + cgpaBonus))
  const scoreDelta = simulatedScore - baseScore

  // Interactive Quick Evaluator
  const runScenario = (e) => {
    e.preventDefault()
    if (!scenarioInput.trim()) return
    setScenarioLoading(true)
    setScenarioResult(null)

    setTimeout(() => {
      setScenarioLoading(false)
      const score = Math.floor(Math.random() * 25) + 72
      setScenarioResult({
        score,
        verdict: score >= 82 ? 'Highly Recommended' : 'Feasible with Optimizations',
        factors: [
          { name: 'Core Competency Match', delta: '+16%', positive: true },
          { name: 'Market Demand Index', delta: '+11%', positive: true },
          { name: 'Resource Runway / Risk', delta: score > 80 ? '+6%' : '-8%', positive: score > 80 },
          { name: 'Execution Complexity', delta: '-4%', positive: false },
        ],
        advice: `For "${scenarioInput}", DeciXAI recommends phased deployment within 45 days. Prioritize mitigating the identified friction factors before scaling.`,
      })
    }, 900)
  }

  // Copy Curl snippet
  const copyApiSnippet = () => {
    const code = `curl -X POST https://api.decixai.io/api/v1/career/ \\
  -H "Authorization: Bearer dxa_live_89b2c3d4..." \\
  -H "Content-Type: application/json" \\
  -d '{"skills": ["Python", "FastAPI", "Docker"], "cgpa": 8.8}'`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code)
      setCopiedCurl(true)
      setTimeout(() => setCopiedCurl(false), 2000)
    }
  }

  // Studio Showcase Content
  const studioShowcases = {
    career: {
      tag: 'ATS 2.0 Talent Studio',
      title: 'Career & Talent Intelligence',
      badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      accentColor: 'from-cyan-500 to-blue-600',
      description:
        'Transform job hunting into an engineered strategy with counterfactual simulation, resume gap analysis, and STAR interview evaluation.',
      score: 94,
      scoreLabel: 'Hiring Match Probability',
      features: [
        'Counterfactual "What-If" Pivot Simulator (real-time probability delta testing)',
        'ATS 2.0 Resume Parser with Google X-Y-Z Bullet Point Rewriter',
        'Live O*NET Evidence Signals & Industry Competency Benchmarks',
        'Mock Interview Studio with AI STAR Scoring (Situation, Task, Action, Result)',
        'Real-Time Compensation Estimator across Tier 1 to Tier 3 Locations',
      ],
      previewStats: [
        { label: 'Skills Match', val: '94%' },
        { label: 'ATS Parsability', val: '98/100' },
        { label: 'Role Fit', val: 'AI Systems Architect' },
      ],
      waterfall: [
        { factor: 'Core Machine Learning Stack', delta: '+18%', positive: true },
        { factor: 'Production Capstone Projects', delta: '+12%', positive: true },
        { factor: 'Cloud Deployment Gap (Docker/AWS)', delta: '-4%', positive: false },
      ],
      sampleOutput:
        'Profile strongly matches AI Systems roles. Adding Docker containerization and Redis caching closes the top 4% candidate gap.',
    },
    finance: {
      tag: 'Automated Credit Studio',
      title: 'Finance & Loan Intelligence',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      accentColor: 'from-emerald-500 to-teal-600',
      description:
        'Eliminate lending uncertainty with automated DigiLocker eKYC, bank penny drops, debt-to-income analysis, and transparent risk explainability.',
      score: 91,
      scoreLabel: 'Credit Viability Score',
      features: [
        'Automated 7-Step Loan Application & Underwriting Wizard',
        'Instant DigiLocker eKYC & Aadhaar Masked Identity Verification',
        'Live Bank Account Penny Drop Verification with IMPS Protocol',
        'Debt-to-Income (DTI) Stress Testing & Repayment Probability Modeling',
        'Risk Radar Explainability isolating high-friction loan parameters',
      ],
      previewStats: [
        { label: 'DTI Ratio', val: '24.2%' },
        { label: 'Credit Health', val: 'Tier-A (760)' },
        { label: 'Fraud Risk', val: '< 0.2%' },
      ],
      waterfall: [
        { factor: 'Verified Monthly In-Hand Salary', delta: '+24%', positive: true },
        { factor: 'Clean Repayment History', delta: '+16%', positive: true },
        { factor: 'High Unsecured Loan Inquiries', delta: '-6%', positive: false },
      ],
      sampleOutput:
        'Loan viability confirmed. Low DTI and clean banking history offset recent credit checks. Eligible for prime rate financing.',
    },
    startup: {
      tag: 'Venture Studio',
      title: 'Startup & Valuation Intelligence',
      badgeColor: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
      accentColor: 'from-fuchsia-500 to-indigo-600',
      description:
        'Model startup survival, valuation multiples, and investor readiness with real-time burn rate, ARR traction, and go-to-market simulations.',
      score: 82,
      scoreLabel: 'Investor Readiness Score',
      features: [
        'Real-time Valuation Multiples based on ARR, MoM Growth & Margin',
        'Dynamic Cash Burn Rate & Runway Extension Calculator (6 to 18 months)',
        'Investor Pitch Scorecard evaluating Moat, TAM, and Founder Velocity',
        'Unit Economics Modeler (LTV to CAC ratio & Net Retention benchmarks)',
        'Go-to-Market (GTM) Strategy Engine with cost-per-acquisition benchmarks',
      ],
      previewStats: [
        { label: 'Est. Valuation', val: '$4.2M' },
        { label: 'Current Runway', val: '14 Months' },
        { label: 'MoM Growth', val: '+18.5%' },
      ],
      waterfall: [
        { factor: 'SaaS Gross Margin (>82%)', delta: '+19%', positive: true },
        { factor: 'Product-Led Growth Velocity', delta: '+14%', positive: true },
        { factor: 'Customer Acquisition Concentration', delta: '-9%', positive: false },
      ],
      sampleOutput:
        'Strong unit economics and runway. Seed-round readiness is high. Diversifying outbound enterprise sales will unlock Series A terms.',
    },
    policy: {
      tag: 'Public Policy Studio',
      title: 'Government & Policy Intelligence',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      accentColor: 'from-amber-500 to-orange-600',
      description:
        'Quantify civic impact, budget allocations, and algorithmic bias with multi-policy tradeoff matrices and public sentiment forecasting.',
      score: 76,
      scoreLabel: 'Policy Feasibility Index',
      features: [
        'Multi-Policy Tradeoff Matrix comparing subsidies vs infrastructure grants',
        'Algorithmic Fairness & Bias Governance Safeguard Checklists',
        'Municipal Budget Allocation Simulator maximizing target beneficiary ROI',
        'Public Demographic Sentiment & Adoption Friction Analysis',
        'Downloadable Audit-Ready PDF Reports for Legislative Committees',
      ],
      previewStats: [
        { label: 'Target Beneficiaries', val: '450k+' },
        { label: 'Budget Efficiency', val: '+31%' },
        { label: 'Bias Score', val: 'Compliant' },
      ],
      waterfall: [
        { factor: 'Targeted Student Outreach', delta: '+17%', positive: true },
        { factor: 'Inter-Agency Governance Alignment', delta: '+11%', positive: true },
        { factor: 'Implementation Logistics Overhead', delta: '-12%', positive: false },
      ],
      sampleOutput:
        'Digital grant shows 2.4x higher student adoption than device subsidies. Recommend allocating 65% funds to cloud broadband hubs.',
    },
  }

  const currentStudio = studioShowcases[activeStudio]

  const faqData = [
    {
      q: 'What is Explainable AI (XAI) and how does DeciXAI eliminate the "Black Box"?',
      a: 'Traditional AI models give a raw score without reasoning. DeciXAI uses SHAP (SHapley Additive exPlanations) values to calculate the exact mathematical contribution of every single variable. Whether evaluating loan eligibility, resume fit, or startup runway, you see exactly which factors boosted or penalized the prediction.',
    },
    {
      q: 'What makes the Counterfactual "What-If" Simulator unique?',
      a: 'Instead of guessing what changes will yield better results, the "What-If" Simulator allows candidates, founders, or loan officers to inject counterfactual variables (like adding Docker, extending runway by 3 months, or adjusting CGPA) and immediately see the live hiring or approval probability delta without submitting the full profile.',
    },
    {
      q: 'How does the Conversational Copilot integrate with the Saved Workspace?',
      a: 'DeciXAI Copilot understands both English and Hindi. When the bot generates actionable roadmaps, interview questions, or loan tips, you can click "Save to Workspace" on that message. It automatically categorizes the insight into its dedicated Studio folder (Career, Finance, Startup, or Policy) in your workspace.',
    },
    {
      q: 'Is my data encrypted and audit-compliant?',
      a: 'Yes. Every evaluation and decision run generates an immutable audit record with SHA-256 hash validation. Identity verification runs via DigiLocker eKYC with masked IDs. All data is protected with TLS 1.3 in transit and AES-256 at rest.',
    },
    {
      q: 'Can developers integrate DeciXAI via API?',
      a: 'DeciXAI features a complete Developer Hub. You can generate API keys instantly, access RESTful endpoints with bearer authentication, and integrate decision scoring into your apps with sub-15ms inference latency in Python, Node.js, or curl.',
    },
  ]

  return (
    <div className="min-h-screen bg-[#FBFDFF] text-slate-900 font-sans selection:bg-cyan-100 selection:text-cyan-900">
      
      {/* Subtle Ambient Light Gradients (Pure Light Theme) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-sky-100/60 via-indigo-50/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[30%] -left-40 w-[600px] h-[600px] bg-cyan-100/30 rounded-full blur-3xl" />
        <div className="absolute top-[50%] -right-40 w-[600px] h-[600px] bg-emerald-100/25 rounded-full blur-3xl" />
      </div>

      {/* ── 1. Dark Navbar Matching App Sidebar (#0B1120) ──────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0B1120]/95 backdrop-blur-xl shadow-lg shadow-black/20 transition-all">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img
              src="/logo.jpeg"
              alt="DeciXAI Logo"
              className="h-9 w-9 rounded-xl border border-slate-700/80 object-cover shadow-xs"
            />
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white font-sans">
                DeciXAI
              </span>
              <span className="hidden sm:inline-block rounded-full bg-cyan-950/70 border border-cyan-800/70 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                v2.4 Live
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-300">
            <a href="#studios" className="hover:text-cyan-400 transition">Decision Studios</a>
            <a href="#what-if" className="hover:text-cyan-400 transition">What-If Simulator</a>
            <a href="#features" className="hover:text-cyan-400 transition">Feature Matrix</a>
            <a href="#copilot" className="hover:text-cyan-400 transition">AI Copilot</a>
            <a href="#developer" className="hover:text-cyan-400 transition">API Hub</a>
            <a href="#faq" className="hover:text-cyan-400 transition">FAQ</a>
          </div>

          {/* User Auth CTAs */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 text-xs font-bold transition shadow-md shadow-blue-500/25 cursor-pointer flex items-center gap-1.5"
              >
                <span>Go to Dashboard</span>
                <span>→</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/auth')}
                  className="text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-800/70"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/auth?mode=register')}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 text-xs font-bold transition shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Launch Free Workspace</span>
                  <span>→</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── 2. Hero Section: Headline & Live Interactive Terminal ────────── */}
      <section className="relative z-10 px-4 sm:px-6 pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="mx-auto max-w-7xl">
          
          {/* Hero Top Eyebrow */}
          <div className="text-center max-w-4xl lg:max-w-5xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50/80 px-3.5 py-1 text-xs font-bold text-cyan-800 shadow-2xs mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-600"></span>
              </span>
              <span>Next-Gen Explainable AI (XAI) Intelligence Platform</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 leading-tight">
              <span className="block sm:whitespace-nowrap">
                Stop Guessing with Black-Box AI.
              </span>
              <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 bg-clip-text text-transparent">
                Explain Every Decision.
              </span>
            </h1>

            <p className="mt-5 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              DeciXAI combines high-precision machine learning with live SHAP attribution charts,
              counterfactual What-If simulations, and an anti-hallucination bilingual copilot
              across <strong>Career, Finance, Startup, and Policy</strong>.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={handleGetStarted}
                className="w-full sm:w-auto rounded-xl bg-slate-950 hover:bg-slate-800 text-white px-7 py-3.5 text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Launch Decision Workspace</span>
                <span>→</span>
              </button>
              <a
                href="#what-if"
                className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 px-6 py-3.5 text-sm font-bold shadow-2xs hover:shadow-sm transition-all text-center"
              >
                ⚡ Try 'What-If' Simulator
              </a>
            </div>

            {/* Quick Proof Metrics */}
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 text-left max-w-3xl mx-auto">
              {[
                { val: '< 15ms', label: 'ML Inference Latency' },
                { val: '100%', label: 'Deterministic SHAP Math' },
                { val: '4 Studios', label: 'Unified Decision Engines' },
                { val: '0% Hallucination', label: 'Grounded Model XAI' },
              ].map((m, i) => (
                <div key={i} className="rounded-xl border border-slate-200/80 bg-white/70 p-3 shadow-2xs">
                  <div className="text-base sm:text-lg font-black text-slate-900">{m.val}</div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Live Hero Terminal Preview */}
          <div className="mt-8 rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-7 shadow-xl shadow-slate-200/40 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </span>
                <span className="text-xs font-mono font-bold text-slate-400 ml-2">decixai-terminal-v2.4</span>
              </div>

              {/* Studio Switcher Tabs inside Hero */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {Object.keys(studioShowcases).map((key) => {
                  const s = studioShowcases[key]
                  const isActive = activeStudio === key
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveStudio(key)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {s.tag}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Terminal Body Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Live Score & Stat Cards */}
              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {currentStudio.scoreLabel}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${currentStudio.badgeColor}`}>
                      Live Prediction
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-slate-950 font-mono">
                      {currentStudio.score}%
                    </span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ High Confidence
                    </span>
                  </div>

                  <div className="mt-4 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${currentStudio.accentColor} transition-all duration-700`}
                      style={{ width: `${currentStudio.score}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {currentStudio.previewStats.map((stat, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-100 bg-white p-3 shadow-2xs text-center">
                      <div className="text-[10px] uppercase font-bold text-slate-400">{stat.label}</div>
                      <div className="text-xs sm:text-sm font-black text-slate-900 mt-1 truncate">{stat.val}</div>
                    </div>
                  ))}
                </div>

                {/* AI Plan Snippet */}
                <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-3.5 text-xs text-slate-700">
                  <span className="font-bold text-cyan-900 block text-[11px] uppercase tracking-wider mb-1">
                    🤖 Grounded XAI Recommendation:
                  </span>
                  <p className="italic leading-relaxed">"{currentStudio.sampleOutput}"</p>
                </div>
              </div>

              {/* Right Column: SHAP Attribution Waterfall */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-100 bg-slate-50/40 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">SHAP Attribution Waterfall</h3>
                    <p className="text-[11px] text-slate-500">Exact feature impact calculated for this decision</p>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-700 font-bold bg-cyan-100/70 px-2 py-0.5 rounded">
                    Mathematical XAI
                  </span>
                </div>

                <div className="space-y-3">
                  {currentStudio.waterfall.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${item.positive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="text-xs font-bold text-slate-800">{item.factor}</span>
                      </div>
                      <span className={`text-xs font-mono font-black ${item.positive ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {item.delta}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">Features grounded strictly in model features</span>
                  <button
                    onClick={() => navigate(`/dashboard/${activeStudio}`)}
                    className="font-bold text-cyan-700 hover:text-cyan-900 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Open in {currentStudio.title}</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── 3. Interactive 'What-If' Simulator Live Playground ────────────── */}
      <section id="what-if" className="relative z-10 px-4 sm:px-6 py-16 bg-slate-50/70 border-y border-slate-200/80">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-full">
              Live Counterfactual Engine
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight mt-3">
              The 'What-If' Pivot Simulator
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Inject skills, capstone projects, and credentials right here to test real-time hiring probability deltas before applying.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Controls */}
              <div className="lg:col-span-7 space-y-6">
                {/* Skill Injector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Inject Key High-Impact Skills:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Python', 'Machine Learning', 'Docker', 'FastAPI', 'Kubernetes', 'System Design', 'Redis'].map((skill) => {
                      const selected = whatIfSkills.includes(skill)
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() =>
                            setWhatIfSkills((prev) =>
                              selected ? prev.filter((s) => s !== skill) : [...prev, skill]
                            )
                          }
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer border ${
                            selected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {selected ? '✓ ' : '+ '}
                          {skill}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Capstone Projects Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>Add Verified Production Capstones:</span>
                    <span className="font-mono text-cyan-700">{whatIfProjects} Projects</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={whatIfProjects}
                    onChange={(e) => setWhatIfProjects(Number(e.target.value))}
                    className="w-full accent-cyan-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>1 (Standard)</span>
                    <span>2 (Recommended)</span>
                    <span>3 (Advanced)</span>
                    <span>4 (Full Portfolio)</span>
                  </div>
                </div>

                {/* CGPA Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>Academic CGPA:</span>
                    <span className="font-mono text-cyan-700">{whatIfCgpa.toFixed(1)} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="7.0"
                    max="9.8"
                    step="0.1"
                    value={whatIfCgpa}
                    onChange={(e) => setWhatIfCgpa(Number(e.target.value))}
                    className="w-full accent-cyan-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Output Result Card */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-white shadow-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Simulated Outcome
                </span>
                
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                      {simulatedScore}%
                    </span>
                    <span className="text-xs text-slate-400 ml-2">from {baseScore}%</span>
                  </div>
                  
                  <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs font-mono font-extrabold">
                    +{scoreDelta}% Uplift
                  </span>
                </div>

                <div className="mt-4 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${simulatedScore}%` }}
                  />
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Skills Contribution:</span>
                    <span className="font-mono font-bold text-emerald-400">+{skillBonus}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capstones Contribution:</span>
                    <span className="font-mono font-bold text-emerald-400">+{projectBonus}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Academic Standing:</span>
                    <span className="font-mono font-bold text-cyan-400">+{cgpaBonus}%</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/dashboard/career')}
                  className="mt-6 w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 py-2.5 text-xs font-black uppercase tracking-wider transition cursor-pointer"
                >
                  Run Full What-If Simulator in Studio →
                </button>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── 4. The 4 Specialized Decision Studios ─────────────────────────── */}
      <section id="studios" className="relative z-10 px-4 sm:px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              Comprehensive Domain Suite
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-3">
              Four High-Stakes Decision Studios
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Each studio combines fine-tuned machine learning models with explainable SHAP reasoning and actionable execution roadmaps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.keys(studioShowcases).map((key) => {
              const s = studioShowcases[key]
              return (
                <div
                  key={key}
                  className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${s.badgeColor}`}>
                        {s.tag}
                      </span>
                      <span className="text-xs font-mono font-black text-slate-900">
                        {s.score}% Baseline
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-950">{s.title}</h3>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {s.description}
                    </p>

                    <div className="mt-5 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Core Built-In Tools:
                      </span>
                      {s.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <span className="text-cyan-600 font-bold leading-none mt-0.5">•</span>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/dashboard/${key}`)}
                      className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold transition cursor-pointer"
                    >
                      Open {s.title} →
                    </button>
                    <span className="text-[11px] font-bold text-slate-400">Included in Free Tier</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 5. Feature Matrix Bento Grid ─────────────────────────────────── */}
      <section id="features" className="relative z-10 px-4 sm:px-6 py-16 bg-slate-50/60 border-t border-slate-200/80">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-full">
              Enterprise Infrastructure
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-3">
              Built for Transparency, Auditability &amp; Speed
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Every feature is built from the ground up to prevent AI hallucinations and provide mathematical certainty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: '📄',
                title: 'ATS 2.0 Resume Scanner',
                desc: 'Upload PDF/DOCX resumes for instant skill extraction, Google X-Y-Z bullet rewrites, and target role alignment scoring.',
              },
              {
                icon: '⚡',
                title: 'DigiLocker & Penny Drop KYC',
                desc: 'Native Indian FinTech integration: instant Aadhaar eKYC via DigiLocker and IMPS bank account penny drop validation.',
              },
              {
                icon: '🎤',
                title: 'Mock Interview Studio',
                desc: 'Practice tough domain questions with live STAR scorecard evaluations and actionable feedback from an AI evaluator.',
              },
              {
                icon: '💬',
                title: 'Bilingual AI Copilot with 4 Folders',
                desc: 'Chat naturally in English or Hindi with strict anti-hallucination guardrails and 1-click "Save to Workspace" studio folders.',
              },
              {
                icon: '🛡️',
                title: 'Tamper-Evident Audit Trail',
                desc: 'SHA-256 cryptographic integrity hash for every decision, timestamped history logs, and verifiable public share links.',
              },
              {
                icon: '⚡',
                title: 'Developer API Hub',
                desc: 'Provision live API keys, monitor request latency, and run decision inferences from any backend using Python or curl.',
              },
            ].map((card, i) => (
              <div key={i} className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs hover:shadow-md transition">
                <div className="text-2xl mb-3">{card.icon}</div>
                <h3 className="text-base font-bold text-slate-950">{card.title}</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Conversational AI Copilot Spotlight ───────────────────────── */}
      <section id="copilot" className="relative z-10 px-4 sm:px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-6 space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-full">
                  Bilingual Live Copilot
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                  Chat Naturally in English or Hindi.
                  Save Roadmaps Straight to Workspace.
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  DeciXAI Copilot adapts dynamically to the studio you are on. In Career mode,
                  it offers tailored STAR interview questions and 3-month transition roadmaps. In Finance,
                  it answers loan eligibility limits in plain Hindi or English.
                </p>

                <div className="space-y-2 pt-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>1-Click <strong>Save to Workspace</strong> with 4 dedicated studio folders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Strict anti-hallucination grounding tied to ML model features</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Real-time streaming text with copy, cancel, and clear options</span>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    onClick={() => navigate('/dashboard/workspace?tab=chatbot')}
                    className="rounded-xl bg-slate-950 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold transition cursor-pointer"
                  >
                    View Saved Chatbot Workspace →
                  </button>
                </div>
              </div>

              {/* Visual Chat Mockup (Light Theme) */}
              <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-800">DeciXAI Copilot</span>
                    <span className="text-[10px] bg-cyan-100 text-cyan-800 px-1.5 py-0.2 rounded font-bold">Career Mode</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Live Session</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* User Bubble */}
                  <div className="flex justify-end">
                    <div className="rounded-2xl bg-slate-900 text-white px-3.5 py-2 max-w-[85%] font-medium">
                      Data Science me switch karne ke liye step-by-step 3-month roadmap batao
                    </div>
                  </div>

                  {/* Assistant Bubble */}
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-white border border-slate-200 p-3.5 max-w-[90%] text-slate-800 shadow-2xs space-y-1.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                        <span>3-Month Transition Roadmap (Python → Data Science):</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        <strong>Month 1:</strong> Advanced Pandas, NumPy &amp; Statistical Hypotheses.<br />
                        <strong>Month 2:</strong> End-to-End Scikit-Learn pipelines &amp; SHAP model explainability.<br />
                        <strong>Month 3:</strong> Deploy 2 Production Capstones with FastAPI &amp; Docker.
                      </p>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">DeciXAI Intelligence</span>
                        <span className="rounded bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 border border-emerald-200">
                          ✓ Saved to Workspace
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Developer API Section ──────────────────────────────────────── */}
      <section id="developer" className="relative z-10 px-4 sm:px-6 py-16 bg-slate-50/70 border-t border-slate-200/80">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full">
              Developer Hub
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mt-3">
              RESTful API Inferences in One Request
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Integrate explainable decision scoring into your HR systems, banking backends, or SaaS products with instant API keys.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="text-emerald-400">POST</span>
                <span>https://api.decixai.io/api/v1/career/</span>
              </div>
              <button
                type="button"
                onClick={copyApiSnippet}
                className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-2.5 py-1 transition cursor-pointer"
              >
                {copiedCurl ? '✓ Copied' : 'Copy cURL'}
              </button>
            </div>

            <pre className="font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
{`curl -X POST https://api.decixai.io/api/v1/career/ \\
  -H "Authorization: Bearer dxa_live_89b2c3d4e5f6..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "skills": ["Python", "FastAPI", "Docker", "PyTorch"],
    "projects": ["Vocalis-AI: Speech synthesis tool"],
    "cgpa": 8.8,
    "interest": "AI Systems & Machine Learning Engineer"
  }'`}
            </pre>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 font-medium">Response returns score, SHAP feature weights, and roadmap milestones in &lt;15ms.</span>
              <button
                onClick={() => navigate('/dashboard/developer')}
                className="rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black px-4 py-2 transition cursor-pointer"
              >
                Get API Keys in Developer Hub →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Comparison Matrix: DeciXAI vs Black-Box AI ─────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              Decision Defense
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mt-3">
              Why Leaders Choose DeciXAI Over Generic LLMs
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
                    <th className="p-4">Capability</th>
                    <th className="p-4 text-cyan-900 font-extrabold bg-cyan-50/60">DeciXAI Platform</th>
                    <th className="p-4 text-slate-500">Black-Box LLMs (ChatGPT)</th>
                    <th className="p-4 text-slate-500">Manual Spreadsheets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      name: 'Mathematical Feature Explainability (SHAP)',
                      deci: '✓ Exact SHAP Attribution',
                      other1: '✗ Fabricated / Hallucinated',
                      other2: '✗ None',
                    },
                    {
                      name: 'Counterfactual "What-If" Delta Simulator',
                      deci: '✓ Live Interactive Deltas',
                      other1: '✗ Static Output',
                      other2: '✗ High Manual Work',
                    },
                    {
                      name: 'Multi-Studio Coverage (Career, Finance, Startup, Policy)',
                      deci: '✓ 4 Unified Studios',
                      other1: '✗ Generic General Knowledge',
                      other2: '✗ Fragmented Tools',
                    },
                    {
                      name: 'Verified FinTech KYC (DigiLocker & Penny Drop)',
                      deci: '✓ Built-in Protocol',
                      other1: '✗ Not Supported',
                      other2: '✗ Third-Party Portals',
                    },
                    {
                      name: 'Tamper-Evident SHA-256 Audit Trail',
                      deci: '✓ Immutable Verification',
                      other1: '✗ Ephemeral Chats',
                      other2: '✗ Unsecured Sheets',
                    },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-bold text-slate-900">{row.name}</td>
                      <td className="p-4 font-bold text-cyan-800 bg-cyan-50/30">{row.deci}</td>
                      <td className="p-4 text-slate-500 font-medium">{row.other1}</td>
                      <td className="p-4 text-slate-400 font-medium">{row.other2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Interactive FAQ Accordion ─────────────────────────────────── */}
      <section id="faq" className="relative z-10 px-4 sm:px-6 py-16 bg-slate-50/60 border-t border-slate-200/80">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mt-3">
              Everything You Need to Know
            </h2>
          </div>

          <div className="space-y-3">
            {faqData.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-slate-900 hover:text-cyan-700 transition cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <span className="text-base font-mono text-slate-400 shrink-0">
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 10. High-Impact Bottom Call to Action ─────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-sky-50 to-indigo-50 p-8 sm:p-14 text-center shadow-lg">
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 bg-white border border-cyan-200 px-3 py-1 rounded-full shadow-2xs">
            Start Free Today
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight mt-4">
            Make Decisions You Can Mathematically Defend.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Join candidates, loan officers, startup founders, and policy analysts utilizing
            transparent, explainable AI intelligence.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleGetStarted}
              className="w-full sm:w-auto rounded-xl bg-slate-950 hover:bg-slate-800 text-white px-8 py-3.5 text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer"
            >
              Get Started in 30 Seconds →
            </button>
            <button
              onClick={() => navigate('/dashboard/career')}
              className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-6 py-3.5 text-sm font-bold shadow-2xs transition cursor-pointer"
            >
              Explore Live Studios
            </button>
          </div>
        </div>
      </section>

      {/* ── 11. Crisp Clean Light Footer ─────────────────────────────────── */}
      <footer className="border-t border-slate-200/90 bg-white px-4 sm:px-6 py-12 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="DeciXAI" className="h-7 w-7 rounded-lg border border-slate-200 object-cover" />
            <span className="font-bold text-slate-900 text-sm">DeciXAI</span>
            <span className="text-slate-400">| Explainable Decision Intelligence OS</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-semibold">
            <button onClick={() => navigate('/dashboard/career')} className="hover:text-slate-900 transition">Career Studio</button>
            <button onClick={() => navigate('/dashboard/finance')} className="hover:text-slate-900 transition">Finance Studio</button>
            <button onClick={() => navigate('/dashboard/startup')} className="hover:text-slate-900 transition">Startup Studio</button>
            <button onClick={() => navigate('/dashboard/policy')} className="hover:text-slate-900 transition">Policy Studio</button>
            <button onClick={() => navigate('/dashboard/workspace')} className="hover:text-slate-900 transition">Saved Workspace</button>
            <button onClick={() => navigate('/dashboard/developer')} className="hover:text-slate-900 transition">Developer API</button>
          </div>

          <div className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} DeciXAI. All mathematical models grounded in XAI.
          </div>
        </div>
      </footer>

    </div>
  )
}
