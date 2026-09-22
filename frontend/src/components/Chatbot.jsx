import React, { useState, useRef, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { saveChatInsight } from '../utils/savedChatStorage'
import { saveDecision } from '../api'

const defaultApiBase = `${window.location.protocol}//${window.location.hostname}:8002`
const API_BASE = import.meta.env.VITE_API_BASE_URL || defaultApiBase

const DOMAIN_CONFIG = {
  career: {
    domain: 'career',
    title: 'DeciXAI Career Copilot',
    badge: '🎓 Career Mode',
    badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80',
    launcherLabel: 'Career AI Copilot',
    subtitle: 'Career Transition, Skills Gap & STAR Interview Advisor',
    greeting: 'Ask about career pathways, bridging skill gaps, resume review, or mock interview prep in English or Hindi.',
    starters: [
      { label: '🎓 Career Path', prompt: 'Suggest a high-growth career path based on my skills in Python, ML, and React' },
      { label: '🎓 Skill Gap', prompt: 'How do I bridge the gap between software development and an AI Systems Engineer role?' },
      { label: '🎓 Interview Prep', prompt: 'Give me 3 tough technical interview questions for a Full-Stack Engineer with STAR answers' },
      { label: '🎓 Resume Review', prompt: 'What key achievements and metrics should I highlight on my resume to pass ATS filters?' },
      { label: '🎓 Hindi Guidance', prompt: 'Data Science me switch karne ke liye step-by-step 3-month roadmap batao' },
    ],
  },
  finance: {
    domain: 'finance',
    title: 'DeciXAI Finance Copilot',
    badge: '💳 Finance Mode',
    badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80',
    launcherLabel: 'Finance AI Copilot',
    subtitle: 'Loan Assessment, Credit Health & Debt Risk Advisor',
    greeting: 'Ask about loan approval chances, credit score improvements, or financial risk in English or Hindi.',
    starters: [
      { label: '💳 Loan Eligibility', prompt: 'Loan safe hai kya if my income is 90000 and credit score is 720?' },
      { label: '💳 Risk Factors', prompt: 'What are the top 3 risk factors when applying for a 15 Lakh personal loan?' },
      { label: '💳 Score Boost', prompt: 'How can I boost my credit score from 680 to 760 within 6 months?' },
      { label: '💳 In-hand Salary', prompt: 'Meri monthly in-hand salary 55,000 hai, max home loan kitna approve ho sakta hai?' },
      { label: '💳 Debt-to-Income', prompt: 'What is an ideal Debt-to-Income (DTI) ratio before applying for business credit?' },
    ],
  },
  startup: {
    domain: 'startup',
    title: 'DeciXAI Startup Copilot',
    badge: '🚀 Startup Mode',
    badgeColor: 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-700/80',
    launcherLabel: 'Startup AI Copilot',
    subtitle: 'Valuation, Runway & Go-to-Market Intelligence',
    greeting: 'Ask about startup valuation, extending runway, investor pitching, or hiring in English or Hindi.',
    starters: [
      { label: '🚀 Startup Valuation', prompt: 'Evaluate my B2B SaaS startup with 50L ARR, 15% MoM growth, and 5-person team' },
      { label: '🚀 Pitch Signals', prompt: 'What key metrics do angel investors look for in an early-stage B2B SaaS pitch?' },
      { label: '🚀 Runway Extension', prompt: 'How do I optimize burn rate and extend runway from 6 months to 14 months?' },
      { label: '🚀 GTM Strategy', prompt: 'Best low-cost go-to-market strategy for an AI productivity tool' },
      { label: '🚀 Unit Economics', prompt: 'How do I calculate LTV to CAC ratio for an early stage subscription product?' },
    ],
  },
  policy: {
    domain: 'policy',
    title: 'DeciXAI Policy Copilot',
    badge: '📜 Policy Mode',
    badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-700/80',
    launcherLabel: 'Policy AI Copilot',
    subtitle: 'Public Policy, Budget Allocation & Compliance Intelligence',
    greeting: 'Ask about policy comparisons, public budget ROI, subsidy impact, or ethics in English or Hindi.',
    starters: [
      { label: '📜 Policy Comparison', prompt: 'Compare student laptop subsidy vs digital classroom infrastructure grant' },
      { label: '📜 Budget Allocation', prompt: 'How to allocate municipal health budget to maximize coverage and minimize delay?' },
      { label: '📜 Compliance Check', prompt: 'What governance safeguards prevent bias in automated algorithmic decision-making?' },
      { label: '📜 Target Demographics', prompt: 'How to structure targeted public assistance without leaking funds to ineligible parties?' },
      { label: '📜 ROI Evaluation', prompt: 'What metrics best measure the return on investment for rural solar power subsidies?' },
    ],
  },
  landing: {
    domain: 'product',
    title: 'DeciXAI Product Guide',
    badge: '💡 Have Questions? Ask here',
    badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80',
    launcherLabel: 'Have questions? Ask AI',
    subtitle: 'Have any questions? Ask them here!',
    greetingTitle: 'Have any questions? Ask them here!',
    greeting: 'Welcome to DeciXAI! I can help you understand our Explainable AI platform, explore our 4 Decision Studios, learn how What-If simulations work, or guide you on getting started.',
    starters: [
      {
        label: '✨ What is DeciXAI?',
        prompt: 'What is DeciXAI and how does Explainable AI (XAI) work?',
        detail: 'Learn about our transparent ML models & live SHAP attribution',
      },
      {
        label: '🎯 4 Decision Studios',
        prompt: 'What are the 4 Decision Studios (Career, Finance, Startup, Policy) and what can they do?',
        detail: 'Explore features across Talent, Credit, Venture & Policy',
      },
      {
        label: '⚡ What-If Simulator',
        prompt: 'How does the Counterfactual What-If Simulator work in DeciXAI?',
        detail: 'Simulate probability changes by testing skills or capstones',
      },
      {
        label: '💳 Finance & DigiLocker eKYC',
        prompt: 'How does automated DigiLocker eKYC and bank verification work in Finance Studio?',
        detail: 'Instant paperless verification & risk radar explainability',
      },
      {
        label: '🚀 Free Workspace & Access',
        prompt: 'Is DeciXAI free to use and how do I get started with a workspace?',
        detail: 'Zero-friction access, instant insights, and developer APIs',
      },
    ],
  },
  default: {
    domain: 'general',
    title: 'DeciXAI Copilot',
    badge: '⚡ General Mode',
    badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
    launcherLabel: 'DeciXAI Copilot',
    subtitle: 'Career • Finance • Startup • Policy',
    greeting: 'Ask any question across Career, Finance, Startup, or Policy in English or Hindi.',
    starters: [
      { label: '🎓 Career', prompt: 'Suggest a high-growth career path based on my skills in Python, ML, and React' },
      { label: '💳 Finance', prompt: 'Loan safe hai kya if my income is 90000 and credit score is 720?' },
      { label: '🚀 Startup', prompt: 'Evaluate my B2B SaaS startup with 50L ARR, 15% MoM growth, and 5-person team' },
      { label: '📜 Policy', prompt: 'Compare student laptop subsidy vs digital classroom infrastructure grant' },
    ],
  },
}

const detectDomainFromPath = (pathname = '') => {
  const p = (pathname || '').toLowerCase()
  if (p === '/' || p === '') return 'landing'
  if (p.includes('career')) return 'career'
  if (p.includes('finance') || p.includes('loan')) return 'finance'
  if (p.includes('startup')) return 'startup'
  if (p.includes('policy')) return 'policy'
  return null
}

// Formats inline tokens like **bold**, `code`, *italic*
export function formatInlineText(text) {
  if (typeof text !== 'string') return text
  const parts = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-slate-100 text-cyan-800 font-mono text-[11px] border border-slate-200">
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-slate-800">
          {token.slice(1, -1)}
        </em>
      )
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }
  return parts.length > 0 ? parts : text
}

