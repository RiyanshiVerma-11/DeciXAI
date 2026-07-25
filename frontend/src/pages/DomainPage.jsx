import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  submitCareer,
  submitCareerPrompt,
  submitFinance,
  submitStartup,
  submitStartupPrompt,
  submitPolicy,
  downloadPdf,
} from '../api'
import DecisionReport from '../components/DecisionReport'
import InsightPanel from '../components/InsightPanel'

const domainConfig = {
  career: {
    title: 'Career',
    subtitle: 'Translate your academic profile and interests into a clearer career direction.',
    freeTextExample: 'Example: cgpa 8.4, course btech cse, specialization ai and ml, skills python sql react, certifications aws cloud practitioner, projects fraud detector dashboard, interest software development',
    examples: [
      'CGPA 8.2, BTech CSE, skills Python SQL React, projects chatbot and dashboard, interest software engineering',
      'मेरी CGPA 7.8 है, skills Python SQL हैं, data science ke liye roadmap batao',
    ],
    fields: [
      { name: 'cgpa', label: 'CGPA', type: 'number', min: 0, max: 10, required: true },
      { name: 'course', label: 'Course / Degree', type: 'text', required: true },
      { name: 'specialization', label: 'Specialization', type: 'text' },
      { name: 'education_level', label: 'Education Level', type: 'text' },
      { name: 'year_of_study', label: 'Year Of Study', type: 'number', min: 1, max: 8 },
      { name: 'skills', label: 'Skills (comma-separated)', type: 'text', required: true },
      { name: 'certifications', label: 'Certifications (comma-separated)', type: 'text' },
      { name: 'projects', label: 'Projects (comma-separated)', type: 'text', required: true },
      { name: 'interest', label: 'Interest', type: 'text', required: true },
    ],
    submit: submitCareer,
    submitFreeText: (prompt) => submitCareerPrompt({ message: prompt }),
  },
  finance: {
    title: 'Finance',
    subtitle: 'Balance risk, affordability, and credit strength before committing to the next move.',
    freeTextExample: 'Example: income 85000, loan 20000, credit score 735',
    examples: [
      'Income 90000, loan 18000, credit score 740',
      'Mera income 12 lakh hai aur loan 5 lakh, credit score 690, risk kitna hai?',
    ],
    fields: [
      { name: 'income', label: 'Income', type: 'number', min: 0, required: true },
      { name: 'loan', label: 'Loan', type: 'number', min: 0, required: true },
      { name: 'credit_score', label: 'Credit Score', type: 'number', min: 300, max: 850, required: true },
    ],
    submit: submitFinance,
    submitFreeText: (prompt) => submitFinance(parseFreeText('finance', prompt)),
  },
  startup: {
    title: 'Startup',
    subtitle: 'Assess founder readiness, traction context, and team strength with explainable signals.',
    freeTextExample: 'Example: funding 250000, team size 7, market fintech enterprise, experience 4',
    examples: [
      'Funding 350000, team size 6, market B2B SaaS, experience 5',
      'Meri startup fintech hai, funding 20 lakh, team 4 log, founder experience 2 saal',
    ],
    fields: [
      { name: 'funding', label: 'Funding', type: 'number', min: 0, required: true },
      { name: 'team_size', label: 'Team Size', type: 'number', min: 1, required: true },
      { name: 'market', label: 'Market', type: 'text', required: true },
      { name: 'experience', label: 'Experience (years)', type: 'number', min: 0, required: true },
    ],
    submit: submitStartup,
    submitFreeText: (prompt) => submitStartupPrompt({ message: prompt }),
  },
  policy: {
    title: 'Government Policy',
    subtitle: 'Estimate policy feasibility with a quick read on scale, budget, and public impact.',
    freeTextExample: 'Example: sector renewable energy, budget 5000000, population 1200000',
    examples: [
      'Sector education, budget 5000000, population 1200000, political support high',
      'Rural health policy ke liye budget 2 crore aur population 8 lakh hai, feasibility batao',
    ],
    fields: [
      { name: 'sector', label: 'Sector', type: 'text', required: true },
      { name: 'budget', label: 'Budget', type: 'number', min: 1, required: true },
      { name: 'population', label: 'Population', type: 'number', min: 1, required: true },
    ],
    submit: submitPolicy,
    submitFreeText: (prompt) => submitPolicy(parseFreeText('policy', prompt)),
  },
}

