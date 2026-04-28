const DOMAIN_STYLES = {
  career: {
    accent: 'from-cyan-500 via-sky-500 to-blue-600',
    soft: 'from-cyan-50 via-sky-50 to-blue-100',
    chip: 'bg-cyan-100 text-cyan-900',
  },
  finance: {
    accent: 'from-emerald-500 via-lime-500 to-teal-600',
    soft: 'from-emerald-50 via-lime-50 to-teal-100',
    chip: 'bg-emerald-100 text-emerald-900',
  },
  startup: {
    accent: 'from-fuchsia-500 via-violet-500 to-indigo-600',
    soft: 'from-fuchsia-50 via-violet-50 to-indigo-100',
    chip: 'bg-fuchsia-100 text-fuchsia-900',
  },
  policy: {
    accent: 'from-orange-500 via-amber-500 to-rose-500',
    soft: 'from-orange-50 via-amber-50 to-rose-100',
    chip: 'bg-orange-100 text-orange-900',
  },
  default: {
    accent: 'from-sky-500 via-indigo-500 to-cyan-600',
    soft: 'from-sky-50 via-indigo-50 to-cyan-100',
    chip: 'bg-sky-100 text-sky-900',
  },
}

const bandStyles = {
  Strong: 'bg-emerald-100 text-emerald-800',
  Promising: 'bg-sky-100 text-sky-800',
  Average: 'bg-amber-100 text-amber-800',
  'Needs work': 'bg-rose-100 text-rose-800',
  Healthy: 'bg-emerald-100 text-emerald-800',
  'Watch closely': 'bg-amber-100 text-amber-800',
  Risky: 'bg-rose-100 text-rose-800',
  'Investor ready': 'bg-emerald-100 text-emerald-800',
  'Investor Ready': 'bg-emerald-100 text-emerald-800',
  'Early stage': 'bg-amber-100 text-amber-800',
  'Early Stage': 'bg-amber-100 text-amber-800',
  Fragile: 'bg-rose-100 text-rose-800',
  'Strong case': 'bg-emerald-100 text-emerald-800',
  Feasible: 'bg-sky-100 text-sky-800',
  Borderline: 'bg-amber-100 text-amber-800',
  'Weak case': 'bg-rose-100 text-rose-800',
}

const POSITIVE_COLORS = ['#14b8a6', '#22c55e', '#06b6d4', '#84cc16']
const NEGATIVE_COLORS = ['#f97316', '#ef4444', '#fb7185', '#f59e0b']

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round((value || 0) * 100)))

