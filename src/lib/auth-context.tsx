'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api, logout as apiLogout, type AuthUser } from './api'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  can: (...permissions: string[]) => boolean
  signOut: () => Promise<void>
  reload: () => Promise<void>
}

const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  can: () => false,
  signOut: async () => {},
  reload: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const load = async () => {
    try {
      // The access token is memory-only, so a reload starts by exchanging the
      // httpOnly refresh cookie for a new one.
      await api.refresh()
      const res = await api.get<{ user: AuthUser }>('/auth/me')
      setUser(res.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        /** Mirrors the API's `requirePermission` — "any of these". */
        can: (...permissions) => !!user && permissions.some((p) => user.permissions.includes(p)),
        signOut: async () => {
          await apiLogout()
          setUser(null)
          router.push('/login')
        },
        reload: load,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