const sectionBreaks = '(?=\\b(?:cgpa|gpa|skills?|expertise|projects?|interest|certifications?|course|degree|specialization|education level|year of study|income|salary|loan|debt|credit score|credit|funding|capital|team size|team|market|experience|years|sector|budget|funds|population|people)\\b|$)'

const splitItems = (value) => {
  const str = String(value)
  if (!/[,;]|\band\b|\bor\b|\/|\n/i.test(str) && /\s+/.test(str.trim())) {
    return str
      .split(/\s+/)
      .map((item) => item.trim().replace(/^[:\-\s]+|[:\-\s]+$/g, ''))
      .filter(Boolean)
  }
  return str
    .split(/,|;|\band\b|\bor\b|\/|\n/gi)
    .map((item) => item.trim().replace(/^[:\-\s]+|[:\-\s]+$/g, ''))
    .filter(Boolean)
}

const pickNumber = (...values) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value) && value !== 0) return value
  }
  return null
}

const parseOptionalNumber = (value) => {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(value, maximum))

const extractNumber = (text, keys) => {
  const lower = text.toLowerCase()
  for (const key of keys) {
    const match = lower.match(new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b\\D*([0-9]+(?:\\.[0-9]+)?)`, 'i'))
    if (match) return Number(match[1])
  }
  return null
}

const extractSection = (text, keys) => {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = text.match(new RegExp(`\\b${escaped}\\b[:\\s-]*(.*?)${sectionBreaks}`, 'is'))
    if (match?.[1]) return match[1].trim().replace(/[.:,;\-\s]+$/g, '')
  }
  return ''
}

const parseFreeText = (domain, text) => {
  const lower = text.toLowerCase()
  const commaParts = text.replace(/[\n]/g, ' ').split(/[,;]+/).map((value) => value.trim()).filter(Boolean)

  if (!domainConfig[domain]) return {}

  switch (domain) {
    case 'career': {
      const cgpa = pickNumber(extractNumber(text, ['cgpa', 'gpa']), Number(commaParts[0])) ?? null
      const course = extractSection(text, ['course', 'degree']) || commaParts[1] || ''
      const specialization = extractSection(text, ['specialization']) || ''
      const educationLevel = extractSection(text, ['education level']) || ''
      const yearOfStudy = pickNumber(extractNumber(text, ['year of study', 'year']), null)
      const skillsSection = extractSection(text, ['skills', 'skill', 'expertise'])
      const certificationsSection = extractSection(text, ['certifications', 'certification'])
      const projectsSection = extractSection(text, ['projects', 'project'])
      const skills = skillsSection ? splitItems(skillsSection) : splitItems(commaParts[2] || '')
      const certifications = certificationsSection ? splitItems(certificationsSection) : []
      const projects = projectsSection ? splitItems(projectsSection) : splitItems(commaParts[3] || '')
      const interest = extractSection(text, ['interest', 'domain']) || (commaParts[4] || 'technical')

      return {
        cgpa,
        course,
        specialization,
        education_level: educationLevel,
        year_of_study: yearOfStudy,
        skills,
        certifications,
        projects,
        interest,
      }
    }
    case 'finance':
      return {
        income: pickNumber(extractNumber(text, ['income', 'salary']), Number(commaParts[0])) ?? 60000,
        loan: pickNumber(extractNumber(text, ['loan', 'debt']), Number(commaParts[1])) ?? 15000,
        credit_score: clamp(pickNumber(extractNumber(text, ['credit score', 'credit']), Number(commaParts[2])) ?? 680, 300, 850),
      }
    case 'startup': {
      const marketSection = extractSection(text, ['market'])
      return {
        funding: pickNumber(extractNumber(text, ['funding', 'capital']), Number(commaParts[0])) ?? 100000,
        team_size: pickNumber(extractNumber(text, ['team size', 'team']), Number(commaParts[1])) ?? 5,
        market: marketSection || commaParts[2] || (lower.includes('enterprise') ? 'enterprise' : 'consumer'),
        experience: pickNumber(extractNumber(text, ['experience', 'years']), Number(commaParts[3])) ?? 2,
      }
    }
    case 'policy': {
      const sectorSection = extractSection(text, ['sector'])
      return {
        sector: sectorSection || commaParts[0] || (lower.includes('health') ? 'healthcare' : lower.includes('education') ? 'education' : 'infrastructure'),
        budget: pickNumber(extractNumber(text, ['budget', 'funds']), Number(commaParts[1])) ?? 1000000,
        population: pickNumber(extractNumber(text, ['population', 'people']), Number(commaParts[2])) ?? 500000,
      }
    }
    default:
      return {}
  }
}

const getRangeForField = (domain, name, value) => {
  const numeric = Number(value)
  switch (`${domain}:${name}`) {
    case 'career:cgpa':
      return { min: 0, max: 10, step: 0.1 }
    case 'career:year_of_study':
      return { min: 1, max: 8, step: 1 }
    case 'finance:income':
      return { min: 10000, max: Math.max(200000, Math.ceil((numeric || 60000) * 1.8)), step: 5000 }
    case 'finance:loan':
      return { min: 0, max: Math.max(100000, Math.ceil((numeric || 15000) * 2.2)), step: 2500 }
    case 'finance:credit_score':
      return { min: 300, max: 850, step: 5 }
    case 'startup:funding':
      return { min: 10000, max: Math.max(1000000, Math.ceil((numeric || 100000) * 2.2)), step: 10000 }
    case 'startup:team_size':
      return { min: 1, max: Math.max(20, Math.ceil((numeric || 5) * 2)), step: 1 }
    case 'startup:experience':
      return { min: 0, max: 15, step: 0.5 }
    case 'policy:budget':
      return { min: 10000, max: Math.max(20000000, Math.ceil((numeric || 1000000) * 2.5)), step: 50000 }
    case 'policy:population':
      return { min: 1000, max: Math.max(5000000, Math.ceil((numeric || 500000) * 2.5)), step: 10000 }
    default:
      return null
  }
}

export default function DomainPage() {
  const navigate = useNavigate()
  const { domain } = useParams()
  const config = domainConfig[domain]
  const resultRef = useRef(null)
  const liveUpdateTimerRef = useRef(null)
  const [mode, setMode] = useState('structured')
  const [textPrompt, setTextPrompt] = useState('')
  const [input, setInput] = useState({})
  const [interactiveInput, setInteractiveInput] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [liveUpdating, setLiveUpdating] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const numericSliderFields = useMemo(
    () => (config?.fields || []).filter((field) => field.type === 'number'),
    [config],
  )

  useEffect(() => {
    if (!result || !resultRef.current) return
    resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [result])

  useEffect(() => () => window.clearTimeout(liveUpdateTimerRef.current), [])

  if (!config) {
    return (
      <div className="p-8">
        <h1 className="text-2xl">Domain not found</h1>
        <button className="mt-2 text-blue-600" onClick={() => navigate('/')}>Back home</button>
      </div>
    )
  }

  const onFieldChange = (name, value) => {
    setInput((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const normalizePayload = (rawInput) => {
    const payload = {}
    for (const field of config.fields) {
      let value = rawInput?.[field.name]
      if (value === undefined || value === null || value === '') {
        if (field.name === 'skills' || field.name === 'projects' || field.name === 'certifications') value = []
        else if (field.type === 'number') value = null
        else value = ''
      }
      if (field.type === 'number') value = parseOptionalNumber(value)
      if (domain === 'finance' && field.name === 'credit_score' && value !== null) value = clamp(value, 300, 850)
      if (domain === 'finance' && (field.name === 'income' || field.name === 'loan') && value !== null) value = Math.max(0, value)
      if (field.name === 'skills' || field.name === 'projects' || field.name === 'certifications') {
        value = Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : String(value || '').split(',').map((v) => v.trim()).filter(Boolean)
      }
      payload[field.name] = value
    }
    return payload
  }

  const validatePayload = (payload) => {
    const nextErrors = {}
    for (const field of config.fields) {
      const value = payload[field.name]
      if (field.required) {
        const empty = Array.isArray(value) ? value.length === 0 : value === null || value === undefined || value === ''
        if (empty) nextErrors[field.name] = `${field.label} is required.`
      }
      if (field.type === 'number' && value !== null) {
        if (field.min !== undefined && value < field.min) nextErrors[field.name] = `${field.label} should be at least ${field.min}.`
        if (field.max !== undefined && value > field.max) nextErrors[field.name] = `${field.label} should be at most ${field.max}.`
      }
    }
    if (domain === 'career' && payload.skills?.length < 2) nextErrors.skills = 'Add at least 2 skills for a useful career signal.'
    if (domain === 'career' && payload.projects?.length < 1) nextErrors.projects = 'Add at least 1 project to unlock stronger recommendations.'
    return nextErrors
  }

  const syncInteractiveInput = (payload) => {
    const next = {}
    for (const field of config.fields) {
      next[field.name] = payload?.[field.name] ?? ''
    }
    setInteractiveInput(next)
  }

  const runAnalysis = async (payload, options = {}) => {
    const { live = false } = options
    if (live) setLiveUpdating(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await config.submit(payload)
      setResult(res)
      setInput(payload)
      syncInteractiveInput(payload)
      if (!live) {
        setIsSidebarCollapsed(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      if (live) setLiveUpdating(false)
      else setLoading(false)
    }
  }

  const runFreeTextAnalysis = async (prompt) => {
    setLoading(true)
    setError(null)
    try {
      const parsedPayload = parseFreeText(domain, prompt)
      const res = await config.submitFreeText(prompt)
      const nextInput = res.parsed_input || parsedPayload
      setResult(res)
      setInput(nextInput)
      syncInteractiveInput(nextInput)
      setIsSidebarCollapsed(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)

    if (mode === 'free') {
      if (!textPrompt.trim()) {
        setError('Add a prompt before running analysis.')
        return
      }
      await runFreeTextAnalysis(textPrompt)
      return
    }

    const payload = normalizePayload(input)
    const nextErrors = validatePayload(payload)
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    await runAnalysis(payload)
  }

  const recalc = async () => {
    const baseInput = interactiveInput || input
    const payload = normalizePayload(baseInput)
    const nextErrors = validatePayload(payload)
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    await runAnalysis(payload, { live: true })
  }

  const handleExampleClick = (example) => {
    if (mode === 'free') {
      setTextPrompt(example)
      return
    }
    setTextPrompt(example)
    const parsed = parseFreeText(domain, example)
    setInput(parsed)
    setFieldErrors({})
  }

  const handleInteractiveChange = (name, value) => {
    const next = { ...(interactiveInput || normalizePayload(input)), [name]: value }
    setInteractiveInput(next)
    window.clearTimeout(liveUpdateTimerRef.current)
    liveUpdateTimerRef.current = window.setTimeout(() => {
      const payload = normalizePayload(next)
      const nextErrors = validatePayload(payload)
      setFieldErrors(nextErrors)
      if (!Object.keys(nextErrors).length) runAnalysis(payload, { live: true })
    }, 350)
  }

  const hasComparisonResult = Boolean(
    result && (
      result.mode === 'comparison'
      || result.mode === 'model-driven'
      || (Array.isArray(result.options) && result.options.length > 1)
      || (Array.isArray(result.details?.option_scores) && result.details.option_scores.length > 1)
      || (Array.isArray(result.details?.probabilities) && result.details.probabilities.length > 1)
    )
  )

  const resultInput = interactiveInput || (mode === 'free' ? (result?.parsed_input || input) : input)

  return (
    <div className="px-4 py-4 sm:px-6 md:p-8 bg-slate-50/50 min-h-screen">
      <div className={`mx-auto transition-all duration-300 ${isSidebarCollapsed ? 'max-w-full' : 'max-w-7xl'}`}>
        <button 
          className="mb-4 text-base font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition" 
          onClick={() => navigate('/')}
        >
          &larr; Back
        </button>

        {/* Compact Workspace Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[13px] uppercase font-bold tracking-[0.2em] text-slate-500">
              {config.title} workspace
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">{config.title} Decision Studio</h1>
            <p className="text-base text-slate-500 mt-0.5">{config.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {result && (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`px-4 py-2 rounded-xl text-base font-bold transition-all duration-300 flex items-center gap-2 border shadow-sm ${
                  isSidebarCollapsed
                    ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:scale-[1.02]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:scale-[1.02]'
                }`}
              >
                {isSidebarCollapsed ? (
                  <>
                    <svg className="h-4 w-4 text-sky-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Modify Inputs
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Minimize Inputs
                  </>
                )}
              </button>
            )}
            <div className="flex items-center gap-3 bg-white border border-slate-200/80 rounded-xl p-2 pr-4 shadow-sm">
              <img src="/logo.jpeg" alt="DeciXAI logo" className="h-10 w-10 rounded-xl object-cover border border-slate-100" />
              <div>
                <div className="text-base font-bold text-slate-900 leading-none">DeciXAI Engine</div>
                <div className="text-[12px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">English + Hindi friendly</div>
              </div>
            </div>
          </div>
        </div>

        {/* Two-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Control Center (col-span-3 when open, hidden when collapsed) */}
          {!isSidebarCollapsed && (
            <div className="md:col-span-3 space-y-4 animate-fade-in">
              <div className="glass-panel p-5 rounded-2xl space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold uppercase tracking-wider text-slate-400">Control Center</h2>
                  <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse"></span>
                </div>

                {/* Segmented slider tab for Input Mode Selection */}
                <div>
                  <span className="text-[13px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Input Mode</span>
                  <div className="relative flex rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setMode('structured')}
                      className={`flex-1 rounded-lg py-1.5 text-base font-bold transition-all duration-300 ${mode === 'structured' ? 'bg-white text-slate-950 shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Structured Input
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('free')}
                      className={`flex-1 rounded-lg py-1.5 text-base font-bold transition-all duration-300 ${mode === 'free' ? 'bg-white text-slate-950 shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Free-text Prompt
                    </button>
                  </div>
                </div>

                {/* Compact Example Prompts Badges */}
                <div className="space-y-2">
                  <span className="text-[13px] font-bold uppercase tracking-wider text-slate-400 block">Example Prompts</span>
                  <div className="flex flex-col gap-2">
                    {config.examples.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => handleExampleClick(example)}
                        className="text-left text-[14px] leading-relaxed text-slate-600 bg-white/60 hover:bg-white border border-slate-200/60 hover:border-sky-400 rounded-xl px-3 py-2.5 transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Input fields */}
                <form onSubmit={submit} className="space-y-4 pt-1">
                  {mode === 'structured' ? (
                    <div className="space-y-3">
                      {config.fields.map((field) => (
                        <div key={field.name} className="flex flex-col">
                          <label className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type={field.type}
                            min={field.min}
                            max={field.max}
                            step={field.type === 'number' ? 'any' : undefined}
                            value={Array.isArray(input[field.name]) ? input[field.name].join(', ') : (input[field.name] ?? '')}
                            onChange={(e) => onFieldChange(field.name, e.target.value)}
                            className={`w-full rounded-xl border bg-white/80 px-3.5 py-2 text-base outline-none transition-all duration-300 focus:border-sky-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(14,165,233,0.12)] ${fieldErrors[field.name] ? 'border-rose-300 focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(244,63,94,0.12)]' : 'border-slate-200'}`}
                          />
                          {fieldErrors[field.name] && <span className="text-[13px] text-rose-600 mt-1">{fieldErrors[field.name]}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <label className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-1">Prompt</label>
                      <textarea
                        rows={4}
                        value={textPrompt}
                        onChange={(e) => setTextPrompt(e.target.value)}
                        placeholder={config.freeTextExample}
                        className="w-full rounded-xl border border-slate-200 bg-white/80 p-3 text-base outline-none transition-all duration-300 focus:border-sky-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(14,165,233,0.12)] resize-none"
                      />
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-slate-955 py-2.5 text-base font-bold uppercase tracking-wider text-white transition-all duration-300 hover:bg-slate-900 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(15,23,42,0.15)] hover:shadow-[0_6px_18px_rgba(15,23,42,0.22)] bg-slate-950"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Analyzing...
                        </>
                      ) : 'Analyze Decision'}
                    </button>
                    <div className="text-[13px] text-slate-400 text-center mt-2.5 leading-relaxed font-bold">
                      {liveUpdating ? 'Refreshing what-if output...' : 'Results refresh dynamically via live sliders.'}
                    </div>
                  </div>
                </form>

                {error && (
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-base text-rose-700 mt-2">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right Panel: Main Analysis & Output Board */}
          <div className={isSidebarCollapsed ? 'md:col-span-12 w-full transition-all duration-300' : 'md:col-span-9 w-full transition-all duration-300'}>
            {result ? (
              <div ref={resultRef} className="scroll-mt-6 animate-fade-in">
                {hasComparisonResult ? (
                  <DecisionReport
                    payload={result}
                    interactiveFields={numericSliderFields.map((field) => ({
                      ...field,
                      range: getRangeForField(domain, field.name, resultInput?.[field.name]),
                      value: resultInput?.[field.name],
                    }))}
                    onInteractiveChange={handleInteractiveChange}
                    isLiveUpdating={liveUpdating}
                    onRefresh={recalc}
                    onDownload={() => downloadPdf(domain, result)}
                  />
                ) : (
                  <InsightPanel
                    result={result}
                    domain={domain}
                    title={`${config.title} decision`}
                    subtitle={config.subtitle}
                    input={resultInput}
                    interactiveFields={numericSliderFields.map((field) => ({
                      ...field,
                      range: getRangeForField(domain, field.name, resultInput?.[field.name]),
                      value: resultInput?.[field.name],
                    }))}
                    onInteractiveChange={handleInteractiveChange}
                    isLiveUpdating={liveUpdating}
                    footerAction={(
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => downloadPdf(domain, result)} 
                          className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[13px] font-bold uppercase tracking-wider text-white transition hover:bg-white/30"
                        >
                          PDF
                        </button>
                        <button 
                          onClick={recalc} 
                          className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[13px] font-bold uppercase tracking-wider text-white transition hover:bg-white/30"
                        >
                          Refresh
                        </button>
                      </div>
                    )}
                  />
                )}
              </div>
            ) : (
              <div className="h-full min-h-[480px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-350 bg-white/50 backdrop-blur-sm p-8 text-center shadow-sm glass-panel-hover border-slate-300">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-500 mb-5 border border-sky-100/60 shadow-[0_4px_12px_rgba(14,165,233,0.1)]">
                  <svg className="h-6 w-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                  </svg>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Awaiting Decision Input</h3>
                <p className="mt-2 text-base text-slate-500 max-w-md leading-relaxed">
                  Configure the inputs in the control center on the left, select an example, or write a free-text prompt, then run analysis to inspect your decision signals and custom roadmap.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
