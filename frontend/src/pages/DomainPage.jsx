import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  submitCareer,
  submitCareerPrompt,
  submitFinance,
  submitStartup,
  submitStartupPrompt,
  submitPolicy,
} from '../api'
import DecisionReport from '../components/DecisionReport'
import InsightPanel from '../components/InsightPanel'

const domainConfig = {
  career: {
    title: 'Career',
    subtitle: 'Translate your academic profile and interests into a clearer career direction.',
    freeTextExample: 'Example: cgpa 8.4, course btech cse, specialization ai and ml, skills python sql react, certifications aws cloud practitioner, projects fraud detector dashboard, interest software development',
    fields: [
      { name: 'cgpa', label: 'CGPA', type: 'number' },
      { name: 'course', label: 'Course / Degree', type: 'text' },
      { name: 'specialization', label: 'Specialization', type: 'text' },
      { name: 'education_level', label: 'Education Level', type: 'text' },
      { name: 'year_of_study', label: 'Year Of Study', type: 'number' },
      { name: 'skills', label: 'Skills (comma-separated)', type: 'text' },
      { name: 'certifications', label: 'Certifications (comma-separated)', type: 'text' },
      { name: 'projects', label: 'Projects (comma-separated)', type: 'text' },
      { name: 'interest', label: 'Interest', type: 'text' },
    ],
    submit: submitCareer,
    submitFreeText: (prompt) => submitCareerPrompt({ message: prompt }),
  },
  finance: {
    title: 'Finance',
    subtitle: 'Balance risk, affordability, and credit strength before committing to the next move.',
    freeTextExample: 'Example: income 85000, loan 20000, credit score 735',
    fields: [
      { name: 'income', label: 'Income', type: 'number' },
      { name: 'loan', label: 'Loan', type: 'number' },
      { name: 'credit_score', label: 'Credit Score', type: 'number' },
    ],
    submit: submitFinance,
    submitFreeText: (prompt) => submitFinance(parseFreeText('finance', prompt)),
  },
  startup: {
    title: 'Startup',
    subtitle: 'Assess founder readiness, traction context, and team strength with explainable signals.',
    freeTextExample: 'Example: funding 250000, team size 7, market fintech enterprise, experience 4',
    fields: [
      { name: 'funding', label: 'Funding', type: 'number' },
      { name: 'team_size', label: 'Team Size', type: 'number' },
      { name: 'market', label: 'Market', type: 'text' },
      { name: 'experience', label: 'Experience (years)', type: 'number' },
    ],
    submit: submitStartup,
    submitFreeText: (prompt) => submitStartupPrompt({ message: prompt }),
  },
  policy: {
    title: 'Government Policy',
    subtitle: 'Estimate policy feasibility with a quick read on scale, budget, and public impact.',
    freeTextExample: 'Example: sector renewable energy, budget 5000000, population 1200000',
    fields: [
      { name: 'sector', label: 'Sector', type: 'text' },
      { name: 'budget', label: 'Budget', type: 'number' },
      { name: 'population', label: 'Population', type: 'number' },
    ],
    submit: submitPolicy,
    submitFreeText: (prompt) => submitPolicy(parseFreeText('policy', prompt)),
  },
}

const sectionBreaks = '(?=\\b(?:cgpa|gpa|skills?|expertise|projects?|interest|certifications?|course|degree|specialization|education level|year of study|income|salary|loan|debt|credit score|credit|funding|capital|team size|team|market|experience|years|sector|budget|funds|population|people)\\b|$)'

const splitItems = (value) =>
  String(value)
    .split(/,|;|\band\b|\bor\b|\/|\n/gi)
    .map((item) => item.trim().replace(/^[:\-\s]+|[:\-\s]+$/g, ''))
    .filter(Boolean)

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

  const fallback = lower.match(/([0-9]+(?:\.[0-9]+)?)/)
  return fallback ? Number(fallback[1]) : null
}

