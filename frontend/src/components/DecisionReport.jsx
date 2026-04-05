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
  if (Array.isArray(details.action_plan) && details.action_plan.length) return details.action_plan
  if (Array.isArray(payload.action_plan) && payload.action_plan.length) return payload.action_plan
  return []
}

const normalizeImpacts = (payload) => {
  const details = payload.details || {}
  if (Array.isArray(details.factor_impacts) && details.factor_impacts.length) return details.factor_impacts
  if (Array.isArray(payload.factor_impacts) && payload.factor_impacts.length) return payload.factor_impacts
  return []
}

function RadarGlyph({ positive }) {
  return (
    <div className={`relative flex h-10 w-10 items-center justify-center rounded-2xl border ${positive ? 'border-emerald-300/60 bg-emerald-400/10' : 'border-rose-300/60 bg-rose-400/10'}`}>
      <div className={`absolute h-5 w-5 rounded-full border ${positive ? 'border-emerald-300/70' : 'border-rose-300/70'}`} />
      <div className={`absolute h-2.5 w-2.5 rounded-full ${positive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
    </div>
  )
}

function ScoreDial({ percent }) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (percent / 100) * circumference

  return (
    <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-white/10 shadow-2xl shadow-cyan-950/25 backdrop-blur">
      <div className="absolute inset-2 rounded-full border border-white/10" />
      <svg className="absolute inset-3 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#comparison-score-gradient)"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth="10"
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
        <div className="text-[2.6rem] font-black leading-none">{percent}</div>
        <div className="mt-2 text-[11px] uppercase tracking-[0.34em] text-cyan-100">Best Score</div>
      </div>
    </div>
  )
}

function MetricTile({ label, value, tone, symbol }) {
  const styles = {
    cyan: 'border-cyan-300/20 bg-cyan-300/10 text-cyan-50',
    lime: 'border-lime-300/20 bg-lime-300/10 text-lime-50',
    amber: 'border-amber-300/20 bg-amber-300/10 text-amber-50',
  }

  return (
    <div className={`rounded-[24px] border p-4 shadow-lg shadow-slate-950/10 backdrop-blur ${styles[tone] || styles.cyan}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.26em] text-white/70">{label}</div>
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-sm font-semibold text-white">
          {symbol}
        </div>
      </div>
      <div className="mt-3 text-base font-semibold text-white">{value}</div>
    </div>
  )
}

function PanelTitle({ eyebrow, title, count, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    cyan: 'bg-cyan-100 text-cyan-800',
    rose: 'bg-rose-100 text-rose-800',
    emerald: 'bg-emerald-100 text-emerald-800',
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{eyebrow}</div>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">{title}</h3>
      </div>
      {count !== undefined && (
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>
          {count}
        </div>
      )}
    </div>
  )
}

