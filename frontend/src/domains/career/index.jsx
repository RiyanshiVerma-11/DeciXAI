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
  const { user } = useAuth()
  const [mode, setMode] = useState('resume')
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
    if (Object.keys(errors).length > 0) return

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
    if (!user) {
      alert('Please sign in to save your decision workspace.')
      return
    }
    try {
      const payload = {
        title: `Career Analysis - ${new Date().toLocaleDateString()}`,
        domain: 'career',
        summary: `Career fit evaluation for ${input.course || 'B.Tech'} - ${input.interest || 'Technical'}`,
        input: resultInput || input,
        result,
      }
      await saveDecision(payload, user.token)
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
      {/* Compact Horizontal Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <span className="text-sm font-black uppercase tracking-wider text-slate-900">
          Evaluation Intake
        </span>

        <DomainModeTabs
          mode={mode}
          setMode={setMode}
          supportsResume={true}
        />
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <span className="font-bold block mb-0.5">Notice:</span>
          {error}
        </div>
      )}

      {mode === 'resume' ? (
        <CareerResumeSection
          resumeFile={resumeFile}
          setResumeFile={setResumeFile}
          targetRole={targetRole}
          setTargetRole={setTargetRole}
          customTargetRole={customTargetRole}
          setCustomTargetRole={setCustomTargetRole}
          resumeLoading={resumeLoading}
          resumeStep={resumeStep}
          onSubmitResume={() => handleResumeSubmit(resumeFile)}
          onSampleResumeTest={handleSampleResumeTest}
        />
      ) : mode === 'free' ? (
        <div className="space-y-4">
          <FreePromptInput
            textPrompt={textPrompt}
            setTextPrompt={setTextPrompt}
            examples={CAREER_CONFIG.examples}
            placeholder={CAREER_CONFIG.freeTextExample}
            onApplyExample={(ex) => setTextPrompt(ex)}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePromptSubmit}
              disabled={loading}
              className="w-full sm:w-auto min-w-[260px] rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Evaluating Prompt...' : 'Evaluate Career Prompt'}
            </button>
          </div>
        </div>
      ) : (
        <CareerForm
          input={input}
          setInput={setInput}
          fieldErrors={fieldErrors}
          onSubmit={handleStructuredSubmit}
          loading={loading}
          onApplyPreset={handleApplyPreset}
        />
      )}
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
      {/* Pinned Baseline Alert Banner */}
      {pinnedResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm flex items-center justify-between gap-4">
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

      {/* Decision Output Visualizer */}
      {result ? (
        hasComparisonResult ? (
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
          />
        )
      ) : null}

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
