import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import DomainLayout from '../common/DomainLayout'
import DomainModeTabs from '../common/DomainModeTabs'
import FreePromptInput from '../common/FreePromptInput'
import FinanceForm from './FinanceForm'
import DecisionReport from '../../components/DecisionReport'
import InsightPanel from '../../components/InsightPanel'
import CompareModal from '../../components/CompareModal'
import {
  FINANCE_CONFIG,
  parseFinancePrompt,
  validateFinancePayload,
} from './financeConfig'
import {
  submitFinance,
  downloadPdf,
  saveDecision,
} from '../../api'
import { useAuth } from '../../components/AuthContext'

const INITIAL_FINANCE_INPUT = {
  income: 80000,
  loan: 20000,
  credit_score: 720,
}

export default function FinanceDomain() {
  const { user } = useAuth()
  const [mode, setMode] = useState('structured')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const [input, setInput] = useState(INITIAL_FINANCE_INPUT)
  const [interactiveInput, setInteractiveInput] = useState(INITIAL_FINANCE_INPUT)
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
    const errors = validateFinancePayload(input)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    try {
      const res = await submitFinance(input)
      setResult(res)
      setResultInput(input)
      setInteractiveInput(input)
      setIsSidebarCollapsed(true)
    } catch (err) {
      setError(err.message || 'Underwriting evaluation failed.')
    } finally {
      setLoading(false)
    }
  }

  const handlePromptSubmit = async () => {
    if (!textPrompt.trim()) {
      setError('Please provide a prompt describing the financial scenario.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const parsed = parseFinancePrompt(textPrompt)
      const res = await submitFinance(parsed)
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
      const res = await submitFinance(payload)
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
      const res = await submitFinance(nextInput)
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
        title: `Finance Underwriting - ${new Date().toLocaleDateString()}`,
        domain: 'finance',
        summary: `Credit risk evaluation for income $${input.income} and loan $${input.loan}`,
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
      name: 'income',
      label: 'Annual Income ($)',
      type: 'number',
      range: { min: 10000, max: 250000, step: 5000 },
      value: interactiveInput?.income || 80000,
    },
    {
      name: 'loan',
      label: 'Loan Amount ($)',
      type: 'number',
      range: { min: 1000, max: 100000, step: 1000 },
      value: interactiveInput?.loan || 20000,
    },
    {
      name: 'credit_score',
      label: 'Credit Score',
      type: 'number',
      range: { min: 300, max: 850, step: 5 },
      value: interactiveInput?.credit_score || 720,
    },
  ]

  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(true)

  const workbenchContent = (
    <div className="space-y-6">
      {/* Quick Access to Guided 7-Step Loan Application Wizard */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Looking for the Step-by-Step Loan Application?</div>
            <div className="text-[11px] text-slate-500">Apply with documents, OTP verification, and instant deterministic offers.</div>
          </div>
        </div>
        <Link
          to="/dashboard/loan-application"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 text-xs font-bold transition shadow-xs"
        >
          <span>Launch 7-Step Wizard</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Financial Intake Workbench
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Configure applicant balance sheet parameters or provide natural language underwriting prompt
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
            examples={FINANCE_CONFIG.examples}
            placeholder={FINANCE_CONFIG.freeTextExample}
            onApplyExample={(ex) => setTextPrompt(ex)}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePromptSubmit}
              disabled={loading}
              className="w-full sm:w-auto min-w-[260px] rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? 'Evaluating Scenario...' : 'Evaluate Financial Scenario'}
            </button>
          </div>
        </div>
      ) : (
        <FinanceForm
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
      domain="finance"
      title={FINANCE_CONFIG.title}
      subtitle={FINANCE_CONFIG.subtitle}
      workbenchContent={workbenchContent}
      isWorkbenchOpen={isWorkbenchOpen}
      setIsWorkbenchOpen={setIsWorkbenchOpen}
      onPinBaseline={handlePinBaseline}
      isPinned={Boolean(pinnedResult)}
      onDownloadPdf={() => downloadPdf('finance', result)}
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
              Tracking interest & default delta across loan adjustment sliders.
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
            onDownload={() => downloadPdf('finance', result)}
          />
        ) : (
          <InsightPanel
            result={result}
            domain="finance"
            title="Finance Decision Insight"
            subtitle={FINANCE_CONFIG.subtitle}
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
            Financial Underwriting & Credit Stage
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
            Select an underwriting preset or enter borrower parameters on the left to calculate default risk and SHAP decision signals.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => handleApplyPreset(FINANCE_CONFIG.fields ? { data: INITIAL_FINANCE_INPUT } : null)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-slate-800 transition cursor-pointer"
            >
              <span>Load Prime Borrower Demo</span>
            </button>
          </div>
        </div>
      )}

      {isCompareOpen && (
        <CompareModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          domain="finance"
          baselinePayload={pinnedResult}
          candidatePayload={result}
          baselineInput={pinnedInputs}
          candidateInput={resultInput || input}
        />
      )}
    </DomainLayout>
  )
}
