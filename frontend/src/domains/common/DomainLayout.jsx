import React from 'react'

export default function DomainLayout({
  domain,
  title,
  subtitle,
  workbenchContent,
  isWorkbenchOpen = true,
  setIsWorkbenchOpen,
  children,
  onPinBaseline,
  isPinned,
  onDownloadPdf,
  onRecalculate,
  onSaveProject,
  onNewRun,
  hasResult,
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 space-y-3">
      
      {/* Unified Executive Workbench Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white/95 shadow-2xs backdrop-blur-md overflow-hidden">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/70 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-black tracking-tight text-slate-900">
              {title}
            </h1>
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-800 border border-sky-200">
              Enterprise XAI
            </span>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {hasResult && setIsWorkbenchOpen && (
              <button
                type="button"
                onClick={() => setIsWorkbenchOpen(!isWorkbenchOpen)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-2xs transition cursor-pointer ${
                  isWorkbenchOpen
                    ? 'border-sky-300 bg-sky-50 text-sky-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{isWorkbenchOpen ? 'Hide Inputs' : 'Edit Inputs'}</span>
              </button>
            )}

            {hasResult && onNewRun && (
              <button
                type="button"
                onClick={onNewRun}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-2xs transition hover:bg-slate-100 cursor-pointer"
              >
                <span>New Analysis</span>
              </button>
            )}

            {hasResult && onPinBaseline && (
              <button
                type="button"
                onClick={onPinBaseline}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-2xs transition cursor-pointer ${
                  isPinned
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{isPinned ? 'Baseline Pinned' : 'Pin Baseline'}</span>
              </button>
            )}

            {hasResult && onDownloadPdf && (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-2xs transition hover:bg-slate-100 cursor-pointer"
              >
                <span>Export Dossier</span>
              </button>
            )}

            {hasResult && onRecalculate && (
              <button
                type="button"
                onClick={onRecalculate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-2xs transition hover:bg-slate-100 cursor-pointer"
              >
                <span>Recalculate</span>
              </button>
            )}

            {hasResult && onSaveProject && (
              <button
                type="button"
                onClick={onSaveProject}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-2xs transition hover:bg-slate-800 cursor-pointer"
              >
                <span>Save Project</span>
              </button>
            )}
          </div>
        </div>

        {/* Workbench Body */}
        {workbenchContent && isWorkbenchOpen && (
          <div className="p-3.5 sm:p-4">
            {workbenchContent}
          </div>
        )}
      </div>

      {/* Main Results Canvas */}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}
