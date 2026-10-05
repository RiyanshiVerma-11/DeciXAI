import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  // State for interactive hero terminal preview
  const [activeStudio, setActiveStudio] = useState('career')
  const [openFaq, setOpenFaq] = useState(0)
  const [copiedCurl, setCopiedCurl] = useState(false)

  // Interactive 'What-If' Demo State
  const [whatIfSkills, setWhatIfSkills] = useState(['Python', 'Machine Learning'])
  const [whatIfProjects, setWhatIfProjects] = useState(1)
  const [whatIfCgpa, setWhatIfCgpa] = useState(8.4)

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

  // Hero Terminal Showcases (Active Studio preview)
  const studioShowcases = {
    career: {
      tag: 'ATS 2.0 Talent Studio',
      title: 'Career & Talent Intelligence',
      badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      accentColor: 'from-cyan-500 to-blue-600',
      score: 94,
      scoreLabel: 'Hiring Match Probability',
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
      score: 91,
      scoreLabel: 'Credit Viability Score',
      previewStats: [
        { label: 'DTI Ratio', val: '24.2%' },
        { label: 'Credit Health', val: 'Prime (760)' },
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
      score: 82,
      scoreLabel: 'Investor Readiness Score',
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
      score: 76,
      scoreLabel: 'Policy Feasibility Index',
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

  // Unified 4 Domain Studios: The Problem They Solve & What DeciXAI Computes
  const domainStudios = [
    {
      id: 'career',
      icon: '🎓',
      title: 'Career & Talent Intelligence',
      subtitle: 'ATS 2.0 & Job Placement',
      badge: 'border-cyan-200 bg-cyan-50 text-cyan-800',
      problem: 'Over 75% of resumes get rejected by black-box ATS keyword filters with zero feedback. Candidates waste months not knowing which skill gap cost them the interview.',
      solution: '3-tier resume parser (PyPDF, PDFPlumber, regex), O*NET 29.0 taxonomy benchmarking, and live What-If simulation that calculates the exact placement probability boost of adding specific skills or capstones.',
      tools: ['Multi-tier ATS 2.0 Parser', 'Counterfactual Pivot Sandbox', 'O*NET 29.0 Competency Radar', 'AI STAR Interview Mock Studio'],
    },
    {
      id: 'finance',
      icon: '💳',
      title: 'Finance & Loan Intelligence',
      subtitle: 'Underwriting & Credit Risk',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      problem: 'Applicants receive arbitrary credit rejections from proprietary scoring black boxes with zero explanation, while banks risk regulatory non-compliance and unmonitored bias.',
      solution: 'Calibrated gradient-boosted credit trees, deterministic debt-to-income (DTI) safety caps, automated DigiLocker eKYC & IMPS penny drops, and exact counterfactual debt-clearing paths for approval.',
      tools: ['7-Step Underwriting Wizard', 'DigiLocker eKYC & Bank Penny Drop', 'DTI Stress-Testing Model', 'SHAP Risk Penalty Decomposition'],
    },
    {
      id: 'startup',
      icon: '🚀',
      title: 'Startup & Valuation Intelligence',
      subtitle: 'Venture Viability & Runway',
      badge: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800',
      problem: 'Over 90% of early-stage startups fail because founders make crucial hiring and capital decisions on intuition instead of comparing their burn rate and unit economics to successful cohorts.',
      solution: 'Acquisition and survival classifiers trained on historical venture cohorts, benchmarking your cash burn, ARR traction, and moat factors against 25th and 50th industry percentiles.',
      tools: ['Cohort Percentile Benchmarking', 'Runway Stress-Test Simulator', 'Unit Economics (LTV/CAC) Modeler', 'Investor Pitch Scorecard'],
    },
    {
      id: 'policy',
      icon: '🏛️',
      title: 'Public Policy & Governance',
      subtitle: 'Civic Impact & Feasibility',
      badge: 'border-amber-200 bg-amber-50 text-amber-800',
      problem: 'Multi-crore public welfare schemes fail when launched without empirical socio-economic feasibility forecasts, leading to wasted funds, demographic bottlenecks, and public backlash.',
      solution: 'Socio-economic feasibility classifier factoring budgetary allocations, target demographic scale, administrative urgency, corruption risk, and algorithmic fairness safeguards.',
      tools: ['Multi-Policy Tradeoff Matrix', 'Algorithmic Fairness Checklists', 'Demographic Sentiment Modeler', 'Legislative PDF Dossier Export'],
    },
  ]

  const currentStudio = studioShowcases[activeStudio]

  const faqData = [
    {
      q: 'Why was DeciXAI created? What core problem does it solve?',
      a: 'DeciXAI was created to eliminate the opacity of "Black-Box AI" in high-stakes decisions. Traditional ML algorithms reject candidates or loan applicants without explanation, and modern LLMs (like ChatGPT) invent numbers without mathematical grounding. DeciXAI solves this with a hybrid pipeline: deterministic ML models calculate calibrated probabilities, SHAP isolates the exact positive and negative factors, and grounded generative AI builds personalized action plans without hallucinating.',
    },
    {
      q: 'What is Explainable AI (XAI) and how does SHAP eliminate the black box?',
      a: 'Instead of providing an ungrounded binary verdict, DeciXAI computes SHAP (SHapley Additive exPlanations) values derived from cooperative game theory. Every input parameter (such as CGPA, verified salary, runway months, or infrastructure index) is assigned an exact positive (+) or negative (-) percentage impact so you see the exact reason behind every prediction.',
    },
    {
      q: 'How does the "What-If" Counterfactual Simulator work?',
      a: 'Instead of guessing what changes will yield better results, the "What-If" Simulator allows candidates, founders, or loan applicants to test counterfactual adjustments (like adding Docker, extending runway by 3 months, or adjusting CGPA) and immediately see the live calculated probability delta without submitting the full profile.',
    },
    {
      q: 'How does DeciXAI ensure regulatory compliance and auditability?',
      a: 'Every evaluation generates an immutable audit record in decision_audit.jsonl with a SHA-256 cryptographic hash, timestamp, user context, and model parameters. You can export a tamper-evident Decision Dossier PDF for regulatory compliance, board reviews, or candidate debriefs.',
    },
    {
      q: 'Can developers integrate DeciXAI via API?',
      a: 'Yes. DeciXAI features a complete Developer Hub where you can generate API keys and run decision scoring inferences with sub-15ms latency in Python, Node.js, or curl.',
    },
  ]

  return (
    <div className="min-h-screen bg-[#FBFDFF] text-slate-900 font-sans selection:bg-cyan-100 selection:text-cyan-900">
      
      {/* Ambient Light Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-sky-100/60 via-indigo-50/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[30%] -left-40 w-[600px] h-[600px] bg-cyan-100/30 rounded-full blur-3xl" />
        <div className="absolute top-[50%] -right-40 w-[600px] h-[600px] bg-emerald-100/25 rounded-full blur-3xl" />
      </div>

      {/* ── 1. Navbar ──────────────────────────────────────────────────────── */}
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
                Explainable Decision Intelligence
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-300">
            <a href="#problem" className="hover:text-cyan-400 transition">The Problem</a>
            <a href="#studios" className="hover:text-cyan-400 transition">4 Decision Studios</a>
            <a href="#what-if" className="hover:text-cyan-400 transition">What-If Engine</a>
            <a href="#architecture" className="hover:text-cyan-400 transition">How It Works</a>
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
                  <span>Launch Decision Studio</span>
                  <span>→</span>
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── 2. Hero Section: Clear Purpose & Interactive Preview ─────────── */}
      <section className="relative z-10 px-4 sm:px-6 pt-10 pb-12 lg:pt-14 lg:pb-16">
        <div className="mx-auto max-w-7xl">
          
          <div className="text-center max-w-4xl lg:max-w-5xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50/90 px-4 py-1 text-xs font-bold text-cyan-900 shadow-2xs mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-600"></span>
              </span>
              <span>Why Was This Built? High-Stakes Decisions Cannot Rely on Black-Box AI</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 leading-tight">
              <span className="block">
                Stop Accepting Black-Box AI Decisions.
              </span>
              <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 bg-clip-text text-transparent">
                Understand The "Why" Behind Every Outcome.
              </span>
            </h1>

            <p className="mt-5 text-sm sm:text-base text-slate-700 leading-relaxed max-w-3xl mx-auto font-medium">
              Every day, automated algorithms reject resumes, decline bank loans, miscalculate startup runways,
              and misdirect public funds without ever explaining why. <strong>DeciXAI was engineered to eliminate this opacity</strong>:
              uniting calibrated Machine Learning, game-theoretic SHAP explainability, and counterfactual simulation
              so every high-stakes decision is transparent, auditable, and actionable.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={handleGetStarted}
                className="w-full sm:w-auto rounded-xl bg-slate-950 hover:bg-slate-800 text-white px-7 py-3.5 text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Launch Decision Studio</span>
                <span>→</span>
              </button>
              <a
                href="#problem"
                className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-6 py-3.5 text-sm font-bold shadow-2xs hover:shadow-sm transition-all text-center"
              >
                📖 The Problem We Solve
              </a>
              <a
                href="#what-if"
                className="w-full sm:w-auto rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-cyan-100/70 text-cyan-900 px-5 py-3.5 text-sm font-bold shadow-2xs transition-all text-center"
              >
                ⚡ Live 'What-If' Demo
              </a>
            </div>
          </div>

          {/* Interactive Live Hero Terminal Preview */}
          <div className="mt-6 rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-7 shadow-xl shadow-slate-200/40 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <span className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </span>
                <span className="text-xs font-mono font-bold text-slate-400 ml-2">decixai-live-inference-preview</span>
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
                      Calibrated Model Output
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-black text-slate-950 font-mono">
                      {currentStudio.score}%
                    </span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ✓ Calibrated Probability
                    </span>
                  </div>

                  <div className="mt-4 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r ${currentStudio.accentColor} transition-all duration-700"
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
                    🤖 Grounded Strategic Recommendation:
                  </span>
                  <p className="italic leading-relaxed">"{currentStudio.sampleOutput}"</p>
                </div>
              </div>

              {/* Right Column: SHAP Attribution Waterfall */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-100 bg-slate-50/40 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">SHAP Attribution Breakdown</h3>
                    <p className="text-[11px] text-slate-500">Every factor mathematically isolated — positive drivers and risk penalties</p>
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
                  <span className="text-slate-500 text-[11px]">Strictly grounded in trained ML feature weights</span>
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

      {/* ── 3. The Core Problem: Why Black-Box AI Fails ───────────────────── */}
      <section id="problem" className="relative z-10 px-4 sm:px-6 py-16 bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 border border-cyan-800 px-3 py-1 rounded-full">
              The Reality of Decision Making Today
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-4 text-white">
              The Problem: Algorithmic Opacity &amp; AI Hallucinations
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-3 leading-relaxed">
              When decisions impact careers, credit, venture capital, and public governance,
              relying on traditional opaque AI introduces severe risks.
            </p>
          </div>

          {/* Side-by-side: The Two Critical Flaws vs The Solution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Flaw 1: Black-Box ML */}
            <div className="rounded-3xl border border-rose-900/60 bg-rose-950/20 p-6 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">⬛</span>
                  <span className="text-[11px] font-mono font-bold text-rose-400 bg-rose-900/40 border border-rose-800/60 px-2 py-0.5 rounded-full">
                    Flaw #1
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Opaque Black-Box ML
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-2">
                  Traditional ML systems output binary verdicts: <em className="text-rose-300">"Rejected"</em> or <em className="text-rose-300">"High Risk"</em>.
                  Nobody knows <strong>why</strong>. Neither candidate nor underwriter knows what caused the penalty, making audits impossible.
                </p>
              </div>
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5 text-[11px] text-rose-300 font-mono">
                ⚠️ Result: Zero feedback, untraceable bias, and helplessness.
              </div>
            </div>

            {/* Flaw 2: Generative Hallucinations */}
            <div className="rounded-3xl border border-amber-900/60 bg-amber-950/20 p-6 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🎭</span>
                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-900/40 border border-amber-800/60 px-2 py-0.5 rounded-full">
                    Flaw #2
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Hallucinating LLMs (ChatGPT)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-2">
                  Modern LLMs speak with total confidence, but <strong className="text-amber-300">fabricate numbers and invent probabilities</strong> without any mathematical training. Following hallucinated business or credit advice leads to severe losses.
                </p>
              </div>
              <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5 text-[11px] text-amber-300 font-mono">
                ⚠️ Result: Persuasive text with zero mathematical validity.
              </div>
            </div>

            {/* The DeciXAI Solution */}
            <div className="rounded-3xl border border-cyan-800/80 bg-cyan-950/30 p-6 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">⚡</span>
                  <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-900/40 border border-cyan-700/60 px-2 py-0.5 rounded-full">
                    DeciXAI Solution
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Hybrid Grounded Intelligence
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mt-2">
                  Deterministic ML calculates calibrated probabilities first. SHAP breaks down each factor mathematically. The LLM is strictly constrained to synthesize strategy based only on verified SHAP drivers, logged in an immutable SHA-256 audit ledger.
                </p>
              </div>
              <div className="rounded-xl bg-slate-950/70 border border-cyan-900/60 p-2.5 text-[11px] text-cyan-300 font-mono">
                ✅ Result: Exact math, full explainability, and real action items.
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── 4. Unified 4 Decision Studios (No Duplication) ─────────────────── */}
      <section id="studios" className="relative z-10 px-4 sm:px-6 py-16 lg:py-20 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              4 Specialized Decision Studios
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-3">
              Real-World Problems Solved in Each Studio
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Every studio combines calibrated ML models, SHAP explainability, and domain-specific safety guardrails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {domainStudios.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 sm:p-7 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-3xl">{item.icon}</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${item.badge}`}>
                      {item.subtitle}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-950 mb-3">
                    {item.title}
                  </h3>

                  {/* The Problem */}
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 mb-3 text-xs text-rose-950 space-y-1">
                    <div className="font-bold text-rose-800 uppercase text-[10px] tracking-wider">
                      ⚠️ Real-World Problem:
                    </div>
                    <p className="leading-relaxed">{item.problem}</p>
                  </div>

                  {/* The DeciXAI Solution */}
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 mb-4 text-xs text-emerald-950 space-y-1">
                    <div className="font-bold text-emerald-800 uppercase text-[10px] tracking-wider">
                      ✅ How DeciXAI Solves It:
                    </div>
                    <p className="leading-relaxed text-slate-700">{item.solution}</p>
                  </div>

                  {/* Built-in Features */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Core Built-in Capabilities:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-700">
                      {item.tools.map((tool, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-cyan-600 font-bold">•</span>
                          <span className="truncate">{tool}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/dashboard/${item.id}`)}
                    className="rounded-xl bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold transition cursor-pointer"
                  >
                    Open {item.title} →
                  </button>
                  <span className="text-[11px] font-bold text-cyan-700">Full XAI Access</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 5. Interactive 'What-If' Simulator Live Playground ────────────── */}
      <section id="what-if" className="relative z-10 px-4 sm:px-6 py-16 bg-slate-50/70 border-b border-slate-200/80">
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

      {/* ── 6. How It Works (4-Step Pipeline) ─────────────────────────────── */}
      <section id="architecture" className="relative z-10 px-4 sm:px-6 py-16 lg:py-20 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-full">
              System Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-3">
              How DeciXAI Operates: Step-by-Step Rigor
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Our hybrid pipeline guarantees mathematical defensibility and eliminates hallucinations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Normalize & Ingest',
                desc: 'Ingests resumes, eKYC, or venture financials and converts them into normalized feature vectors.',
                detail: 'O*NET 29.0 taxonomy + IMPS protocol',
              },
              {
                step: '02',
                title: 'Deterministic ML',
                desc: 'Trained Scikit-Learn pipelines & XGBoost decision trees compute calibrated probabilities.',
                detail: 'Calibrated math, no LLM guesswork',
              },
              {
                step: '03',
                title: 'SHAP Decomposition',
                desc: 'TreeExplainer isolates the exact positive (+) and negative (-) contributions for every parameter.',
                detail: 'Game-theoretic factor attribution',
              },
              {
                step: '04',
                title: 'Grounded Action Plan',
                desc: 'Cloud LLM is prompted strictly with verified SHAP drivers to synthesize step-by-step counterfactual roadmaps.',
                detail: 'SHA-256 tamper-evident ledger',
              },
            ].map((st, i) => (
              <div key={i} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-between">
                <div>
                  <span className="text-3xl font-black text-cyan-600 font-mono">{st.step}</span>
                  <h3 className="text-base font-bold text-slate-950 mt-3">{st.title}</h3>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{st.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] font-mono font-bold text-slate-500">
                  {st.detail}
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── 7. Grounded Copilot & Developer API Hub (Concise) ─────────────── */}
      <section className="relative z-10 px-4 sm:px-6 py-16 bg-slate-50/60 border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Copilot Summary */}
            <div className="lg:col-span-5 space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 border border-cyan-200 px-3 py-1 rounded-full">
                Bilingual Copilot &amp; API
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                Grounded Assistant &amp; RESTful API Hub
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                DeciXAI Copilot speaks English &amp; Hindi, grounded strictly in model features without hallucinating.
                Developers can integrate the same explainable decision scores via sub-15ms RESTful APIs.
              </p>

              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => navigate('/dashboard/workspace?tab=chatbot')}
                  className="rounded-xl bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 font-bold transition cursor-pointer"
                >
                  Open Copilot Workspace →
                </button>
                <button
                  onClick={() => navigate('/dashboard/developer')}
                  className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 px-4 py-2 font-bold transition cursor-pointer"
                >
                  Get Developer API Keys →
                </button>
              </div>
            </div>

            {/* Developer Code Snippet */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="text-emerald-400 font-bold">POST</span>
                  <span>https://api.decixai.io/api/v1/career/</span>
                </div>
                <button
                  type="button"
                  onClick={copyApiSnippet}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-2 py-1 transition cursor-pointer"
                >
                  {copiedCurl ? '✓ Copied' : 'Copy cURL'}
                </button>
              </div>

              <pre className="font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
{`curl -X POST https://api.decixai.io/api/v1/career/ \\
  -H "Authorization: Bearer dxa_live_89b2c3d4e5f6..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "skills": ["Python", "FastAPI", "Docker"],
    "cgpa": 8.8,
    "interest": "AI Systems & Machine Learning Engineer"
  }'`}
              </pre>
              <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                Returns calibrated probability, SHAP factors, and roadmap in &lt;15ms.
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 8. Concise FAQ Accordion ──────────────────────────────────────── */}
      <section id="faq" className="relative z-10 px-4 sm:px-6 py-16 bg-white border-b border-slate-200/80">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mt-3">
              Why DeciXAI Matters
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

      {/* ── 9. Final Call to Action ───────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 py-20 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-4xl rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-sky-50 to-indigo-50 p-8 sm:p-14 text-center shadow-lg">
          <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 bg-white border border-cyan-200 px-3 py-1 rounded-full shadow-2xs">
            Ground Your Decisions Today
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight mt-4">
            Make Decisions You Can Mathematically Defend.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Eliminate blind black-box rejections and generic hallucinations with verifiable, explainable AI intelligence.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleGetStarted}
              className="w-full sm:w-auto rounded-xl bg-slate-950 hover:bg-slate-800 text-white px-8 py-3.5 text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer"
            >
              Launch Decision Studio →
            </button>
            <button
              onClick={() => navigate('/dashboard/career')}
              className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-6 py-3.5 text-sm font-bold shadow-2xs transition cursor-pointer"
            >
              Explore Career Studio
            </button>
          </div>
        </div>
      </section>

      {/* ── 10. Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/90 bg-white px-4 sm:px-6 py-12 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="DeciXAI" className="h-7 w-7 rounded-lg border border-slate-200 object-cover" />
            <span className="font-bold text-slate-900 text-sm">DeciXAI</span>
            <span className="text-slate-400">| Explainable Decision Intelligence OS</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-semibold">
            <button onClick={() => navigate('/dashboard/career')} className="hover:text-slate-900 transition cursor-pointer">Career Studio</button>
            <button onClick={() => navigate('/dashboard/finance')} className="hover:text-slate-900 transition cursor-pointer">Finance Studio</button>
            <button onClick={() => navigate('/dashboard/startup')} className="hover:text-slate-900 transition cursor-pointer">Startup Studio</button>
            <button onClick={() => navigate('/dashboard/policy')} className="hover:text-slate-900 transition cursor-pointer">Policy Studio</button>
            <button onClick={() => navigate('/dashboard/workspace')} className="hover:text-slate-900 transition cursor-pointer">Saved Workspace</button>
            <button onClick={() => navigate('/dashboard/developer')} className="hover:text-slate-900 transition cursor-pointer">Developer API</button>
          </div>

          <div className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} DeciXAI. Grounded in Explainable AI (XAI) &amp; Deterministic ML.
          </div>
        </div>
      </footer>

    </div>
  )
}
