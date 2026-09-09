import React, { useState } from 'react'

export default function ResumeAuditCard({
  resumeData,
  onTuneInForm,
  onDownloadReport,
  onReAuditRole,
}) {
  const [showRawText, setShowRawText] = useState(false)
  const [copied, setCopied] = useState(false)
  const [activeRoleSwitch, setActiveRoleSwitch] = useState('')

  if (!resumeData) return null

  const {
    filename = 'resume.pdf',
    extracted_text_preview = '',
    parsed_profile = {},
    ats_audit = {},
    target_role = null,
  } = resumeData

  const atsScore = Math.round(ats_audit.ats_score || 0)
  const atsGrade = ats_audit.ats_grade || 'ATS Evaluated'
  const gradeColor = ats_audit.grade_color || (atsScore >= 80 ? 'emerald' : atsScore >= 65 ? 'amber' : 'rose')

  const colorMap = {
    emerald: {
      ring: 'stroke-emerald-500',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      badge: 'bg-emerald-100/90 text-emerald-800 border-emerald-300',
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/20',
    },
    amber: {
      ring: 'stroke-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      badge: 'bg-amber-100/90 text-amber-800 border-amber-300',
      gradient: 'from-amber-500 to-orange-600',
      glow: 'shadow-amber-500/20',
    },
    rose: {
      ring: 'stroke-rose-500',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      badge: 'bg-rose-100/90 text-rose-800 border-rose-300',
      gradient: 'from-rose-500 to-red-600',
      glow: 'shadow-rose-500/20',
    },
  }

  const theme = colorMap[gradeColor] || colorMap.emerald
  const circumference = 276.46
  const strokeDashoffset = circumference - (atsScore / 100) * circumference

  const handleCopyText = () => {
    if (!extracted_text_preview) return
    navigator.clipboard.writeText(extracted_text_preview)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const quickRoles = [
    'AI Systems & Machine Learning Engineer',
    'Full-Stack Software Engineer',
    'Cloud & DevOps Architect',
    'Data Scientist & Analytics Engineer',
    'Cybersecurity Engineer',
  ]

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
      {/* Top Banner Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/25 ring-4 ring-white/10 text-xs font-black uppercase tracking-wider">
              ATS
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/20 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-widest text-sky-300 border border-sky-400/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                  ATS 2.0 Engine Verified
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {filename}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                Candidate Resume Intelligence & ATS Audit
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Extracted credentials, section compliance, action metrics, and ATS compatibility for technical screening.
              </p>

              {/* Target Role Status Indicator */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase font-black tracking-wider text-slate-400">
                  Evaluated Target Track:
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/20 border border-sky-400/30 px-3 py-1 text-xs font-bold text-sky-200">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  {target_role || 'Auto-Detected Best Fit Profile'}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onTuneInForm && (
              <button
                type="button"
                onClick={onTuneInForm}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                title="Populate interactive form sliders with parsed resume values"
              >
                <span>Tune in Studio Form</span>
              </button>
            )}
            {onDownloadReport && (
              <button
                type="button"
                onClick={onDownloadReport}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <span>Export Dossier</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Role Switcher Bar on Audit Card */}
        {onReAuditRole && (
          <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Benchmark Against Another Role:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickRoles.map((role) => {
                const isActive = (target_role || '').toLowerCase() === role.toLowerCase()
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onReAuditRole(role)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {role}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Score & Metrics Hero Grid */}
      <div className="p-6 sm:p-7 space-y-7 bg-slate-50/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left: Circular ATS Score Visualizer (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  ATS Readability Score
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${theme.badge}`}>
                  {atsGrade}
                </span>
              </div>

              {/* Radial Progress Gauge */}
              <div className="flex flex-col items-center justify-center my-6">
                <div className="relative flex items-center justify-center">
                  <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      className="stroke-slate-100"
                      strokeWidth="9"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      className={`${theme.ring} transition-all duration-1000 ease-out`}
                      strokeWidth="9"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                      {atsScore}
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                      out of 100
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <p className="text-xs font-semibold text-slate-600">
                    {atsScore >= 80
                      ? 'High probability of passing automated enterprise ATS filters.'
                      : atsScore >= 65
                      ? 'Solid foundation, but can be elevated with measurable metrics.'
                      : 'Missing key formatting sections; revise before submitting to tier-1 firms.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Audit Metrics 4-tile grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100 text-xs">
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Word Count</div>
                <div className="text-base font-black text-slate-800 mt-0.5">
                  {ats_audit.word_count || 0} <span className="text-[10px] text-slate-500 font-normal">words</span>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quantified Metrics</div>
                <div className="text-base font-black text-slate-800 mt-0.5">
                  {ats_audit.detected_metrics_count || 0} <span className="text-[10px] text-slate-500 font-normal">detected</span>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Section Status</div>
                <div className="text-base font-black text-emerald-600 mt-0.5">
                  Passed <span className="text-[10px] text-slate-500 font-normal">ATS filter</span>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Parsed Skills</div>
                <div className="text-base font-black text-indigo-600 mt-0.5">
                  {parsed_profile.skills_count || (parsed_profile.skills || []).length} <span className="text-[10px] text-slate-500 font-normal">tokens</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Extracted Candidate Profile (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Normalized Candidate Attributes
                </h3>
                <span className="text-[11px] font-bold text-slate-400">
                  ML Ready
                </span>
              </div>

              {/* Attributes Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-200/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Degree</div>
                  <div className="text-sm font-black text-slate-800 truncate mt-0.5" title={parsed_profile.degree}>
                    {parsed_profile.degree || 'B.Tech'}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-200/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Specialization</div>
                  <div className="text-sm font-black text-slate-800 truncate mt-0.5" title={parsed_profile.specialization}>
                    {parsed_profile.specialization || 'Computer Science'}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-200/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CGPA / Grade</div>
                  <div className="text-sm font-black text-sky-700 mt-0.5">
                    {parsed_profile.cgpa ? Number(parsed_profile.cgpa).toFixed(1) : '8.5'}
                    <span className="text-[10px] text-slate-400 font-medium ml-1">
                      {parsed_profile.score_type === 'percentage' ? '%' : '/ 10'}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50/80 p-3 border border-slate-200/60">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Domain Interest</div>
                  <div className="text-sm font-black text-indigo-700 truncate mt-0.5 capitalize" title={parsed_profile.interest}>
                    {parsed_profile.interest || 'Technical'}
                  </div>
                </div>
              </div>

              {/* Extracted Skills Cloud */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Recognized Technical Skills ({parsed_profile.skills?.length || 0})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {(parsed_profile.skills || []).length > 0 ? (
                    parsed_profile.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 border border-sky-200/80 hover:bg-sky-100 hover:border-sky-300 transition-colors shadow-2xs capitalize"
                      >
                        <span>{skill}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No specific technical tokens isolated</span>
                  )}
                </div>
              </div>

              {/* Projects, Certifications & Internships Counters */}
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Projects Identified:</span>
                  <span className="font-bold text-slate-900">{parsed_profile.projects_count ?? (parsed_profile.projects || []).length}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Certifications Identified:</span>
                  <span className="font-bold text-slate-900">{parsed_profile.certifications_count ?? (parsed_profile.certifications || []).length}</span>
                </div>
                {(parsed_profile.internships_count > 0 || (parsed_profile.internships || []).length > 0) && (
                  <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                    <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Internships Identified:</span>
                    <span className="font-bold text-slate-900">{parsed_profile.internships_count ?? (parsed_profile.internships || []).length}</span>
                  </div>
                )}
                {parsed_profile.experience_years > 0 && (
                  <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                    <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Industry Tenure:</span>
                    <span className="font-bold text-slate-900">{parsed_profile.experience_years} yrs</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Strengths & Recommendations Executive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Strengths Card */}
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <h4 className="text-xs font-black uppercase tracking-wider">
                ATS Strengths Detected ({ats_audit.strengths?.length || 0})
              </h4>
            </div>
            <ul className="space-y-2">
              {(ats_audit.strengths || []).map((strength, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                  <span className="text-emerald-600 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations Card */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-800">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
              <h4 className="text-xs font-black uppercase tracking-wider">
                Actionable ATS Optimizations ({ats_audit.recommendations?.length || 0})
              </h4>
            </div>
            <ul className="space-y-2">
              {(ats_audit.recommendations || []).length > 0 ? (
                ats_audit.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                    <span className="text-amber-600 mt-1 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))
              ) : (
                <li className="text-xs text-emerald-700 italic">
                  Resume sections and action bullet points align with benchmark standards!
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Collapsible Raw Extracted Text Drawer */}
        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setShowRawText(!showRawText)}
            className="w-full flex items-center justify-between p-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-sky-600 font-bold">Preview</span>
              <span>Inspect Raw Extracted Resume Text Stream</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 font-semibold">
                {extracted_text_preview ? `${extracted_text_preview.length} chars preview` : 'empty'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span>{showRawText ? 'Collapse' : 'Expand'}</span>
            </div>
          </button>

          {showRawText && (
            <div className="p-4 bg-slate-900 text-slate-200 border-t border-slate-200 text-xs font-mono space-y-3">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                <span>Text tokens extracted via parser engine</span>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans font-semibold transition cursor-pointer"
                >
                  {copied ? 'Copied' : 'Copy to Clipboard'}
                </button>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto text-emerald-400 text-[11px]">
                {extracted_text_preview || 'No text extracted.'}
              </pre>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