const extractSection = (text, keys) => {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const match = text.match(new RegExp(`\\b${escaped}\\b[:\\s-]*(.*?)${sectionBreaks}`, 'is'))
    if (match?.[1]) return match[1].trim().replace(/[.:-]+$/g, '')
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
        skills: skills.length ? skills : [],
        certifications: certifications.length ? certifications : [],
        projects: projects.length ? projects : [],
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

export default function DomainPage() {
  const navigate = useNavigate()
  const { domain } = useParams()
  const config = domainConfig[domain]
  const resultRef = useRef(null)
  const [mode, setMode] = useState('structured')
  const [textPrompt, setTextPrompt] = useState('')
  const [input, setInput] = useState({})
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!result || !resultRef.current) return

    resultRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [result])

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
  }

  const normalizePayload = (rawInput) => {
    const payload = {}
    for (const field of config.fields) {
      let value = rawInput[field.name]
      if (value === undefined || value === null || value === '') {
        // Provide defaults for required fields
        if (field.name === 'skills' || field.name === 'projects' || field.name === 'certifications') {
          value = []
        } else if (field.type === 'number') {
          value = null
        } else {
          value = ''
        }
      }
      if (field.type === 'number') value = parseOptionalNumber(value)
      if (domain === 'finance' && field.name === 'credit_score' && value !== null) {
        value = clamp(value, 300, 850)
      }
      if (domain === 'finance' && (field.name === 'income' || field.name === 'loan') && value !== null) {
        value = Math.max(0, value)
      }
      if (field.name === 'skills' || field.name === 'projects' || field.name === 'certifications') {
        if (Array.isArray(value)) {
          value = value.map((v) => String(v).trim()).filter(Boolean)
        } else {
          value = !value ? [] : String(value).split(',').map((v) => v.trim()).filter(Boolean)
        }
      }
      payload[field.name] = value
    }
    return payload
  }

  const runAnalysis = async (payload) => {
    setLoading(true)
    setError(null)
    try {
      const res = await config.submit(payload)
      setResult(res)
      setInput(payload)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const runFreeTextAnalysis = async (prompt) => {
    setLoading(true)
    setError(null)
    try {
      const parsedPayload = parseFreeText(domain, prompt)
      const res = await config.submitFreeText(prompt)
      setResult(res)
      setInput(res.parsed_input || parsedPayload)
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
      if (textPrompt.trim()) {
        await runFreeTextAnalysis(textPrompt)
      } else {
        const structured = parseFreeText(domain, textPrompt)
        await runAnalysis(structured)
      }
    } else {
      const payload = normalizePayload(input)
      await runAnalysis(payload)
    }
  }

  const recalc = async () => {
    if (mode === 'free') {
      await runFreeTextAnalysis(textPrompt)
      return
    }
    await runAnalysis(normalizePayload(input))
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

  const resultInput = mode === 'free'
    ? (result?.parsed_input || input)
    : input

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <button className="mb-5 text-sm font-medium text-sky-700 transition hover:text-sky-900" onClick={() => navigate('/')}>
          ← Back
        </button>

        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.92fr,1.08fr]">
            <div>
              <div className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs uppercase tracking-[0.28em] text-slate-500">
                {config.title} workspace
              </div>
              <h1 className="mt-5 text-4xl font-bold text-slate-900">{config.title} Decision Studio</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">{config.subtitle}</p>

              <div className="mt-6 flex gap-2">
                <button onClick={() => setMode('structured')} className={`rounded-full px-4 py-2 text-sm font-medium ${mode === 'structured' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  Structured Input
                </button>
                <button onClick={() => setMode('free')} className={`rounded-full px-4 py-2 text-sm font-medium ${mode === 'free' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  Free-text Prompt
                </button>
              </div>
            </div>

            <div className="rounded-[28px] bg-[linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(30,41,59,0.95)_45%,_rgba(14,165,233,0.82)_100%)] p-6 text-white shadow-lg">
              <div className="flex items-center gap-4">
                <img
                  src="/logo.jpeg"
                  alt="deciXAI logo"
                  className="h-16 w-16 rounded-3xl border border-white/20 object-cover"
                />
                <div>
                  <div className="text-2xl font-semibold">deciXAI</div>
                  <div className="text-xs uppercase tracking-[0.26em] text-slate-300">Your AI partner for better decisions</div>
                </div>
              </div>
              <p className="mt-6 text-lg leading-8 text-slate-100">
                Fill in a few inputs and we’ll turn them into a recommendation you can actually understand, defend, and act on.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {mode === 'structured' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {config.fields.map((field) => (
                  <div key={field.name} className="rounded-3xl bg-slate-50 p-4">
                    <label className="block text-sm font-medium text-slate-700">{field.label}</label>
                    <input
                      type={field.type}
                      value={Array.isArray(input[field.name]) ? input[field.name].join(', ') : (input[field.name] ?? '')}
                      onChange={(e) => onFieldChange(field.name, e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky-400"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-slate-50 p-4">
                <label className="block text-sm font-medium text-slate-700">Prompt</label>
                <textarea
                  rows={5}
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  placeholder={config.freeTextExample}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 outline-none transition focus:border-sky-400"
                />
                <p className="mt-2 text-sm text-slate-500">{config.freeTextExample}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Analyzing...' : 'Analyze Decision'}
              </button>
              <div className="text-sm text-slate-500">Results appear as explainable cards and quick-read charts.</div>
            </div>
          </form>

          {error && <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

          {result && (
            <div ref={resultRef} className="mt-8 scroll-mt-24">
              {hasComparisonResult ? (
                <DecisionReport payload={result} />
              ) : (
                <InsightPanel
                  result={result}
                  domain={domain}
                  title={`${config.title} decision`}
                  subtitle={config.subtitle}
                  input={resultInput}
                  footerAction={(
                    <button onClick={recalc} className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20">
                      Recalculate What-if
                    </button>
                  )}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
