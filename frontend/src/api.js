const defaultApiBase = `${window.location.protocol}//${window.location.hostname}:8000`
const API_BASE = import.meta.env.VITE_API_BASE_URL || defaultApiBase

const postJson = async (path, body) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`)
  }
  return res.json()
}

export const submitCareer = (payload) => postJson('/career', payload)
export const submitFinance = (payload) => postJson('/finance', payload)
export const submitStartup = (payload) => postJson('/startup', payload)
export const submitPolicy = (payload) => postJson('/policy', payload)
export const submitChatbot = (payload) => postJson('/chatbot', payload)
