import React from 'react'
import { POLICY_PRESETS } from './policyConfig'

export default function PolicyForm({
  input,
  setInput,
  fieldErrors = {},
  onSubmit,
  loading,
  onApplyPreset,
}) {
  const handleChange = (field, value) => {
    setInput((prev) => ({ ...prev, [field]: value }))
  }

  const handleNumericChange = (field, value) => {
    setInput((prev) => ({ ...prev, [field]: value === '' ? '' : Number(value) }))
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Quick Presets */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
          Policy Initiatives
        </span>
        <div className="flex flex-wrap gap-1.5">
          {POLICY_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onApplyPreset(preset)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 transition shadow-2xs cursor-pointer active:scale-95"
            >
              <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-extrabold">
                {preset.badge}
              </span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs */}
      <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
        {/* Sector */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1">
            Policy Portfolio / Sector <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={input.sector || ''}
            onChange={(e) => handleChange('sector', e.target.value)}
            placeholder="e.g. Renewable Energy, Public Health, Education"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
          {fieldErrors.sector && (
            <p className="mt-1 text-[11px] text-rose-500 font-semibold">{fieldErrors.sector}</p>
          )}
        </div>

        {/* Budget */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1">
            Allocated Budget ($) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="10000"
            step="100000"
            value={input.budget ?? ''}
            onChange={(e) => handleNumericChange('budget', e.target.value)}
            placeholder="e.g. 5000000"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
          {fieldErrors.budget && (
            <p className="mt-1 text-[11px] text-rose-500 font-semibold">{fieldErrors.budget}</p>
          )}
        </div>

        {/* Population */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1">
            Target Beneficiary Population <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="100"
            step="10000"
            value={input.population ?? ''}
            onChange={(e) => handleNumericChange('population', e.target.value)}
            placeholder="e.g. 1200000"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
          {fieldErrors.population && (
            <p className="mt-1 text-[11px] text-rose-500 font-semibold">{fieldErrors.population}</p>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <>
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Evaluating Feasibility...</span>
          </>
        ) : (
          <span>Run Policy Decision Engine</span>
        )}
      </button>
    </form>
  )
}