const prettifyKey = (key) =>
  String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const formatNumericValue = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  if (Math.abs(numeric) >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`
  if (Math.abs(numeric) >= 1000) return `${(numeric / 1000).toFixed(1)}k`
  return `${Number.isInteger(numeric) ? numeric : numeric.toFixed(2)}`
}

const humanizeFeatureLabel = (rawLabel = '') => {
  const lowered = String(rawLabel).trim().toLowerCase()

  if (!lowered) return 'This factor'
  if (lowered.includes('interest management')) return 'Management interest'
  if (lowered.includes('interest technical')) return 'Technical interest'
  if (lowered.includes('interest data')) return 'Data interest'
  if (lowered.includes('skills count')) return 'Skill count'
  if (lowered.includes('projects count')) return 'Project count'
  if (lowered.includes('credit score')) return 'Credit score'
  if (lowered.includes('team size')) return 'Team size'
  if (lowered.includes('per capita')) return 'Per-capita allocation'
  if (lowered.includes('interest bonus')) return 'Interest fit'

  return prettifyKey(lowered)
}

const parseKeyFactorLine = (factor) => {
  const match = String(factor).match(/^(.*)\((-?\d+(?:\.\d+)?)\)\s*$/)
  if (!match) return null

  const label = match[1].trim()
  const value = Number(match[2])
  if (!Number.isFinite(value)) return null

  return {
    rawLabel: label,
    label: humanizeFeatureLabel(label),
    value,
    magnitude: Math.abs(value),
    direction: value >= 0 ? 'positive' : 'negative',
  }
}

const parseExplanationFactors = (text) => {
  const regex = /([^.]*)\s(increases|decreases)\s+the score by\s+(-?\d+(?:\.\d+)?)/gi
  const matches = []
  let match

  while ((match = regex.exec(String(text))) !== null) {
    const label = match[1].trim()
    const verb = match[2].toLowerCase()
    const amount = Number(match[3])
    if (!label || !Number.isFinite(amount)) continue

    matches.push({
      rawLabel: label,
      label: humanizeFeatureLabel(label),
      value: verb === 'increases' ? Math.abs(amount) : -Math.abs(amount),
      magnitude: Math.abs(amount),
      direction: verb === 'increases' ? 'positive' : 'negative',
    })
  }

  return matches
}

const buildFactorData = (result) => {
  if (Array.isArray(result.factor_impacts) && result.factor_impacts.length) {
    return result.factor_impacts.slice(0, 5).map((item, index) => {
      const value = Number(item.value ?? 0)
      const direction = value >= 0 ? 'positive' : 'negative'
      return {
        rawLabel: item.factor,
        label: humanizeFeatureLabel(item.factor),
        value,
        magnitude: Math.max(Math.abs(value), 0.01),
        direction,
        color: direction === 'positive'
          ? POSITIVE_COLORS[index % POSITIVE_COLORS.length]
          : NEGATIVE_COLORS[index % NEGATIVE_COLORS.length],
      }
    })
  }
  if ((!result.explanation || !String(result.explanation).trim()) && Array.isArray(result.key_factors)) {
    return result.key_factors.slice(0, 5).map((item, index) => ({
      rawLabel: item,
      label: String(item),
      value: 1,
      magnitude: Math.max(1, 5 - index),
      direction: 'positive',
      color: POSITIVE_COLORS[index % POSITIVE_COLORS.length],
    }))
  }

  const fromKeys = Array.isArray(result.key_factors)
    ? result.key_factors.map(parseKeyFactorLine).filter(Boolean)
    : []
  const parsed = parseExplanationFactors(result.explanation)
  const base = parsed.length ? parsed : fromKeys

  return base
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, 5)
    .map((item, index) => ({
      ...item,
      color: item.direction === 'positive'
        ? POSITIVE_COLORS[index % POSITIVE_COLORS.length]
        : NEGATIVE_COLORS[index % NEGATIVE_COLORS.length],
    }))
}

const buildActionItems = (result) => {
  const planSteps = Array.isArray(result?.action_plan) ? result.action_plan : []
  const suggestionSteps = Array.isArray(result?.suggestions) ? result.suggestions : []

  // The UI already surfaces `next_step` as "Priority". Keep the step cards focused on the plan itself.
  const steps = [
    ...planSteps,
    ...suggestionSteps,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)

  const unique = []
  for (const step of steps) {
    if (!unique.some((existing) => existing.toLowerCase() === step.toLowerCase())) {
      unique.push(step)
    }
  }

  return unique.slice(0, 3)
}

const buildNarrativePoints = (result) => {
  const insights = Array.isArray(result.insights) ? result.insights : []
  const risks = Array.isArray(result.risks) ? result.risks : []
  if (insights.length || risks.length) {
    return [...insights.slice(0, 2), ...risks.slice(0, 1)]
  }
  return []
}

const buildBlockingFactors = (result) =>
  (Array.isArray(result.blocking_factors) ? result.blocking_factors : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 3)

const splitExplanation = (text) =>
  String(text || '')
    .split(/(?<!\d)\.(?:\s+|$)|(?<=\))\s+(?=[A-Z])/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)

const withSentencePunctuation = (text) => {
  const cleaned = String(text || '').trim()
  if (!cleaned) return ''
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`
}

const segmentPercent = (magnitude, total) => `${Math.round((magnitude / total) * 100)}%`

function ScoreRing({ score, accentClass, ringId }) {
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className={`relative mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br ${accentClass} p-[1px] shadow-lg`}>
      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950/95">
        <svg className="absolute inset-4 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={`url(#${ringId})`}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeWidth="10"
          />
          <defs>
            <linearGradient id={ringId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#a3e635" />
              <stop offset="100%" stopColor="#f9a8d4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="relative text-center text-white">
          <div className="text-4xl font-bold">{score}</div>
          <div className="text-xs uppercase tracking-[0.25em] text-slate-300">Score</div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm">
      <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className={`mt-2 text-lg font-semibold ${tone}`}>{value}</div>
    </div>
  )
}

