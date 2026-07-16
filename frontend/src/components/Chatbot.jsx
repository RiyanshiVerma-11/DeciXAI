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
  const abortControllerRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, loading])

  // Cancel any active stream when the chat panel is toggled closed
  useEffect(() => {
    if (!open && abortControllerRef.current) {
      abortControllerRef.current.abort()
      setLoading(false)
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [open])

  const sendMessage = async () => {
    if (loading) return // Guard against concurrent spammed calls
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

    // Set up AbortController for stream cancellation
    abortControllerRef.current = new AbortController()

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
        signal: abortControllerRef.current.signal,
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
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Chatbot request aborted by user.')
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setMessages((prev) => prev.map((msg) => msg.id === assistantId ? { ...msg, content: `Error: ${errorMessage}` } : msg))
      }
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  const useStarter = (prompt) => {
    if (!loading) {
      setInput(prompt)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!loading) {
        sendMessage()
      }
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3 max-w-[calc(100vw-2rem)]">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-full bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 border border-slate-700/50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          )}
        </svg>
        {open ? 'Close Chat' : 'Open DeciXAI Chat'}
      </button>

      {open && (
        <div className="flex h-[70vh] w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,_rgba(15,23,42,1),_rgba(14,165,233,0.88))] p-4 text-white">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpeg"
                alt="DeciXAI logo"
                className="h-12 w-12 rounded-2xl border border-white/20 object-cover"
              />
              <div>
                <div className="font-semibold">DeciXAI Chat</div>
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
                  DeciXAI is typing...
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            <textarea
              disabled={loading}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="w-full resize-none rounded-3xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-400 disabled:opacity-70"
              placeholder={loading ? "DeciXAI is thinking..." : "Type in English or Hindi and press Enter to send..."}
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
