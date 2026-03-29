import { useState } from 'react'
import { submitChatbot } from '../api'
import InsightPanel from './InsightPanel'

const domainLabels = {
  career: 'Career',
  finance: 'Finance',
  startup: 'Startup',
  policy: 'Policy',
}

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!query.trim()) return

    const prompt = query
    const user = { id: `${Date.now()}-user`, from: 'user', message: prompt }
    setHistory((h) => [...h, user])
    setLoading(true)

    try {
      const response = await submitChatbot({ message: prompt })
      const bot = {
        id: `${Date.now()}-bot`,
        from: 'bot',
        payload: response,
      }
      setHistory((h) => [...h, bot])
      setQuery('')
    } catch (err) {
      setHistory((h) => [...h, { id: `${Date.now()}-error`, from: 'bot', message: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl transition hover:bg-slate-800"
      >
        {open ? 'Close deciXAI Chat' : 'Open deciXAI Chat'}
      </button>
      {open && (
        <div className="mt-3 flex h-[76vh] w-[min(30rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-2xl backdrop-blur">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,_rgba(15,23,42,1),_rgba(14,165,233,0.88))] p-4 text-white">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpeg"
                alt="deciXAI logo"
                className="h-12 w-12 rounded-2xl border border-white/20 object-cover"
              />
              <div>
                <div className="font-semibold">deciXAI Chat</div>
                <div className="text-xs uppercase tracking-[0.24em] text-slate-200">Ask, compare, understand</div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {history.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                Ask a decision question and the answer will show up as visual cards with factors and actions.
              </div>
            )}

            {history.map((item) => (
              <div key={item.id} className={item.from === 'user' ? 'pl-8' : ''}>
                {item.from === 'user' ? (
                  <div className="ml-auto max-w-[90%] rounded-3xl bg-slate-900 px-4 py-3 text-sm text-white shadow-sm">
                    {item.message}
                  </div>
                ) : item.payload ? (
                  <div className="max-w-full">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      {domainLabels[item.payload.intent] || 'Decision'} answer
                    </div>
                    <InsightPanel
                      result={{
                        ...item.payload,
                        summary: `Instant ${domainLabels[item.payload.intent] || 'decision'} guidance powered by the chatbot.`,
                        next_step: item.payload.suggestions?.[0] || 'Review the strongest factor and iterate.',
                        score_band: item.payload.intent,
                        score_label: `${Math.round((item.payload.probability || 0) * 100)}% confidence`,
                      }}
                      domain={item.payload.intent}
                      title="Chat insight"
                      subtitle="Structured guidance generated from your question."
                      input={item.payload.parsed_input}
                    />
                  </div>
                ) : (
                  <div className="max-w-[90%] rounded-3xl bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
                    {item.message}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-3xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              placeholder="Type your decision question..."
            />
            <button
              disabled={loading}
              onClick={send}
              className="mt-3 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? 'Processing...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
