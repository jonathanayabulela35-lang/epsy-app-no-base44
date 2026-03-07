import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null) // Supabase user object
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function hydrate() {
      try {
        setIsLoadingAuth(true)
        setAuthError(null)

        const { data, error } = await supabase.auth.getSession()
        if (error) throw error

        const sessionUser = data?.session?.user ?? null

        if (!mounted) return
        setUser(sessionUser)
        setIsAuthenticated(!!sessionUser)
        setIsLoadingAuth(false)
      } catch (e) {
        if (!mounted) return
        setUser(null)
        setIsAuthenticated(false)
        setIsLoadingAuth(false)
        setAuthError({ type: 'auth_error', message: e?.message || 'Authentication error' })
      }
    }

    hydrate()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      setIsAuthenticated(!!sessionUser)
      setAuthError(sessionUser ? null : { type: 'auth_required', message: 'Authentication required' })
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      logout: async () => {
        await supabase.auth.signOut()
      },
      // This now becomes a front-end navigation concern (React Router)
      navigateToLogin: () => {
        window.location.href = '/login'
      },
    }),
    [user, isAuthenticated, isLoadingAuth, authError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}