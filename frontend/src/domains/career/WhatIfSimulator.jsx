import React, { useState, useEffect } from 'react'
import { simulateCareerWhatIf } from '../../api'
import { CAREER_PERSONAS, CAREER_PARENT_DOMAINS } from './careerConfig'

const DOMAIN_CAPSTONE_PRESETS = {
  legal: {
    focusLabel: 'Legal Deliverable / Focus Area',
    focusOptions: [
      'Compliance Audit Protocol',
      'Cross-Border Contract Drafting',
      'GDPR & Data Privacy Impact Assessment',
      'Regulatory Risk Assessment',
      'M&A Legal Due Diligence Report',
      'Cyber Law & IP Case Synthesis',
    ],
    toolLabel: 'Regulatory Framework & Focus',
    toolOptions: [
      'GDPR / Data Privacy (CIPP/E)',
      'Corporate Governance Codes',
      'Cross-Border Regulatory Compliance',
      'Contract Drafting & Negotiation',
      'Risk Scoring Matrix',
      'Statutory Compliance Protocol',
    ],
    placeholder: 'Problem addressed, regulatory frameworks/laws analyzed, key legal findings, measurable outcome (e.g. eliminated 4 key compliance liabilities, standard protocol adopted across 2 departments)...',
    linkPlaceholder: 'https://drive.google.com/... or portfolio/dossier URL',
    linkLabel: 'Case Study / Dossier Link',
  },
  finance: {
    focusLabel: 'Financial Model / Deliverable',
    focusOptions: [
      'LBO & DCF Valuation Model',
      'Credit Risk Scoring Engine',
      'Algorithmic Portfolio Rebalancer',
      'Financial Statement Forecasting',
      'M&A Synergies Valuation Deck',
      'Equity Research Note',
    ],
    toolLabel: 'Financial Tooling & Methodology',
    toolOptions: [
      'Excel (Advanced VBA)',
      'Python (Pandas/NumPy)',
      'DCF & Multiple Valuation',
      'Monte Carlo Simulation',
      'Financial Modeling & Risk Analytics',
      'SQL Financial Queries',
    ],
    placeholder: 'Investment hypothesis, valuation methodology (DCF/LBO), key financial drivers, measurable result (e.g. modeled 15% IRR across 3 macro stress scenarios)...',
    linkPlaceholder: 'https://github.com/... or financial model link',
    linkLabel: 'Model / Report Link',
  },
  strategy: {
    focusLabel: 'Product / Strategy Deliverable',
    focusOptions: [
      'Product Requirement Document (PRD)',
      'Market Entry & Sizing Case Study',
      'B2B SaaS Growth & Churn Audit',
      'Competitive Moat Teardown',
      'Unit Economics Optimization Model',
    ],
    toolLabel: 'Strategy Framework / Tooling',
    toolOptions: [
      'Mixpanel / GA4 Analytics',
      'Agile & Scrum Specs',
      'Customer Journey Mapping',
      'TAM / SAM / SOM Sizing',
      'A/B Test Design & Evaluation',
      'Figma Wireframing',
    ],
    placeholder: 'Target user problem, market sizing, strategic roadmap, quantifiable impact (e.g. hypothesized 22% uplift in onboarding activation rate)...',
    linkPlaceholder: 'https://notion.so/... or PRD document link',
    linkLabel: 'PRD / Strategy Deck Link',
  },
  design: {
    focusLabel: 'Design Deliverable / Artifact',
    focusOptions: [
      'Design System & Component Tokens',
      'Mobile App UX Redesign & Usability Audit',
      'Interactive High-Fidelity Prototype',
      'WCAG 2.1 Accessibility Audit',
      'SaaS Dashboard Information Architecture',
    ],
    toolLabel: 'Design Tooling / Methodology',
    toolOptions: [
      'Figma Design Systems',
      'User Testing (5-User Cohort)',
      'Interactive Prototyping',
      'Design Tokens',
      'WCAG Accessibility Standards',
      'Micro-interactions',
    ],
    placeholder: 'User pain point, research insights, design iterations, usability testing metrics (e.g. reduced task completion time by 45%, WCAG AAA compliance)...',
    linkPlaceholder: 'https://figma.com/... or portfolio URL',
    linkLabel: 'Figma / Portfolio Link',
  },
  marketing: {
    focusLabel: 'Marketing / Growth Campaign',
    focusOptions: [
      'SaaS Organic Growth & SEO Audit',
      'Multi-Channel Funnel CRO Experiment',
      'Brand Positioning & Content Playbook',
      'Paid Acquisition Ad Optimization Suite',
    ],
    toolLabel: 'Marketing Stack / Methodology',
    toolOptions: [
      'Google Analytics 4 (GA4)',
      'HubSpot & CRM Automation',
      'SEO / Ahrefs Audit',
      'A/B Testing Experiments',
      'Funnel Analytics & CAC/LTV Modeling',
    ],
    placeholder: 'Acquisition challenge, channel strategy, creative & targeting framework, measurable growth (e.g. 3.2x organic demo signups, -28% CAC)...',
    linkPlaceholder: 'https://notion.so/... or campaign report link',
    linkLabel: 'Campaign Report Link',
  },
  engineering: {
    focusLabel: 'Frontend / UI Stack',
    focusOptions: ['React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Flutter', 'React Native', 'HTML/CSS/JS'],
    toolLabel: 'Backend & APIs',
    toolOptions: ['FastAPI', 'Django', 'Node.js/Express', 'Spring Boot', 'Flask', 'Go/Gin', 'NestJS', 'Laravel'],
    dbLabel: 'Database & Storage',
    dbOptions: ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Supabase', 'Firebase', 'SQLite', 'Cassandra'],
    placeholder: 'Problem you solved, your approach, key features, measurable impact (e.g. reduced latency by 40%, handles 10k req/sec)...',
    linkPlaceholder: 'https://github.com/username/repo-name',
    linkLabel: 'GitHub Repository URL',
  },
}

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
function InlineProjectForm({ draft, onChange, onAdd, onCancel, isEditing, activeDomain }) {
  const [errors, setErrors] = useState({})
  const wordCount = draft.description.trim().split(/\s+/).filter(Boolean).length
  const domainId = activeDomain?.id || 'engineering'
  const isTechDomain = domainId === 'engineering'
  const preset = DOMAIN_CAPSTONE_PRESETS[domainId] || DOMAIN_CAPSTONE_PRESETS.engineering

  const set = (key, val) => {
    onChange({ ...draft, [key]: val })
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }))
  }

  const validate = () => {
    const errs = {}
    if (!draft.title.trim()) errs.title = 'Project / Deliverable name is required'
    if (draft.inputMode === 'manual' && wordCount < 4)
      errs.description = 'Describe your deliverable / case study (min 4 words)'
    if (draft.inputMode === 'github' && !draft.githubUrl.trim())
      errs.githubUrl = isTechDomain ? 'Enter a GitHub repository URL' : 'Enter a portfolio, case study, or document URL'
    if (draft.inputMode === 'github' && draft.githubUrl.trim() && isTechDomain && !draft.githubUrl.includes('github.com'))
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
          {isTechDomain ? 'Project Name *' : 'Deliverable / Project Title *'}
        </label>
        <input
          type="text"
          value={draft.title}
          onChange={e => set('title', e.target.value)}
          placeholder={
            domainId === 'legal'
              ? 'e.g. SaaS GDPR Compliance Audit Protocol, Cross-Border M&A Due Diligence...'
              : domainId === 'finance'
              ? 'e.g. LBO & DCF Valuation Model, Credit Risk Assessment Engine...'
              : domainId === 'design'
              ? 'e.g. Design System Component Library, Fintech App UX Redesign...'
              : domainId === 'strategy'
              ? 'e.g. B2B SaaS Growth & Churn PRD, Market Entry Strategy Case Study...'
              : 'e.g. AI-Powered Resume Screener, Real-Time Fraud Detection Pipeline...'
          }
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
          ✏️ {isTechDomain ? 'Write Description' : 'Write Case Study Summary'}
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
          {isTechDomain ? (
            <>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub URL
            </>
          ) : (
            <>
              <span>🔗</span>
              {preset.linkLabel || 'Case Study Link'}
            </>
          )}
        </button>
      </div>

      {/* Row 3: Manual description OR GitHub/Dossier URL */}
      {draft.inputMode === 'manual' ? (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {isTechDomain ? 'What did you build? *' : 'Methodology & Outcomes Achieved *'}
            </label>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
              wordCount < 4 ? 'text-rose-600 bg-rose-50 border-rose-200'
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
            placeholder={preset.placeholder}
            className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 bg-white leading-relaxed transition ${
              errors.description ? 'border-rose-400' : 'border-slate-200 focus:border-blue-400'
            }`}
          />
          {errors.description && <p className="mt-1 text-[11px] text-rose-600 font-semibold">{errors.description}</p>}
        </div>
      ) : (
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
            {preset.linkLabel || 'URL / Artifact Link *'}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                {isTechDomain ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                ) : (
                  <span>🔗</span>
                )}
              </span>
              <input
                type="url"
                value={draft.githubUrl}
                onChange={e => set('githubUrl', e.target.value)}
                placeholder={preset.linkPlaceholder}
                className={`w-full rounded-xl border pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 bg-white transition ${
                  errors.githubUrl ? 'border-rose-400' : 'border-slate-200 focus:border-slate-400'
                }`}
              />
            </div>
          </div>
          {errors.githubUrl
            ? <p className="mt-1 text-[11px] text-rose-600 font-semibold">{errors.githubUrl}</p>
            : <p className="mt-1 text-[10px] text-slate-400">AI will evaluate the scope, tooling, and measurable outcomes in the simulation</p>
          }
        </div>
      )}

      {/* Row 4: Domain-Specific Deliverables & Tools */}
      <div className="space-y-3 rounded-xl border border-blue-100 bg-white/60 p-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
          {isTechDomain ? 'Tech Stack Components' : `${activeDomain?.label || 'Domain'} Focus & Tooling`}
        </span>

        {/* Section 1: Focus / Frontend */}
        <div>
          <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
            {preset.focusLabel}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {preset.focusOptions.map(opt => (
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

        {/* Section 2: Tools / Backend */}
        <div>
          <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">
            {preset.toolLabel}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {preset.toolOptions.map(opt => (
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

        {/* Section 3: Database (Tech only) */}
        {isTechDomain && preset.dbOptions && (
          <div>
            <span className="block text-[11px] font-semibold text-slate-600 mb-1.5">{preset.dbLabel}</span>
            <div className="flex flex-wrap gap-1.5">
              {preset.dbOptions.map(opt => (
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
        )}
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
  const tags = [project.frontend, project.backend, project.database].filter(Boolean)
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
            <span className="truncate">{project.githubUrl}</span>
          </a>
        ) : (
          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 leading-relaxed">
            {project.description}
          </div>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {tags.map(t => (
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
export default function WhatIfSimulator({
  candidateProfile,
  targetRole,
  skillGaps = [],
  onApplyToForm,
}) {
  const baseProfile = candidateProfile || {}

  // 1. Identify active candidate persona
  const activePersona =
    CAREER_PERSONAS.find(p => p.id === baseProfile.persona) ||
    CAREER_PERSONAS.find(p => {
      const exp = Number(baseProfile.experience_years || 0)
      if (exp >= 2) return p.id === 'professional'
      if (exp > 0) return p.id === 'graduate'
      return p.id === 'student'
    }) ||
    CAREER_PERSONAS[0]

  // 2. Identify active parent domain
  const courseStr = String(baseProfile.course || '').toLowerCase()
  const specStr = String(baseProfile.specialization || '').toLowerCase()
  const interestStr = String(targetRole || baseProfile.interest || '').toLowerCase()
  const domainKey = String(baseProfile.domain || baseProfile.interest_domain || '').toLowerCase()

  const activeDomain =
    CAREER_PARENT_DOMAINS.find(d => d.id === domainKey) ||
    CAREER_PARENT_DOMAINS.find(d => {
      if (domainKey && domainKey.includes(d.id)) return true
      if (d.id === 'legal' && (courseStr.includes('llb') || courseStr.includes('law') || interestStr.includes('law') || interestStr.includes('legal') || interestStr.includes('compliance') || specStr.includes('law'))) return true
      if (d.id === 'finance' && (courseStr.includes('b.com') || courseStr.includes('bcom') || courseStr.includes('cfa') || interestStr.includes('finance') || interestStr.includes('banking') || interestStr.includes('valuation') || specStr.includes('finance'))) return true
      if (d.id === 'strategy' && (interestStr.includes('product') || interestStr.includes('consulting') || interestStr.includes('strategy') || specStr.includes('product') || specStr.includes('strategy'))) return true
      if (d.id === 'design' && (courseStr.includes('des') || interestStr.includes('design') || interestStr.includes('ux') || interestStr.includes('ui') || specStr.includes('design'))) return true
      if (d.id === 'marketing' && (interestStr.includes('marketing') || interestStr.includes('seo') || interestStr.includes('growth') || specStr.includes('marketing'))) return true
      return false
    }) ||
    CAREER_PARENT_DOMAINS[0]

  // 3. Dynamic High-Impact Skill suggestions tailored to roadmap and domain
  const existingSkills = new Set(
    (baseProfile.skills || []).map(s => String(s).toLowerCase().trim())
  )

  const candidateGaps = (skillGaps || []).filter(
    s => s && !existingSkills.has(String(s).toLowerCase().trim())
  )

  const domainSkills = (activeDomain?.skillSuggestions || []).filter(
    s => s && !existingSkills.has(String(s).toLowerCase().trim())
  )

  const availableQuickSkills = Array.from(
    new Set([...candidateGaps, ...domainSkills])
  ).slice(0, 12)

  // 4. Certifications copy by domain
  const certConfig = {
    legal: {
      label: 'Add Legal & Compliance Credentials',
      hint: 'CIPP/E, Bar Certification, Regulatory Compliance Audit credentials',
      defaultCertName: 'CIPP/E & Regulatory Compliance Certification',
    },
    finance: {
      label: 'Add Financial Credentials',
      hint: 'CFA Level 1/2, FRM, FINRA / Valuation credentials',
      defaultCertName: 'CFA / Financial Risk Certification',
    },
    strategy: {
      label: 'Add Product & Strategy Credentials',
      hint: 'CSPO, PMP, Scrum Master, Product Leadership credentials',
      defaultCertName: 'CSPO / PMP Strategic Leadership Certification',
    },
    design: {
      label: 'Add Design Credentials',
      hint: 'Nielsen Norman Group UX, Google UX Design, WCAG Specialist credentials',
      defaultCertName: 'Advanced UX / Design Systems Certification',
    },
    marketing: {
      label: 'Add Growth & Analytics Credentials',
      hint: 'Google Analytics 4, HubSpot Inbound, Meta Performance Marketing credentials',
      defaultCertName: 'Growth Analytics & Inbound Certification',
    },
    engineering: {
      label: 'Add Cloud / Architecture Credentials',
      hint: 'AWS / GCP / CKA / System Architecture credentials',
      defaultCertName: 'Cloud / Architecture Certification',
    },
  }[activeDomain.id] || {
    label: 'Add Industry Certifications',
    hint: 'Domain-aligned professional credentials',
    defaultCertName: 'Professional Domain Certification',
  }

  const [selectedSkills, setSelectedSkills]     = useState([])
  const [capstoneProjects, setCapstoneProjects] = useState([])
  const [addedCerts, setAddedCerts]             = useState(0)
  const [cgpaDelta, setCgpaDelta]               = useState(0.0)

  // Inline form state
  const [showForm, setShowForm]           = useState(false)
  const [editingIdx, setEditingIdx]       = useState(null)
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
          const tags = [p.frontend, p.backend, p.database].filter(Boolean).join(', ')
          if (p.inputMode === 'github' && p.githubUrl)
            return `${p.title} [URL: ${p.githubUrl}]${tags ? ` (${tags})` : ''}`
          return `${p.title}${tags ? ` (${tags})` : ''}: ${p.description}`
        })

        const res = await simulateCareerWhatIf({
          baseline_input: baseProfile,
          modifications: {
            added_skills: selectedSkills,
            added_projects: projectDescriptions,
            added_certs: addedCerts > 0 ? Array(addedCerts).fill(certConfig.defaultCertName) : [],
            cgpa_delta: cgpaDelta,
          },
        })
        if (isCurrent) setSimulationData(res)
      } catch { /* fallback */ } finally {
        if (isCurrent) setLoading(false)
      }
    }
    const t = setTimeout(run, 400)
    return () => { isCurrent = false; clearTimeout(t) }
  }, [baseProfile, selectedSkills, capstoneProjects, addedCerts, cgpaDelta, certConfig.defaultCertName])

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

      {/* ── Active Candidate Persona Context Banner (Never Disappears!) ── */}
      <div className="mb-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-4 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-white bg-gradient-to-r ${activePersona.color} shadow-sm shrink-0`}>
              <span className="text-base font-black">
                {activePersona.id === 'student' ? '🎓' : activePersona.id === 'graduate' ? '🎯' : '💼'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-extrabold text-white">
                  {activePersona.label}
                </span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-300 border border-white/15">
                  {activeDomain.label}
                </span>
                {targetRole && (
                  <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-cyan-200 border border-cyan-400/30">
                    Target: {targetRole}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-300 mt-1 flex items-center gap-3 flex-wrap font-medium">
                {baseProfile.course && (
                  <span>Degree: <strong className="text-white font-bold">{baseProfile.course}</strong></span>
                )}
                {baseProfile.specialization && (
                  <span>• Specialization: <strong className="text-white font-bold">{baseProfile.specialization}</strong></span>
                )}
                <span>• Baseline Score: <strong className="text-white font-bold">{baseProfile.cgpa || 8.5}</strong></span>
                <span>• Existing Skills: <strong className="text-white font-bold">{(baseProfile.skills || []).length}</strong></span>
                <span>• Current Projects: <strong className="text-white font-bold">{(baseProfile.projects || []).length}</strong></span>
              </div>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Simulation Mode</span>
            <span className="text-xs font-mono font-extrabold text-emerald-400 flex items-center gap-1.5 justify-end mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Persona Calibration
            </span>
          </div>
        </div>
      </div>

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
            Inject skills, capstones, and credentials tailored to <strong className="text-slate-800">{activeDomain.label}</strong> to test real-time hiring probability deltas.
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Inject Missing High-Impact Skills
              </label>
              <span className="text-[11px] font-medium text-slate-500">
                Tailored for <strong className="text-blue-700">{activeDomain.label}</strong>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableQuickSkills.map(skill => {
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
                Capstone Projects & Deliverables
                <span className="ml-2 rounded-full bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 text-[11px]">
                  {capstoneProjects.length}
                </span>
              </label>
              {!showForm && capstoneProjects.length > 0 && capstoneProjects.length < 3 && (
                <button type="button" onClick={openNewForm}
                  className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition shadow-sm cursor-pointer">
                  + Add Deliverable
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

            {/* Inline form */}
            {capstoneProjects.length === 0 && !showForm ? (
              <InlineProjectForm
                draft={draft}
                onChange={setDraft}
                onAdd={handleSave}
                onCancel={null}
                isEditing={false}
                activeDomain={activeDomain}
              />
            ) : showForm ? (
              <InlineProjectForm
                draft={draft}
                onChange={setDraft}
                onAdd={handleSave}
                onCancel={handleCancel}
                isEditing={editingIdx !== null}
                activeDomain={activeDomain}
              />
            ) : capstoneProjects.length < 3 ? (
              <button type="button" onClick={openNewForm}
                className="w-full rounded-xl border border-dashed border-blue-300 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer">
                + Add Another Deliverable ({capstoneProjects.length}/3)
              </button>
            ) : null}
          </div>

          {/* ── Sliders ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Certifications (Domain-Adaptive) */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                <span className="truncate pr-2">{certConfig.label}</span>
                <span className="text-indigo-600 font-extrabold font-mono text-sm shrink-0">+{addedCerts}</span>
              </div>
              <input type="range" min="0" max="2" step="1" value={addedCerts}
                onChange={e => setAddedCerts(parseInt(e.target.value, 10))}
                className="w-full accent-indigo-600 cursor-pointer"/>
              <span className="text-[10px] text-slate-400 block mt-1 leading-tight">{certConfig.hint}</span>
            </div>

            {/* Academic Standing / CGPA */}
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
                      <span>📁</span>
                      {p.title.length > 18 ? p.title.slice(0, 18) + '…' : p.title}
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