// Lightweight, formatted markdown renderer
export function FormattedMessage({ content }) {
  if (!content) return null
  const lines = content.split('\n')

  return (
    <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <div key={idx} className="h-1" />
        }

        // Heading 3: ### Heading
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-bold text-slate-900 text-xs sm:text-sm mt-2 mb-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              {formatInlineText(trimmed.slice(4))}
            </h4>
          )
        }
        // Heading 2: ## Heading
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="font-bold text-slate-900 text-sm mt-2 mb-1 text-cyan-950 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-600" />
              {formatInlineText(trimmed.slice(3))}
            </h3>
          )
        }
        // Bullet list item: * or -
        if (/^[-*•]\s+/.test(trimmed)) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="text-cyan-600 font-bold leading-none mt-1 shrink-0">•</span>
              <div className="flex-1 text-slate-800">{formatInlineText(trimmed.replace(/^[-*•]\s+/, ''))}</div>
            </div>
          )
        }
        // Numbered list item: 1. 2. etc.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
              <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold shrink-0 mt-0.5">
                {numMatch[1]}
              </span>
              <div className="flex-1 text-slate-800">{formatInlineText(numMatch[2])}</div>
            </div>
          )
        }

        return (
          <p key={idx} className="text-slate-800">
            {formatInlineText(line)}
          </p>
        )
      })}
    </div>
  )
}

