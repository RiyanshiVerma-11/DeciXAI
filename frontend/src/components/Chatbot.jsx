import { useState, useRef, useEffect } from 'react'

const defaultApiBase = `${window.location.protocol}//${window.location.hostname}:8000`
const API_BASE = import.meta.env.VITE_API_BASE_URL || defaultApiBase
const starterPrompts = [
  'Suggest a career path from my CGPA, projects, and skills',
  'Loan safe hai kya if my income is 90000 and credit score is 720?',
  'Evaluate my B2B SaaS startup with funding and team size',
  'Compare a laptop policy vs digital infrastructure policy',
]

export default function Chatbot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, loading])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: trimmed,
    }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    const payload = {
      messages: nextMessages.slice(-10).map(({ role, content }) => ({ role, content })),
      stream: true,
    }

    const assistantId = `${Date.now()}-assistant`
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '' },
    ])

    try {
      const response = await fetch(`${API_BASE}/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Chat API error')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        const text = await response.text()
        setMessages((prev) => prev.map((msg) => msg.id === assistantId ? { ...msg, content: text } : msg))
        return
      }

      const decoder = new TextDecoder()
      let done = false
      let assistantText = ''

      while (!done) {
        const { value, done: finished } = await reader.read()
        done = finished
        if (value) {
          assistantText += decoder.decode(value, { stream: true })
          setMessages((prev) => prev.map((msg) => msg.id === assistantId ? { ...msg, content: assistantText } : msg))
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setMessages((prev) => prev.map((msg) => msg.id === assistantId ? { ...msg, content: `Error: ${errorMessage}` } : msg))
    } finally {
      setLoading(false)
    }
  }

  const useStarter = (prompt) => {
    setInput(prompt)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-1rem)]">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl transition hover:bg-slate-800"
      >
        {open ? 'Close deciXAI Chat' : 'Open deciXAI Chat'}
      </button>

      {open && (
        <div className="mt-3 flex h-[78vh] w-[min(32rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-2xl backdrop-blur">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,_rgba(15,23,42,1),_rgba(14,165,233,0.88))] p-4 text-white">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpeg"
                alt="deciXAI logo"
                className="h-12 w-12 rounded-2xl border border-white/20 object-cover"
              />
              <div>
                <div className="font-semibold">deciXAI Chat</div>
                <div className="text-xs uppercase tracking-[0.24em] text-slate-200">Chat naturally in English or Hindi</div>
              </div>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {messages.length === 0 && (
              <>
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                  Start a conversation and the bot will reply conversationally with domain-aware guidance.
                </div>
                <div className="grid gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => useStarter(prompt)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </>
            )}

            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
                    message.role === 'user'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-900 border border-slate-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[50%] animate-pulse rounded-3xl bg-slate-200 px-4 py-3 text-sm text-slate-500 shadow-sm">
                  deciXAI is typing...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="w-full resize-none rounded-3xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400"
              placeholder="Type in English or Hindi and press Enter to send..."
            />
            <button
              disabled={loading}
              onClick={sendMessage}
              className="mt-3 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
