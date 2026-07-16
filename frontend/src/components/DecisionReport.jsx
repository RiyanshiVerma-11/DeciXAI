const clampPercent = (value) => Math.max(0, Math.min(100, Math.round((value || 0) * 100)))

const normalizeOptions = (payload) => {
  const details = payload.details || {}
  if (Array.isArray(details.option_scores)) {
    return details.option_scores.map((item) => ({
      name: item.mapped_label || item.name,
      percent: typeof item.probability === 'number' ? clampPercent(item.probability) : Math.round(item.score || 0),
      reason: item.reason || '',
    }))
  }
  if (Array.isArray(details.probabilities)) {
    return details.probabilities.map((item) => ({
      name: item.label,
      percent: clampPercent(item.probability),
      reason: '',
    }))
  }
  if (Array.isArray(payload.options)) {
    return payload.options.map((item) => ({
      name: item.mapped_label || item.name,
      percent: typeof item.probability === 'number' ? clampPercent(item.probability) : Math.round(item.score || 0),
      reason: item.reason || '',
    }))
  }
  return []
}

const normalizeInsights = (payload) => {
  const details = payload.details || {}
  if (Array.isArray(details.explanations) && details.explanations.length) return details.explanations
  if (Array.isArray(payload.insights) && payload.insights.length) return payload.insights
  if (Array.isArray(payload.explanations) && payload.explanations.length) return payload.explanations
  return []
}

const normalizeRisks = (payload) => {
  const details = payload.details || {}
  if (Array.isArray(details.risks) && details.risks.length) {
    return details.risks.map((item) => typeof item === 'string' ? { title: 'Risk', text: item } : { title: item.path || 'Risk', text: item.risk })
  }
  if (Array.isArray(payload.risks) && payload.risks.length) {
    return payload.risks.map((item, index) => typeof item === 'string'
      ? { title: `Risk ${index + 1}`, text: item }
      : { title: item.path || `Risk ${index + 1}`, text: item.risk })
  }
  return []
}

const normalizeActions = (payload) => {
  const details = payload.details || {}
  const raw =
    (Array.isArray(details.action_plan) && details.action_plan.length ? details.action_plan : null) ||
    (Array.isArray(payload.action_plan) && payload.action_plan.length ? payload.action_plan : null) ||
    []

  // Normalize + dedupe: backend may already dedupe, but we treat UI input as untrusted.
  // This prevents "Do this first" being repeated as "Step 2" when strings are identical.
  const normalized = raw
    .map((item) => String(item || '').trim())
    .filter(Boolean)

  const unique = []
  for (const step of normalized) {
    const key = step.toLowerCase().replace(/\s+/g, ' ')
    if (!unique.some((existing) => existing.toLowerCase().replace(/\s+/g, ' ') === key)) {
      unique.push(step)
    }
  }

  return unique
}

const normalizeImpacts = (payload) => {
  const details = payload.details || {}
  if (Array.isArray(details.factor_impacts) && details.factor_impacts.length) return details.factor_impacts
  if (Array.isArray(payload.factor_impacts) && payload.factor_impacts.length) return payload.factor_impacts
  return []
}

const normalizeCareerIntel = (payload) => payload?.details?.career_intelligence || null

function RadarGlyph({ positive }) {
  return (
    <div className={`relative flex h-8 w-8 items-center justify-center rounded-xl border ${positive ? 'border-emerald-300/60 bg-emerald-400/10' : 'border-rose-300/60 bg-rose-400/10'}`}>
      <div className={`absolute h-4 w-4 rounded-full border ${positive ? 'border-emerald-300/70' : 'border-rose-300/70'}`} />
      <div className={`absolute h-2 w-2 rounded-full ${positive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
    </div>
  )
}

function AlignmentChip({ value }) {
  const normalized = String(value || '').toLowerCase()
  const styles = {
    match: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    mismatch: 'bg-rose-50 text-rose-700 border-rose-100',
    missing: 'bg-amber-50 text-amber-700 border-amber-100',
  }
  const style = styles[normalized] || styles.missing
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${style}`}>
      {normalized || 'missing'}
    </span>
  )
}

