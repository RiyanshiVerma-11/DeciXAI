const defaultApiBase = `${window.location.protocol}//${window.location.hostname}:8002`
const API_BASE = import.meta.env.VITE_API_BASE_URL || defaultApiBase

const postJson = async (path, body, token) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const rawText = await res.text()

  if (!res.ok) {
    try {
      const errJson = JSON.parse(rawText)
      throw new Error(errJson.detail || `API error ${res.status}`)
    } catch (e) {
      if (e.message && !e.message.startsWith('API error')) throw e
      throw new Error(`API error ${res.status}: ${rawText || res.statusText || 'Request failed'}`)
    }
  }

  if (!rawText.trim()) {
    throw new Error(`API returned an empty response for ${path}`)
  }

  try {
    return JSON.parse(rawText)
  } catch {
    throw new Error(`API returned a non-JSON response for ${path}: ${rawText}`)
  }
}

const getJson = async (path, token) => {
  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { headers })
  const rawText = await res.text()

  if (!res.ok) {
    try {
      const errJson = JSON.parse(rawText)
      throw new Error(errJson.detail || `API error ${res.status}`)
    } catch (e) {
      if (e.message && !e.message.startsWith('API error')) throw e
      throw new Error(`API error ${res.status}: ${rawText || res.statusText || 'Request failed'}`)
    }
  }

  return JSON.parse(rawText)
}

const deleteJson = async (path, token) => {
  const headers = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
  })
  const rawText = await res.text()
  if (!res.ok) {
    try {
      const errJson = JSON.parse(rawText)
      throw new Error(errJson.detail || `API error ${res.status}`)
    } catch (e) {
      if (e.message && !e.message.startsWith('API error')) throw e
      throw new Error(`API error ${res.status}: ${rawText || res.statusText || 'Request failed'}`)
    }
  }
  return rawText ? JSON.parse(rawText) : { status: 'success' }
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const registerUser = (payload) => postJson('/api/v1/auth/register', payload)
export const loginUser = (payload) => postJson('/api/v1/auth/login', payload)
export const fetchCurrentUser = (token) => getJson('/api/v1/auth/me', token)

// ---------------------------------------------------------------------------
// Domain API
// ---------------------------------------------------------------------------

export const submitCareer = (payload) => postJson('/api/v1/career/', payload)
export const submitCareerPrompt = (payload) => postJson('/api/v1/career/parse', payload)
export const submitFinance = (payload) => postJson('/api/v1/finance/', payload)
export const submitStartup = (payload) => postJson('/api/v1/startup/', payload)
export const submitStartupPrompt = (payload) => postJson('/api/v1/startup/parse', payload)
export const submitPolicy = (payload) => postJson('/api/v1/policy/', payload)
export const submitChatbot = (payload) => postJson('/api/v1/chatbot/', payload)

export const downloadPdf = async (domain, resultData) => {
  const res = await fetch(`${API_BASE}/api/v1/export/${domain}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resultData),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to download report: ${errorText || res.statusText}`)
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `decixai_${domain}_report.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Workspace & Decisions API
// ---------------------------------------------------------------------------

export const saveDecision = (payload, token) => postJson('/api/v1/decisions', payload, token)
export const fetchSavedDecisions = (domain = '', search = '', token) => {
  const params = new URLSearchParams()
  if (domain) params.set('domain', domain)
  if (search) params.set('search', search)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return getJson(`/api/v1/decisions${qs}`, token)
}
export const fetchDecisionById = (id, token) => getJson(`/api/v1/decisions/${id}`, token)
export const deleteDecision = (id, token) => deleteJson(`/api/v1/decisions/${id}`, token)
export const toggleDecisionShare = (id, isPublic, token) => postJson(`/api/v1/decisions/${id}/share`, { is_public: isPublic }, token)
export const fetchPublicReport = (shareToken) => getJson(`/api/v1/decisions/public/${shareToken}`)

// ---------------------------------------------------------------------------
// Developer Hub & API Keys
// ---------------------------------------------------------------------------

export const fetchApiKeys = (token) => getJson('/api/v1/keys', token)
export const createApiKey = (name, token) => postJson('/api/v1/keys', { name }, token)
export const deleteApiKey = (id, token) => deleteJson(`/api/v1/keys/${id}`, token)

// ---------------------------------------------------------------------------
// Subscription Tier Upgrade
// ---------------------------------------------------------------------------

export const updateUserTier = (tier, token) => postJson('/api/v1/auth/tier', { tier }, token)
