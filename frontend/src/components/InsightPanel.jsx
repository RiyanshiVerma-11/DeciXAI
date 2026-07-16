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
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${accentClass} p-[1px] shadow-md`}>
      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950/90 backdrop-blur">
        <svg className="absolute inset-1.5 -rotate-90" viewBox="0 0 60 60" width="52" height="52">
          <circle cx="30" cy="30" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4.5" />
          <circle
            cx="30"
            cy="30"
            r={radius}
            fill="none"
            stroke={`url(#${ringId})`}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeWidth="4.5"
          />
          <defs>
            <linearGradient id={ringId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#a3e635" />
              <stop offset="100%" stopColor="#f9a8d4" />
            </linearGradient>
          </defs>
        </svg>
        <div className="relative z-10 text-center text-white">
          <div className="text-sm font-black leading-none">{score}</div>
          <div className="text-[6.5px] uppercase tracking-wider text-slate-300 mt-0.5 font-bold">Score</div>
        </div>
      </div>
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

  const chipStyle = DOMAIN_STYLES[domain]?.chip || DOMAIN_STYLES.default.chip

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-500" />
          Decision Story
        </h3>
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${chipStyle}`}>
          {domain}
        </span>
      </div>
      <div className="space-y-2">
        <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-100">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Summary</div>
          <p className="mt-0.5 text-[11px] font-bold text-slate-800 leading-normal">{result.summary}</p>
        </div>
        {points.map((point, index) => (
          <div key={index} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 bg-cyan-50 text-cyan-700 border border-cyan-100 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
              Insight {index + 1}
            </span>
            <p className="text-slate-600 leading-normal text-[11px] mt-0.5">{withSentencePunctuation(point)}</p>
          </div>
        ))}
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
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm md:col-span-2">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          Impact Mix
        </h3>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Factor weights</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-[110px,1fr] items-center">
        <div className="flex justify-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 shadow-inner">
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(${gradientParts})` }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-center shadow">
                <span className="text-xs font-bold text-slate-800">{factors.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {segments.map((factor) => (
            <div key={factor.label} className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: factor.color }} />
                  <span className="text-[10px] font-bold text-slate-700 truncate">{factor.label}</span>
                </div>
                <span className="text-[9px] font-semibold text-slate-400">{segmentPercent(factor.magnitude, total)}</span>
              </div>
              <div className="mt-1 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
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
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Action Plan
        </h3>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Execution</span>
      </div>
      <div className="space-y-2">
        {actions.length ? (
          actions.map((action, index) => (
            <div key={index} className="flex items-start gap-2 text-xs">
              <span className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                {index === 0 ? 'First' : `Step ${index + 1}`}
              </span>
              <p className="text-slate-600 leading-normal text-[11px] mt-0.5 font-medium">{action}</p>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-slate-400 italic text-center py-2">No actions suggested.</p>
        )}
      </div>
    </div>
  )
}

function BlockingFactorsCard({ items }) {
  if (!items.length) return null

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Blocking Factors
        </h3>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Watchout</span>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
              Risk {index + 1}
            </span>
            <p className="text-slate-600 leading-normal text-[11px] mt-0.5">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuestionsCard({ questions }) {
  if (!Array.isArray(questions) || !questions.length) return null

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          Quick Questions
        </h3>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Clarify</span>
      </div>
      <div className="space-y-2">
        {questions.slice(0, 3).map((item, index) => (
          <div key={index} className="flex items-start gap-2 text-xs">
            <span className="shrink-0 bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
              Q {index + 1}
            </span>
            <p className="text-slate-600 leading-normal text-[11px] mt-0.5">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlignmentPill({ label, value }) {
  const styles = {
    match: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    mismatch: 'bg-rose-50 text-rose-700 border-rose-100',
    missing: 'bg-amber-50 text-amber-700 border-amber-100',
  }
  const normalized = String(value || '').toLowerCase()
  const style = styles[normalized] || styles.missing

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-2 py-1 shadow-sm">
      <span className="text-[10px] font-medium text-slate-500">{label}</span>
      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${style}`}>
        {normalized || 'missing'}
      </span>
    </div>
  )
}

function RoadmapBlock({ title, items, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50/50',
    cyan: 'border-cyan-200 bg-cyan-50/30',
    indigo: 'border-indigo-200 bg-indigo-50/30',
    emerald: 'border-emerald-200 bg-emerald-50/30',
    amber: 'border-amber-200 bg-amber-50/30',
  }

  return (
    <div className={`rounded-xl border p-3 ${tones[tone] || tones.slate}`}>
      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5">{title}</span>
      <div className="space-y-1">
        {(items || []).slice(0, 3).map((item, index) => (
          <div key={index} className="rounded-lg bg-white border border-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700 truncate shadow-sm" title={item}>
            {item}
          </div>
        ))}
        {!(items || []).length && <span className="text-[9px] text-slate-400 font-medium">None detected</span>}
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
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm col-span-1 lg:col-span-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-500" />
          Roadmap (Best Fit vs Interest)
        </h3>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
          {intel.recommended_view === 'dual_track' ? 'Dual track' : 'Single track'}
        </span>
      </div>

      {Array.isArray(intel.difference) && intel.difference.length > 0 && (
        <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-[11px] text-slate-600 leading-normal">
          {intel.difference.slice(0, 2).map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Best Fit Track */}
        <div className="rounded-xl border border-cyan-100 bg-cyan-50/20 p-3">
          <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-600">Best Fit (Current)</span>
          <h4 className="text-xs font-bold text-slate-800 mt-0.5 truncate">{best.path_label}</h4>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <AlignmentPill label="Skills" value={best.alignment?.skills} />
            <AlignmentPill label="Projects" value={best.alignment?.projects} />
            <AlignmentPill label="Certs" value={best.alignment?.certifications} />
            <AlignmentPill label="Interest" value={best.alignment?.interest} />
          </div>
          <div className="mt-3 grid gap-2">
            <RoadmapBlock title="Skills to add" items={best.roadmap?.skills_to_add || []} tone="cyan" />
            <RoadmapBlock title="Project ideas" items={best.roadmap?.project_ideas || []} tone="indigo" />
          </div>
        </div>

        {/* Interest Track */}
        <div className="rounded-xl border border-rose-100 bg-rose-50/20 p-3">
          <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600">Interest Track (Target)</span>
          <h4 className="text-xs font-bold text-slate-800 mt-0.5 truncate">{interest.path_label}</h4>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <AlignmentPill label="Skills" value={interest.alignment?.skills} />
            <AlignmentPill label="Projects" value={interest.alignment?.projects} />
            <AlignmentPill label="Certs" value={interest.alignment?.certifications} />
            <AlignmentPill label="Interest" value={interest.alignment?.interest} />
          </div>
          <div className="mt-3 grid gap-2">
            <RoadmapBlock title="Skills to add" items={interest.roadmap?.skills_to_add || []} tone="amber" />
            <RoadmapBlock title="Project ideas" items={interest.roadmap?.project_ideas || []} tone="emerald" />
          </div>
        </div>
      </div>
    </div>
  )
}

function EvidenceCard({ sources }) {
  if (!Array.isArray(sources) || !sources.length) return null

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm col-span-1 lg:col-span-2">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          O*NET Evidence Signals
        </h3>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Reference</span>
      </div>
      <div className="space-y-3">
        {sources.slice(0, 2).map((item, index) => (
          <div key={index} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-[11px] font-bold text-slate-800">{item.title}</h4>
                <span className="text-[8px] font-semibold uppercase text-slate-400 mt-0.5 block">{item.code}</span>
              </div>
              {typeof item.score === 'number' && (
                <span className="rounded bg-sky-50 border border-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700 shrink-0">
                  {Math.round(item.score * 100)}% Match
                </span>
              )}
            </div>
            {item.snippet && <p className="text-[10px] text-slate-600 mt-1 leading-normal">{item.snippet}</p>}
            <div className="mt-2 flex flex-wrap gap-1">
              {(item.top_skills || []).slice(0, 3).map((skill, idx) => (
                <span key={idx} className="bg-white border border-slate-100 text-[8px] font-semibold text-slate-500 rounded px-1.5 py-0.5">
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
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm col-span-1">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-500" />
          Detected Inputs
        </h3>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Metadata</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="bg-slate-50 border border-slate-100 rounded-lg p-2">
            <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">{prettifyKey(key)}</span>
            <span className="text-[11px] font-semibold text-slate-700 truncate block mt-0.5">
              {Array.isArray(value) ? value.join(', ') : formatNumericValue(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LiveControls({ fields, onChange, isLiveUpdating }) {
  if (!fields?.length || !onChange) return null

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          What-if Sliders
        </h3>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
          {isLiveUpdating ? 'Updating' : 'Live'}
        </span>
      </div>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.name} className="rounded-lg border border-slate-100 bg-slate-50/40 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-700">{field.label}</span>
              <span className="text-[11px] font-extrabold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">{field.value ?? field.range?.min ?? 0}</span>
            </div>
            <input
              type="range"
              min={field.range?.min}
              max={field.range?.max}
              step={field.range?.step || 1}
              value={field.value ?? field.range?.min ?? 0}
              onChange={(event) => onChange(field.name, Number(event.target.value))}
              className="mt-2 w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="mt-1 flex justify-between text-[9px] text-slate-400">
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
    <div className="space-y-4">
      {/* Compact Header Gradient Card */}
      <div className={`rounded-xl bg-gradient-to-br ${styles.accent} p-4 sm:p-5 text-white shadow-md relative overflow-hidden`}>
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/90 font-bold">
                {title}
              </span>
              {footerAction}
            </div>
            <h2 className="mt-1.5 text-lg font-bold tracking-tight leading-snug">{result.decision}</h2>
            <p className="mt-0.5 text-xs text-white/80 line-clamp-1 max-w-xl">{result.summary || subtitle}</p>
          </div>
          <ScoreRing score={score} ringId={ringId} accentClass={styles.accent} />
        </div>

        {/* Secondary Metrics Row */}
        <div className="grid grid-cols-4 gap-4 pt-3 text-white/95">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/70">Confidence</span>
            <span className="text-sm font-extrabold mt-0.5">{confidence}%</span>
          </div>
          <div className="flex flex-col border-l border-white/10 pl-4">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/70">Priority</span>
            <span className="text-sm font-extrabold mt-0.5 truncate max-w-[120px]" title={result.next_step}>{result.next_step || 'Proceed'}</span>
          </div>
          <div className="flex flex-col border-l border-white/10 pl-4 col-span-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/70">Focus / Band</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase border ${bandClass}`}>
                {result.score_label || result.score_band || result.band || 'Evaluated'}
              </span>
              <span className="text-xs text-white/90 font-medium truncate max-w-[150px]" title={result.focus}>
                {result.focus || actions[1]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Downstream Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {/* Story Card */}
        <StoryCards result={result} domain={domain} />

        {/* Action Card */}
        <ActionCards actions={actions} />

        {/* Live Slider Controls */}
        <LiveControls fields={interactiveFields} onChange={onInteractiveChange} isLiveUpdating={isLiveUpdating} />

        {/* Impact Mix Chart */}
        <ImpactMix factors={factors} domain={domain} />

        {/* Input Snapshot */}
        <InputSnapshot input={input} />

        {/* Roadmap (Career only) */}
        {domain === 'career' && careerIntel && <DualRoadmapCard intel={careerIntel} />}

        {/* Evidence (Career only) */}
        {domain === 'career' && evidenceSources.length > 0 && <EvidenceCard sources={evidenceSources} />}

        {/* Quick Questions (Career only) */}
        {domain === 'career' && followupQuestions.length > 0 && <QuestionsCard questions={followupQuestions} />}

        {/* Blocking Factors */}
        {blockingFactors.length > 0 && <BlockingFactorsCard items={blockingFactors} />}
      </div>
    </div>
  )
}
