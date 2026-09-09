import React from 'react'
import { CAREER_PRESETS } from './careerConfig'

export default function CareerForm({
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

  const handleScoreTypeChange = (type) => {
    setInput((prev) => {
      let nextRaw = prev.raw_score ?? prev.cgpa
      if (type === 'percentage' && nextRaw <= 10) nextRaw = Math.min(100, Math.round(nextRaw * 10))
      else if (type === 'gpa_4' && nextRaw > 4.0) nextRaw = Math.min(4.0, Math.round((nextRaw / 2.5) * 10) / 10)
      else if (type === 'cgpa_10' && nextRaw > 10) nextRaw = Math.min(10, Math.round((nextRaw / 10) * 10) / 10)
      return {
        ...prev,
        score_type: type,
        raw_score: nextRaw,
      }
    })
  }

  const scoreType = input.score_type || 'cgpa_10'
  const rawScore = input.raw_score ?? input.cgpa ?? ''

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {/* Compact Presets Line */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-slate-500">Quick Presets:</span>
        <div className="flex flex-wrap items-center gap-1">
          {CAREER_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onApplyPreset(preset)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition cursor-pointer"
            >
              <span className="text-[10px] text-slate-400 uppercase">{preset.badge}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tight Landscape Form Grid (Direct fields, no nested cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2.5 pt-1">
        
        {/* Academic Score */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800">
              Academic Score <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-0.5 bg-slate-100 rounded p-0.5">
              <button
                type="button"
                onClick={() => handleScoreTypeChange('cgpa_10')}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                  scoreType === 'cgpa_10' ? 'bg-slate-900 text-white' : 'text-slate-500'
                }`}
              >
                10 Scale
              </button>
              <button
                type="button"
                onClick={() => handleScoreTypeChange('gpa_4')}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                  scoreType === 'gpa_4' ? 'bg-slate-900 text-white' : 'text-slate-500'
                }`}
              >
                4.0 GPA
              </button>
              <button
                type="button"
                onClick={() => handleScoreTypeChange('percentage')}
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                  scoreType === 'percentage' ? 'bg-slate-900 text-white' : 'text-slate-500'
                }`}
              >
                %
              </button>
            </div>
          </div>
          <input
            type="number"
            step={scoreType === 'percentage' ? '0.1' : '0.01'}
            min="0"
            max={scoreType === 'percentage' ? '100' : scoreType === 'gpa_4' ? '4.0' : '10.0'}
            value={rawScore}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : Number(e.target.value)
              setInput((prev) => ({ ...prev, raw_score: val, cgpa: val }))
            }}
            placeholder={scoreType === 'percentage' ? '85.5' : scoreType === 'gpa_4' ? '3.8' : '8.5'}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
          {fieldErrors.cgpa && <p className="text-xs text-rose-600 mt-0.5">{fieldErrors.cgpa}</p>}
        </div>

        {/* Course */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Degree / Course <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={input.course || ''}
            onChange={(e) => handleChange('course', e.target.value)}
            placeholder="e.g. B.Tech"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
          {fieldErrors.course && <p className="text-xs text-rose-600 mt-0.5">{fieldErrors.course}</p>}
        </div>

        {/* Specialization */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Specialization / Major
          </label>
          <input
            type="text"
            value={input.specialization || ''}
            onChange={(e) => handleChange('specialization', e.target.value)}
            placeholder="e.g. Computer Science"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Skills */}
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Technical Skills (comma-separated) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={Array.isArray(input.skills) ? input.skills.join(', ') : input.skills || ''}
            onChange={(e) => handleChange('skills', e.target.value)}
            placeholder="e.g. Python, SQL, React, PyTorch, Docker, FastAPI"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
          {fieldErrors.skills && <p className="text-xs text-rose-600 mt-0.5">{fieldErrors.skills}</p>}
        </div>

        {/* Domain Interest */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Target Domain Direction <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={input.interest || ''}
            onChange={(e) => handleChange('interest', e.target.value)}
            placeholder="e.g. AI Systems, Full-Stack"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
          {fieldErrors.interest && <p className="text-xs text-rose-600 mt-0.5">{fieldErrors.interest}</p>}
        </div>

        {/* Projects */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800">
              Engineering Projects &amp; GitHub Repos (comma-separated) <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              Direct GitHub Links Supported
            </span>
          </div>
          <input
            type="text"
            value={Array.isArray(input.projects) ? input.projects.join(', ') : input.projects || ''}
            onChange={(e) => handleChange('projects', e.target.value)}
            placeholder="e.g. Multimodal RAG Agent, https://github.com/username/deci-xai, Distributed Cache"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
          {fieldErrors.projects && <p className="text-xs text-rose-600 mt-0.5">{fieldErrors.projects}</p>}
        </div>

        {/* Certifications */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Certifications (comma-separated)
          </label>
          <input
            type="text"
            value={Array.isArray(input.certifications) ? input.certifications.join(', ') : input.certifications || ''}
            onChange={(e) => handleChange('certifications', e.target.value)}
            placeholder="e.g. AWS Certified Developer"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>

      </div>

      {/* Action Row */}
      <div className="flex justify-end pt-2 border-t border-slate-100">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 hover:bg-slate-800 px-6 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Analyzing Profile...' : 'Run Decision Engine'}
        </button>
      </div>
    </form>
  )
}