function StoryCards({ result, domain }) {
  const dynamicPoints = buildNarrativePoints(result)
  const points = dynamicPoints.length
    ? dynamicPoints
    : result.explanation
      ? splitExplanation(result.explanation)
    : [
        ...(Array.isArray(result.key_factors) ? result.key_factors.slice(0, 2) : []),
        ...(Array.isArray(result.risks) ? result.risks.slice(0, 1) : []),
      ].filter(Boolean)

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Decision story</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${DOMAIN_STYLES[domain]?.chip || DOMAIN_STYLES.default.chip}`}>{domain}</span>
      </div>
      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Model summary</div>
        <div className="mt-2 text-base font-semibold text-slate-900">{result.summary}</div>
      </div>
      <div className="mt-3 grid gap-3">
        {points.length ? (
          points.map((point, index) => (
            <div key={`${point}-${index}`} className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Insight {index + 1}</div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{withSentencePunctuation(point)}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {result.explanation}
          </div>
        )}
      </div>
    </div>
  )
}

function ImpactMix({ factors, domain }) {
  if (!factors.length) return null

  const total = factors.reduce((sum, factor) => sum + factor.magnitude, 0) || 1
  let currentOffset = 0

  const segments = factors.map((factor) => {
    const segment = (factor.magnitude / total) * 100
    const start = currentOffset
    currentOffset += segment
    return { ...factor, segment, start }
  })

  const gradientParts = segments.map((segment) => `${segment.color} ${segment.start}% ${segment.start + segment.segment}%`).join(', ')

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Impact mix</h3>
          <p className="text-sm text-slate-500">
            {domain === 'startup'
              ? 'A relative view of the startup factors emphasized by the current scoring rules.'
              : 'A compact view of which factors matter most right now.'}
          </p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {domain === 'startup' ? 'Rule-based emphasis' : 'Horizontal view'}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[220px,1fr]">
        <div className="flex items-center justify-center">
          <div className="flex h-40 w-40 items-center justify-center rounded-full bg-slate-100">
            <div
              className="relative flex h-32 w-32 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(${gradientParts})` }}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-center shadow-inner">
                <div className="text-lg font-bold text-slate-900">{factors.length}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 content-start">
          {segments.map((factor) => (
            <div key={`${factor.label}-${factor.start}`} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: factor.color }} />
                  <span className="text-sm font-semibold text-slate-800">{factor.label}</span>
                </div>
                <span className="text-xs font-semibold text-slate-500">{segmentPercent(factor.magnitude, total)}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full"
                  style={{ width: segmentPercent(factor.magnitude, total), backgroundColor: factor.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ActionCards({ actions }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Action plan</h3>
      <div className="mt-4 grid gap-3">
        {actions.length ? (
          actions.map((action, index) => (
            <div key={`${action}-${index}`} className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-lime-50 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-emerald-700">{index === 0 ? 'Do this first' : `Step ${index + 1}`}</div>
              <div className="mt-2 text-sm font-medium leading-6 text-emerald-950">{action}</div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No actions available.</div>
        )}
      </div>
    </div>
  )
}

function BlockingFactorsCard({ items }) {
  if (!items.length) return null

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Blocking factors</h3>
      <div className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-rose-50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Watchout {index + 1}</div>
            <div className="mt-2 text-sm font-medium leading-6 text-slate-800">{item}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuestionsCard({ questions }) {
  if (!Array.isArray(questions) || !questions.length) return null

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Quick questions</h3>
      <p className="mt-1 text-sm text-slate-500">Answering these makes the recommendation much more reliable.</p>
      <div className="mt-4 grid gap-3">
        {questions.slice(0, 4).map((item, index) => (
          <div key={`${item}-${index}`} className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-sky-50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-indigo-700">Question {index + 1}</div>
            <div className="mt-2 text-sm font-medium leading-6 text-slate-800">{item}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlignmentPill({ label, value }) {
  const styles = {
    match: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    mismatch: 'bg-rose-100 text-rose-800 border-rose-200',
    missing: 'bg-amber-100 text-amber-800 border-amber-200',
  }
  const normalized = String(value || '').toLowerCase()
  const style = styles[normalized] || styles.missing

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm">
      <div className="text-sm font-medium text-slate-800">{label}</div>
      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${style}`}>
        {normalized || 'missing'}
      </span>
    </div>
  )
}

function RoadmapBlock({ title, items, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50',
    cyan: 'border-cyan-200 bg-cyan-50',
    indigo: 'border-indigo-200 bg-indigo-50',
    emerald: 'border-emerald-200 bg-emerald-50',
  }

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.slate}`}>
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{title}</div>
      <div className="mt-3 grid gap-2">
        {(items || []).slice(0, 4).map((item, index) => (
          <div key={`${title}-${index}`} className="rounded-xl bg-white/80 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function DualRoadmapCard({ intel }) {
  if (!intel || typeof intel !== 'object') return null
  const best = intel.best_fit
  const interest = intel.interest
  if (!best || !interest) return null

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Roadmap (Best Fit vs Interest)</h3>
          <p className="mt-1 text-sm text-slate-500">Two-track plan so the user gets a clear decision and a clear pivot path.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {intel.recommended_view === 'dual_track' ? 'Dual track' : 'Single track'}
        </span>
      </div>

      {Array.isArray(intel.difference) && intel.difference.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">What’s different</div>
          <div className="mt-2 grid gap-2">
            {intel.difference.slice(0, 3).map((line, index) => (
              <div key={`diff-${index}`} className="text-sm leading-6 text-slate-700">{line}</div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[22px] border border-slate-200 bg-gradient-to-br from-cyan-50 to-sky-50 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-cyan-700">Best fit (current)</div>
          <div className="mt-2 text-base font-semibold text-slate-900">{best.path_label}</div>
          <div className="mt-3 grid gap-2">
            <AlignmentPill label="Skills" value={best.alignment?.skills} />
            <AlignmentPill label="Projects" value={best.alignment?.projects} />
            <AlignmentPill label="Certifications" value={best.alignment?.certifications} />
            <AlignmentPill label="Interest" value={best.alignment?.interest} />
          </div>
          <div className="mt-4 grid gap-3">
            <RoadmapBlock title="Skills to add" items={best.roadmap?.skills_to_add || []} tone="cyan" />
            <RoadmapBlock title="4 project ideas" items={best.roadmap?.project_ideas || []} tone="indigo" />
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-gradient-to-br from-amber-50 to-rose-50 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-rose-700">Interest track (target)</div>
          <div className="mt-2 text-base font-semibold text-slate-900">{interest.path_label}</div>
          <div className="mt-3 grid gap-2">
            <AlignmentPill label="Skills" value={interest.alignment?.skills} />
            <AlignmentPill label="Projects" value={interest.alignment?.projects} />
            <AlignmentPill label="Certifications" value={interest.alignment?.certifications} />
            <AlignmentPill label="Interest" value={interest.alignment?.interest} />
          </div>
          <div className="mt-4 grid gap-3">
            <RoadmapBlock title="Skills to add" items={interest.roadmap?.skills_to_add || []} tone="amber" />
            <RoadmapBlock title="4 project ideas" items={interest.roadmap?.project_ideas || []} tone="emerald" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <RoadmapBlock title="Certifications (best fit)" items={best.roadmap?.certifications || []} tone="slate" />
        <RoadmapBlock title="Certifications (interest)" items={interest.roadmap?.certifications || []} tone="slate" />
      </div>
    </div>
  )
}

function EvidenceCard({ sources }) {
  if (!Array.isArray(sources) || !sources.length) return null

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Evidence (O*NET)</h3>
      <p className="mt-1 text-sm text-slate-500">Matched occupations and skill signals related to your profile.</p>
      <div className="mt-4 grid gap-3">
        {sources.slice(0, 4).map((item, index) => (
          <div key={`${item.code || item.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">{item.title || 'O*NET Occupation'}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{item.code || 'O*NET'}</div>
              </div>
              {typeof item.score === 'number' && (
                <div className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                  {Math.round(item.score * 100)}%
                </div>
              )}
            </div>
            {item.snippet && <p className="mt-3 text-sm leading-6 text-slate-700">{item.snippet}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {(Array.isArray(item.top_skills) ? item.top_skills : []).slice(0, 4).map((skill) => (
                <span key={`${item.code}-skill-${skill}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  {skill}
                </span>
              ))}
              {(Array.isArray(item.technology_skills) ? item.technology_skills : []).slice(0, 3).map((skill) => (
                <span key={`${item.code}-tech-${skill}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function InputSnapshot({ input }) {
  if (!input || typeof input !== 'object') return null

  const entries = Object.entries(input).filter(([, value]) => value !== undefined && value !== null && `${value}` !== '')
  if (!entries.length) return null

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Detected inputs</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-2xl bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{prettifyKey(key)}</div>
            <div className="mt-2 text-sm font-medium text-slate-800">
              {Array.isArray(value) ? value.join(', ') : formatNumericValue(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LiveControls({ fields, onChange, isLiveUpdating }) {
  if (!fields?.length || !onChange) return null

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">What-if sliders</h3>
          <p className="text-sm text-slate-500">Adjust numeric inputs and the score refreshes automatically.</p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {isLiveUpdating ? 'Updating' : 'Live'}
        </div>
      </div>
      <div className="mt-4 grid gap-4">
        {fields.map((field) => (
          <div key={field.name} className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium text-slate-800">{field.label}</div>
              <div className="text-sm font-semibold text-slate-600">{field.value}</div>
            </div>
            <input
              type="range"
              min={field.range?.min}
              max={field.range?.max}
              step={field.range?.step || 1}
              value={field.value ?? field.range?.min ?? 0}
              onChange={(event) => onChange(field.name, Number(event.target.value))}
              className="mt-4 w-full accent-sky-500"
            />
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>{field.range?.min}</span>
              <span>{field.range?.max}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function InsightPanel({
  result,
  domain = 'default',
  title = 'Decision insight',
  subtitle = 'A visual summary of the latest recommendation.',
  input,
  interactiveFields,
  onInteractiveChange,
  isLiveUpdating,
  footerAction,
}) {
  if (!result) return null

  const styles = DOMAIN_STYLES[domain] || DOMAIN_STYLES.default
  const score = typeof result.score === 'number' ? Math.round(result.score) : clampPercent(result.probability)
  const confidenceSource = typeof result.confidence === 'number' ? result.confidence : (result.confidence_ratio ?? result.probability ?? 0)
  const confidence = Math.round(confidenceSource > 1 ? confidenceSource : confidenceSource * 100)
  const bandClass = bandStyles[result.score_label] || bandStyles[result.score_band] || bandStyles[result.band] || 'bg-slate-100 text-slate-800'
  const factors = buildFactorData(result)
  const actions = buildActionItems(result)
  const blockingFactors = buildBlockingFactors(result)
  const followupQuestions = Array.isArray(result.followup_questions) ? result.followup_questions : []
  const evidenceSources = result?.details?.retrieved_sources || []
  const careerIntel = result?.details?.career_intelligence || null
  const ringId = `scoreRingGradient-${domain}-${score}-${title.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <section className={`overflow-hidden rounded-[32px] bg-gradient-to-br ${styles.soft} p-1 shadow-xl`}>
      <div className="rounded-[30px] bg-white p-5 md:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.15fr,0.85fr]">
          <div className={`rounded-[28px] bg-gradient-to-br ${styles.accent} p-6 text-white shadow-lg`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/75">{title}</div>
                <h2 className="mt-3 text-3xl font-semibold">{result.decision}</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/85">{result.summary || subtitle}</p>
              </div>
              {footerAction}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[170px,1fr]">
              <ScoreRing score={score} accentClass={styles.accent} ringId={ringId} />
              <div className="grid gap-4 sm:grid-cols-2">
                <MetricCard label="Confidence" value={`${confidence}% confidence`} />
                {/* Priority is a separate, single-line highlight. Do not fall back to action_plan[0] (that would duplicate "Do this first"). */}
                <MetricCard label="Priority" value={result.next_step || 'Proceed with the next best move'} />
                <MetricCard
                  label="Decision band"
                  value={<span className={`inline-flex rounded-full px-3 py-1 text-sm ${bandClass}`}>{result.score_label || result.score_band || result.band || 'Evaluated'}</span>}
                />
                <MetricCard
                  label="Focus"
                  value={result.focus || actions[1] || 'Keep improving the strongest levers'}
                  tone="text-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <StoryCards result={result} domain={domain} />
            {domain === 'career' && <DualRoadmapCard intel={careerIntel} />}
            {domain === 'career' && <EvidenceCard sources={evidenceSources} />}
            <ActionCards actions={actions} />
            <QuestionsCard questions={domain === 'career' ? followupQuestions : []} />
            <BlockingFactorsCard items={blockingFactors} />
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr,0.95fr]">
          <ImpactMix factors={factors} domain={domain} />
          <InputSnapshot input={input} />
        </div>

        <div className="mt-5">
          <LiveControls fields={interactiveFields} onChange={onInteractiveChange} isLiveUpdating={isLiveUpdating} />
        </div>
      </div>
    </section>
  )
}
