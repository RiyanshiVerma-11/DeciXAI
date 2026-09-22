import React, { useState } from 'react'
import DomainLayout from '../common/DomainLayout'
import DomainModeTabs from '../common/DomainModeTabs'
import FreePromptInput from '../common/FreePromptInput'
import CareerForm from './CareerForm'
import CareerResumeSection from './CareerResumeSection'
import ResumeAuditCard from '../../components/ResumeAuditCard'
import DecisionReport from '../../components/DecisionReport'
import InsightPanel from '../../components/InsightPanel'
import CompareModal from '../../components/CompareModal'
import WhatIfSimulator from './WhatIfSimulator'
import JobDescriptionMatcher from './JobDescriptionMatcher'
import MockInterviewStudio from './MockInterviewStudio'
import SprintRoadmap from './SprintRoadmap'
import CompensationEstimator from './CompensationEstimator'
import {
  CAREER_CONFIG,
  parseCareerPrompt,
  normalizeCareerPayload,
  validateCareerPayload,
} from './careerConfig'
import {
  submitCareer,
  submitCareerPrompt,
  uploadResume,
  downloadPdf,
  saveDecision,
} from '../../api'
import { useAuth } from '../../components/AuthContext'

const CAREER_TABS = [
  {
    id: 'decision',
    label: 'Decision & Explainability',
    badge: 'XAI',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'what-if',
    label: "'What-If' Simulator",
    badge: 'Live Pivot',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    id: 'jd-match',
    label: 'JD Matcher & Rewriter',
    badge: 'ATS Bullets',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'mock-interview',
    label: 'AI Mock Interview',
    badge: 'STAR Grader',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    id: 'roadmap',
    label: '90-Day Sprint Plan',
    badge: '12 Weeks',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'compensation',
    label: 'Salary & Skill ROI',
    badge: 'Market',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

const INITIAL_CAREER_INPUT = {
  cgpa: 8.5,
  score_type: 'cgpa_10',
  raw_score: 8.5,
  course: 'B.Tech',
  specialization: 'Computer Science',
  education_level: 'Undergraduate',
  year_of_study: 4,
  skills: ['Python', 'SQL', 'React', 'PyTorch'],
  certifications: ['AWS Cloud Practitioner'],
  projects: ['Decentralized Ledger System', 'Semantic Search Engine'],
  interest: 'Artificial Intelligence',
}

export default function CareerDomain() {
  const { user, token } = useAuth()
  const [mode, setMode] = useState('structured')
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(true)

  // Input states
  const [input, setInput] = useState(INITIAL_CAREER_INPUT)
  const [interactiveInput, setInteractiveInput] = useState(INITIAL_CAREER_INPUT)
  const [textPrompt, setTextPrompt] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Resume state
  const [resumeFile, setResumeFile] = useState(null)
  const [targetRole, setTargetRole] = useState('auto')
  const [customTargetRole, setCustomTargetRole] = useState('')
  const [resumeLoading, setResumeLoading] = useState(false)
  const [resumeStep, setResumeStep] = useState('')
  const [resumeData, setResumeData] = useState(null)

  // Evaluation & Explainability states
  const [result, setResult] = useState(null)
  const [resultInput, setResultInput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [liveUpdating, setLiveUpdating] = useState(false)
  const [error, setError] = useState(null)

  // Baseline comparison state
  const [pinnedInputs, setPinnedInputs] = useState(null)
  const [pinnedResult, setPinnedResult] = useState(null)
  const [isCompareOpen, setIsCompareOpen] = useState(false)

  // Career Accelerator Suite Active Tab
  const [acceleratorTab, setAcceleratorTab] = useState('decision')

  const handleApplySimulatedProfile = (simulatedProfile) => {
    if (!simulatedProfile) return
    setInput(simulatedProfile)
    syncInteractiveInput(simulatedProfile)
    setResultInput(simulatedProfile)
    setAcceleratorTab('decision')
    handleRecalculate()
  }

  const handleUpdateParsedInput = async (updatedInput) => {
    if (!updatedInput) return
    setInput(updatedInput)
    syncInteractiveInput(updatedInput)
    setResultInput(updatedInput)
    setLoading(true)
    setError(null)
    try {
      const normalized = normalizeCareerPayload(updatedInput)
      const res = await submitCareer(normalized)
      setResult(res)
      setResultInput(normalized)
    } catch (err) {
      setError(err.message || 'Re-evaluation failed.')
    } finally {
      setLoading(false)
    }
  }

  const syncInteractiveInput = (payload) => {
    const next = { ...payload }
    if (payload?.raw_score !== undefined && payload?.raw_score !== null) {
      next.cgpa = payload.raw_score
    }
    setInteractiveInput(next)
  }

  const handleApplyPreset = (preset) => {
    setInput(preset.data)
    setInteractiveInput(preset.data)
    setFieldErrors({})
  }

  const handleStructuredSubmit = async (e) => {
    if (e) e.preventDefault()
    setError(null)
    const normalized = normalizeCareerPayload(input)
    const errors = validateCareerPayload(normalized)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Validation Alert: ' + Object.values(errors).join(' '))
      return
    }

    setLoading(true)
    try {
      const res = await submitCareer(normalized)
      setResult(res)
      setResultInput(normalized)
      syncInteractiveInput(normalized)
      setIsWorkbenchOpen(false) // Collapse workbench to let results take center stage
    } catch (err) {
      setError(err.message || 'Analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  const handlePromptSubmit = async () => {
    if (!textPrompt.trim()) {
      setError('Please add a prompt describing your academic profile.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const parsed = parseCareerPrompt(textPrompt)
      const res = await submitCareerPrompt({ message: textPrompt })
      const nextInput = res.parsed_input || parsed
      setResult(res)
      setResultInput(nextInput)
      setInput(nextInput)
      syncInteractiveInput(nextInput)
      setIsWorkbenchOpen(false)
    } catch (err) {
      setError(err.message || 'NLP prompt evaluation failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleResumeSubmit = async (fileToUpload = resumeFile, roleOverride = null) => {
    const file = fileToUpload || resumeFile
    if (!file) {
      setError('Please select or upload a resume file first.')
      return
    }
    setResumeFile(file)
    setError(null)
    setResumeLoading(true)
    setResumeStep('Scanning layout, extracting text tokens & headers...')

    const selectedRole = roleOverride !== null ? roleOverride : targetRole
    const effectiveRole =
      selectedRole === 'custom'
        ? customTargetRole.trim()
        : selectedRole === 'auto'
        ? ''
        : selectedRole

    try {
      setTimeout(() => {
        setResumeStep('Evaluating section compliance, action metrics & ATS keywords...')
      }, 700)
      setTimeout(() => {
        setResumeStep('Synthesizing career affinity matrix & SHAP feature importances...')
      }, 1400)

      const res = await uploadResume(file, effectiveRole)
      setResumeData(res)

      const decisionResult = res.decision || {}
      setResult(decisionResult)

      const profile = res.parsed_profile || {}
      const mappedInput = {
        cgpa: profile.cgpa ?? 8.5,
        score_type: profile.score_type || 'cgpa_10',
        raw_score: profile.cgpa ?? 8.5,
        course: profile.degree || 'B.Tech',
        specialization: profile.specialization || 'Computer Science',
        skills: profile.skills && profile.skills.length > 0 ? profile.skills : ['Python', 'SQL'],
        projects: profile.projects && profile.projects.length > 0 ? profile.projects : ['Engineering Project'],
        project_descriptions: profile.project_descriptions || [],
        certifications: profile.certifications || [],
        internships: profile.internships || [],
        internship_count: profile.internships_count ?? (profile.internships || []).length,
        experience_years: profile.experience_years ?? 0.0,
        achievements: profile.achievements || [],
        interest: effectiveRole || profile.interest || 'AI Systems & Machine Learning Engineer',
      }
      setInput(mappedInput)
      setResultInput(mappedInput)
      syncInteractiveInput(mappedInput)
      setIsWorkbenchOpen(false) // Cleanly collapse workbench so results shine in full landscape!
    } catch (err) {
      setError(err.message || 'Failed to parse resume document.')
    } finally {
      setResumeLoading(false)
      setResumeStep('')
    }
  }

  const handleSampleResumeTest = async () => {
    setError(null)
    setResumeLoading(true)
    setResumeStep('Fetching sample AI Systems Engineer resume...')
    try {
      const response = await fetch('/sample_resume.pdf')
      if (!response.ok) throw new Error('Could not load sample resume asset.')
      const blob = await response.blob()
      const sampleFile = new File([blob], 'Alex_Morgan_AI_Engineer_Resume.pdf', {
        type: 'application/pdf',
      })
      setResumeFile(sampleFile)
      await handleResumeSubmit(sampleFile)
    } catch (err) {
      setError(err.message || 'Sample resume test encountered an error.')
      setResumeLoading(false)
      setResumeStep('')
    }
  }

  const handleTuneInForm = () => {
    setMode('structured')
    setIsWorkbenchOpen(true)
    window.scrollTo({ top: 120, behavior: 'smooth' })
  }

  const handlePinBaseline = () => {
    if (!result) return
    setPinnedInputs(resultInput || input)
    setPinnedResult(result)
  }

  const handleRecalculate = async () => {
    const payload = normalizeCareerPayload(interactiveInput || input)
    setLoading(true)
    try {
      const res = await submitCareer(payload)
      setResult(res)
      setResultInput(payload)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInteractiveChange = async (fieldName, nextValue) => {
    const nextInput = { ...interactiveInput, [fieldName]: nextValue }
    setInteractiveInput(nextInput)
    setLiveUpdating(true)
    try {
      const normalized = normalizeCareerPayload(nextInput)
      const res = await submitCareer(normalized)
      setResult(res)
      setResultInput(normalized)
    } catch (err) {
      console.warn('Live update error:', err)
    } finally {
      setLiveUpdating(false)
    }
  }

  const handleSaveProject = async () => {
    const effectiveToken = token || user?.token || localStorage.getItem('decixai_token')
    try {
      const activeInput = resultInput || input || {}
      const effectiveScore =
        result?.metrics?.fit_score ??
        (result?.probability ? Math.round(result.probability * 100) : 85.0)
      const effectiveVerdict =
        result?.prediction || result?.decision || result?.verdict || 'Fit Analyzed'
      const payload = {
        title: `Career Analysis - ${new Date().toLocaleDateString()}`,
        domain: 'career',
        notes: `Career fit evaluation for ${activeInput.course || 'B.Tech'} - ${activeInput.interest || 'Technical'}`,
        tags: `${activeInput.course || 'Engineering'},${activeInput.specialization || 'CS'},Fit`,
        input_payload: activeInput,
        output_payload: result || {},
        score: effectiveScore,
        verdict: effectiveVerdict,
        // compatibility aliases:
        input: activeInput,
        result: result || {},
        summary: `Career fit evaluation for ${activeInput.course || 'B.Tech'} - ${activeInput.interest || 'Technical'}`,
      }
      await saveDecision(payload, effectiveToken)
      alert('Project saved successfully to your Workspace.')
    } catch (err) {
      alert(err.message || 'Failed to save project.')
    }
  }

  const handleNewRun = () => {
    setResult(null)
    setResumeData(null)
    setIsWorkbenchOpen(true)
  }

  const hasComparisonResult = Boolean(
    result && pinnedResult && result.metrics && pinnedResult.metrics
  )

  const workbenchContent = (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <span className="font-bold block mb-0.5">Notice:</span>
          {error}
        </div>
      )}

      <CareerForm
        input={input}
        setInput={setInput}
        fieldErrors={fieldErrors}
        onSubmit={handleStructuredSubmit}
        loading={loading}
        onApplyPreset={handleApplyPreset}
      />
    </div>
  )

  return (
    <DomainLayout
      domain="career"
      title={CAREER_CONFIG.title}
      subtitle={CAREER_CONFIG.subtitle}
      workbenchContent={workbenchContent}
      isWorkbenchOpen={isWorkbenchOpen}
      setIsWorkbenchOpen={setIsWorkbenchOpen}
      onPinBaseline={handlePinBaseline}
      isPinned={Boolean(pinnedResult)}
      onDownloadPdf={() => downloadPdf('career', result)}
      onRecalculate={handleRecalculate}
      onSaveProject={handleSaveProject}
      onNewRun={handleNewRun}
      hasResult={Boolean(result)}
    >
      {/* Topmost Career Intelligence Suite Switcher (Visible after Decision Analysis) */}
      {result && (
        <div className="mb-5 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-md shadow-slate-200/40 backdrop-blur-md sticky top-16 z-20">
          <div className="flex flex-wrap items-center gap-1.5">
            {CAREER_TABS.map((tab) => {
              const isActive = acceleratorTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAcceleratorTab(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className={isActive ? 'text-cyan-400' : 'text-slate-400'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[9px] font-mono font-extrabold uppercase ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Pinned Baseline Alert Banner */}
      {pinnedResult && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <div className="text-xs text-emerald-950 font-medium">
              <span className="font-black uppercase tracking-wider text-emerald-800 mr-2">
                Pinned Baseline Active:
              </span>
              Comparing dynamic adjustments against initial candidate baseline.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCompareOpen(true)}
              className="rounded-xl bg-white border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
            >
              Side-by-Side Diff
            </button>
            <button
              type="button"
              onClick={() => {
                setPinnedResult(null)
                setPinnedInputs(null)
              }}
              className="text-xs text-emerald-700 hover:text-emerald-950 px-1 font-bold cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Active View Display */}
      {result ? (
        acceleratorTab === 'what-if' ? (
          <WhatIfSimulator
            candidateProfile={resultInput || input}
            onApplyToForm={handleApplySimulatedProfile}
          />
        ) : acceleratorTab === 'jd-match' ? (
          <JobDescriptionMatcher
            candidateProfile={resultInput || input}
          />
        ) : acceleratorTab === 'mock-interview' ? (
          <MockInterviewStudio
            targetRole={
              result?.prediction ||
              result?.details?.career_intelligence?.interest?.path_label ||
              resultInput?.interest ||
              input?.interest ||
              'Software Engineer'
            }
            skillGaps={
              result?.details?.career_intelligence?.interest?.roadmap?.skills_to_add ||
              result?.details?.career_intelligence?.best_fit?.roadmap?.skills_to_add ||
              []
            }
            bestFitRole={
              result?.details?.career_intelligence?.best_fit?.path_label ||
              result?.prediction ||
              'AI Systems & Machine Learning Engineer'
            }
            bestFitSkillGaps={
              result?.details?.career_intelligence?.best_fit?.roadmap?.skills_to_add ||
              result?.details?.career_intelligence?.interest?.roadmap?.skills_to_add ||
              []
            }
            candidateProfile={resultInput || input}
            resumeData={resumeData}
          />
        ) : acceleratorTab === 'roadmap' ? (
          <SprintRoadmap
            targetRole={
              result?.prediction ||
              result?.details?.career_intelligence?.interest?.path_label ||
              resultInput?.interest ||
              input?.interest ||
              'Software Engineer'
            }
            skillGaps={
              result?.details?.career_intelligence?.interest?.roadmap?.skills_to_add ||
              result?.details?.career_intelligence?.best_fit?.roadmap?.skills_to_add ||
              []
            }
          />
        ) : acceleratorTab === 'compensation' ? (
          <CompensationEstimator
            targetRole={
              result?.prediction ||
              result?.details?.career_intelligence?.interest?.path_label ||
              resultInput?.interest ||
              input?.interest ||
              'Software Engineer'
            }
            candidateProfile={resultInput || input}
          />
        ) : (
          <>
            {/* Resume ATS Audit Card */}
            {resumeData && (
              <div className="mb-6">
                <ResumeAuditCard
                  resumeData={resumeData}
                  onTuneInForm={handleTuneInForm}
                  onDownloadReport={() => downloadPdf('career', result)}
                  onReAuditRole={(newRole) => {
                    setTargetRole(newRole)
                    handleResumeSubmit(resumeFile, newRole)
                  }}
                />
              </div>
            )}

            {hasComparisonResult ? (
              <DecisionReport
                payload={result}
                interactiveFields={[
                  {
                    name: 'cgpa',
                    label: 'Academic Score (CGPA)',
                    type: 'number',
                    range: { min: 5.0, max: 10.0, step: 0.1 },
                    value: interactiveInput?.cgpa || 8.5,
                  },
                ]}
                onInteractiveChange={handleInteractiveChange}
                isLiveUpdating={liveUpdating}
                onRefresh={handleRecalculate}
                onDownload={() => downloadPdf('career', result)}
              />
            ) : (
              <InsightPanel
                result={result}
                domain="career"
                title="Career Decision Insight"
                subtitle={CAREER_CONFIG.subtitle}
                input={resultInput}
                interactiveFields={[
                  {
                    name: 'cgpa',
                    label: 'Academic Score (CGPA)',
                    type: 'number',
                    range: { min: 5.0, max: 10.0, step: 0.1 },
                    value: interactiveInput?.cgpa || 8.5,
                  },
                ]}
                onInteractiveChange={handleInteractiveChange}
                isLiveUpdating={liveUpdating}
                onUpdateInput={handleUpdateParsedInput}
              />
            )}
          </>
        )
      ) : (
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-6 text-center shadow-xs">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white font-extrabold text-sm mb-2 shadow-xs">
            ⚡
          </div>
          <h3 className="text-sm font-extrabold text-slate-900">
            Step-by-Step Decision Engine Ready
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Please complete Steps 1 to 5 in the wizard above and click <strong>&quot;Run Decision XAI Engine&quot;</strong> to calculate your SHAP feature attributions and unlock personalized career tools.
          </p>
        </div>
      )}


      {/* Compare Modal */}
      {isCompareOpen && (
        <CompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          domain="career"
          baselinePayload={pinnedResult}
          candidatePayload={result}
          baselineInput={pinnedInputs}
          candidateInput={resultInput || input}
        />
      )}
    </DomainLayout>
  )
}