function RoadmapCard({ eyebrow, title, alignment, roadmap, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-slate-50/20',
    cyan: 'border-cyan-200/80 bg-cyan-50/20',
    rose: 'border-rose-200/80 bg-rose-50/20',
  }

  return (
    <div className={`rounded-xl border p-4 shadow-sm bg-white ${tones[tone] || tones.slate}`}>
      <div className="text-[9px] uppercase tracking-[0.22em] text-slate-400 font-bold">{eyebrow}</div>
      <div className="mt-0.5 text-xs font-bold text-slate-950">{title}</div>

      {/* Grid Alignment: compact row */}
      <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-50 border border-slate-100 rounded-lg p-1.5">
        <div className="flex items-center justify-between px-1.5">
          <span className="text-[10px] font-medium text-slate-500">Skills</span>
          <AlignmentChip value={alignment?.skills} />
        </div>
        <div className="flex items-center justify-between px-1.5 border-l border-slate-200/60">
          <span className="text-[10px] font-medium text-slate-500">Projects</span>
          <AlignmentChip value={alignment?.projects} />
        </div>
        <div className="flex items-center justify-between px-1.5 border-l border-slate-200/60">
          <span className="text-[10px] font-medium text-slate-500">Certs</span>
          <AlignmentChip value={alignment?.certifications} />
        </div>
        <div className="flex items-center justify-between px-1.5 border-l border-slate-200/60">
          <span className="text-[10px] font-medium text-slate-500">Interest</span>
          <AlignmentChip value={alignment?.interest} />
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Skills to Add */}
          <div className="rounded-lg border border-slate-100 bg-slate-50/30 p-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Skills to add</span>
            <div className="flex flex-wrap gap-1">
              {(roadmap?.skills_to_add || []).slice(0, 4).map((item) => (
                <span key={item} className="rounded bg-white border border-slate-100 px-1 py-0.5 text-[9px] font-semibold text-slate-600">
                  {item}
                </span>
              ))}
              {!(roadmap?.skills_to_add || []).length && <span className="text-[9px] text-slate-400">None</span>}
            </div>
          </div>

          {/* Certifications */}
          <div className="rounded-lg border border-slate-100 bg-slate-50/30 p-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Certifications</span>
            <div className="space-y-1">
              {(roadmap?.certifications || []).slice(0, 2).map((item, index) => (
                <div key={index} className="text-[9px] font-semibold text-slate-700 truncate" title={item}>
                  &bull; {item}
                </div>
              ))}
              {!(roadmap?.certifications || []).length && <span className="text-[9px] text-slate-400">None</span>}
            </div>
          </div>
        </div>

        {/* Project Ideas */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/30 p-2.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Project Ideas</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {(roadmap?.project_ideas || []).slice(0, 2).map((item, index) => {
              const isObj = typeof item === 'object' && item !== null;
              return (
                <div key={index} className="rounded-lg border border-slate-100 bg-white p-2 shadow-sm">
                  <div className="text-[10px] font-bold text-slate-800 truncate">{isObj ? item.title : item}</div>
                  {isObj && (
                    <div className="mt-1 text-[9px] text-slate-500 leading-normal">
                      <span className="font-semibold text-slate-600">Problem:</span> {item.problem}
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="bg-cyan-50 text-cyan-700 px-1 rounded text-[8px] font-mono font-bold">{item.stack}</span>
                        <span className="bg-emerald-50 text-emerald-700 px-1 rounded text-[8px] font-bold">{item.impact}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreDial({ percent }) {
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (percent / 100) * circumference

  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 shadow-lg backdrop-blur">
      <svg className="absolute inset-1.5 -rotate-90" viewBox="0 0 60 60" width="52" height="52">
        <circle cx="30" cy="30" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4.5" />
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          stroke="url(#comparison-score-gradient)"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth="4.5"
        />
        <defs>
          <linearGradient id="comparison-score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="40%" stopColor="#2dd4bf" />
            <stop offset="78%" stopColor="#a3e635" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
        </defs>
      </svg>
      <div className="relative z-10 text-center text-white">
        <div className="text-sm font-black leading-none">{percent}</div>
        <div className="text-[6.5px] uppercase tracking-wider text-cyan-200 mt-0.5 font-bold">Score</div>
      </div>
    </div>
  )
}

function PanelTitle({ eyebrow, title, count, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    cyan: 'bg-cyan-50 text-cyan-700',
    rose: 'bg-rose-50 text-rose-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2 mb-3">
      <div>
        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{eyebrow}</div>
        <h3 className="text-xs font-bold text-slate-900 mt-0.5">{title}</h3>
      </div>
      {count !== undefined && (
        <div className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tones[tone] || tones.slate}`}>
          {count}
        </div>
      )}
    </div>
  )
}

function ComparisonBars({ options }) {
  return (
    <div className="space-y-2">
      {options.map((option, index) => {
        const rank = index + 1
        const accent = index === 0
          ? 'from-cyan-500 via-sky-500 to-emerald-400'
          : index === 1
            ? 'from-sky-400 via-teal-400 to-lime-400'
            : 'from-slate-400 via-slate-500 to-slate-600'

        return (
          <div key={`${option.name}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50/30 p-2.5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${index === 0 ? 'bg-cyan-50 text-cyan-700 border border-cyan-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {rank}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 leading-tight">{option.name}</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Path fit signal</div>
                  </div>
                </div>
                {option.reason && <div className="mt-2 text-[11px] leading-relaxed text-slate-600">{option.reason}</div>}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-black text-slate-950">{option.percent}%</div>
                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Match</div>
              </div>
            </div>
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className={`report-rise h-full rounded-full bg-gradient-to-r ${accent}`} style={{ width: `${option.percent}%` }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StoryCard({ title, items, emptyText, tone }) {
  const styles = {
    insight: {
      dot: 'bg-cyan-500',
      badge: 'bg-cyan-50 text-cyan-700 border-cyan-100',
      tag: 'Momentum',
    },
    risk: {
      dot: 'bg-rose-500',
      badge: 'bg-rose-50 text-rose-600 border-rose-100',
      tag: 'Watch-out',
    },
    action: {
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      tag: 'Execution',
    },
  }

  const current = styles[tone] || styles.insight

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${current.dot}`}></span>
          {title}
        </h3>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{current.tag}</span>
      </div>
      <div className="space-y-2">
        {items.length ? (
          items.map((item, index) => (
            <div key={index} className="flex items-start gap-2 text-xs">
              <span className={`shrink-0 ${current.badge} px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border`}>
                {tone === 'action' ? (index === 0 ? 'First' : `Step ${index + 1}`) : `${current.tag}`}
              </span>
              <p className="text-slate-600 leading-normal text-[11px] mt-0.5">{item.text || item}</p>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-slate-400 italic text-center py-2">{emptyText}</p>
        )}
      </div>
    </div>
  )
}

export default function DecisionReport({ payload, interactiveFields, onInteractiveChange, isLiveUpdating, onRefresh, onDownload }) {
  const options = normalizeOptions(payload)
  const insights = normalizeInsights(payload)
  const risks = normalizeRisks(payload)
  const actions = normalizeActions(payload)
  const impacts = normalizeImpacts(payload)
  const realityCheck = payload.reality_check || ''
  const projectIdeas = payload.project_ideas || []
  const careerIntel = normalizeCareerIntel(payload)
  const bestPercent = typeof payload.score === 'number'
    ? Math.round(payload.score)
    : (options[0]?.percent || 0)
  const confidence = typeof payload.confidence === 'number'
    ? Math.round(payload.confidence)
    : clampPercent(payload.probability)
  const whatIf = payload.what_if || payload.details?.what_if || ''
  const sliders = Array.isArray(interactiveFields) ? interactiveFields : []
  const showSliders = Boolean(sliders.length && typeof onInteractiveChange === 'function')

  return (
    <div className="space-y-4">
      {/* Sleek, Compact Decision Signal Board Header */}
      <div className="relative overflow-hidden rounded-xl bg-[linear-gradient(135deg,_#7c3aed_0%,_#ec4899_45%,_#f97316_100%)] p-4 sm:p-5 text-white shadow-md">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-cyan-200 font-bold">
                Decision Signal Board
              </span>
              {typeof onDownload === 'function' && (
                <button
                  onClick={onDownload}
                  className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white transition hover:bg-white/30"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  PDF
                </button>
              )}
            </div>
            <h2 className="mt-1.5 text-lg font-bold tracking-tight leading-snug">{payload.decision}</h2>
            <p className="mt-0.5 text-xs text-cyan-50/90 line-clamp-1 max-w-xl">{payload.summary}</p>
          </div>
          <ScoreDial percent={bestPercent} />
        </div>

        {/* Secondary Metrics Horizontal Grid Row */}
        <div className="grid grid-cols-3 gap-4 pt-3 text-white/95">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-200/90">Confidence</span>
            <span className="text-sm font-extrabold mt-0.5">{confidence}%</span>
          </div>
          <div className="flex flex-col border-l border-white/10 pl-4">
            <span className="text-[9px] font-bold uppercase tracking-wider text-lime-200/90">Top Path</span>
            <span className="text-sm font-extrabold mt-0.5 truncate max-w-[150px]">{options[0]?.name || payload.decision}</span>
          </div>
          <div className="flex flex-col border-l border-white/10 pl-4">
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-200/90">Next Move</span>
            <span className="text-sm font-extrabold mt-0.5 truncate max-w-[220px]">
              {(() => {
                const next = String(payload.next_step || '').trim()
                const first = String(actions[0] || '').trim()
                if (next && first && next.toLowerCase() === first.toLowerCase()) return first
                return first || next || 'Review factors'
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {/* Option Comparison Card */}
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm md:col-span-2">
          <PanelTitle eyebrow="Path ranking" title="Option comparison" count={`${options.length} options`} tone="cyan" />
          <ComparisonBars options={options} />
        </div>

        {/* Live Slider controls */}
        {showSliders && (
          <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">What-if</span>
                <h3 className="text-xs font-bold text-slate-900 mt-0.5">Live Sliders</h3>
              </div>
              {typeof onRefresh === 'function' && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="text-[10px] font-bold text-sky-600 hover:text-sky-800 transition"
                >
                  {isLiveUpdating ? 'Updating...' : 'Refresh'}
                </button>
              )}
            </div>
            <div className="space-y-3 pr-1">
              {sliders.map((field) => (
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
                    onChange={(event) => onInteractiveChange(field.name, Number(event.target.value))}
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
        )}

        {/* Insights drivers */}
        <StoryCard
          title="Insights"
          items={insights.map((item) => ({ text: item }))}
          emptyText="No model insights available."
          tone="insight"
        />

        {/* Risks list */}
        <StoryCard
          title="Risks"
          items={risks}
          emptyText="No major risks surfaced."
          tone="risk"
        />

        {/* Action checklist */}
        <StoryCard
          title="Action Plan"
          items={actions.map((item) => ({ text: item }))}
          emptyText="No action plan available."
          tone="action"
        />

        {/* Factor Impact Signals map */}
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm md:col-span-2">
          <PanelTitle eyebrow="Model trace" title="Factor impact" count="Signal map" tone="slate" />
          <div className="grid gap-3 sm:grid-cols-2">
            {impacts.length ? impacts.slice(0, 4).map((item, index) => {
              const rawValue = Number(item.value)
              const strength = Number.isFinite(rawValue) ? Math.max(Math.min(Math.abs(rawValue) * 100, 100), 8) : 20
              const positive = Number.isFinite(rawValue) ? rawValue >= 0 : !String(item.impact || '').toLowerCase().includes('holds back')

              return (
                <div key={index} className="rounded-lg border border-slate-100 bg-slate-50/30 p-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-800 truncate" title={item.factor}>{item.factor}</span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {positive ? 'Positive' : 'Negative'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal line-clamp-2" title={item.impact}>{item.impact}</p>
                  </div>
                  <div className="mt-3">
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${positive ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-orange-400 to-rose-500'}`}
                        style={{ width: `${strength}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-400 italic text-center sm:col-span-2">No factor impact data available.</div>
            )}
          </div>
        </div>

        {/* Reality check perspective */}
        {realityCheck && (
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 shadow-sm lg:col-span-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500">Auditor Perspective / Reality Check</span>
                <p className="text-xs italic leading-relaxed text-slate-700 mt-0.5">"{realityCheck}"</p>
              </div>
            </div>
          </div>
        )}

        {/* Scenario lab scenario details */}
        {whatIf && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 shadow-sm lg:col-span-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-extrabold text-xs">
                W
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Scenario Lab / What-if Scenario</span>
                <p className="text-xs text-amber-950/90 mt-0.5 leading-relaxed">{whatIf}</p>
              </div>
            </div>
          </div>
        )}

        {/* Project Ideas for mentorship */}
        {projectIdeas.length > 0 && (
          <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm lg:col-span-3">
            <PanelTitle eyebrow="Mentorship" title="High-Quality Project Ideas" count={projectIdeas.length} tone="cyan" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {projectIdeas.slice(0, 3).map((idea, idx) => (
                <div key={idx} className="flex flex-col justify-between rounded-lg border border-slate-100 bg-slate-50/40 p-3 shadow-sm">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{idea.title}</h4>
                    <div className="mt-2 space-y-1">
                      <span className="text-[8px] font-bold uppercase text-slate-400">Problem</span>
                      <p className="text-[10px] text-slate-500 leading-normal line-clamp-3">{idea.problem}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <span className="text-[8px] font-mono text-cyan-600 bg-cyan-50/50 px-1 py-0.5 rounded font-semibold block truncate mb-1">{idea.stack}</span>
                    <span className="inline-flex rounded bg-emerald-50 text-emerald-700 px-1 py-0.5 text-[9px] font-bold">
                      Impact: {idea.impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Career roadmap track details */}
        {careerIntel?.best_fit && careerIntel?.interest && (
          <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm lg:col-span-3">
            <PanelTitle
              eyebrow="Decision clarity"
              title="Roadmap (Best Fit vs Interest)"
              count={careerIntel.recommended_view === 'dual_track' ? 'Dual track' : 'Single track'}
              tone="slate"
            />
            {Array.isArray(careerIntel.difference) && careerIntel.difference.length > 0 && (
              <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs text-slate-600 leading-normal">
                {careerIntel.difference.slice(0, 2).map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
            )}
            {careerIntel.recommended_view === 'dual_track' ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <RoadmapCard
                  eyebrow="Best fit (current)"
                  title={careerIntel.best_fit.path_label || 'Best fit'}
                  alignment={careerIntel.best_fit.alignment}
                  roadmap={careerIntel.best_fit.roadmap}
                  tone="cyan"
                />
                <RoadmapCard
                  eyebrow="Interest track (target)"
                  title={careerIntel.interest.path_label || 'Interest track'}
                  alignment={careerIntel.interest.alignment}
                  roadmap={careerIntel.interest.roadmap}
                  tone="rose"
                />
              </div>
            ) : (
              <div className="mt-4">
                <RoadmapCard
                  eyebrow="Single track"
                  title={careerIntel.best_fit.path_label || payload.decision || 'Roadmap'}
                  alignment={careerIntel.best_fit.alignment}
                  roadmap={careerIntel.best_fit.roadmap}
                  tone="cyan"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
