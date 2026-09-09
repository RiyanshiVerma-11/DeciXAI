import React from 'react'
import { FINANCE_PRESETS } from './financeConfig'

export default function FinanceForm({
  input,
  setInput,
  fieldErrors = {},
  onSubmit,
  loading,
  onApplyPreset,
}) {
  const handleChange = (field, value) => {
    setInput((prev) => ({ ...prev, [field]: value === '' ? '' : Number(value) }))
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Quick Presets */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
          Underwriting Scenarios
        </span>
        <div className="flex flex-wrap gap-1.5">
          {FINANCE_PRESETS.map((preset, idx) => (
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
        {/* Annual Income */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1">
            Annual Income ($) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="1000"
            step="1000"
            value={input.income ?? ''}
            onChange={(e) => handleChange('income', e.target.value)}
            placeholder="e.g. 75000"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
          {fieldErrors.income && (
            <p className="mt-1 text-[11px] text-rose-500 font-semibold">{fieldErrors.income}</p>
          )}
        </div>

        {/* Requested Loan */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1">
            Requested Loan Amount ($) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="500"
            value={input.loan ?? ''}
            onChange={(e) => handleChange('loan', e.target.value)}
            placeholder="e.g. 15000"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
          {fieldErrors.loan && (
            <p className="mt-1 text-[11px] text-rose-500 font-semibold">{fieldErrors.loan}</p>
          )}
        </div>

        {/* Credit Score */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
              Credit Score (300 - 850) <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs font-black text-sky-700">
              {input.credit_score ?? 680}
            </span>
          </div>
          <input
            type="number"
            min="300"
            max="850"
            value={input.credit_score ?? ''}
            onChange={(e) => handleChange('credit_score', e.target.value)}
            placeholder="e.g. 720"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
          <input
            type="range"
            min="300"
            max="850"
            step="5"
            value={input.credit_score ?? 680}
            onChange={(e) => handleChange('credit_score', e.target.value)}
            className="w-full mt-2 accent-sky-600 cursor-pointer"
          />
          {fieldErrors.credit_score && (
            <p className="mt-1 text-[11px] text-rose-500 font-semibold">{fieldErrors.credit_score}</p>
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
            <span>Evaluating Credit Model...</span>
          </>
        ) : (
          <span>Run Financial Decision Engine</span>
        )}
      </button>
    </form>
  )
}
