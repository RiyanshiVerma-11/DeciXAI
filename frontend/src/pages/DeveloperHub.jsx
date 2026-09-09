import React, { useState, useEffect } from 'react'
import { fetchApiKeys, createApiKey, deleteApiKey } from '../api'
import { useAuth } from '../components/AuthContext'

export default function DeveloperHub() {
  const { token, user } = useAuth()
  
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null)
  const [copiedSecret, setCopiedSecret] = useState(false)

  // Code generator state
  const [selectedLanguage, setSelectedLanguage] = useState('curl')
  const [selectedEndpoint, setSelectedEndpoint] = useState('career')
  const [copiedSnippet, setCopiedSnippet] = useState(false)

  const loadKeys = async () => {
    setLoading(true)
    try {
      const data = await fetchApiKeys(token)
      setKeys(data)
    } catch (err) {
      console.error('Failed to load API keys:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      loadKeys()
    }
  }, [token])

  const handleCreateKey = async (e) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const created = await createApiKey(newKeyName.trim(), token)
      setNewlyCreatedKey(created)
      setNewKeyName('')
      setKeys((prev) => [created, ...prev])
    } catch (err) {
      alert(err.message || 'Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteKey = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this API key? External requests using this key will immediately fail.')) return
    try {
      await deleteApiKey(id, token)
      setKeys((prev) => prev.filter((k) => k.id !== id))
    } catch (err) {
      alert(err.message || 'Failed to revoke API key')
    }
  }

  const handleCopySecret = () => {
    if (!newlyCreatedKey) return
    navigator.clipboard.writeText(newlyCreatedKey.secret_key)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  // Snippet generator
  const getSnippet = () => {
    const activeKeyStr = newlyCreatedKey ? newlyCreatedKey.secret_key : (keys[0] ? `${keys[0].prefix}` : 'dx_live_YOUR_API_KEY')
    const apiHost = window.location.origin.includes('5173') ? 'http://localhost:8000' : window.location.origin

    let payload = {}
    let endpointPath = ''

    switch (selectedEndpoint) {
      case 'career':
        endpointPath = '/api/v1/career/'
        payload = {
          cgpa: 8.5,
          skills: ['Python', 'PyTorch', 'LangChain', 'vLLM'],
          projects: ['Local RAG Engine', 'Agentic Workflow'],
          interest: 'ai engineer',
          course: 'B.Tech CS',
        }
        break
      case 'finance':
        endpointPath = '/api/v1/finance/'
        payload = {
          income: 85000,
          loan: 220000,
          credit_score: 740,
        }
        break
      case 'startup':
        endpointPath = '/api/v1/startup/'
        payload = {
          funding: 300000,
          team_size: 5,
          market: 'B2B AI SaaS',
          experience: 4.5,
        }
        break
      case 'policy':
        endpointPath = '/api/v1/policy/'
        payload = {
          sector: 'Renewable Energy',
          budget: 5000000,
          population: 120000,
          political_support: 'high',
          infrastructure_readiness: 'medium',
        }
        break
      default:
        endpointPath = '/api/v1/career/'
    }

    if (selectedLanguage === 'curl') {
      return `curl -X POST "${apiHost}${endpointPath}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${activeKeyStr}" \\
  -d '${JSON.stringify(payload, null, 2)}'`
    }

    if (selectedLanguage === 'python') {
      return `import requests

url = "${apiHost}${endpointPath}"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "${activeKeyStr}"
}
payload = ${JSON.stringify(payload, null, 4)}

response = requests.post(url, json=payload, headers=headers)
decision = response.json()

print(f"Viability Score: {decision.get('score')}")
print(f"SHAP Explanation: {decision.get('explanation')}")`
    }

    if (selectedLanguage === 'nodejs') {
      return `const url = "${apiHost}${endpointPath}";
const payload = ${JSON.stringify(payload, null, 2)};

async function runDecision() {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": "${activeKeyStr}"
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log("Decision result:", data);
}

runDecision();`
    }

    return ''
  }

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(getSnippet())
    setCopiedSnippet(true)
    setTimeout(() => setCopiedSnippet(false), 2000)
  }

  return (
    <main className="p-5 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Header Banner */}
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-md md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-sky-700">
              🔌 Developer Portal & API Access
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              API Keys & SDK Playground
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Integrate DeciXAI explainable models directly into your systems via REST API.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Plan</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black uppercase text-sky-400">{user?.tier || 'Free'} Tier</span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                100 req/day
              </span>
            </div>
          </div>
        </div>

        {/* API Key Creation & List */}
        <div className="grid gap-6 lg:grid-cols-[1fr,1.3fr]">
          
          {/* Key Management Card */}
          <div className="space-y-4">
            
            {/* Create Key Box */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Generate New API Key</h2>
              <p className="mt-1 text-xs text-slate-500">
                Keys are prefixed with <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700 font-bold">dx_live_</code> and authenticated via the <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700 font-bold">X-API-Key</code> header.
              </p>

              <form onSubmit={handleCreateKey} className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Key name (e.g. My App Backend, Colab Script)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
                <button
                  type="submit"
                  disabled={creating || !newKeyName.trim()}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {creating ? 'Generating...' : '+ Create Key'}
                </button>
              </form>

              {/* One-time Key Secret Alert */}
              {newlyCreatedKey && (
                <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50/70 p-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-800">
                      ⚠️ Copy Secret Key Now
                    </span>
                    <span className="text-[10px] text-emerald-600">Won't be shown again</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-white p-2.5 shadow-sm border border-emerald-200">
                    <code className="text-xs font-bold text-emerald-900 break-all select-all">
                      {newlyCreatedKey.secret_key}
                    </code>
                    <button
                      onClick={handleCopySecret}
                      className="ml-2 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      {copiedSecret ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Active Keys List */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900">Active API Keys ({keys.length})</h3>
              
              {loading ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading keys...</div>
              ) : keys.length === 0 ? (
                <p className="mt-3 text-xs italic text-slate-400">No API keys created yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {keys.map((k) => (
                    <div
                      key={k.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">{k.name}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500">{k.prefix}</div>
                        <div className="mt-1 text-[9px] text-slate-400">
                          Created {new Date(k.created_at).toLocaleDateString()} • {k.rate_limit} req/hr
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteKey(k.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Revoke key"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Interactive Code Snippet Playground */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Interactive API Playground</h3>
                <p className="text-xs text-slate-500">Live snippets tailored with your active authentication key.</p>
              </div>

              {/* Language Selector */}
              <div className="flex rounded-xl bg-slate-100 p-1">
                {['curl', 'python', 'nodejs'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLanguage(lang)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase transition ${
                      selectedLanguage === lang
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {lang === 'nodejs' ? 'Node.js' : lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Endpoint Selector Tabs */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { id: 'career', label: 'Career Studio' },
                { id: 'finance', label: 'Finance Studio' },
                { id: 'startup', label: 'Startup Studio' },
                { id: 'policy', label: 'Policy Studio' },
              ].map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => setSelectedEndpoint(ep.id)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    selectedEndpoint === ep.id
                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {ep.label}
                </button>
              ))}
            </div>

            {/* Code Box */}
            <div className="relative mt-4 overflow-hidden rounded-2xl bg-slate-950 p-4 text-xs font-mono text-slate-200 shadow-inner">
              <button
                onClick={handleCopySnippet}
                className="absolute right-3 top-3 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                {copiedSnippet ? '✓ Copied' : 'Copy Code'}
              </button>
              <pre className="overflow-x-auto whitespace-pre leading-relaxed pr-16">
                {getSnippet()}
              </pre>
            </div>

            {/* Response schema preview */}
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-xs border border-slate-100">
              <div className="font-bold text-slate-700">Expected API Response Format:</div>
              <div className="mt-1 text-[11px] text-slate-500">
                Returns evaluated probability score (0-100), SHAP factor weights, reality checks, and dynamic action roadmaps in standard JSON format.
              </div>
            </div>

          </div>

        </div>

      </div>
    </main>
  )
}
