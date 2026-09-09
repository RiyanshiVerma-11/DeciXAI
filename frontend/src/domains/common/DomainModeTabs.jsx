import React from 'react'

export default function DomainModeTabs({
  mode,
  setMode,
  supportsResume = false,
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 border border-slate-200">
      {supportsResume && (
        <button
          type="button"
          onClick={() => setMode('resume')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-bold transition-all cursor-pointer ${
            mode === 'resume'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <span>Resume Parser</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
              mode === 'resume'
                ? 'bg-white/20 text-white'
                : 'bg-sky-100 text-sky-800'
            }`}
          >
            ATS
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={() => setMode('structured')}
        className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-bold transition-all cursor-pointer ${
          mode === 'structured'
            ? 'bg-slate-900 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
        }`}
      >
        <span>Studio Form</span>
      </button>

      <button
        type="button"
        onClick={() => setMode('free')}
        className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-bold transition-all cursor-pointer ${
          mode === 'free'
            ? 'bg-slate-900 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
        }`}
      >
        <span>Prompt NLP</span>
      </button>
    </div>
  )
}
