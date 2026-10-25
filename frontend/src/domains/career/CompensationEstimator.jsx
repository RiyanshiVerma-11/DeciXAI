import React, { useState, useEffect } from 'react'
import { estimateCompensation } from '../../api'

const DEFAULT_COUNTRIES = [
  { code: 'in', name: 'India', flag: '🇮🇳', currency_code: 'INR', label: '₹ INR (LPA)' },
  { code: 'us', name: 'United States', flag: '🇺🇸', currency_code: 'USD', label: '$ USD (/Yr)' },
  { code: 'uk', name: 'United Kingdom', flag: '🇬🇧', currency_code: 'GBP', label: '£ GBP (/Yr)' },
  { code: 'eu', name: 'Germany (EU)', flag: '🇪🇺', currency_code: 'EUR', label: '€ EUR (/Yr)' },
  { code: 'ca', name: 'Canada', flag: '🇨🇦', currency_code: 'CAD', label: 'C$ CAD (/Yr)' },
  { code: 'sg', name: 'Singapore', flag: '🇸🇬', currency_code: 'SGD', label: 'S$ SGD (/Yr)' },
  { code: 'ae', name: 'UAE (Dubai)', flag: '🇦🇪', currency_code: 'AED', label: 'AED (/Yr)' },
]

export default function CompensationEstimator({ targetRole, candidateProfile }) {
  const role = targetRole || 'Software Engineer'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [country, setCountry] = useState('in') // default India
  const [currencyView, setCurrencyView] = useState('local') // 'local', 'inr', 'usd'
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
          country: country,
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
  }, [role, experience, candidateProfile, country])

  const brackets = data?.brackets || {}
  const countries = data?.available_countries || DEFAULT_COUNTRIES
  const activeCountry = countries.find((c) => c.code === country) || countries[0]

  // Determine what to display based on currency toggle
  const getBracketDisplay = (bracketKey) => {
    if (!brackets[bracketKey]) return '—'
    if (currencyView === 'usd') return brackets[bracketKey].usd || brackets[bracketKey].display
    if (currencyView === 'inr') return brackets[bracketKey].inr || brackets[bracketKey].display
    return brackets[bracketKey].display
  }

  const getMainRangeDisplay = () => {
    if (!data) return '—'
    if (currencyView === 'usd') return data.predicted_range_usd
    if (currencyView === 'inr') return data.predicted_range_inr
    return data.predicted_range
  }

  const getLadderRange = (step) => {
    if (currencyView === 'usd') return step.usd
    if (currencyView === 'inr') return step.inr
    return step.range || step.inr
  }

  const getSkillUplift = (item) => {
    if (currencyView === 'usd') return `${item.uplift_usd} (${item.uplift_pct})`
    if (currencyView === 'inr') return `${item.uplift_inr} (${item.uplift_pct})`
    return `${item.uplift_display} (${item.uplift_pct})`
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-5 sm:p-7 shadow-xl shadow-slate-200/50 backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Market Intelligence Engine • Real Market Data
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            💰 Market Compensation &amp; Skill ROI Estimator
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Realistic, un-fluffed industry salary benchmarks calibrated for <strong>{role}</strong> with verified skills and live international market comparisons.
          </p>
        </div>

        {/* Controls: Country Picker & Currency Toggle */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* Country Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500">Country:</span>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value)
                setCurrencyView('local')
              }}
              className="bg-transparent text-xs font-black text-slate-900 focus:outline-none cursor-pointer pr-1"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code} className="text-slate-900 font-semibold py-1">
                  {c.flag} {c.name} ({c.currency_code || c.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Currency View Toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setCurrencyView('local')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                currencyView === 'local'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title={`View in ${activeCountry.name} local currency`}
            >
              {activeCountry.flag} {activeCountry.currency_code || 'Local'}
            </button>

            {country !== 'in' && (
              <button
                type="button"
                onClick={() => setCurrencyView('inr')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  currencyView === 'inr'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Convert benchmark to Indian Rupee (LPA)"
              >
                ₹ INR
              </button>
            )}

            {country !== 'us' && (
              <button
                type="button"
                onClick={() => setCurrencyView('usd')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                  currencyView === 'usd'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Compare against US Dollar standard"
              >
                $ USD
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ground-truth Calibration Notice */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50/70 border border-amber-200/80 px-3.5 py-2 text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <span className="text-base">{activeCountry.flag}</span>
          <span>
            <strong>{activeCountry.name} Calibration:</strong> Ground-truth data calibrated via{' '}
            {country === 'in'
              ? 'AmbitionBox, Levels.fyi, Naukri & Radford India reports'
              : 'Levels.fyi, Glassdoor & regional compensation benchmarks'}{' '}
            (no artificial inflation).
          </span>
        </div>
        <span className="text-[11px] font-bold text-amber-700 bg-amber-100/70 rounded-md px-2 py-0.5">
          Verified Baseline
        </span>
      </div>

      {loading && !data ? (
        <div className="py-12 text-center text-xs text-slate-500 font-semibold animate-pulse">
          Calculating verified salary percentiles and international brackets...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Compensation Overview Banner */}
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0B1120] via-slate-900 to-indigo-950 p-6 text-white shadow-xl relative overflow-hidden">
            {/* Subtle glow backdrop */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Estimated Base Compensation Range
                  </span>
                  <span className="rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.2 text-[10px] font-semibold">
                    {activeCountry.flag} {activeCountry.name}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                    {getMainRangeDisplay()}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-400 font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Verified Candidate Profile Match
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Calibrated for {role} at <strong>{experience} Years</strong> professional experience.
                </p>
              </div>

              {/* Experience slider */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 min-w-[240px] shadow-inner">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span className="text-slate-400">Experience Level:</span>
                  <span className="text-cyan-400 font-mono font-extrabold text-sm">{experience} Years</span>
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
                <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-1">
                  <span>Fresher (0y)</span>
                  <span>Mid (3y)</span>
                  <span>Senior (6y+)</span>
                </div>
              </div>
            </div>

            {/* Percentile Brackets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80 relative z-10">
              <div className="rounded-xl bg-slate-800/50 p-3.5 border border-slate-700/50 hover:border-slate-600 transition">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  25th Percentile
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-slate-200 mt-1 block">
                  {getBracketDisplay('entry_25th')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Typical Entry / Baseline</span>
              </div>

              <div className="rounded-xl bg-cyan-950/40 p-3.5 border border-cyan-800/50 hover:border-cyan-600/70 transition shadow-xs">
                <span className="text-[10px] font-bold uppercase text-cyan-400 block tracking-wider flex items-center justify-between">
                  <span>50th (Median)</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-cyan-300 mt-1 block">
                  {getBracketDisplay('median_50th')}
                </span>
                <span className="text-[10px] text-cyan-200/70 block mt-0.5">Market Midpoint Rate</span>
              </div>

              <div className="rounded-xl bg-slate-800/50 p-3.5 border border-slate-700/50 hover:border-slate-600 transition">
                <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                  75th Percentile
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-slate-200 mt-1 block">
                  {getBracketDisplay('top_75th')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">High-Performing Tier</span>
              </div>

              <div className="rounded-xl bg-emerald-950/40 p-3.5 border border-emerald-800/50 hover:border-emerald-600/70 transition shadow-xs">
                <span className="text-[10px] font-bold uppercase text-emerald-400 block tracking-wider flex items-center justify-between">
                  <span>Top Tier (90th)</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                <span className="text-sm sm:text-base font-black font-mono text-emerald-300 mt-1 block">
                  {getBracketDisplay('top_tier_90th')}
                </span>
                <span className="text-[10px] text-emerald-200/70 block mt-0.5">Elite Tech / Unicorns</span>
              </div>
            </div>
          </div>

          {/* Skill ROI Uplift Breakdown */}
          <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold mb-1">
                  Market Premium Analysis • {activeCountry.name}
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  Highest-ROI Skills (Financial Uplift in {activeCountry.name})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adding these competencies directly unlocks higher compensation bands during offer negotiation.
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shrink-0">
                Sorted by Market Shortage
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {data?.skill_roi_premiums?.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-emerald-400 hover:shadow-md transition group"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                      {item.skill}
                    </span>
                    <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-mono font-extrabold shrink-0">
                      {getSkillUplift(item)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-2.5">
                    {item.reasoning}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-semibold">
                    <span>Enterprise Demand Index</span>
                    <span className="font-mono text-emerald-600 font-bold">{item.demand_score}/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Career Progression Ladder */}
          {data?.career_ladder && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Target Role Career Progression Ladder
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Expected base salary trajectory across professional seniority stages in <strong>{activeCountry.name}</strong>.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md px-2 py-0.5">
                  {role}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {data.career_ladder.map((step, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl bg-slate-50 border border-slate-200/90 p-4 hover:border-indigo-300 hover:bg-white hover:shadow-sm transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Stage {idx + 1}
                      </span>
                      {((idx === 0 && experience <= 2.0) ||
                        (idx === 1 && experience > 2.0 && experience <= 5.0) ||
                        (idx === 2 && experience > 5.0 && experience <= 8.0) ||
                        (idx === 3 && experience > 8.0)) && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wide bg-cyan-100 text-cyan-800 rounded-full px-1.5 py-0.2 border border-cyan-200">
                          Current Stage
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {step.level}
                    </span>
                    <span className="text-sm font-black font-mono text-indigo-600 mt-2 block">
                      {getLadderRange(step)}
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
