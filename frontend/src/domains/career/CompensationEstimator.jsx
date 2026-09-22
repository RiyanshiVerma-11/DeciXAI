import React, { useState, useEffect } from 'react'
import { estimateCompensation } from '../../api'

export default function CompensationEstimator({ targetRole, candidateProfile }) {
  const role = targetRole || 'Software Engineer'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currency, setCurrency] = useState('inr') // 'inr' or 'usd'
  const [experience, setExperience] = useState(1.5)

  useEffect(() => {
    let isCurrent = true
    const loadComp = async () => {
      setLoading(true)
      try {
        const res = await estimateCompensation({
          target_role: role,
          experience_years: experience,
          skills: candidateProfile?.skills || [],
          academic_score: candidateProfile?.cgpa || 8.5,
        })
        if (isCurrent) setData(res)
      } catch (err) {
        console.error('Failed to estimate compensation', err)
      } finally {
        if (isCurrent) setLoading(false)
      }
    }
    loadComp()
    return () => {
      isCurrent = false
    }
  }, [role, experience, candidateProfile])

  const brackets = data?.brackets || {}

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 sm:p-7 shadow-xl shadow-slate-200/50 backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Market Intelligence Engine
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            💰 Market Compensation &amp; Skill ROI Estimator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Benchmark market salary brackets for <strong>{role}</strong> and measure the financial ROI of adding high-demand skills.
          </p>
        </div>

        {/* Currency Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Currency:</span>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setCurrency('inr')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                currency === 'inr' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              ₹ INR (LPA)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('usd')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                currency === 'usd' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              $ USD (/Yr)
            </button>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-12 text-center text-xs text-slate-500 font-semibold animate-pulse">
          Calculating salary benchmarks and skill premium multipliers...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Compensation Overview Banner */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0B1120] via-slate-900 to-indigo-950 p-6 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Estimated Base Compensation Range ({role})
                </span>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                    {currency === 'inr' ? data?.predicted_range_inr : data?.predicted_range_usd}
                  </span>
                  <span className="text-xs text-emerald-400 font-bold">
                    Based on verified profile skills
                  </span>
                </div>
              </div>

              {/* Experience slider */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 min-w-[220px]">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>Experience Level</span>
                  <span className="text-cyan-400 font-mono font-extrabold">{experience} Years</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="0.5"
                  value={experience}
                  onChange={(e) => setExperience(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Percentile Brackets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
              <div className="rounded-xl bg-slate-800/50 p-3 border border-slate-700/50">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">25th Percentile</span>
                <span className="text-sm font-black font-mono text-slate-200 mt-0.5 block">
                  {brackets.entry_25th ? brackets.entry_25th[currency] : '—'}
                </span>
              </div>
              <div className="rounded-xl bg-slate-800/50 p-3 border border-slate-700/50">
                <span className="text-[10px] font-bold uppercase text-cyan-400 block">50th (Median)</span>
                <span className="text-sm font-black font-mono text-cyan-300 mt-0.5 block">
                  {brackets.median_50th ? brackets.median_50th[currency] : '—'}
                </span>
              </div>
              <div className="rounded-xl bg-slate-800/50 p-3 border border-slate-700/50">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">75th Percentile</span>
                <span className="text-sm font-black font-mono text-slate-200 mt-0.5 block">
                  {brackets.top_75th ? brackets.top_75th[currency] : '—'}
                </span>
              </div>
              <div className="rounded-xl bg-slate-800/50 p-3 border border-slate-700/50">
                <span className="text-[10px] font-bold uppercase text-emerald-400 block">Top Tier (90th)</span>
                <span className="text-sm font-black font-mono text-emerald-300 mt-0.5 block">
                  {brackets.top_tier_90th ? brackets.top_tier_90th[currency] : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Skill ROI Uplift Breakdown */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-5">
            <div className="mb-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold mb-1">
                Market Premium Analysis
              </span>
              <h3 className="text-sm font-black text-slate-900">
                Highest-ROI Skills (Financial Uplift per Skill)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Acquiring these specific competencies unlocks higher compensation bands during offer negotiation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data?.skill_roi_premiums?.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-300 transition">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-900">{item.skill}</span>
                    <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px] font-mono font-extrabold shrink-0">
                      {currency === 'inr' ? item.uplift_inr : item.uplift_usd} ({item.uplift_pct})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {item.reasoning}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Career Ladder */}
          {data?.career_ladder && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Target Role Career Progression Ladder
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.career_ladder.map((step, idx) => (
                  <div key={idx} className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Stage {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 block mt-0.5">
                      {step.level}
                    </span>
                    <span className="text-xs font-black font-mono text-indigo-600 mt-2 block">
                      {currency === 'inr' ? step.inr : step.usd}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
