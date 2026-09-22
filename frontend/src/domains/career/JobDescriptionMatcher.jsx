import React, { useState } from 'react'
import { matchJobDescription } from '../../api'

const SAMPLE_JDS = [
  {
    title: 'Senior AI / ML Engineer (FastAPI, PyTorch, Docker)',
    text: `We are looking for a Senior AI Engineer to design high-throughput inference microservices.
Requirements:
- Strong hands-on proficiency in Python, PyTorch, FastAPI, and Docker.
- Experience with asynchronous programming, Redis caching, and PostgreSQL.
- Familiarity with CI/CD deployment pipelines, Kubernetes, and AWS cloud services.
- Degree in Computer Science, Data Science, or related technical field.
- Excellent track record of building and deploying production ML services.`,
  },
  {
    title: 'Full-Stack Software Engineer (React, Node, Cloud)',
    text: `Seeking a Full-Stack Engineer to scale our enterprise platform.
Responsibilities & Skills:
- Architect responsive interfaces in React, TypeScript, and modern TailwindCSS.
- Build resilient backend APIs in Node.js/FastAPI with PostgreSQL and Redis.
- Implement automated testing with Jest and Pytest to ensure high test coverage.
- Experience with Docker containerization and cloud hosting on AWS or GCP.`,
  },
]

export default function JobDescriptionMatcher({ candidateProfile }) {
  const [jdText, setJdText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [copiedIdx, setCopiedIdx] = useState(null)

  const handleMatch = async (textToMatch = jdText) => {
    const text = textToMatch || jdText
    if (!text.trim()) {
      setError('Please paste a job description or select one of the sample presets.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await matchJobDescription({
        candidate_profile: candidateProfile || {},
        job_description: text,
      })
      setAnalysis(res)
    } catch (err) {
      setError(err.message || 'Job description analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 sm:p-7 shadow-xl shadow-slate-200/50 backdrop-blur-md">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200 mb-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          ATS Targeting Engine
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Target Job Description (JD) Matcher &amp; Bullet Rewriter</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Paste any job posting from LinkedIn, Indeed, or Wellfound to uncover keyword gaps and generate tailored Google X-Y-Z resume bullet points.
        </p>
      </div>

      {/* Input Stage */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Paste Job Description (JD)
          </label>
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Try preset:</span>
            {SAMPLE_JDS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setJdText(preset.text)
                  handleMatch(preset.text)
                }}
                className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer"
              >
                {preset.title.split(' ')[0]} {preset.title.split(' ')[1]}
              </button>
            ))}
          </div>
        </div>

        <textarea
          rows={5}
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          placeholder="Paste requirements, responsibilities, or tech stack from any real job posting..."
          className="w-full rounded-xl border border-slate-200 p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-sans"
        />

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => handleMatch()}
            disabled={loading || !jdText.trim()}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20 disabled:opacity-40 cursor-pointer flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Scanning JD &amp; Aligning...
              </>
            ) : (
              'Analyze Match & Generate Bullets'
            )}
          </button>
        </div>
      </div>

      {/* Results View */}
      {analysis && (
        <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in duration-300">
          {/* Top Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-indigo-50/80 to-white p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                ATS Compatibility Score
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 font-mono">
                  {analysis.fit_score}%
                </span>
                <span className="text-xs font-bold text-indigo-600">
                  {analysis.fit_score >= 80 ? 'Strong Fit' : analysis.fit_score >= 60 ? 'Moderate Alignment' : 'Gap Detected'}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Target Role
              </span>
              <div className="text-sm font-bold text-slate-900 mt-1 truncate">
                {analysis.detected_role}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Matched Stack
              </span>
              <div className="text-sm font-bold text-emerald-600 mt-1 font-mono">
                {analysis.matched_keywords?.length || 0} Skills Overlapping
              </div>
            </div>
          </div>

          {/* Keywords Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-2">
                ✓ Overlapping Keywords Detected ({analysis.matched_keywords?.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {analysis.matched_keywords?.map((kw) => (
                  <span key={kw} className="rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-bold">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Critical Missing Keywords ({analysis.missing_keywords?.length})</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {analysis.missing_keywords?.map((kw) => (
                  <span key={kw} className="rounded-lg bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 text-xs font-bold">
                    + {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Google X-Y-Z Resume Bullet Rewriter */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
            <div className="mb-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-[10px] font-bold mb-1">
                Google X-Y-Z Formula
              </div>
              <h3 className="text-sm font-black text-slate-900">
                Tailored High-Impact Resume Bullet Points
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rewritten with action verbs and quantifiable metrics specifically aligned with this job posting.
              </p>
            </div>

            <div className="space-y-3">
              {analysis.rewritten_bullets?.map((bullet, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300 transition">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      Variant #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(bullet.optimized_xyz, idx)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition cursor-pointer shrink-0"
                    >
                      {copiedIdx === idx ? '✓ Copied' : 'Copy Bullet'}
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-900 leading-relaxed">
                    • {bullet.optimized_xyz}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                    <span className="font-bold text-indigo-600 mr-1">Formula Breakdown:</span>
                    {bullet.formula_breakdown}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
