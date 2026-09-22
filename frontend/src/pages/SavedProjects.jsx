import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { fetchSavedDecisions, deleteDecision, toggleDecisionShare, downloadPdf } from '../api'
import { useAuth } from '../components/AuthContext'
import CompareModal from '../components/CompareModal'
import { getSavedChatInsights, deleteChatInsight } from '../utils/savedChatStorage'
import { FormattedMessage } from '../components/Chatbot'

export default function SavedProjects() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuth()

  // Primary workspace mode: 'dossiers' | 'chatbot'
  const searchParams = new URLSearchParams(location.search)
  const initialMainTab =
    searchParams.get('tab') === 'chatbot' || searchParams.get('view') === 'chatbot'
      ? 'chatbot'
      : 'dossiers'
  const [mainTab, setMainTab] = useState(initialMainTab)

  // Decision Dossiers state
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDomain, setSelectedDomain] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedToken, setCopiedToken] = useState(null)

  // Comparison selection
  const [compareItems, setCompareItems] = useState([])
  const [isCompareOpen, setIsCompareOpen] = useState(false)

  // Chatbot Saved Insights state
  const initialChatDomain = searchParams.get('domain') || 'all'
  const [chatInsights, setChatInsights] = useState([])
  const [selectedChatStudio, setSelectedChatStudio] = useState(initialChatDomain)
  const [copiedChatId, setCopiedChatId] = useState(null)

  const loadDecisions = async () => {
    setLoading(true)
    try {
      const data = await fetchSavedDecisions('', '', token)
      setDecisions(Array.isArray(data) ? data : [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load workspace decisions')
    } finally {
      setLoading(false)
    }
  }

  const loadChatInsights = () => {
    setChatInsights(getSavedChatInsights())
  }

  useEffect(() => {
    loadDecisions()
    loadChatInsights()

    const onChatSaved = () => loadChatInsights()
    const onChatDeleted = () => loadChatInsights()

    window.addEventListener('decixai_chat_saved', onChatSaved)
    window.addEventListener('decixai_chat_deleted', onChatDeleted)

    return () => {
      window.removeEventListener('decixai_chat_saved', onChatSaved)
      window.removeEventListener('decixai_chat_deleted', onChatDeleted)
    }
  }, [token])

  // Sync with URL query parameters if they change
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('tab') === 'chatbot' || params.get('view') === 'chatbot') {
      setMainTab('chatbot')
      if (params.get('domain')) {
        setSelectedChatStudio(params.get('domain'))
      }
    }
  }, [location.search])

  // Filtered Decision Dossiers
  const filteredDecisions = useMemo(() => {
    return decisions.filter((item) => {
      const matchDomain =
        selectedDomain === 'all' || item.domain.toLowerCase() === selectedDomain.toLowerCase()
      const matchSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.toLowerCase().includes(searchQuery.toLowerCase())
      return matchDomain && matchSearch
    })
  }, [decisions, selectedDomain, searchQuery])

  // Filtered Chatbot Saved Insights
  const filteredChatInsights = useMemo(() => {
    return chatInsights.filter((item) => {
      const matchStudio =
        selectedChatStudio === 'all' ||
        (item.domain && item.domain.toLowerCase() === selectedChatStudio.toLowerCase())
      const matchSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.userQuery && item.userQuery.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchStudio && matchSearch
    })
  }, [chatInsights, selectedChatStudio, searchQuery])

  // Studio counts for Chatbot folders
  const chatStudioCounts = useMemo(() => {
    const counts = { all: chatInsights.length, career: 0, finance: 0, startup: 0, policy: 0 }
    for (const item of chatInsights) {
      const d = (item.domain || '').toLowerCase()
      if (counts[d] !== undefined) {
        counts[d] += 1
      }
    }
    return counts
  }, [chatInsights])

  const handleDeleteDecision = async (id, e) => {
    e.stopPropagation()
    if (!window.confirm('Delete this decision from your workspace?')) return
    try {
      await deleteDecision(id, token)
      setDecisions((prev) => prev.filter((d) => d.id !== id))
      setCompareItems((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      alert(err.message || 'Failed to delete decision')
    }
  }

  const handleDeleteChatInsight = (id) => {
    if (!window.confirm('Remove this saved chatbot insight from your workspace?')) return
    deleteChatInsight(id)
    loadChatInsights()
  }

  const handleCopyChatContent = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedChatId(id)
      setTimeout(() => setCopiedChatId(null), 2000)
    }
  }

  const handleDownloadMarkdown = (item) => {
    const blob = new Blob(
      [
        `# ${item.title}\n\n`,
        `**Studio:** ${item.domain?.toUpperCase()}\n`,
        `**Date:** ${new Date(item.created_at).toLocaleString()}\n`,
        item.userQuery ? `**Prompt:** ${item.userQuery}\n\n` : '\n',
        `---\n\n`,
        item.content,
      ],
      { type: 'text/markdown;charset=utf-8' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `decixai_${item.domain}_${item.id}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleShareDecision = async (item, e) => {
    e.stopPropagation()
    try {
      let updatedItem = item
      if (!item.is_public) {
        updatedItem = await toggleDecisionShare(item.id, true, token)
        setDecisions((prev) => prev.map((d) => (d.id === item.id ? updatedItem : d)))
      }
      const shareUrl = `${window.location.origin}/share/${updatedItem.share_token}`
      await navigator.clipboard.writeText(shareUrl)
      setCopiedToken(updatedItem.id)
      setTimeout(() => setCopiedToken(null), 2500)
    } catch (err) {
      alert(err.message || 'Failed to generate share link')
    }
  }

  const handleToggleCompare = (item, e) => {
    e.stopPropagation()
    if (compareItems.some((d) => d.id === item.id)) {
      setCompareItems((prev) => prev.filter((d) => d.id !== item.id))
    } else {
      if (compareItems.length >= 2) {
        setCompareItems([compareItems[1], item])
      } else {
        setCompareItems((prev) => [...prev, item])
      }
    }
  }

  const handleOpenInStudio = (item) => {
    navigate(`/dashboard/${item.domain}`, {
      state: {
        preloadedInput: item.input_payload,
        preloadedOutput: item.output_payload,
        preloadedTitle: item.title,
      },
    })
  }

  const handleDownloadPdf = async (item, e) => {
    e.stopPropagation()
    try {
      await downloadPdf(item.domain, item.output_payload)
    } catch (err) {
      alert(err.message || 'Failed to download report')
    }
  }

  const getDomainTheme = (domain) => {
    switch (domain?.toLowerCase()) {
      case 'career':
        return {
          pill: 'bg-cyan-50 text-cyan-800 border-cyan-200',
          icon: '🎓',
          name: 'Career Studio',
        }
      case 'finance':
        return {
          pill: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: '💳',
          name: 'Finance Studio',
        }
      case 'startup':
        return {
          pill: 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200',
          icon: '🚀',
          name: 'Startup Studio',
        }
      case 'policy':
        return {
          pill: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: '📜',
          name: 'Policy Studio',
        }
      default:
        return {
          pill: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: '⚡',
          name: 'General',
        }
    }
  }

  return (
    <main className="p-5 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Workspace Banner */}
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-md md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-sky-700">
              📁 Central Saved Workspace
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              Workspace &amp; Intelligence Hub
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review saved decision dossiers and access bookmarked AI Copilot roadmaps categorized by studio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {mainTab === 'dossiers' && compareItems.length === 2 && (
              <button
                onClick={() => setIsCompareOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:scale-[1.02]"
              >
                <span>⚡ Compare ({compareItems.length})</span>
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard/career')}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-slate-800"
            >
              <span>+ New Simulation</span>
            </button>
          </div>
        </div>

        {/* Primary View Switcher: Decision Dossiers vs Dedicated Chatbot Workspace */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMainTab('dossiers')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                mainTab === 'dossiers'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>Decision Dossiers</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.2 text-[10px] text-slate-300 font-bold">
                {decisions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('chatbot')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                mainTab === 'chatbot'
                  ? 'bg-slate-950 text-white shadow-sm ring-2 ring-cyan-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Chatbot Saved Insights</span>
              <span className="rounded-full bg-cyan-950 border border-cyan-800 px-2 py-0.2 text-[10px] text-cyan-300 font-bold">
                {chatInsights.length}
              </span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder={mainTab === 'chatbot' ? 'Search roadmaps, topics...' : 'Search dossiers, tags, notes...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-2xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* VIEW 1: DEDICATED CHATBOT SAVED WORKSPACE (4 STUDIO FOLDERS) */}
        {/* ============================================================ */}
        {mainTab === 'chatbot' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* 4 Studio Tabs (Folders) */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 p-2 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2">
                Studio Folders:
              </span>
              {[
                { id: 'all', label: '⚡ All Folders', count: chatStudioCounts.all },
                { id: 'career', label: '🎓 Career Studio', count: chatStudioCounts.career },
                { id: 'finance', label: '💳 Finance Studio', count: chatStudioCounts.finance },
                { id: 'startup', label: '🚀 Startup Studio', count: chatStudioCounts.startup },
                { id: 'policy', label: '📜 Policy Studio', count: chatStudioCounts.policy },
              ].map((tab) => {
                const isActive = selectedChatStudio === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedChatStudio(tab.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        isActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* List of Saved Chatbot Insights */}
            {filteredChatInsights.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-12 text-center shadow-2xs">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-2xl text-cyan-600">
                  💬
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-800">
                  {selectedChatStudio === 'all'
                    ? 'No saved chatbot insights yet'
                    : `No saved ${selectedChatStudio.toUpperCase()} insights found`}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-xs text-slate-500 leading-relaxed">
                  When chatting with DeciXAI Copilot, click{' '}
                  <strong className="text-slate-700">"Save to Workspace"</strong> on any roadmap,
                  guidance, or interview response to automatically store it in its dedicated Studio folder!
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <button
                    onClick={() =>
                      navigate(
                        selectedChatStudio !== 'all'
                          ? `/dashboard/${selectedChatStudio}`
                          : '/dashboard/career'
                      )
                    }
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition cursor-pointer"
                  >
                    Open {selectedChatStudio !== 'all' ? `${selectedChatStudio} Studio` : 'Career Studio'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {filteredChatInsights.map((item) => {
                  const theme = getDomainTheme(item.domain)

                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-md transition-all border-l-4"
                      style={{
                        borderLeftColor:
                          item.domain === 'career'
                            ? '#06b6d4'
                            : item.domain === 'finance'
                            ? '#10b981'
                            : item.domain === 'startup'
                            ? '#d946ef'
                            : '#f59e0b',
                      }}
                    >
                      <div>
                        {/* Top Meta Line: Domain Badge + Date */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${theme.pill}`}
                          >
                            <span>{theme.icon}</span>
                            <span>{theme.name}</span>
                          </span>

                          <span className="text-[11px] text-slate-400 font-medium">
                            {new Date(item.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="mt-3 text-base font-bold text-slate-900 leading-snug">
                          {item.title}
                        </h3>

                        {/* User Prompt / Context Box */}
                        {item.userQuery && (
                          <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-600">
                            <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                              User Question / Prompt:
                            </span>
                            <span className="italic">"{item.userQuery}"</span>
                          </div>
                        )}

                        {/* Complete Formatted AI Response */}
                        <div className="mt-3.5 max-h-96 overflow-y-auto rounded-xl border border-slate-150 bg-slate-50/50 p-3.5 text-xs text-slate-800 leading-relaxed shadow-inner">
                          <FormattedMessage content={item.content} />
                        </div>
                      </div>

                      {/* Bottom Action Toolbar */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/${item.domain}`)}
                          className="text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open {item.domain} Studio</span>
                          <span>→</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Copy Content */}
                          <button
                            type="button"
                            onClick={() => handleCopyChatContent(item.content, item.id)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1"
                            title="Copy full insight text"
                          >
                            {copiedChatId === item.id ? (
                              <>
                                <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-emerald-700">Copied</span>
                              </>
                            ) : (
                              <>
                                <svg className="h-3 w-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Export / Download Markdown */}
                          <button
                            type="button"
                            onClick={() => handleDownloadMarkdown(item)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                            title="Download as Markdown (.md)"
                          >
                            .MD
                          </button>

                          {/* Delete Note */}
                          <button
                            type="button"
                            onClick={() => handleDeleteChatInsight(item.id)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                            title="Delete this note"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: STANDARD DECISION DOSSIERS */}
        {/* ============================================================ */}
        {mainTab === 'dossiers' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Domain filter tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/70 bg-white/60 p-1.5 shadow-2xs backdrop-blur-sm">
              {['all', 'career', 'finance', 'startup', 'policy'].map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDomain(d)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                    selectedDomain === d
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {d === 'all' ? 'All Domains' : d}
                </button>
              ))}
            </div>

            {/* Decision Cards List */}
            {loading ? (
              <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/50">
                <div className="text-center text-sm font-semibold text-slate-500">
                  <span className="inline-block animate-spin mr-2">⚙</span> Loading your workspace dossiers...
                </div>
              </div>
            ) : filteredDecisions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center shadow-2xs">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-2xl">
                  📂
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-800">No saved decisions found</h3>
                <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
                  Run an evaluation in Career, Finance, Startup, or Policy studio and click 
                  <strong> "Save to Workspace"</strong> to keep track of your decision dossiers.
                </p>
                <div className="mt-6 flex justify-center gap-2">
                  <button
                    onClick={() => navigate('/dashboard/career')}
                    className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold uppercase text-white shadow-sm hover:bg-sky-700 cursor-pointer"
                  >
                    Explore Studios
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredDecisions.map((item) => {
                  const isComparing = compareItems.some((d) => d.id === item.id)
                  const scoreVal = Math.round(item.score || 0)
                  const theme = getDomainTheme(item.domain)

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenInStudio(item)}
                      className={`group relative cursor-pointer rounded-2xl border bg-white p-5 shadow-2xs transition-all hover:-translate-y-1 hover:shadow-md ${
                        isComparing ? 'border-sky-400 ring-2 ring-sky-200' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Top line: domain & compare checkbox */}
                      <div className="flex items-center justify-between">
                        <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${theme.pill}`}>
                          {item.domain}
                        </span>
                        
                        <button
                          onClick={(e) => handleToggleCompare(item, e)}
                          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase transition ${
                            isComparing
                              ? 'bg-sky-500 text-white'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                          }`}
                          title="Select up to 2 items to compare side-by-side"
                        >
                          {isComparing ? '✓ Comparing' : '+ Compare'}
                        </button>
                      </div>

                      {/* Title */}
                      <h3 className="mt-3 text-base font-bold text-slate-900 line-clamp-1 group-hover:text-sky-600">
                        {item.title}
                      </h3>

                      {/* Score & verdict */}
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <div>
                          <div className="text-[10px] font-semibold uppercase text-slate-400">Score</div>
                          <div className="text-xl font-black text-slate-900">{scoreVal}<span className="text-xs font-normal text-slate-400">/100</span></div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-semibold uppercase text-slate-400">Verdict</div>
                          <div className="text-xs font-bold text-slate-700">{item.verdict || 'Evaluated'}</div>
                        </div>
                      </div>

                      {/* Notes / Tags */}
                      {item.notes && (
                        <p className="mt-2 text-xs text-slate-500 line-clamp-2 italic">
                          "{item.notes}"
                        </p>
                      )}

                      {item.tags && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.tags.split(',').map((tag, idx) => (
                            <span key={idx} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Date and Action bar */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        
                        <div className="flex items-center gap-2">
                          {/* Share Button */}
                          <button
                            onClick={(e) => handleShareDecision(item, e)}
                            className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase transition ${
                              copiedToken === item.id
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                            title="Copy public verification link"
                          >
                            {copiedToken === item.id ? '✓ Copied' : 'Share'}
                          </button>

                          {/* PDF download */}
                          <button
                            onClick={(e) => handleDownloadPdf(item, e)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50"
                            title="Download PDF"
                          >
                            PDF
                          </button>

                          {/* Delete */}
                          <button
                            onClick={(e) => handleDeleteDecision(item.id, e)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                            title="Delete dossier"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Side-by-Side Comparison Modal */}
      {isCompareOpen && compareItems.length === 2 && (
        <CompareModal
          itemA={compareItems[0]}
          itemB={compareItems[1]}
          onClose={() => setIsCompareOpen(false)}
        />
      )}
    </main>
  )
}
