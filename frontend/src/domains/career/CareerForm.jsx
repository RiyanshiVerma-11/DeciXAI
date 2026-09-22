import React, { useState } from 'react'
import axios from 'axios'
import { CAREER_PERSONAS, CAREER_PARENT_DOMAINS, CAREER_TARGET_ROLES, CAREER_PRESETS } from './careerConfig'

const renderIcon = (iconName) => {
  switch (iconName) {
    case 'academic-cap':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      )
    case 'user-check':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    case 'briefcase':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    case 'code':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    case 'scale':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l9-4 9 4M3 6v14l9 2 9-2V6M3 6l9 4 9-4" />
        </svg>
      )
    case 'trending-up':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    case 'palette':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    case 'target':
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      )
    default:
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
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
  const [step, setStep] = useState(1)
  const [intakeMode, setIntakeMode] = useState('form') // 'resume' | 'form' | 'prompt'
  const [uploadingResume, setUploadingResume] = useState(false)
  const [resumeSuccessMsg, setResumeSuccessMsg] = useState('')
  const [resumeErrorMsg, setResumeErrorMsg] = useState('')
  const [promptText, setPromptText] = useState(input.raw_prompt || input.freeText || '')
  const [promptParseSuccess, setPromptParseSuccess] = useState('')
  const [targetIntentChoice, setTargetIntentChoice] = useState(input.target_role && input.target_role !== 'auto' ? 'specific' : 'ai_recommend')

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002'

  const handleParsePromptToForm = (overrideText) => {
    const text = overrideText || promptText
    if (!text.trim()) return

    const cgpaMatch = text.match(/(?:cgpa|gpa|score|marks)\s*[:=]?\s*([\d.]+)/i)
    const courseMatch = text.match(/(?:course|degree|graduated in)\s*[:=]?\s*([a-zA-Z\s.]+?)(?:,|$|specialization|skills|projects|certifications|interest)/i) || text.match(/\b(b\.?tech|btech|bs|ba llb|llb|b\.?com|bcom|mba|bba|msc|bdes|bpharm)\b/i)
    const specMatch = text.match(/(?:specialization|major|in)\s*[:=]?\s*([a-zA-Z\s&]+?)(?:,|$|skills|projects|certifications|interest)/i)
    const skillsMatch = text.match(/skills\s*[:=]?\s*([^,\n.]+?(?:,[^,\n.]+)*)/i)
    const projectsMatch = text.match(/projects?\s*[:=]?\s*([^,\n.]+?(?:,[^,\n.]+)*)/i)
    const certsMatch = text.match(/certifications?\s*[:=]?\s*([^,\n.]+?(?:,[^,\n.]+)*)/i)
    const interestMatch = text.match(/interest\s*[:=]?\s*([^\n,.]+)/i)

    const parsedScore = cgpaMatch ? parseFloat(cgpaMatch[1]) : (input.cgpa || 8.0)
    const parsedCourse = courseMatch ? (courseMatch[1] || courseMatch[0]).trim() : (input.course || '')
    const parsedSpec = specMatch ? specMatch[1].trim() : (input.specialization || '')
    const parsedSkills = skillsMatch ? skillsMatch[1].split(',').map(s => s.trim()).filter(Boolean) : input.skills
    const parsedProjects = projectsMatch ? projectsMatch[1].split(',').map(p => p.trim()).filter(Boolean) : input.projects
    const parsedCerts = certsMatch ? certsMatch[1].split(',').map(c => c.trim()).filter(Boolean) : input.certifications
    const parsedInterest = interestMatch ? interestMatch[1].trim() : input.interest

    setInput((prev) => ({
      ...prev,
      cgpa: parsedScore,
      raw_score: parsedScore,
      course: parsedCourse || prev.course || 'B.Tech',
      specialization: parsedSpec || prev.specialization,
      skills: parsedSkills && parsedSkills.length > 0 ? parsedSkills : prev.skills,
      projects: parsedProjects && parsedProjects.length > 0 ? parsedProjects : prev.projects,
      certifications: parsedCerts && parsedCerts.length > 0 ? parsedCerts : prev.certifications,
      interest: parsedInterest || prev.interest,
      raw_prompt: text,
    }))

    setPromptParseSuccess('Prompt parsed successfully! Skills, CGPA, projects & course extracted into form state.')
  }

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

  // STEP 1: PERSONA SELECTOR
  const handleSelectPersona = (persona) => {
    setInput((prev) => ({
      ...prev,
      persona: persona.id,
      experience_years: persona.defaultYears,
    }))
    setStep(2)
  }

  // STEP 2: DOMAIN SELECTOR
  const handleSelectDomain = (domain) => {
    const defaults = domain.defaultValues || {}
    setInput((prev) => ({
      ...prev,
      parent_domain: domain.id,
      domain: domain.id,
      course: defaults.course || '',
      specialization: defaults.specialization || '',
      skills: defaults.skills ? [...defaults.skills] : [],
      projects: defaults.projects ? [...defaults.projects] : [],
      interest: defaults.interest || '',
      certifications: [],
      target_role: domain.roleSuggestions?.[0] || 'auto',
    }))
    setStep(3)
  }

  // STEP 3: RESUME DROP PARSER
  const handleResumeFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingResume(true)
    setResumeErrorMsg('')
    setResumeSuccessMsg('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (input.interest) formData.append('target_role', input.interest)

      const response = await axios.post(`${API_BASE_URL}/api/v1/career/upload-resume`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const data = response.data
      const creds = data.parsed_credentials || data.normalized || {}

      setInput((prev) => ({
        ...prev,
        course: creds.degree || creds.course || prev.course || 'B.Tech',
        specialization: creds.specialization || prev.specialization || 'Computer Science',
        cgpa: creds.cgpa || prev.cgpa || 8.0,
        skills: creds.skills && creds.skills.length > 0 ? creds.skills : prev.skills,
        projects: creds.projects && creds.projects.length > 0 ? creds.projects : prev.projects,
        certifications: creds.certifications || prev.certifications || [],
        internships: creds.internships || prev.internships || [],
        resume_text: data.raw_text || '',
        resume_extracted: true,
      }))

      setResumeSuccessMsg(`Resume successfully parsed! Extracted ${creds.skills?.length || 0} skills and ${creds.projects?.length || 0} projects.`)
    } catch (err) {
      console.error('Resume upload error:', err)
      setResumeErrorMsg(err.response?.data?.detail || 'Failed to parse resume. You can fill the fields manually.')
    } finally {
      setUploadingResume(false)
    }
  }

  const handleAddSkillChip = (skill) => {
    setInput((prev) => {
      const currentSkills = Array.isArray(prev.skills)
        ? prev.skills
        : (prev.skills || '').split(',').map((s) => s.trim()).filter(Boolean)
      if (currentSkills.some((s) => s.toLowerCase() === skill.toLowerCase())) return prev
      return { ...prev, skills: [...currentSkills, skill] }
    })
  }

  const handleAddProjectChip = (project) => {
    setInput((prev) => {
      const currentProjects = Array.isArray(prev.projects)
        ? prev.projects
        : (prev.projects || '').split(',').map((p) => p.trim()).filter(Boolean)
      if (currentProjects.some((p) => p.toLowerCase() === project.toLowerCase())) return prev
      return { ...prev, projects: [...currentProjects, project] }
    })
  }

  const activePersona = CAREER_PERSONAS.find((p) => p.id === input.persona) || CAREER_PERSONAS[0]
  const activeDomain = CAREER_PARENT_DOMAINS.find((d) => d.id === input.parent_domain) || CAREER_PARENT_DOMAINS[0]
  const scoreType = input.score_type || 'cgpa_10'
  const rawScore = input.raw_score ?? input.cgpa ?? ''

  return (
    <div className="space-y-4">
      {/* Horizontal 5-Step Stepper Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          {[
            { num: 1, label: 'Persona' },
            { num: 2, label: 'Discipline' },
            { num: 3, label: 'Evidence Intake' },
            { num: 4, label: 'Target Intent' },
            { num: 5, label: 'Run XAI Engine' },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num)}
              className={`flex items-center gap-1.5 transition cursor-pointer ${
                step === s.num
                  ? 'text-slate-900 font-extrabold'
                  : step > s.num
                  ? 'text-emerald-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === s.num
                    ? 'bg-slate-900 text-white'
                    : step > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: "WHO ARE YOU?" (PERSONA IDENTIFIER) */}
      {step === 1 && (
        <div className="space-y-4 py-2">
          <div className="text-center max-w-xl mx-auto mb-4">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2 border border-slate-200">
              Step 1 of 5: Stage &amp; Persona Identifier
            </span>
            <h3 className="text-xl font-extrabold text-slate-900">Who are you?</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Identifying your stage sets baseline expectations so student CGPA capstones and professional YoE are evaluated with true context.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CAREER_PERSONAS.map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => handleSelectPersona(persona)}
                className={`group relative flex flex-col justify-between rounded-2xl border p-5 text-left transition-all cursor-pointer ${
                  input.persona === persona.id
                    ? 'border-slate-900 bg-slate-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-xl text-white bg-gradient-to-r ${persona.color} shadow-xs`}>
                      {renderIcon(persona.icon)}
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {persona.badge}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-base">{persona.label}</h4>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{persona.description}</p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>Select Stage</span>
                  <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: DISCIPLINE / DOMAIN SELECTION */}
      {step === 2 && (
        <div className="space-y-4 py-2">
          <div className="text-center max-w-xl mx-auto mb-4">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2 border border-slate-200">
              Step 2 of 5: Discipline &amp; Domain Umbrella
            </span>
            <h3 className="text-xl font-extrabold text-slate-900">Select Your Primary Discipline</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Combines specialized domains into umbrella tracks for domain-aware skill gap analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {CAREER_PARENT_DOMAINS.map((domain) => (
              <button
                key={domain.id}
                type="button"
                onClick={() => handleSelectDomain(domain)}
                className={`group flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer ${
                  input.parent_domain === domain.id
                    ? 'border-slate-900 bg-slate-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg text-white bg-gradient-to-r ${domain.color} shadow-xs`}>
                      {renderIcon(domain.icon)}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {domain.badge}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{domain.label}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">{domain.description}</p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Choose Track</span>
                  <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: PROFILE & EVIDENCE INTAKE (SMART RESUME + AUTO-FILL) */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg text-white bg-gradient-to-r ${activeDomain.color}`}>
                {renderIcon(activeDomain.icon)}
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900">{activePersona.label} &bull; {activeDomain.label}</span>
                <p className="text-[11px] text-slate-500">{activeDomain.description}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs font-bold px-3 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Change Domain
            </button>
          </div>

          {/* 3-Option Sub-mode Switcher */}
          <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => setIntakeMode('resume')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold rounded-xl transition cursor-pointer ${
                intakeMode === 'resume'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>📄</span>
              <span className="truncate">Resume Parser ATS</span>
            </button>

            <button
              type="button"
              onClick={() => setIntakeMode('form')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold rounded-xl transition cursor-pointer ${
                intakeMode === 'form' || intakeMode === 'manual'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>📝</span>
              <span className="truncate">Studio Form</span>
            </button>

            <button
              type="button"
              onClick={() => setIntakeMode('prompt')}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold rounded-xl transition cursor-pointer ${
                intakeMode === 'prompt'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span>💬</span>
              <span className="truncate">Prompt NLP</span>
            </button>
          </div>

          {/* MODE 1: RESUME PARSER ATS */}
          {intakeMode === 'resume' && (
            <div className="space-y-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mx-auto text-slate-700">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Upload Your Resume (ATS Parser)</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Supports PDF or DOCX. Automatically extracts your degree, CGPA, skills, projects, and certifications into form state.
                </p>
              </div>

              <label className="inline-block cursor-pointer bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition">
                {uploadingResume ? 'Parsing Resume Details...' : 'Choose Resume File'}
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleResumeFileUpload}
                  disabled={uploadingResume}
                  className="hidden"
                />
              </label>

              {resumeSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 text-left mt-2">
                  ✓ {resumeSuccessMsg}
                </div>
              )}
              {resumeErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 text-left mt-2">
                  ⚠️ {resumeErrorMsg}
                </div>
              )}
            </div>
          )}

          {/* MODE 3: PROMPT NLP */}
          {intakeMode === 'prompt' && (
            <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Natural Language Prompt NLP</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Type or paste a freeform profile description. The NLP parser will structure your score, skills, projects &amp; degree.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                  NLP Engine
                </span>
              </div>

              {/* Sample Prompt Pills */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block">Sample Prompts (Click to Fill):</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'CGPA 8.2, BTech CSE, skills Python SQL React, projects chatbot and dashboard, interest software engineering',
                    'Meri CGPA 7.8 hai, skills Python SQL, degree B.Com, interest financial risk analyst',
                    'GPA 3.8/4.0, BS Computer Science, skills PyTorch Docker Kubernetes, projects ML pipeline, interest AI Systems',
                  ].map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPromptText(sample)
                        handleParsePromptToForm(sample)
                      }}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-100 text-left transition cursor-pointer"
                    >
                      💡 {sample.slice(0, 50)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <textarea
                  rows={4}
                  value={promptText}
                  onChange={(e) => {
                    setPromptText(e.target.value)
                    handleChange('raw_prompt', e.target.value)
                  }}
                  placeholder="Example: cgpa 8.4, course btech cse, specialization ai and ml, skills python sql react, certifications aws cloud practitioner, projects fraud detector dashboard, interest software development"
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900 leading-relaxed"
                />
              </div>

              {promptParseSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between">
                  <span>✓ {promptParseSuccess}</span>
                  <button
                    type="button"
                    onClick={() => setIntakeMode('form')}
                    className="text-[11px] underline hover:text-emerald-950 font-extrabold"
                  >
                    View in Studio Form &rarr;
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => handleParsePromptToForm()}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>Auto-Extract &amp; Structure Prompt</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleParsePromptToForm()
                    setStep(4)
                  }}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition cursor-pointer"
                >
                  Proceed to Target Intent &rarr;
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: STUDIO FORM (MANUAL QUICK-FILL FORM) */}
          {(intakeMode === 'form' || intakeMode === 'manual') && (
            <div className="space-y-3 pt-1">
              {/* Domain-Aware Preset Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500">Selected Track:</span>
                  <span className="font-extrabold text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                    {activeDomain.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (activeDomain.defaultValues) {
                      setInput((prev) => ({
                        ...prev,
                        ...activeDomain.defaultValues,
                      }))
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer shadow-xs"
                >
                  <span>⚡</span>
                  <span>Populate {activeDomain.label} Benchmarks</span>
                </button>
              </div>

              {/* Landscape Fields Grid */}
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
                    Domain &amp; Technical Skills (comma-separated) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(input.skills) ? input.skills.join(', ') : input.skills || ''}
                    onChange={(e) => handleChange('skills', e.target.value)}
                    placeholder={`e.g. ${activeDomain.skillSuggestions.slice(0, 5).join(', ')}`}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                  {fieldErrors.skills && <p className="text-xs text-rose-600 mt-0.5">{fieldErrors.skills}</p>}

                  {/* Skill Chips */}
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

                {/* Target Focus */}
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

                {/* Projects */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Projects, Audits &amp; Case Studies (comma-separated) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(input.projects) ? input.projects.join(', ') : input.projects || ''}
                    onChange={(e) => handleChange('projects', e.target.value)}
                    placeholder={`e.g. ${activeDomain.projectSuggestions[0] || 'Capstone Project'}`}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                  {fieldErrors.projects && <p className="text-xs text-rose-600 mt-0.5">{fieldErrors.projects}</p>}

                  {/* Project Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Suggested:</span>
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
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              Continue to Target Role Confirmation &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: INTENT & TARGET ROLE CONFIRMATION */}
      {step === 4 && (
        <div className="space-y-4 py-2">
          <div className="text-center max-w-xl mx-auto mb-4">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2 border border-slate-200">
              Step 4 of 5: Target Role Intent
            </span>
            <h3 className="text-xl font-extrabold text-slate-900">How should the Engine evaluate your profile?</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Let AI find your highest affinity match across all job profiles or benchmark against a specific target position.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: AI Recommend */}
            <button
              type="button"
              onClick={() => {
                setTargetIntentChoice('ai_recommend')
                handleChange('target_role', 'auto')
              }}
              className={`rounded-2xl border p-5 text-left transition cursor-pointer ${
                targetIntentChoice === 'ai_recommend'
                  ? 'border-slate-900 bg-slate-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-400'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-lg mb-3 shadow-xs">
                ✨
              </div>
              <h4 className="font-extrabold text-slate-900 text-base">Let AI Recommend Best Fit</h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                The XAI decision engine will analyze your credentials across all job profiles in the market and identify your highest affinity track.
              </p>
            </button>

            {/* Card 2: Specific Role */}
            <button
              type="button"
              onClick={() => {
                setTargetIntentChoice('specific')
                if (!input.target_role || input.target_role === 'auto') {
                  handleChange('target_role', activeDomain.roleSuggestions[0] || CAREER_TARGET_ROLES[1].id)
                }
              }}
              className={`rounded-2xl border p-5 text-left transition cursor-pointer ${
                targetIntentChoice === 'specific'
                  ? 'border-slate-900 bg-slate-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-400'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 text-white flex items-center justify-center font-extrabold text-lg mb-3 shadow-xs">
                🎯
              </div>
              <h4 className="font-extrabold text-slate-900 text-base">I Have a Specific Target Role</h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Benchmark your profile directly against a specific job title to calculate role match affinity, SHAP attribution, and core skill gaps.
              </p>
            </button>
          </div>

          {/* Role Dropdown if Specific Role selected */}
          {targetIntentChoice === 'specific' && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mt-3">
              <label className="text-xs font-bold text-slate-900 block">
                Select or Enter Target Role Position:
              </label>
              <select
                value={input.target_role || ''}
                onChange={(e) => handleChange('target_role', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none transition focus:border-slate-900"
              >
                {CAREER_TARGET_ROLES.filter((r) => r.id !== 'auto').map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label} — {role.desc}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(5)}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              Review &amp; Run Engine &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW & RUN EXPLAINABLE ENGINE */}
      {step === 5 && (
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="text-center max-w-xl mx-auto mb-4">
            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2 border border-slate-200">
              Step 5 of 5: XAI Attribution Review
            </span>
            <h3 className="text-xl font-extrabold text-slate-900">Run Decision XAI Engine</h3>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Your profile evidence, stage context, and target intent are ready for explainable attribution.
            </p>
          </div>

          {/* Review Summary Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Configured Profile Summary</span>
                <h4 className="text-base font-extrabold text-white mt-0.5">{activePersona.label} &bull; {activeDomain.label}</h4>
              </div>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
              >
                Edit Details ✎
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Academic Score</span>
                <span className="font-bold text-white">{input.raw_score || input.cgpa || '8.0'} ({scoreType})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Degree &amp; Major</span>
                <span className="font-bold text-white">{input.course || 'B.Tech'} ({input.specialization || 'General'})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Skills Count</span>
                <span className="font-bold text-emerald-400">{Array.isArray(input.skills) ? input.skills.length : (input.skills || '').split(',').length} Skills</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Target Intent</span>
                <span className="font-bold text-sky-400 line-clamp-1">{input.target_role === 'auto' ? 'AI Recommended Best Fit' : input.target_role || input.interest}</span>
              </div>
            </div>
          </div>

          {/* Field Errors Alert in Step 5 */}
          {Object.keys(fieldErrors).length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center justify-between">
              <span>⚠️ Validation Alert: {Object.values(fieldErrors).join(' ')}</span>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs font-extrabold underline text-rose-950 hover:text-rose-700 cursor-pointer"
              >
                Edit Step 3 Inputs &rarr;
              </button>
            </div>
          )}

          {/* Primary Submit Action */}
          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-500 px-8 py-3 text-sm font-extrabold uppercase tracking-wider text-white shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Running Explainable Decision Engine...</span>
              ) : (
                <>
                  <span>Run Explainable Decision Engine</span>
                  <span className="text-lg">&rarr;</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}


