import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchPublicReport } from '../api'

export default function PublicReport() {
  const { token } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true)
      try {
        const data = await fetchPublicReport(token)
        setReport(data)
        setError(null)
      } catch (err) {
        setError(err.message || 'Decision dossier not found or public access has been revoked.')
      } finally {
        setLoading(false)
      }
    }
    loadReport()
  }, [token])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm font-bold text-slate-600">Verifying Cryptographic Decision Dossier...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-2xl text-rose-500">
            🔒
          </div>
          <h2 className="mt-4 text-xl font-black text-slate-900">Dossier Unavailable</h2>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">{error}</p>
          <div className="mt-6">
            <Link
              to="/"
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-slate-800"
            >
              Go to DeciXAI Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const score = Math.round(report.score || 0)
  const factors = report.output_payload?.factor_impacts || []
  const actionPlan = report.output_payload?.action_plan || []

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-50 via-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        
        {/* Certificate Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl">
          
          {/* Top Banner */}
          <div className="border-b border-slate-100 bg-slate-950 p-6 text-white md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.jpeg"
                  alt="DeciXAI logo"
                  className="h-10 w-10 rounded-xl border border-white/20 object-cover"
                />
                <div>
                  <div className="text-lg font-black tracking-tight">DeciXAI Engine</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                    Verified Decision Intelligence Certificate
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  Verified Authenticity
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-400">
                  Hash: {report.audit_hash}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <span className="rounded-lg bg-sky-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-300 border border-sky-400/30 capitalize">
                {report.domain} Domain Evaluation
              </span>
              <h1 className="mt-3 text-2xl font-black md:text-3xl">{report.title}</h1>
              <p className="mt-1 text-xs text-slate-400">
                Generated and audited on {new Date(report.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Score & Verdict Row */}
          <div className="grid gap-6 border-b border-slate-100 p-6 md:grid-cols-3 md:p-8">
            <div className="flex items-center gap-4 rounded-2xl bg-sky-50/60 p-4 border border-sky-100">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-600 text-2xl font-black text-white shadow-md">
                {score}
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                  Viability Score
                </div>
                <div className="text-xs text-slate-600">Model-Calibrated Score</div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 md:col-span-2 flex flex-col justify-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verdict & Status</div>
              <div className="text-lg font-black text-slate-900">{report.verdict || report.output_payload?.score_label || 'Approved'}</div>
              <div className="mt-1 text-xs text-slate-500">
                {report.output_payload?.summary || 'Comprehensive evaluation completed via SHAP feature attributions.'}
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 md:p-8 space-y-6">
            
            {/* SHAP Factor Impacts */}
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <span>📊</span> Key Explainable AI Drivers (SHAP)
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                The machine learning model determined the following factors were the strongest contributors to this score:
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {factors.length > 0 ? (
                  factors.slice(0, 6).map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                      <span className="font-semibold text-slate-700">{f.factor || f.reason || 'Attribution factor'}</span>
                      <span className={`font-bold ${f.impact === 'positive' || (f.value && f.value > 0) ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {f.impact || (f.value ? `${f.value > 0 ? '+' : ''}${Math.round(f.value * 100)}%` : 'Active')}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-slate-400">Baseline attributions applied.</p>
                )}
              </div>
            </div>

            {/* AI Action Plan */}
            {actionPlan.length > 0 && (
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <span>🚀</span> Recommended Strategic Milestones
                </h3>
                <div className="mt-3 space-y-2">
                  {actionPlan.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Print & Return */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
              >
                <span>🖨️ Print / Save as PDF</span>
              </button>

              <Link
                to="/"
                className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-sky-600"
              >
                <span>Try DeciXAI Decision Engine →</span>
              </Link>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