export default function Chatbot() {
  const location = useLocation()
  const detectedDomain = detectDomainFromPath(location.pathname)
  const isLandingPage = detectedDomain === 'landing' || location.pathname === '/'
  const activeConfig = DOMAIN_CONFIG[detectedDomain] || DOMAIN_CONFIG.landing || DOMAIN_CONFIG.default

  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())
  const [toastMessage, setToastMessage] = useState(null)
  const listRef = useRef(null)
  const textareaRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Auto-scroll to bottom when messages or typing state change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, loading])

  // Focus textarea when chat is opened
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [open])

  // Cancel any active stream when the chat panel is closed
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

  const copyMessage = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleSaveToWorkspace = async (message, messageIdx) => {
    // Find the user query that prompted this response
    const priorUserMsg = messages
      .slice(0, messageIdx)
      .reverse()
      .find((m) => m.role === 'user')
    const userQuery = priorUserMsg?.content || ''
    const domain = (detectedDomain || 'career').toLowerCase()

    const savedItem = saveChatInsight({
      content: message.content,
      domain,
      userQuery,
      title: '',
    })

    if (savedItem) {
      setSavedIds((prev) => new Set([...prev, message.id]))
      setToastMessage(`✓ Saved to Workspace (${domain.toUpperCase()} folder)!`)
      setTimeout(() => setToastMessage(null), 3000)

      // Background sync to backend decisions database if token exists
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('decixai_token') : null
      if (token) {
        try {
          await saveDecision(
            {
              domain,
              title: savedItem.title,
              notes: userQuery ? `User Query: ${userQuery}` : 'Saved from DeciXAI Copilot',
              tags: `chatbot,${domain},roadmap`,
              score: 100,
              verdict: 'AI Copilot Insight',
              input_payload: { userQuery },
              output_payload: { content: message.content },
            },
            token
          )
        } catch {
          // LocalStorage fallback already active
        }
      }
    }
  }

  const stopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setLoading(false)
  }

  const clearChat = () => {
    stopGenerating()
    setMessages([])
    setInput('')
  }

  const sendMessage = async (overridePrompt) => {
    if (loading) return
    const textToSend = (overridePrompt || input).trim()
    if (!textToSend) return

    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: textToSend,
    }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    abortControllerRef.current = new AbortController()

    const payload = {
      messages: nextMessages.slice(-10).map(({ role, content }) => ({ role, content })),
      stream: true,
    }

    const assistantId = `${Date.now()}-assistant`
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', isError: false },
    ])

    try {
      // Primary attempt to /api/v1/chatbot/, fallback to /chatbot/
      let response = null
      try {
        response = await fetch(`${API_BASE}/api/v1/chatbot/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        })
      } catch (networkErr) {
        if (networkErr?.name === 'AbortError') throw networkErr
        // Retry with legacy route if first fails
        response = await fetch(`${API_BASE}/chatbot/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal,
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Chat API returned HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        const text = await response.text()
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantId ? { ...msg, content: text } : msg))
        )
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
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: assistantText } : msg
            )
          )
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Stop generating was triggered cleanly
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Unable to connect to AI engine'
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content: `⚠️ ${errorMessage}. Please check your connection or try again.`,
                  isError: true,
                }
              : msg
          )
        )
      }
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!loading && input.trim()) {
        sendMessage()
      }
    }
  }

  return (
    <>
      {/* Floating launcher button: Visible when chat is closed */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 rounded-full bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2.5 border border-slate-700/60 cursor-pointer group"
          title={`Open ${activeConfig.title}`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
          <svg className="h-4 w-4 text-cyan-400 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="tracking-wide">{activeConfig.launcherLabel}</span>
        </button>
      )}

      {/* Chat Floating Window */}
      {open && (
        <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-6 z-50 flex h-[88vh] sm:h-[86vh] max-h-[820px] w-[min(32rem,calc(100vw-1.25rem))] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="border-b border-slate-800 bg-slate-900 px-4 py-3 text-white flex items-center justify-between gap-3 shadow-sm select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white leading-tight flex items-center gap-1.5 flex-wrap">
                  <span>{activeConfig.title}</span>
                  <span className={`rounded border px-1.5 py-0.2 text-[10px] font-semibold ${activeConfig.badgeColor}`}>
                    {activeConfig.badge}
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 font-medium leading-tight truncate mt-0.5">
                  {activeConfig.subtitle}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Link to Saved Workspace Chatbot tab (only for dashboard domains) */}
              {!isLandingPage && (
                <Link
                  to={`/dashboard/workspace?tab=chatbot&domain=${detectedDomain || 'all'}`}
                  onClick={() => setOpen(false)}
                  title="Open Saved Workspace Chatbot Folder"
                  className="h-7 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white text-[11px] font-medium flex items-center gap-1 transition cursor-pointer border border-slate-700"
                >
                  <svg className="h-3.5 w-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span className="hidden sm:inline">Workspace</span>
                </Link>
              )}

              {/* Reset/Clear Chat Button */}
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChat}
                  title="Clear conversation"
                  aria-label="Clear conversation"
                  className="h-7 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 transition cursor-pointer border border-slate-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}

              {/* Red Circle Close Button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Close Chat"
                aria-label="Close Chat"
                className="h-7 w-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-all shadow-sm hover:scale-110 active:scale-95 cursor-pointer shrink-0 border border-rose-400"
              >
                <svg className="h-3.5 w-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Toast Notification Banner when saved */}
          {toastMessage && (
            <div className="bg-emerald-600 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top duration-150">
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{toastMessage}</span>
              </span>
              <Link
                to={`/dashboard/workspace?tab=chatbot&domain=${detectedDomain || 'all'}`}
                onClick={() => setOpen(false)}
                className="underline text-[11px] font-semibold text-emerald-100 hover:text-white"
              >
                View
              </Link>
            </div>
          )}

          {/* Message List */}
          <div ref={listRef} className="flex-1 space-y-3.5 overflow-y-auto bg-slate-50/60 p-3 sm:p-4 text-xs sm:text-sm">
            {messages.length === 0 && (
              <div className="space-y-3 py-2">
                {/* Domain or Product Welcome Greeting */}
                <div
                  className={`rounded-2xl border p-4 shadow-2xs ${
                    isLandingPage
                      ? 'border-cyan-200/90 bg-gradient-to-br from-cyan-50/80 via-sky-50/40 to-white'
                      : 'border-slate-200/80 bg-gradient-to-br from-slate-50 to-white'
                  }`}
                >
                  <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 mb-1.5">
                    <span className="text-base sm:text-lg">💬</span>
                    <span>{activeConfig.greetingTitle || `Namaste! ${activeConfig.title} at your service.`}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] sm:text-xs leading-relaxed">
                    {activeConfig.greeting}
                  </p>
                </div>

                {/* Section Header Label */}
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
                  <span>{isLandingPage ? 'Common Questions About DeciXAI' : `Example Prompts (${activeConfig.badge})`}</span>
                  <span className="text-[10px] text-cyan-600 font-semibold lowercase">tap to ask</span>
                </div>

                {/* Starters List */}
                <div className="grid gap-1.5">
                  {activeConfig.starters.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(item.prompt)}
                      className="group flex flex-col text-left rounded-xl border border-slate-200 bg-white p-2.5 transition hover:border-cyan-400 hover:bg-cyan-50/40 cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 group-hover:text-cyan-800">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-400 group-hover:text-cyan-600 font-semibold">
                          Ask →
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-slate-950 mt-0.5 leading-snug">
                        {item.prompt}
                      </span>
                      {item.detail && (
                        <span className="text-[10px] text-slate-400 group-hover:text-slate-500 mt-0.5 leading-tight">
                          {item.detail}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, idx) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`relative group max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-2xs leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-slate-900 text-white font-medium rounded-br-xs'
                      : message.isError
                      ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-bl-xs'
                      : 'bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs'
                  }`}
                >
                  {message.role === 'user' ? (
                    <div className="whitespace-pre-wrap text-xs sm:text-sm">{message.content}</div>
                  ) : (
                    <FormattedMessage content={message.content} />
                  )}

                  {/* Actions Bar for Assistant Messages (Copy & Save to Workspace) */}
                  {message.role === 'assistant' && message.content && !message.isError && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                      <span className="font-semibold text-slate-400">{activeConfig.title}</span>

                      <div className="flex items-center gap-1.5">
                        {/* Save to Workspace Button */}
                        <button
                          type="button"
                          onClick={() => handleSaveToWorkspace(message, idx)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            savedIds.has(message.id)
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-cyan-800 border border-slate-200'
                          }`}
                          title="Save this roadmap / response to Saved Workspace"
                        >
                          {savedIds.has(message.id) ? (
                            <>
                              <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Saved</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                              <span>Save to Workspace</span>
                            </>
                          )}
                        </button>

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => copyMessage(message.content, message.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer"
                          title="Copy response"
                        >
                          {copiedId === message.id ? (
                            <>
                              <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-emerald-700 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing / Generating Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-600 shadow-2xs">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  <span className="font-medium">DeciXAI is thinking &amp; generating...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input & Control Bar */}
          <div className="border-t border-slate-200 bg-white p-2.5 sm:p-3">
            <div className="relative flex items-end rounded-xl border border-slate-200 bg-slate-50/90 focus-within:border-cyan-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-cyan-500/20 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                disabled={loading}
                className="w-full resize-none bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-800 outline-none disabled:opacity-60 placeholder:text-slate-400 max-h-28"
                placeholder={
                  loading
                    ? 'Generating response...'
                    : isLandingPage
                    ? 'Have a question about DeciXAI? Ask here (e.g. features, 4 studios, What-If)...'
                    : `Ask ${activeConfig.title} in English or Hindi (Enter to send)...`
                }
              />

              <div className="m-1.5 shrink-0 flex items-center gap-1">
                {/* Stop generating button */}
                {loading ? (
                  <button
                    type="button"
                    onClick={stopGenerating}
                    title="Stop generation"
                    className="rounded-lg bg-rose-500 hover:bg-rose-600 text-white px-2.5 py-1.5 text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span className="h-2 w-2 rounded-xs bg-white" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!input.trim()}
                    onClick={() => sendMessage()}
                    title="Send message"
                    className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <span>Send</span>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
              <span>Shift + Enter for new line</span>
              <span className="font-medium text-slate-500">{activeConfig.badge}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
