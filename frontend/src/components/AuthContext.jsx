import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loginUser, registerUser, fetchCurrentUser } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('decixai_token'))
  const [loading, setLoading] = useState(true)

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      const savedToken = localStorage.getItem('decixai_token')
      if (savedToken) {
        try {
          const userData = await fetchCurrentUser(savedToken)
          setUser(userData ? { ...userData, token: savedToken } : null)
          setToken(savedToken)
        } catch {
          localStorage.removeItem('decixai_token')
          setToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }
    restore()
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await loginUser({ email, password })
    localStorage.setItem('decixai_token', data.access_token)
    setToken(data.access_token)
    setUser(data.user ? { ...data.user, token: data.access_token } : null)
    return data
  }, [])

  const register = useCallback(async (email, name, password) => {
    const data = await registerUser({ email, name, password })
    localStorage.setItem('decixai_token', data.access_token)
    setToken(data.access_token)
    setUser(data.user ? { ...data.user, token: data.access_token } : null)
    return data
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) return
    try {
      const userData = await fetchCurrentUser(token)
      setUser(userData ? { ...userData, token } : null)
      return userData
    } catch (e) {
      console.error('Failed to refresh user profile:', e)
    }
  }, [token])

  const loginWithToken = useCallback((newToken, newUser) => {
    localStorage.setItem('decixai_token', newToken)
    setToken(newToken)
    setUser(newUser ? { ...newUser, token: newToken } : null)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('decixai_token')
    setToken(null)
    setUser(null)
  }, [])

  const value = {
    user,
    setUser,
    token,
    isAuthenticated: !!user && !!token,
    loading,
    login,
    loginWithToken,
    register,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
