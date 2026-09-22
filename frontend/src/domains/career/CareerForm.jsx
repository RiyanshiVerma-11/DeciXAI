import React, { useState } from 'react'
import { CAREER_DOMAINS, CAREER_TARGET_ROLES, CAREER_PRESETS } from './careerConfig'

const renderDomainIcon = (icon) => {
  switch (icon) {
    case 'code':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    case 'scale':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l9-4 9 4M3 6v14l9 2 9-2V6M3 6l9 4 9-4" />
        </svg>
      )
    case 'trending-up':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    case 'activity':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    case 'palette':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    case 'target':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      )
    case 'briefcase':
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    default:
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
  }
}

export default function CareerForm({
  input,
  setInput,
  fieldErrors = {},
  onSubmit,
  loading,
  onApplyPreset,
}) {
  const [selectedDomainId, setSelectedDomainId] = useState(input.domain || null)

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

  const handleSelectDomain = (domain) => {
    setSelectedDomainId(domain.id)
    setInput((prev) => {
      const isFormEmpty = !prev.course && (!prev.skills || (Array.isArray(prev.skills) && prev.skills.length === 0))
      const prefill = isFormEmpty && domain.defaultValues ? domain.defaultValues : {}
      return {
        ...prev,
        domain: domain.id,
        ...prefill,
      }
    })
  }

  const handleAddSkillChip = (skill) => {
    setInput((prev) => {
      const currentSkills = Array.isArray(prev.skills)
        ? prev.skills
        : (prev.skills || '').split(',').map((s) => s.trim()).filter(Boolean)
      if (currentSkills.some((s) => s.toLowerCase() === skill.toLowerCase())) return prev
      return {
        ...prev,
        skills: [...currentSkills, skill],
      }
    })
  }

  const handleAddProjectChip = (project) => {
    setInput((prev) => {
      const currentProjects = Array.isArray(prev.projects)
        ? prev.projects
        : (prev.projects || '').split(',').map((p) => p.trim()).filter(Boolean)
      if (currentProjects.some((p) => p.toLowerCase() === project.toLowerCase())) return prev
      return {
        ...prev,
        projects: [...currentProjects, project],
      }
    })
  }

  const activeDomain = CAREER_DOMAINS.find((d) => d.id === selectedDomainId) || CAREER_DOMAINS[0]
  const scoreType = input.score_type || 'cgpa_10'
  const rawScore = input.raw_score ?? input.cgpa ?? ''

  // STEP 1: DOMAIN SELECTOR GRID
  if (!selectedDomainId) {
    return (
      <div className="space-y-4 py-2">
        <div className="text-center max-w-xl mx-auto mb-4">
          <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2 border border-slate-200">
            Step 1 of 2: Select Career Domain
          </span>
          <h3 className="text-lg font-extrabold text-slate-900">Which field best matches your goal?</h3>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Choosing your domain tailors skill requirements, target roles, and alignment scoring for maximum explainability accuracy.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {CAREER_DOMAINS.map((domain) => (
            <button
              key={domain.id}
              type="button"
              onClick={() => handleSelectDomain(domain)}
              className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xs transition-all hover:border-slate-900 hover:shadow-md cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg text-white bg-gradient-to-r ${domain.color} shadow-xs`}>
                    {renderDomainIcon(domain.icon)}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {domain.badge}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm group-hover:text-slate-900">
                  {domain.label}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">
                  {domain.description}
                </p>
              </div>
              <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-slate-900">
                <span>Select Domain</span>
                <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // STEP 2: STRUCTURED DOMAIN-AWARE FORM
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Active Domain Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg text-white bg-gradient-to-r ${activeDomain.color}`}>
            {renderDomainIcon(activeDomain.icon)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900">{activeDomain.label} Domain</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                {activeDomain.badge}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">{activeDomain.description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSelectedDomainId(null)}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          Change Domain
        </button>
      </div>

      {/* Quick Presets */}
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

      {/* Landscape Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3">
        
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

        {/* Course / Degree */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Degree / Course <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={input.course || ''}
            onChange={(e) => handleChange('course', e.target.value)}
            placeholder={activeDomain.id === 'legal' ? 'e.g. BA LLB' : activeDomain.id === 'finance' ? 'e.g. B.Com / MBA' : 'e.g. B.Tech'}
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
            placeholder={activeDomain.id === 'legal' ? 'e.g. Cyber Law & IP' : activeDomain.id === 'finance' ? 'e.g. Financial Valuation' : 'e.g. Computer Science'}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Skills */}
        <div className="md:col-span-2">
          <label className="text-xs font-bold text-slate-800 block mb-1">
            {activeDomain.id === 'legal' ? 'Legal Skills & Competencies' : activeDomain.id === 'finance' ? 'Financial & Analytics Skills' : activeDomain.id === 'healthcare' ? 'Clinical & Life Science Skills' : activeDomain.id === 'design' ? 'Design & Prototyping Skills' : 'Domain & Technical Skills'} (comma-separated) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={Array.isArray(input.skills) ? input.skills.join(', ') : input.skills || ''}
            onChange={(e) => handleChange('skills', e.target.value)}
            placeholder={`e.g. ${activeDomain.skillSuggestions.slice(0, 5).join(', ')}`}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
          {fieldErrors.skills && <p className="text-xs text-rose-600 mt-0.5">{fieldErrors.skills}</p>}
          
          {/* Skill Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Suggested:</span>
            {activeDomain.skillSuggestions.map((skill, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddSkillChip(skill)}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>

        {/* Domain Interest */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Target Direction / Focus <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={input.interest || ''}
            onChange={(e) => handleChange('interest', e.target.value)}
            placeholder={activeDomain.id === 'legal' ? 'e.g. Corporate Law & Compliance' : activeDomain.id === 'finance' ? 'e.g. Investment Banking' : 'e.g. Software Engineering'}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
          {fieldErrors.interest && <p className="text-xs text-rose-600 mt-0.5">{fieldErrors.interest}</p>}
        </div>

        {/* Target Role Selector */}
        <div className="md:col-span-3">
          <label className="text-xs font-bold text-slate-800 block mb-1">
            Target Role for Alignment Benchmark (Optional)
          </label>
          <select
            value={input.target_role || 'auto'}
            onChange={(e) => handleChange('target_role', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          >
            {CAREER_TARGET_ROLES.map((role) => (
              <option key={role.id} value={role.id}>
                {role.label} — {role.desc}
              </option>
            ))}
          </select>
        </div>

        {/* Projects */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800">
              {activeDomain.id === 'legal' ? 'Legal Case Law & Audits' : activeDomain.id === 'finance' ? 'Valuation & Financial Projects' : activeDomain.id === 'healthcare' ? 'Clinical Research & Protocols' : activeDomain.id === 'design' ? 'Design Case Studies & Prototypes' : 'Projects & Portfolio Evidence'} (comma-separated) <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              GitHub Links Supported
            </span>
          </div>
          <input
            type="text"
            value={Array.isArray(input.projects) ? input.projects.join(', ') : input.projects || ''}
            onChange={(e) => handleChange('projects', e.target.value)}
            placeholder={`e.g. ${activeDomain.projectSuggestions[0] || 'Capstone Project'}`}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
          {fieldErrors.projects && <p className="text-xs text-rose-600 mt-0.5">{fieldErrors.projects}</p>}

          {/* Project Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Suggested Ideas:</span>
            {activeDomain.projectSuggestions.map((proj, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddProjectChip(proj)}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                + {proj}
              </button>
            ))}
          </div>
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
            placeholder={activeDomain.id === 'legal' ? 'e.g. CIPP/E, GDPR Auditor' : activeDomain.id === 'finance' ? 'e.g. CFA Level 1, FMVA' : 'e.g. AWS Developer, CKA'}
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

