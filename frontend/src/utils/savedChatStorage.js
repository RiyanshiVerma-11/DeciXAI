// Storage and management for saved Chatbot insights, roadmaps, and studio responses

const STORAGE_KEY = 'decixai_saved_chat_insights'

export const getSavedChatInsights = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error('Failed to read saved chat insights', e)
    return []
  }
}

export const saveChatInsight = ({ content, domain = 'career', userQuery = '', title = '' }) => {
  try {
    const existing = getSavedChatInsights()
    
    // Auto-generate title if not provided
    let finalTitle = title.trim()
    if (!finalTitle && userQuery.trim()) {
      finalTitle = userQuery.trim().slice(0, 60) + (userQuery.trim().length > 60 ? '...' : '')
    } else if (!finalTitle) {
      // Use the first line of content
      const firstLine = content.split('\n')[0].replace(/^[#*•\s-]+/, '').trim()
      finalTitle = firstLine ? firstLine.slice(0, 60) : `${domain.toUpperCase()} AI Guidance`
    }

    const newInsight = {
      id: `chat-note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      content,
      domain: (domain || 'career').toLowerCase(),
      title: finalTitle,
      userQuery: userQuery || '',
      created_at: new Date().toISOString(),
    }

    const updated = [newInsight, ...existing]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

    // Dispatch event so other components (e.g. SavedProjects) know immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('decixai_chat_saved', { detail: newInsight }))
    }

    return newInsight
  } catch (e) {
    console.error('Failed to save chat insight', e)
    return null
  }
}

export const deleteChatInsight = (id) => {
  try {
    const existing = getSavedChatInsights()
    const updated = existing.filter((item) => item.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('decixai_chat_deleted', { detail: id }))
    }
    return true
  } catch (e) {
    console.error('Failed to delete chat insight', e)
    return false
  }
}

export const isInsightSaved = (content) => {
  if (!content) return false
  const existing = getSavedChatInsights()
  return existing.some((item) => item.content.trim() === content.trim())
}
