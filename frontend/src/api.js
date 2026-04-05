const defaultApiBase = `${window.location.protocol}//${window.location.hostname}:8000`
const API_BASE = import.meta.env.VITE_API_BASE_URL || defaultApiBase

const postJson = async (path, body) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const rawText = await res.text()

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${rawText || res.statusText || 'Request failed'}`)
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

export const submitCareer = (payload) => postJson('/career', payload)
export const submitCareerPrompt = (payload) => postJson('/career/parse', payload)
export const submitFinance = (payload) => postJson('/finance', payload)
export const submitStartup = (payload) => postJson('/startup', payload)
export const submitStartupPrompt = (payload) => postJson('/startup/parse', payload)
export const submitPolicy = (payload) => postJson('/policy', payload)
export const submitChatbot = (payload) => postJson('/chatbot', payload)
