'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { api, logout as apiLogout, type AuthUser, type SecurityState } from './api'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  /** Second-factor state of the account and the session behind this tab. */
  security: Pick<SecurityState, 'mfaEnabled' | 'mfaSetupRequired' | 'session'> | null
  can: (...permissions: string[]) => boolean
  signOut: () => Promise<void>
  reload: () => Promise<void>
}

const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  security: null,
  can: () => false,
  signOut: async () => {},
  reload: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [security, setSecurity] = useState<AuthState['security']>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const load = async () => {
    try {
      // The access token and signing key are memory-only, so a reload starts by
      // exchanging the httpOnly refresh cookie for new ones.
      await api.refresh()
      const res = await api.get<SecurityState>('/auth/me')
      setUser(res.user)
      setSecurity({ mfaEnabled: res.mfaEnabled, mfaSetupRequired: res.mfaSetupRequired, session: res.session })
    } catch {
      setUser(null)
      setSecurity(null)
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
        security,
        /** Mirrors the API's `requirePermission` — "any of these". */
        can: (...permissions) => !!user && permissions.some((p) => user.permissions.includes(p)),
        signOut: async () => {
          await apiLogout()
          setUser(null)
          setSecurity(null)
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