function ComparisonBars({ options }) {
  return (
    <div className="mt-5 space-y-3">
      {options.map((option, index) => {
        const rank = index + 1
        const accent = index === 0
          ? 'from-cyan-500 via-sky-500 to-emerald-400'
          : index === 1
            ? 'from-sky-400 via-teal-400 to-lime-400'
            : 'from-slate-400 via-slate-500 to-slate-600'

        return (
          <div key={`${option.name}-${index}`} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${index === 0 ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-700'}`}>
                    {rank}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{option.name}</div>
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Path fit signal</div>
                  </div>
                </div>
                {option.reason && <div className="mt-3 text-sm leading-6 text-slate-600">{option.reason}</div>}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-2xl font-black text-slate-950">{option.percent}%</div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Match</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div className={`report-rise h-full rounded-full bg-gradient-to-r ${accent}`} style={{ width: `${option.percent}%` }} />
              </div>
              <div className="mt-3 flex items-end gap-1.5">
                {[0.28, 0.42, 0.56, 0.72, 0.9].map((ratio, barIndex) => (
                  <div
                    key={`${option.name}-mini-${barIndex}`}
                    className={`rounded-full bg-gradient-to-t ${accent}`}
                    style={{ height: `${16 + Math.max(8, option.percent * ratio * 0.45)}px`, width: '10px', opacity: 0.3 + barIndex * 0.12 }}
                  />
                ))}
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
      wrapper: 'border-cyan-300/90 bg-gradient-to-br from-cyan-50 via-sky-100 to-cyan-100',
      icon: 'bg-cyan-200 text-cyan-950',
      chip: 'text-cyan-800',
    },
    risk: {
      wrapper: 'border-rose-300/90 bg-gradient-to-br from-rose-50 via-pink-100 to-rose-100',
      icon: 'bg-rose-200 text-rose-950',
      chip: 'text-rose-800',
    },
    action: {
      wrapper: 'border-emerald-300/90 bg-gradient-to-br from-emerald-50 via-lime-100 to-emerald-100',
      icon: 'bg-emerald-200 text-emerald-950',
      chip: 'text-emerald-800',
    },
  }

  const current = styles[tone]

  return (
    <div className={`rounded-[30px] border p-5 shadow-sm ${current.wrapper}`}>
      <PanelTitle eyebrow="Signal summary" title={title} />
      <div className="mt-5 grid gap-3">
        {items.length ? items.map((item, index) => (
          <div key={`${title}-${index}`} className="rounded-[24px] border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${current.icon}`}>
                {index + 1}
              </div>
              <div>
                <div className={`text-[11px] uppercase tracking-[0.22em] ${current.chip}`}>
                  {tone === 'insight' ? 'Momentum' : tone === 'risk' ? 'Watch-out' : index === 0 ? 'Do this first' : `Step ${index + 1}`}
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-700">{item.text || item}</div>
              </div>
            </div>
          </div>
        )) : (
          <div className="rounded-[24px] bg-white/80 p-4 text-sm text-slate-500">{emptyText}</div>
        )}
      </div>
    </div>
  )
}

export default function DecisionReport({ payload }) {
  const options = normalizeOptions(payload)
  const insights = normalizeInsights(payload)
  const risks = normalizeRisks(payload)
  const actions = normalizeActions(payload)
  const impacts = normalizeImpacts(payload)
  const bestPercent = typeof payload.score === 'number'
    ? Math.round(payload.score)
    : (options[0]?.percent || 0)
  const confidence = typeof payload.confidence === 'number'
    ? Math.round(payload.confidence)
    : clampPercent(payload.probability)
  const whatIf = payload.what_if || payload.details?.what_if || ''

  return (
    <section className="overflow-hidden rounded-[36px] bg-[linear-gradient(145deg,_rgba(243,248,255,1),_rgba(233,246,255,1)_35%,_rgba(240,253,250,1)_100%)] p-1.5 shadow-[0_28px_90px_-32px_rgba(14,165,233,0.45)]">
      <div className="rounded-[34px] border border-white/60 bg-white/85 p-5 backdrop-blur md:p-6">
        <div className="grid gap-5 xl:grid-cols-[1.12fr,0.88fr]">
          <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(140deg,_#7c3aed_0%,_#ec4899_38%,_#f97316_100%)] p-6 text-white shadow-2xl shadow-cyan-950/20">
            <div className="report-float absolute -right-16 top-6 h-40 w-40 rounded-full bg-cyan-300/12 blur-2xl" />
            <div className="absolute left-8 top-8 h-20 w-20 rounded-full border border-white/10 bg-white/5" />
            <div className="absolute bottom-4 right-8 flex gap-2 opacity-40">
              {[18, 30, 24, 42, 28].map((height, index) => (
                <div key={`hero-bar-${index}`} className="w-3 rounded-full bg-white/40" style={{ height }} />
              ))}
            </div>

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-cyan-100">
                  Career signal board
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">{payload.decision}</h2>
                <p className="mt-4 max-w-lg text-sm leading-7 text-cyan-50/90">{payload.summary}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <MetricTile label="Confidence" value={`${confidence}%`} tone="cyan" symbol="C" />
                  <MetricTile label="Top Path" value={options[0]?.name || payload.decision} tone="lime" symbol="P" />
                  <MetricTile label="Next Move" value={actions[0] || payload.next_step || 'Review the strongest factor first'} tone="amber" symbol="N" />
                </div>
              </div>

              <div className="flex justify-center lg:justify-end">
                <ScoreDial percent={bestPercent} />
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(248,252,255,0.98))] p-5 shadow-sm">
              <PanelTitle eyebrow="Path ranking" title="Option comparison" count={`${options.length} options`} tone="cyan" />
              <ComparisonBars options={options} />
            </div>

            {whatIf && (
              <div className="rounded-[30px] border border-amber-200/80 bg-[linear-gradient(135deg,_rgba(255,251,235,1),_rgba(254,243,199,0.72)_55%,_rgba(255,255,255,0.96)_100%)] p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-amber-100 text-lg font-black text-amber-700">
                    W
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em] text-amber-600">Scenario lab</div>
                    <div className="mt-2 text-xl font-semibold text-amber-950">What-if scenario</div>
                    <p className="mt-3 text-sm leading-6 text-amber-900/80">{whatIf}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <StoryCard
            title="Insights"
            items={insights.map((item) => ({ text: item }))}
            emptyText="No model insights available."
            tone="insight"
          />
          <StoryCard
            title="Risks"
            items={risks}
            emptyText="No major risks surfaced."
            tone="risk"
          />
          <StoryCard
            title="Action plan"
            items={actions.map((item) => ({ text: item }))}
            emptyText="No action plan available."
            tone="action"
          />
        </div>

        <div className="mt-5 rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(246,250,255,0.98))] p-5 shadow-sm">
          <PanelTitle eyebrow="Model trace" title="Factor impact" count="Signal map" tone="slate" />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {impacts.length ? impacts.slice(0, 6).map((item, index) => {
              const rawValue = Number(item.value)
              const magnitude = Number.isFinite(rawValue) ? Math.max(Math.min(Math.abs(rawValue) * 1000, 100), 8) : 20
              const positive = Number.isFinite(rawValue) ? rawValue >= 0 : !String(item.impact || '').toLowerCase().includes('holds back')

              return (
                <div key={`${item.factor}-${index}`} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <RadarGlyph positive={positive} />
                      <div>
                        <div className="text-sm font-semibold text-slate-950">{item.factor}</div>
                        <div className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {positive ? 'Positive' : 'Negative'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-slate-950">{Math.round(magnitude)}%</div>
                      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Strength</div>
                    </div>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`report-rise h-full rounded-full ${positive ? 'bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500' : 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500'}`}
                      style={{ width: `${magnitude}%` }}
                    />
                  </div>
                  <div className="mt-4 text-sm leading-6 text-slate-600">{item.impact}</div>
                </div>
              )
            }) : (
              <div className="rounded-[24px] bg-slate-50 p-4 text-sm text-slate-500">No factor impact data available.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
