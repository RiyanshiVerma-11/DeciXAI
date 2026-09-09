import React from 'react'

export default function FreePromptInput({
  textPrompt,
  setTextPrompt,
  examples = [],
  placeholder = 'Describe your scenario in English or Hindi...',
  onApplyExample,
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
          Describe Scenario (English or Hindi)
        </label>
        <textarea
          rows={5}
          value={textPrompt}
          onChange={(e) => setTextPrompt(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100 resize-none leading-relaxed"
        />
      </div>

      {examples.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Sample Invocations
          </span>
          <div className="flex flex-col gap-1.5">
            {examples.map((example, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTextPrompt(example)
                  if (onApplyExample) onApplyExample(example)
                }}
                className="text-left text-[11px] rounded-xl bg-slate-100/80 hover:bg-sky-50 border border-slate-200/70 hover:border-sky-300 p-2.5 text-slate-700 hover:text-sky-800 transition block cursor-pointer leading-relaxed"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
