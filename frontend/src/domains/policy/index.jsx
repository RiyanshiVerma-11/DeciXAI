import React, { useState } from 'react'
import DomainLayout from '../common/DomainLayout'
import DomainModeTabs from '../common/DomainModeTabs'
import FreePromptInput from '../common/FreePromptInput'
import PolicyForm from './PolicyForm'
import DecisionReport from '../../components/DecisionReport'
import InsightPanel from '../../components/InsightPanel'
import CompareModal from '../../components/CompareModal'
import {
  POLICY_CONFIG,
  parsePolicyPrompt,
  validatePolicyPayload,
} from './policyConfig'
import {
  submitPolicy,
  downloadPdf,
  saveDecision,
} from '../../api'
import { useAuth } from '../../components/AuthContext'

const INITIAL_POLICY_INPUT = {
  sector: 'Renewable Energy',
  budget: 5000000,
  population: 1200000,
}

export default function PolicyDomain() {
  const { user } = useAuth()
  const [mode, setMode] = useState('structured')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const [input, setInput] = useState(INITIAL_POLICY_INPUT)
  const [interactiveInput, setInteractiveInput] = useState(INITIAL_POLICY_INPUT)
  const [textPrompt, setTextPrompt] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const [result, setResult] = useState(null)
  const [resultInput, setResultInput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [liveUpdating, setLiveUpdating] = useState(false)
  const [error, setError] = useState(null)

  const [pinnedInputs, setPinnedInputs] = useState(null)
  const [pinnedResult, setPinnedResult] = useState(null)
  const [isCompareOpen, setIsCompareOpen] = useState(false)

  const handleApplyPreset = (preset) => {
    setInput(preset.data)
    setInteractiveInput(preset.data)
    setFieldErrors({})
  }

  const handleStructuredSubmit = async (e) => {
    if (e) e.preventDefault()
    setError(null)
    const errors = validatePolicyPayload(input)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    try {
      const res = await submitPolicy(input)
      setResult(res)
      setResultInput(input)
      setInteractiveInput(input)
      setIsSidebarCollapsed(true)
    } catch (err) {
      setError(err.message || 'Policy evaluation failed.')
    } finally {
      setLoading(false)
    }
  }

  const handlePromptSubmit = async () => {
    if (!textPrompt.trim()) {
      setError('Please provide a prompt describing your policy proposal.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const parsed = parsePolicyPrompt(textPrompt)
      const res = await submitPolicy(parsed)
      setResult(res)
      setResultInput(parsed)
      setInput(parsed)
      setInteractiveInput(parsed)
      setIsSidebarCollapsed(true)
    } catch (err) {
      setError(err.message || 'NLP prompt evaluation failed.')
    } finally {
      setLoading(false)
    }
  }

  const handlePinBaseline = () => {
    if (!result) return
    setPinnedInputs(resultInput || input)
    setPinnedResult(result)
  }

  const handleRecalculate = async () => {
    const payload = interactiveInput || input
    setLoading(true)
    try {
      const res = await submitPolicy(payload)
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
      const res = await submitPolicy(nextInput)
      setResult(res)
      setResultInput(nextInput)
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
        title: `Policy Feasibility - ${new Date().toLocaleDateString()}`,
        domain: 'policy',
        summary: `Public feasibility for ${input.sector} ($${input.budget} budget, ${input.population} population)`,
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
    setIsSidebarCollapsed(false)
  }

  const hasComparisonResult = Boolean(
    result && pinnedResult && result.metrics && pinnedResult.metrics
  )

  const interactiveFields = [
    {
      name: 'budget',
      label: 'Allocated Budget ($)',
      type: 'number',
      range: { min: 100000, max: 25000000, step: 500000 },
      value: interactiveInput?.budget || 5000000,
    },
    {
      name: 'population',
      label: 'Beneficiary Population',
      type: 'number',
      range: { min: 10000, max: 5000000, step: 50000 },
      value: interactiveInput?.population || 1200000,
    },
  ]

  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(true)

  const workbenchContent = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Policy Intake Workbench
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Configure public sector portfolio, allocated budget, and beneficiary population
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <DomainModeTabs
            mode={mode}
            setMode={setMode}
            supportsResume={false}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <span className="font-bold block mb-0.5">Notice:</span>
          {error}
        </div>
      )}

      {mode === 'free' ? (
        <div className="space-y-4">
          <FreePromptInput
            textPrompt={textPrompt}
            setTextPrompt={setTextPrompt}
            examples={POLICY_CONFIG.examples}
            placeholder={POLICY_CONFIG.freeTextExample}
            onApplyExample={(ex) => setTextPrompt(ex)}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePromptSubmit}
              disabled={loading}
              className="w-full sm:w-auto min-w-[260px] rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Evaluating Proposal...' : 'Evaluate Policy Scenario'}
            </button>
          </div>
        </div>
      ) : (
        <PolicyForm
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
      domain="policy"
      title={POLICY_CONFIG.title}
      subtitle={POLICY_CONFIG.subtitle}
      workbenchContent={workbenchContent}
      isWorkbenchOpen={isWorkbenchOpen}
      setIsWorkbenchOpen={setIsWorkbenchOpen}
      onPinBaseline={handlePinBaseline}
      isPinned={Boolean(pinnedResult)}
      onDownloadPdf={() => downloadPdf('policy', result)}
      onRecalculate={handleRecalculate}
      onSaveProject={handleSaveProject}
      onNewRun={handleNewRun}
      hasResult={Boolean(result)}
    >
      {pinnedResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <div className="text-xs text-emerald-950 font-medium">
              <span className="font-black uppercase tracking-wider text-emerald-800 mr-2">
                Pinned Baseline Active:
              </span>
              Tracking feasibility delta across budget and population reach sliders.
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

      {result ? (
        hasComparisonResult ? (
          <DecisionReport
            payload={result}
            interactiveFields={interactiveFields}
            onInteractiveChange={handleInteractiveChange}
            isLiveUpdating={liveUpdating}
            onRefresh={handleRecalculate}
            onDownload={() => downloadPdf('policy', result)}
          />
        ) : (
          <InsightPanel
            result={result}
            domain="policy"
            title="Policy Feasibility Insight"
            subtitle={POLICY_CONFIG.subtitle}
            input={resultInput}
            interactiveFields={interactiveFields}
            onInteractiveChange={handleInteractiveChange}
            isLiveUpdating={liveUpdating}
          />
        )
      ) : (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-8 sm:p-12 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 font-black text-xl">
            XAI
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            Government Policy & Public Feasibility Stage
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
            Select a public policy initiative or configure sector, budget, and population in the Parameter Studio to estimate implementation viability.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => handleApplyPreset({ data: INITIAL_POLICY_INPUT })}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-slate-800 transition cursor-pointer"
            >
              <span>Load Clean Energy Initiative</span>
            </button>
          </div>
        </div>
      )}

      {isCompareOpen && (
        <CompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          domain="policy"
          baselinePayload={pinnedResult}
          candidatePayload={result}
          baselineInput={pinnedInputs}
          candidateInput={resultInput || input}
        />
      )}
    </DomainLayout>
  )
}
