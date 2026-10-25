import React, { useState } from 'react'
import { CAREER_TARGET_ROLES } from './careerConfig'

export default function CareerResumeSection({
  resumeFile,
  setResumeFile,
  targetRole,
  setTargetRole,
  customTargetRole,
  setCustomTargetRole,
  resumeLoading,
  resumeStep,
  onSubmitResume,
  onSampleResumeTest,
}) {
  const [dragActive, setDragActive] = useState(false)
  const [localError, setLocalError] = useState(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const validateAndSetFile = (file) => {
    const name = (file?.name || '').toLowerCase()
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      setLocalError('Please provide an ATS-readable PDF or DOCX file.')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setLocalError('File exceeds 15MB limit. Please upload a smaller document.')
      return
    }
    setLocalError(null)
    setResumeFile(file)
    if (onSubmitResume) {
      onSubmitResume(file)
    }
  }

  const currentRoleObj = CAREER_TARGET_ROLES.find((r) => r.id === targetRole)
  const currentRoleDisplay =
    targetRole === 'custom'
      ? customTargetRole.trim() || 'Custom Role'
      : currentRoleObj?.label || 'Auto-Detect Best Fit'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-1">
      {/* Left Column: Target Role Benchmark (5 cols) */}
      <div className="lg:col-span-5 space-y-2.5">
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Target Engineering Role / Track
          </label>
          <select
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-900 cursor-pointer shadow-2xs"
          >
            {CAREER_TARGET_ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {targetRole === 'custom' && (
          <div>
            <input
              type="text"
              value={customTargetRole}
              onChange={(e) => setCustomTargetRole(e.target.value)}
              placeholder="e.g. Quantitative Developer, Blockchain Architect..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>
        )}

        {currentRoleObj?.desc && targetRole !== 'custom' && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700">
            <span className="font-bold text-slate-500 uppercase text-[10px] block">Role Focus:</span>
            <span className="font-medium">{currentRoleObj.desc}</span>
          </div>
        )}

        <div className="text-xs flex items-center justify-between text-slate-500 pt-1">
          <span className="font-bold text-[10px] uppercase">Active Target:</span>
          <span className="font-bold text-slate-900 truncate max-w-[210px]">{currentRoleDisplay}</span>
        </div>
      </div>

      {/* Right Column: Ingestion Station (7 cols) */}
      <div className="lg:col-span-7 space-y-2.5">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-3 text-center transition-all ${
            dragActive ? 'border-sky-500 bg-sky-50/80' : 'border-slate-300 bg-slate-50/40 hover:border-slate-400'
          }`}
        >
          <input
            type="file"
            id="career-resume-file-input"
            accept=".pdf,.docx"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                validateAndSetFile(e.target.files[0])
              }
            }}
            className="hidden"
          />

          <div className="flex flex-wrap items-center justify-center gap-2">
            <label
              htmlFor="career-resume-file-input"
              className="rounded-lg bg-white border border-slate-300 px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 cursor-pointer"
            >
              Browse PDF / DOCX
            </label>
            <button
              type="button"
              onClick={onSampleResumeTest}
              disabled={resumeLoading}
              className="rounded-lg bg-slate-200/80 hover:bg-slate-300/80 px-3.5 py-1.5 text-xs font-bold text-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              Load Sample AI Resume
            </button>
          </div>

          {resumeFile && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-1 text-left shadow-2xs">
              <span className="text-xs font-bold text-slate-900 truncate mr-2">
                {resumeFile.name} ({(resumeFile.size / 1024).toFixed(1)} KB)
              </span>
              <button
                type="button"
                onClick={() => setResumeFile(null)}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}

          {resumeLoading && (
            <div className="mt-2 rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-medium animate-pulse text-left truncate">
              {resumeStep || 'Parsing tokens and evaluating ATS compatibility...'}
            </div>
          )}

          {localError && (
            <div className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded p-1.5 text-left">
              {localError}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onSubmitResume}
            disabled={!resumeFile || resumeLoading}
            className="rounded-lg bg-slate-900 hover:bg-slate-800 px-6 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {resumeLoading ? 'Evaluating...' : 'Scan Resume & Run Decision Engine'}
          </button>
        </div>
      </div>
    </div>
  )
}
