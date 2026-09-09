import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSavedDecisions, deleteDecision, toggleDecisionShare, downloadPdf } from '../api'
import { useAuth } from '../components/AuthContext'
import CompareModal from '../components/CompareModal'

export default function SavedProjects() {
  const navigate = useNavigate()
  const { token } = useAuth()
  
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDomain, setSelectedDomain] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedToken, setCopiedToken] = useState(null)

  // Comparison selection
  const [compareItems, setCompareItems] = useState([])
  const [isCompareOpen, setIsCompareOpen] = useState(false)

  const loadDecisions = async () => {
    setLoading(true)
    try {
      const data = await fetchSavedDecisions('', '', token)
      setDecisions(data)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load workspace decisions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadDecisions()
    }
  }, [token])

  const filteredDecisions = useMemo(() => {
    return decisions.filter((item) => {
      const matchDomain = selectedDomain === 'all' || item.domain.toLowerCase() === selectedDomain.toLowerCase()
      const matchSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.toLowerCase().includes(searchQuery.toLowerCase())
      return matchDomain && matchSearch
    })
  }, [decisions, selectedDomain, searchQuery])

  const handleDelete = async (id, e) => {
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

  const handleShare = async (item, e) => {
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
    // Navigate to studio with saved input
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

  const getDomainColor = (domain) => {
    switch (domain?.toLowerCase()) {
      case 'career':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'finance':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'startup':
        return 'bg-violet-50 text-violet-700 border-violet-200'
      case 'policy':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  return (
    <main className="p-5 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Workspace Banner */}
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-md md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-sky-700">
              📁 Project Workspaces
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              Saved Decision Dossiers
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review, compare, share, and reload your historical decision simulations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {compareItems.length === 2 && (
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
              <span>+ New Analysis</span>
            </button>
          </div>
        </div>

        {/* Filter bar & Search */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          
          {/* Domain tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/70 bg-white/60 p-1.5 shadow-sm backdrop-blur-sm">
            {['all', 'career', 'finance', 'startup', 'policy'].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDomain(d)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                  selectedDomain === d
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {d === 'all' ? 'All Domains' : d}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative min-w-[260px]">
            <input
              type="text"
              placeholder="Search dossiers, tags, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Decision Cards List */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/50">
            <div className="text-center text-sm font-semibold text-slate-500">
              <span className="inline-block animate-spin mr-2">⚙</span> Loading your workspace dossiers...
            </div>
          </div>
        ) : filteredDecisions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-12 text-center shadow-sm">
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
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold uppercase text-white shadow-sm hover:bg-sky-700"
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

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenInStudio(item)}
                  className={`group relative cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                    isComparing ? 'border-sky-400 ring-2 ring-sky-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top line: domain & compare checkbox */}
                  <div className="flex items-center justify-between">
                    <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${getDomainColor(item.domain)}`}>
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
                        onClick={(e) => handleShare(item, e)}
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
                        onClick={(e) => handleDelete(item.id, e)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete dossier"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
