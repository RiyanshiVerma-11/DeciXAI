import React, { useState, useEffect } from 'react'
import { simulateCareerWhatIf } from '../../api'

const QUICK_SKILLS = [
  'Docker', 'Kubernetes', 'FastAPI', 'AWS', 'PostgreSQL',
  'Redis', 'System Design', 'PyTorch', 'CI/CD', 'Microservices',
]

const FRONTEND_OPTIONS = ['React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Flutter', 'React Native', 'HTML/CSS/JS']
const BACKEND_OPTIONS  = ['FastAPI', 'Django', 'Node.js/Express', 'Spring Boot', 'Flask', 'Go/Gin', 'NestJS', 'Laravel']
const DATABASE_OPTIONS = ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Supabase', 'Firebase', 'SQLite', 'Cassandra']

const BLANK_DRAFT = {
  title: '',
  githubUrl: '',
  description: '',
  frontend: '',
  backend: '',
  database: '',
  inputMode: 'manual', // 'manual' | 'github'
}

// ─── Inline Project Form ────────────────────────────────────────────────────
function InlineProjectForm({ draft, onChange, onAdd, onCancel, isEditing }) {
  const [errors, setErrors] = useState({})
  const wordCount = draft.description.trim().split(/\s+/).filter(Boolean).length

  const set = (key, val) => {
    onChange({ ...draft, [key]: val })
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const errs = {}
    if (!draft.title.trim()) errs.title = 'Project name is required'
    if (draft.inputMode === 'manual' && wordCount < 5)
      errs.description = 'Describe your project (min 5 words)'
    if (draft.inputMode === 'github' && !draft.githubUrl.trim())
      errs.githubUrl = 'Enter a GitHub repository URL'
    if (draft.inputMode === 'github' && draft.githubUrl.trim() && !draft.githubUrl.includes('github.com'))
      errs.githubUrl = 'Must be a valid github.com URL'
    return errs
  }

  const handleAdd = () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onAdd(draft)
    setErrors({})
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/80 to-cyan-50/60 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">

      {/* Row 1: Title */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
          Project Name *
        </label>
        <input
          type="text"
          value={draft.title}
          onChange={e => set('title', e.target.value)}
          placeholder="e.g. AI-Powered Resume Screener, Fraud Detection API..."
          className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 bg-white transition ${
            errors.title ? 'border-rose-400' : 'border-slate-200 focus:border-blue-400'
          }`}
        />
        {errors.title && <p className="mt-1 text-[11px] text-rose-600 font-semibold">{errors.title}</p>}
      </div>

      {/* Row 2: Input mode toggle */}
      <div className="flex items-center gap-1.5 rounded-xl bg-white/70 border border-slate-200 p-1 w-fit">
        <button
          type="button"
          onClick={() => set('inputMode', 'manual')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
            draft.inputMode === 'manual'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          ✏️ Write Description
        </button>
        <button
          type="button"
          onClick={() => set('inputMode', 'github')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            draft.inputMode === 'github'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub URL
        </button>
      </div>

      {/* Row 3: Manual description OR GitHub URL */}
      {draft.inputMode === 'manual' ? (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              What did you build? *
            </label>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
              wordCount < 5 ? 'text-rose-600 bg-rose-50 border-rose-200'
              : wordCount <= 1000 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-amber-700 bg-amber-50 border-amber-200'
            }`}>
              {wordCount} words
            </span>
          </div>
          <textarea
            rows={3}
            value={draft.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Problem you solved, your approach, key features, measurable impact (e.g. reduced latency by 40%, handles 10k req/sec)..."
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 bg-white leading-relaxed transition ${
              errors.description ? 'border-rose-400' : 'border-slate-200 focus:border-blue-400'
            }`}
          />
          {errors.description && <p className="mt-1 text-[11px] text-rose-600 font-semibold">{errors.description}</p>}
        </div>
      ) : (
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
            GitHub Repository URL *
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </span>
              <input
                type="url"
                value={draft.githubUrl}
                onChange={e => set('githubUrl', e.target.value)}
                placeholder="https://github.com/username/repo-name"
                className={`w-full rounded-xl border pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 bg-white transition ${
                  errors.githubUrl ? 'border-rose-400' : 'border-slate-200 focus:border-slate-400'
                }`}
              />
            </div>
          </div>
          {errors.githubUrl
            ? <p className="mt-1 text-[11px] text-rose-600 font-semibold">{errors.githubUrl}</p>
            : <p className="mt-1 text-[10px] text-slate-400">AI will analyze your README, tech stack & description from the repo</p>
          }
        </div>
      )}

      {/* Row 4: Tech Stack */}
      <div className="space-y-3 rounded-xl border border-blue-100 bg-white/60 p-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Tech Stack</span>

        {/* Frontend */}
        <div>
          <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">Frontend</span>
          <div className="flex flex-wrap gap-1.5">
            {FRONTEND_OPTIONS.map(opt => (
              <button key={opt} type="button"
                onClick={() => set('frontend', draft.frontend === opt ? '' : opt)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition border cursor-pointer ${
                  draft.frontend === opt
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                }`}
              >{opt}</button>
            ))}
          </div>
        </div>

        {/* Backend */}
        <div>
          <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">Backend</span>
          <div className="flex flex-wrap gap-1.5">
            {BACKEND_OPTIONS.map(opt => (
              <button key={opt} type="button"
                onClick={() => set('backend', draft.backend === opt ? '' : opt)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition border cursor-pointer ${
                  draft.backend === opt
                    ? 'bg-cyan-600 text-white border-cyan-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300 hover:text-cyan-700'
                }`}
              >{opt}</button>
            ))}
          </div>
        </div>

        {/* Database */}
        <div>
          <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">Database</span>
          <div className="flex flex-wrap gap-1.5">
            {DATABASE_OPTIONS.map(opt => (
              <button key={opt} type="button"
                onClick={() => set('database', draft.database === opt ? '' : opt)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition border cursor-pointer ${
                  draft.database === opt
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700'
                }`}
              >{opt}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 5: Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-1.5 text-xs font-bold text-white hover:from-blue-700 hover:to-cyan-700 transition shadow-sm cursor-pointer"
        >
          {isEditing ? 'Save Changes' : '+ Add to Simulation'}
        </button>
      </div>
    </div>
  )
}

// ─── Saved Project Pill ─────────────────────────────────────────────────────
function ProjectPill({ project, index, onEdit, onRemove }) {
  const techStack = [project.frontend, project.backend, project.database].filter(Boolean)
  const isGithub = project.inputMode === 'github' && project.githubUrl

  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3">
      <div className="flex-shrink-0 h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-[11px] font-black">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-900 text-sm truncate">{project.title}</div>
        {isGithub ? (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
            onClick={e => e.stopPropagation()}
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            {project.githubUrl.replace('https://github.com/', 'github.com/')}
          </a>
        ) : (
          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 leading-relaxed">
            {project.description}
          </div>
        )}
        {techStack.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {techStack.map(t => (
              <span key={t} className="rounded bg-white border border-blue-200 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button type="button" onClick={() => onEdit(index)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-blue-600 transition cursor-pointer" title="Edit">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button type="button" onClick={() => onRemove(index)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer" title="Remove">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function WhatIfSimulator({ candidateProfile, onApplyToForm }) {
  const baseProfile = candidateProfile || {}

  const [selectedSkills, setSelectedSkills]     = useState([])
  const [capstoneProjects, setCapstoneProjects] = useState([])
  const [addedCerts, setAddedCerts]             = useState(0)
  const [cgpaDelta, setCgpaDelta]               = useState(0.0)

  // Inline form state
  const [showForm, setShowForm]           = useState(false)
  const [editingIdx, setEditingIdx]       = useState(null) // null = new, number = editing
  const [draft, setDraft]                 = useState(BLANK_DRAFT)

  // Simulation state
  const [loading, setLoading]             = useState(false)
  const [simulationData, setSimulationData] = useState(null)

  // Auto-simulate on any change
  useEffect(() => {
    let isCurrent = true
    const run = async () => {
      setLoading(true)
      try {
        const projectDescriptions = capstoneProjects.map(p => {
          const tech = [p.frontend, p.backend, p.database].filter(Boolean).join(', ')
          if (p.inputMode === 'github' && p.githubUrl)
            return `${p.title} [GitHub: ${p.githubUrl}]${tech ? ` (${tech})` : ''}`
          return `${p.title}${tech ? ` (${tech})` : ''}: ${p.description}`
        })

        const res = await simulateCareerWhatIf({
          baseline_input: baseProfile,
          modifications: {
            added_skills: selectedSkills,
            added_projects: projectDescriptions,
            added_certs: addedCerts > 0 ? Array(addedCerts).fill('Cloud / Architecture Certification') : [],
            cgpa_delta: cgpaDelta,
          },
        })
        if (isCurrent) setSimulationData(res)
      } catch { /* fallback displayed */ } finally {
        if (isCurrent) setLoading(false)
      }
    }
    const t = setTimeout(run, 400)
    return () => { isCurrent = false; clearTimeout(t) }
  }, [baseProfile, selectedSkills, capstoneProjects, addedCerts, cgpaDelta])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleSkill = s =>
    setSelectedSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])

  const openNewForm = () => {
    setEditingIdx(null)
    setDraft(BLANK_DRAFT)
    setShowForm(true)
  }

  const openEditForm = idx => {
    setEditingIdx(idx)
    setDraft({ ...capstoneProjects[idx] })
    setShowForm(true)
  }

  const handleSave = projectData => {
    if (editingIdx !== null) {
      setCapstoneProjects(p => p.map((x, i) => i === editingIdx ? projectData : x))
    } else {
      setCapstoneProjects(p => [...p, projectData])
    }
    setShowForm(false)
    setEditingIdx(null)
    setDraft(BLANK_DRAFT)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingIdx(null)
    setDraft(BLANK_DRAFT)
  }

  const handleRemove = idx => {
    setCapstoneProjects(p => p.filter((_, i) => i !== idx))
    if (showForm && editingIdx === idx) handleCancel()
  }

  const handleReset = () => {
    setSelectedSkills([])
    setCapstoneProjects([])
    setAddedCerts(0)
    setCgpaDelta(0.0)
    handleCancel()
  }

  const baseProb  = simulationData?.baseline_probability ?? 0.62
  const simProb   = simulationData?.simulated_probability ?? 0.62
  const deltaPct  = simulationData?.delta_percentage ?? '+0.0%'
  const isPositive = (simulationData?.delta_probability || 0) >= 0

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 sm:p-7 shadow-xl shadow-slate-200/50 backdrop-blur-md">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-0.5 text-[11px] font-bold text-cyan-700 border border-cyan-200 mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
            Counterfactual Explainability
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <svg className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            'What-If' Career Pivot Simulator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Inject skills, capstones, and credentials to test real-time hiring probability deltas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleReset}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer">
            Reset All
          </button>
          {onApplyToForm && simulationData?.simulated_profile && (
            <button type="button" onClick={() => onApplyToForm(simulationData.simulated_profile)}
              className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm cursor-pointer">
              Apply to Profile
            </button>
          )}
        </div>
      </div>

      {/* ── Two Column Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: Controls */}
        <div className="lg:col-span-7 space-y-6">

          {/* Skills */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Inject Missing High-Impact Skills
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_SKILLS.map(skill => {
                const on = selectedSkills.includes(skill)
                return (
                  <button key={skill} type="button" onClick={() => toggleSkill(skill)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      on
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}>
                    <span>{on ? '✓' : '+'}</span>
                    <span>{skill}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Capstone Projects ──────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Capstone Projects
                <span className="ml-2 rounded-full bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 text-[11px]">
                  {capstoneProjects.length}
                </span>
              </label>
              {/* Show "+ Add" only when 1+ projects saved and form is hidden */}
              {!showForm && capstoneProjects.length > 0 && capstoneProjects.length < 3 && (
                <button type="button" onClick={openNewForm}
                  className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm cursor-pointer">
                  + Add Project
                </button>
              )}
            </div>

            {/* Saved project pills */}
            {capstoneProjects.map((proj, idx) => (
              <ProjectPill
                key={idx}
                project={proj}
                index={idx}
                onEdit={openEditForm}
                onRemove={handleRemove}
              />
            ))}

            {/* Inline form — always visible when no project exists, or when editing/adding */}
            {capstoneProjects.length === 0 && !showForm ? (
              /* Empty state: form is embedded directly — no extra click needed */
              <InlineProjectForm
                draft={draft}
                onChange={setDraft}
                onAdd={handleSave}
                onCancel={null}
                isEditing={false}
              />
            ) : showForm ? (
              <InlineProjectForm
                draft={draft}
                onChange={setDraft}
                onAdd={handleSave}
                onCancel={handleCancel}
                isEditing={editingIdx !== null}
              />
            ) : capstoneProjects.length < 3 ? (
              <button type="button" onClick={openNewForm}
                className="w-full rounded-xl border border-dashed border-blue-300 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer">
                + Add Another Project ({capstoneProjects.length}/3)
              </button>
            ) : null}
          </div>

          {/* ── Sliders ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Certifications */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Add Cloud Certifications</span>
                <span className="text-indigo-600 font-extrabold font-mono text-sm">+{addedCerts}</span>
              </div>
              <input type="range" min="0" max="2" step="1" value={addedCerts}
                onChange={e => setAddedCerts(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"/>
              <span className="text-[10px] text-slate-400 block mt-1">AWS / GCP / CKA credentials</span>
            </div>

            {/* CGPA */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Academic Standing Delta</span>
                <span className={`font-mono text-sm font-extrabold ${
                  cgpaDelta > 0 ? 'text-emerald-600' : cgpaDelta < 0 ? 'text-rose-600' : 'text-slate-600'
                }`}>
                  {cgpaDelta > 0 ? `+${cgpaDelta.toFixed(1)}` : cgpaDelta.toFixed(1)}
                </span>
              </div>
              <input type="range" min="-1.5" max="1.5" step="0.1" value={cgpaDelta}
                onChange={e => setCgpaDelta(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"/>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>-1.5</span>
                <span>Baseline ({baseProfile?.cgpa || 8.5})</span>
                <span>+1.5</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Gauge + Waterfall */}
        <div className="lg:col-span-5 space-y-4">

          {/* Probability Card */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-5 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Simulated Match Probability
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                    {(simProb * 100).toFixed(0)}%
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    (from {(baseProb * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold font-mono ${
                  isPositive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {deltaPct}
                </div>
              </div>

              <div className="mt-4 h-2.5 w-full rounded-full bg-slate-700/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, simProb * 100))}%` }}
                />
              </div>

              {/* Project badges in card */}
              {capstoneProjects.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {capstoneProjects.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                      {p.inputMode === 'github' ? (
                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                      ) : '🚀'}
                      {p.title.length > 16 ? p.title.slice(0, 16) + '…' : p.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SHAP Waterfall */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
              <span>Attribution Waterfall (SHAP Delta)</span>
              {loading && <span className="text-[10px] text-blue-600 font-semibold animate-pulse">Calculating...</span>}
            </h3>
            {simulationData?.waterfall?.length > 0 ? (
              <div className="space-y-2">
                {simulationData.waterfall.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 p-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{item.factor}</span>
                      <span className="text-[10px] text-slate-400">{item.description}</span>
                    </div>
                    <span className="font-mono font-extrabold text-emerald-600 shrink-0 ml-2">
                      +{Math.round(item.delta * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                Toggle skills or add a project to see individual impact.
              </p>
            )}
          </div>

          {/* Optimal Recommendations */}
          {simulationData?.optimal_recommendations?.length > 0 && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-2">
                🚀 Minimum Pivot to Reach 90%+
              </span>
              <ul className="space-y-1.5">
                {simulationData.optimal_recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-amber-900 font-medium flex items-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5"/>
                    <div>
                      <span>{rec.action}</span>
                      <span className="ml-1 text-[11px] font-mono font-bold text-amber-700">({rec.estimated_uplift})</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
