import React from 'react'

export default function CompareModal({ itemA, itemB, onClose }) {
  if (!itemA || !itemB) return null

  const scoreA = Math.round(itemA.score || 0)
  const scoreB = Math.round(itemB.score || 0)
  const delta = scoreB - scoreA

  // Extract factors if available
  const factorsA = itemA.output_payload?.factor_impacts || []
  const factorsB = itemB.output_payload?.factor_impacts || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-700">
              ⚡ A/B What-If Comparison Matrix
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Scenario Side-by-Side Trade-off Analysis
            </h2>
            <p className="text-sm text-slate-500">
              Comparing decisions to identify probability changes, feature differences, and risk levers.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Delta Summary Banner */}
        <div className="mt-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-400">Score Differential</div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className={`text-3xl font-black ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {delta > 0 ? `+${delta}` : delta} pts
                </span>
                <span className="text-sm text-slate-300">
                  {delta > 0 
                    ? `Scenario B outperforms Scenario A by ${delta} points.` 
                    : delta < 0 
                    ? `Scenario A is stronger by ${Math.abs(delta)} points.` 
                    : 'Both scenarios yield equal predictive viability.'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="rounded-lg bg-white/10 px-3 py-1.5">Scenario A: {scoreA}/100</span>
              <span className="text-slate-500">vs</span>
              <span className="rounded-lg bg-sky-500/20 px-3 py-1.5 text-sky-300 border border-sky-400/30">Scenario B: {scoreB}/100</span>
            </div>
          </div>
        </div>

        {/* 2-Column Comparison Grid */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          
          {/* Card A */}
          <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-5 transition hover:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-slate-200 px-2.5 py-0.5 text-xs font-bold uppercase text-slate-700">
                Baseline: Scenario A
              </span>
              <span className="text-xs text-slate-400 capitalize">{itemA.domain}</span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">{itemA.title}</h3>
            
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-800 shadow-sm border border-slate-200">
                {scoreA}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">Verdict</div>
                <div className="text-sm font-bold text-slate-700">{itemA.verdict || itemA.output_payload?.score_label || 'Evaluated'}</div>
              </div>
            </div>

            {/* Factors */}
            <div className="mt-5 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Key Drivers (SHAP)</div>
              {factorsA.slice(0, 3).map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-sm border border-slate-100">
                  <span className="font-medium text-slate-700 truncate max-w-[200px]">{f.factor || f.reason || 'Impact factor'}</span>
                  <span className={`font-bold ${f.impact === 'positive' || (f.value && f.value > 0) ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {f.impact || (f.value ? `${f.value > 0 ? '+' : ''}${Math.round(f.value * 100)}%` : 'Active')}
                  </span>
                </div>
              ))}
              {factorsA.length === 0 && (
                <p className="text-xs italic text-slate-400">No raw SHAP factors recorded for this run.</p>
              )}
            </div>

            {/* Recommendation summary */}
            {itemA.output_payload?.explanation && (
              <div className="mt-4 rounded-xl bg-white p-3 text-xs leading-relaxed text-slate-600 border border-slate-100">
                <span className="font-bold text-slate-800">Core Insight: </span>
                {itemA.output_payload.explanation.slice(0, 160)}...
              </div>
            )}
          </div>

          {/* Card B */}
          <div className="rounded-2xl border-2 border-sky-300 bg-sky-50/40 p-5 shadow-sm transition hover:border-sky-400">
            <div className="flex items-center justify-between">
              <span className="rounded-md bg-sky-600 px-2.5 py-0.5 text-xs font-bold uppercase text-white shadow-sm">
                Variant: Scenario B
              </span>
              <span className="text-xs text-slate-400 capitalize">{itemB.domain}</span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-slate-900">{itemB.title}</h3>
            
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-xl font-black text-white shadow-md">
                {scoreB}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-sky-700">Verdict</div>
                <div className="text-sm font-bold text-slate-800">{itemB.verdict || itemB.output_payload?.score_label || 'Evaluated'}</div>
              </div>
            </div>

            {/* Factors */}
            <div className="mt-5 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Key Drivers (SHAP)</div>
              {factorsB.slice(0, 3).map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs shadow-sm border border-sky-100">
                  <span className="font-medium text-slate-700 truncate max-w-[200px]">{f.factor || f.reason || 'Impact factor'}</span>
                  <span className={`font-bold ${f.impact === 'positive' || (f.value && f.value > 0) ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {f.impact || (f.value ? `${f.value > 0 ? '+' : ''}${Math.round(f.value * 100)}%` : 'Active')}
                  </span>
                </div>
              ))}
              {factorsB.length === 0 && (
                <p className="text-xs italic text-slate-400">No raw SHAP factors recorded for this run.</p>
              )}
            </div>

            {/* Recommendation summary */}
            {itemB.output_payload?.explanation && (
              <div className="mt-4 rounded-xl bg-white p-3 text-xs leading-relaxed text-slate-600 border border-sky-100">
                <span className="font-bold text-slate-800">Core Insight: </span>
                {itemB.output_payload.explanation.slice(0, 160)}...
              </div>
            )}
          </div>

        </div>

        {/* Footer actions */}
        <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Close Matrix
          </button>
        </div>

      </div>
    </div>
  )
}
