import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import {
  submitCareer,
  submitCareerPrompt,
  submitFinance,
  submitStartup,
  submitStartupPrompt,
  submitPolicy,
  downloadPdf,
  saveDecision,
} from '../api'
import DecisionReport from '../components/DecisionReport'
import InsightPanel from '../components/InsightPanel'
import CompareModal from '../components/CompareModal'
import { useAuth } from '../components/AuthContext'


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
      { name: 'cgpa', label: 'Academic Score', type: 'number', min: 0, max: 10, required: true },
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

const INDUSTRY_PRESETS = {
  career: [
    {
      label: 'AI Systems Engineer',
      desc: 'PyTorch, vLLM, Agentic Workflows',
      icon: '🤖',
      data: {
        cgpa: 8.7,
        course: 'B.Tech CSE',
        specialization: 'Artificial Intelligence',
        education_level: 'Undergraduate',
        year_of_study: 4,
        skills: ['Python', 'PyTorch', 'LangChain', 'vLLM', 'Docker', 'FastAPI'],
        certifications: ['DeepLearning.AI GenAI', 'AWS Machine Learning'],
        projects: ['Autonomous Multi-Agent RAG', 'Local LLM Inference Engine'],
        interest: 'ai engineer',
      },
    },
    {
      label: 'Cloud & DevOps Architect',
      desc: 'Kubernetes, Terraform, CI/CD pipelines',
      icon: '☁️',
      data: {
        cgpa: 8.2,
        course: 'B.Tech IT',
        specialization: 'Cloud Infrastructure',
        education_level: 'Undergraduate',
        year_of_study: 4,
        skills: ['Kubernetes', 'Docker', 'Terraform', 'Python', 'Go', 'AWS'],
        certifications: ['CKA Kubernetes', 'AWS Solutions Architect'],
        projects: ['Zero-Downtime Microservices Cluster', 'MLOps Model CI/CD'],
        interest: 'cloud devops',
      },
    },
    {
      label: 'Technical Product Manager',
      desc: 'Agile execution, SQL, PRD roadmaps',
      icon: '📊',
      data: {
        cgpa: 7.9,
        course: 'B.Tech + Minor MBA',
        specialization: 'Product & Analytics',
        education_level: 'Undergraduate',
        year_of_study: 4,
        skills: ['Product Strategy', 'SQL', 'Mixpanel', 'Figma', 'Agile', 'Scrum'],
        certifications: ['Certified Scrum Product Owner (CSPO)'],
        projects: ['SaaS Growth Funnel Audit', 'B2B User Onboarding Redesign'],
        interest: 'product management',
      },
    },
  ],
  finance: [
    {
      label: 'Prime Mortgage Applicant',
      desc: 'High credit score, healthy leverage',
      icon: '🏡',
      data: {
        income: 95000,
        loan: 180000,
        credit_score: 760,
      },
    },
    {
      label: 'High-Risk Consolidation',
      desc: 'Sub-prime credit, high debt ratio',
      icon: '⚠️',
      data: {
        income: 42000,
        loan: 38000,
        credit_score: 590,
      },
    },
    {
      label: 'Commercial Business Credit',
      desc: 'Working capital financing request',
      icon: '💼',
      data: {
        income: 140000,
        loan: 65000,
        credit_score: 715,
      },
    },
  ],
  startup: [
    {
      label: 'Pre-Seed Generative AI',
      desc: 'Angel-backed B2B AI copilot team',
      icon: '🚀',
      data: {
        funding: 250000,
        team_size: 4,
        market: 'Enterprise B2B AI',
        experience: 3.5,
      },
    },
    {
      label: 'Bootstrapped Fintech Engine',
      desc: 'Lean, capital-efficient settlement app',
      icon: '💳',
      data: {
        funding: 75000,
        team_size: 2,
        market: 'Payments & Settlement',
        experience: 6,
      },
    },
    {
      label: 'Series-A HealthTech Scaleup',
      desc: 'Clinical traction, expanding engineering',
      icon: '🏥',
      data: {
        funding: 1600000,
        team_size: 15,
        market: 'Healthcare Diagnostics',
        experience: 8,
      },
    },
  ],
  policy: [
    {
      label: 'Clean Energy Grid Expansion',
      desc: 'Municipal renewable energy subsidy',
      icon: '⚡',
      data: {
        sector: 'Renewable Energy',
        budget: 8000000,
        population: 650000,
      },
    },
    {
      label: 'Rural Healthcare Network',
      desc: 'Primary medical distribution scheme',
      icon: '🩺',
      data: {
        sector: 'Healthcare',
        budget: 3500000,
        population: 1200000,
      },
    },
    {
      label: 'Smart Urban Transit Fleet',
      desc: 'Electric bus and metro corridors',
      icon: '🚌',
      data: {
        sector: 'Transportation',
        budget: 15000000,
        population: 2800000,
      },
    },
  ],
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
      let cgpa = null
      let scoreType = 'cgpa_10'
      const match4 = text.match(/(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*4(?:\.0)?\b/i)
      const matchPct = text.match(/(?:percentage|percent|%)\s*[:=]?\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:%|percent\b)/i)
      if (match4) {
        cgpa = parseFloat(match4[1])
        scoreType = 'gpa_4'
      } else if (matchPct) {
        cgpa = parseFloat(matchPct[1] || matchPct[2])
        scoreType = 'percentage'
      } else {
        cgpa = pickNumber(extractNumber(text, ['cgpa', 'gpa']), Number(commaParts[0])) ?? null
      }
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
        score_type: scoreType,
        raw_score: cgpa,
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
  const location = useLocation()
  const { domain } = useParams()
  const { token, refreshUser } = useAuth()
  const config = domainConfig[domain]
  const presets = INDUSTRY_PRESETS[domain] || []

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

  // Workspace & Save state
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [saveNotes, setSaveNotes] = useState('')
  const [saveTags, setSaveTags] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // A/B Comparison Baseline state
  const [baselineItem, setBaselineItem] = useState(null)
  const [isCompareOpen, setIsCompareOpen] = useState(false)

  const numericSliderFields = useMemo(
    () => (config?.fields || []).filter((field) => field.type === 'number'),
    [config],
  )

  // Restore preloaded state if navigated from Saved Projects workspace
  useEffect(() => {
    if (location.state?.preloadedInput) {
      setInput(location.state.preloadedInput)
      syncInteractiveInput(location.state.preloadedInput)
      if (location.state.preloadedOutput) {
        setResult(location.state.preloadedOutput)
        setIsSidebarCollapsed(true)
      }
      if (location.state.preloadedTitle) {
        setSaveTitle(location.state.preloadedTitle)
      }
    }
  }, [location.state])

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
      if (domain === 'career' && field.name === 'cgpa') {
        const st = rawInput?.score_type || 'cgpa_10'
        let norm = value
        if (value !== null) {
          if (st === 'percentage' || value > 10.0) norm = Math.min(10, Math.max(0, value / 10.0))
          else if (st === 'gpa_4') norm = Math.min(10, Math.max(0, (value / 4.0) * 10.0))
          else norm = Math.min(10, Math.max(0, value))
          norm = Number(norm.toFixed(2))
        }
        payload.cgpa = norm
        payload.raw_score = value
        payload.score_type = st
        continue
      }
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
      if (domain === 'career' && field.name === 'cgpa') {
        const rawVal = payload.raw_score ?? value
        const st = payload.score_type || 'cgpa_10'
        if (rawVal !== null && rawVal !== undefined) {
          if (st === 'percentage' && (rawVal < 0 || rawVal > 100)) nextErrors.cgpa = 'Percentage must be between 0 and 100.'
          else if (st === 'gpa_4' && (rawVal < 0 || rawVal > 4.0)) nextErrors.cgpa = 'GPA must be between 0 and 4.0.'
          else if (st === 'cgpa_10' && (rawVal < 0 || rawVal > 10.0)) nextErrors.cgpa = 'CGPA must be between 0 and 10.0.'
        }
        continue
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
    if (domain === 'career') {
      next.score_type = payload?.score_type || 'cgpa_10'
      if (payload?.raw_score !== undefined && payload?.raw_score !== null) next.cgpa = payload.raw_score
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

  const handleApplyPreset = (preset) => {
    setInput(preset.data)
    syncInteractiveInput(preset.data)
    setMode('structured')
    setFieldErrors({})
    runAnalysis(preset.data)
  }

  const handleSaveDecision = async (e) => {
    e.preventDefault()
    if (!result) return
    setSaveLoading(true)
    try {
      const score = Math.round(result.score || (result.probability ? result.probability * 100 : 0))
      const verdict = result.score_label || result.decision || 'Evaluated'
      const titleToSave = saveTitle.trim() || `${config.title} Analysis - Score ${score}`
      
      await saveDecision({
        domain,
        title: titleToSave,
        notes: saveNotes.trim(),
        tags: saveTags.trim() || domain,
        input_payload: resultInput || input,
        output_payload: result,
        score,
        verdict,
      }, token)

      setSaveSuccess(true)
      if (refreshUser) refreshUser()
      setTimeout(() => {
        setSaveSuccess(false)
        setSaveModalOpen(false)
      }, 1400)
    } catch (err) {
      alert(err.message || 'Failed to save decision to workspace')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleSetBaseline = () => {
    if (!result) return
    const score = Math.round(result.score || (result.probability ? result.probability * 100 : 0))
    setBaselineItem({
      id: 'baseline',
      title: `${config.title} Baseline (Score ${score})`,
      domain,
      score,
      verdict: result.score_label || result.decision || 'Baseline Run',
      output_payload: result,
    })
  }

  const handleOpenComparison = () => {
    if (!baselineItem || !result) return
    setIsCompareOpen(true)
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

  const renderField = (field, isModifyPanel = false) => {
    const isWide = ['skills', 'projects', 'certifications'].includes(field.name)
    if (domain === 'career' && field.name === 'cgpa') {
      const currentScoreType = input.score_type || 'cgpa_10'
      const rawVal = input.cgpa ?? ''
      const numVal = parseFloat(rawVal)
      let normVal = null
      if (!isNaN(numVal)) {
        if (currentScoreType === 'percentage' || numVal > 10) normVal = (numVal / 10).toFixed(1)
        else if (currentScoreType === 'gpa_4') normVal = ((numVal / 4) * 10).toFixed(1)
        else normVal = numVal.toFixed(1)
      }
      return (
        <div key="cgpa" className="flex flex-col col-span-1">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Academic Score</span>
            <span className="text-rose-500 text-[10px] font-semibold lowercase">required</span>
          </label>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100 transition-all">
            <select
              value={currentScoreType}
              onChange={(e) => {
                onFieldChange('score_type', e.target.value)
                setFieldErrors((prev) => ({ ...prev, cgpa: undefined }))
              }}
              className="bg-slate-100/90 text-xs font-bold text-slate-700 px-2.5 py-2 border-r border-slate-200 outline-none cursor-pointer hover:bg-slate-200/70 transition"
            >
              <option value="cgpa_10">CGPA (10 Scale)</option>
              <option value="gpa_4">GPA (4.0 Scale)</option>
              <option value="percentage">Percentage (%)</option>
            </select>
            <input
              type="number"
              min={0}
              max={currentScoreType === 'percentage' ? 100 : currentScoreType === 'gpa_4' ? 4 : 10}
              step={currentScoreType === 'percentage' ? '0.1' : '0.01'}
              value={rawVal}
              onChange={(e) => onFieldChange('cgpa', e.target.value)}
              placeholder={
                currentScoreType === 'percentage'
                  ? 'e.g. 82'
                  : currentScoreType === 'gpa_4'
                  ? 'e.g. 3.6'
                  : 'e.g. 8.5'
              }
              className="w-full bg-transparent px-3 py-2 text-sm text-slate-800 outline-none"
            />
          </div>
          {normVal !== null && currentScoreType !== 'cgpa_10' && (
            <span className="text-[11px] text-sky-600 font-semibold mt-1">
              ✨ Auto-converted: {normVal} / 10.0 for ML evaluation
            </span>
          )}
          {fieldErrors.cgpa && (
            <span className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.cgpa}</span>
          )}
        </div>
      )
    }

    return (
      <div
        key={field.name}
        className={`flex flex-col ${isWide && config.fields.length > 4 ? 'md:col-span-2 lg:col-span-1' : 'col-span-1'}`}
      >
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>{field.label}</span>
          {field.required && (
            <span className="text-rose-500 text-[10px] font-semibold lowercase">required</span>
          )}
        </label>
        <input
          type={field.type}
          min={field.min}
          max={field.max}
          step={field.type === 'number' ? 'any' : undefined}
          value={Array.isArray(input[field.name]) ? input[field.name].join(', ') : (input[field.name] ?? '')}
          onChange={(e) => onFieldChange(field.name, e.target.value)}
          placeholder={
            field.type === 'number'
              ? (field.min !== undefined ? `e.g. ${field.min}` : '0')
              : `Enter ${field.label.toLowerCase()}`
          }
          className={`w-full rounded-xl border ${isModifyPanel ? 'bg-slate-50/50' : 'bg-slate-50/60'} px-3.5 py-2 text-sm text-slate-800 outline-none transition-all duration-200 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 ${
            fieldErrors[field.name]
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        />
        {fieldErrors[field.name] && (
          <span className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors[field.name]}</span>
        )}
      </div>
    )
  }

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

        {/* Studio Form & Results Dashboard Layout */}
        {!result ? (
          /* Initial State: Wide, Zero-Scroll 3-Column Studio Form */
          <div className="py-2 animate-fade-in">
            <div className="glass-panel rounded-3xl border border-slate-200/90 bg-white/95 shadow-xl p-6 md:p-8 max-w-5xl mx-auto space-y-6">
              
              {/* Top Controls: Mode Switcher & 1-Click Presets */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Mode:</span>
                  <div className="inline-flex rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setMode('structured')}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                        mode === 'structured'
                          ? 'bg-white text-slate-900 shadow-sm scale-[1.02]'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      🎛️ Structured Form
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('free')}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                        mode === 'free'
                          ? 'bg-white text-slate-900 shadow-sm scale-[1.02]'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      ✍️ AI Free-Text Prompt
                    </button>
                  </div>
                </div>

                {/* 1-Click Presets (Horizontal Chips) */}
                {presets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      ⚡ 1-Click Presets:
                    </span>
                    {presets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Body: Multi-column clean grid (No scrolling needed!) */}
              <form onSubmit={submit} className="space-y-6">
                {mode === 'structured' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {config.fields.map((field) => renderField(field, false))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      Describe your scenario in plain English or Hindi:
                    </label>
                    <textarea
                      rows={4}
                      value={textPrompt}
                      onChange={(e) => setTextPrompt(e.target.value)}
                      placeholder={config.freeTextExample}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-800 outline-none transition-all duration-200 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 resize-none leading-relaxed"
                    />
                  </div>
                )}

                {/* Action & Submit Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
                  {/* Example prompt pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[11px] mr-1">
                      💬 Try:
                    </span>
                    {config.examples.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => handleExampleClick(example)}
                        className="inline-flex items-center rounded-lg bg-slate-100 hover:bg-sky-50 border border-slate-200/70 hover:border-sky-300 px-2.5 py-1 text-xs text-slate-600 hover:text-sky-700 transition truncate max-w-xs cursor-pointer"
                        title={example}
                      >
                        {example}
                      </button>
                    ))}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-3 text-sm font-bold uppercase tracking-wider text-white transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Analyzing Decision...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>Analyze Decision with DeciXAI</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-sm text-rose-700 mt-4 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Evaluated State: Full-Width Decision Dashboard + Collapsible Top Input Panel */
          <div className="space-y-6">
            {/* Collapsible Input Modification Panel (when user clicks 'Modify Inputs') */}
            {!isSidebarCollapsed && (
              <div className="animate-fade-in glass-panel rounded-3xl border border-sky-200 bg-white/95 p-6 shadow-xl mb-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Modify Decision Inputs
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-700 transition flex items-center gap-1"
                  >
                    <span>✕</span>
                    <span>Close Panel</span>
                  </button>
                </div>

                {/* 1-Click Presets inside modify panel */}
                {presets.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      ⚡ Quick Presets:
                    </span>
                    {presets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Form fields in 3 columns */}
                <form onSubmit={submit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {config.fields.map((field) => renderField(field, true))}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsSidebarCollapsed(true)}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? 'Re-analyzing...' : 'Update Decision Analysis 🚀'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Main Full-Width Results Dashboard */}
            <div ref={resultRef} className="scroll-mt-6 animate-fade-in space-y-4">
              
              {/* Executive SaaS Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Evaluated Simulation Active
                  </span>
                  {baselineItem && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                      Baseline Pinned ({baselineItem.score} pts)
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Save to Workspace */}
                  <button
                    type="button"
                    onClick={() => {
                      const score = Math.round(result?.score || (result?.probability ? result.probability * 100 : 0))
                      setSaveTitle(`${config.title} - ${result?.decision || result?.score_label || 'Analysis'} (${score})`)
                      setSaveModalOpen(true)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-sky-700 shadow-sm transition hover:bg-sky-600 hover:text-white cursor-pointer"
                  >
                    <span>💾</span>
                    <span>Save Dossier</span>
                  </button>

                  {/* Compare with Baseline */}
                  {baselineItem ? (
                    <button
                      type="button"
                      onClick={handleOpenComparison}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 shadow-sm transition hover:bg-amber-500 hover:text-white cursor-pointer"
                    >
                      <span>⚡</span>
                      <span>Compare Delta</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSetBaseline}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition hover:bg-slate-100 cursor-pointer"
                      title="Pin this simulation as baseline to compare changes when adjusting sliders"
                    >
                      <span>📌</span>
                      <span>Pin Baseline</span>
                    </button>
                  )}

                  {/* PDF */}
                  <button
                    type="button"
                    onClick={() => downloadPdf(domain, result)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition hover:bg-slate-100 cursor-pointer"
                  >
                    <span>📄</span>
                    <span>PDF</span>
                  </button>

                  {/* Recalculate */}
                  <button
                    type="button"
                    onClick={recalc}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-sm transition hover:bg-slate-100 cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>Recalc</span>
                  </button>
                </div>
              </div>

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
                        onClick={() => {
                          const score = Math.round(result?.score || (result?.probability ? result.probability * 100 : 0))
                          setSaveTitle(`${config.title} - ${result?.decision || result?.score_label || 'Analysis'} (${score})`)
                          setSaveModalOpen(true)
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[13px] font-bold uppercase tracking-wider text-white transition hover:bg-white/30"
                      >
                        💾 Save
                      </button>
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
          </div>
        )}

      {/* Save Decision Dossier Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">Workspace Dossier</span>
                <h3 className="text-xl font-black text-slate-900">Save Decision to Workspace</h3>
              </div>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {saveSuccess ? (
              <div className="py-8 text-center animate-fadeIn">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl text-emerald-600">
                  ✓
                </div>
                <h4 className="mt-3 text-base font-black text-slate-900">Dossier Saved to Workspace!</h4>
                <p className="mt-1 text-xs text-slate-500">You can reload, share, or compare this run anytime.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Link
                    to="/dashboard/workspace"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    Open Workspace →
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveDecision} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Dossier Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder="e.g. Q3 Startup Funding Viability"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Notes & Hypothesis
                  </label>
                  <textarea
                    rows={2}
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    placeholder="e.g. Tested scenario with 8.5 CGPA and 2 internships"
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={saveTags}
                    onChange={(e) => setSaveTags(e.target.value)}
                    placeholder="e.g. Q3, AI, Bangalore, Target"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setSaveModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-sky-600 disabled:opacity-50"
                  >
                    {saveLoading ? 'Saving...' : 'Save Dossier'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Baseline A/B Comparison Modal */}
      {isCompareOpen && baselineItem && result && (
        <CompareModal
          itemA={baselineItem}
          itemB={{
            id: 'current',
            title: `${config.title} - Current Variant`,
            domain,
            score: Math.round(result.score || (result.probability ? result.probability * 100 : 0)),
            verdict: result.score_label || result.decision || 'Current Evaluation',
            output_payload: result,
          }}
          onClose={() => setIsCompareOpen(false)}
        />
      )}
      </div>
    </div>
  )
}
