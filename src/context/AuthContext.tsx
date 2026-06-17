import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  getSupabase,
  getSupabaseConfigDiagnostics,
  getSupabaseConfigError,
  isSupabaseConfigured,
  mapSupabaseAuthError,
} from '../lib/supabase'
import type { SubscriptionPlan } from '../data/subscriptionPlans'
import { API_BASE } from '../services/apiClient'
import { getAuthHeaders } from '../services/authHeaders'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  plan: SubscriptionPlan
  planLoading: boolean
  isConfigured: boolean
  configError: string | null
  configDiagnostics: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signOut: () => Promise<void>
  refreshPlan: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchPlan(): Promise<SubscriptionPlan> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch(`${API_BASE}/api/account/plan`, { headers })
    if (!response.ok) return 'free'
    const data = (await response.json()) as { plan?: SubscriptionPlan }
    return data.plan === 'pro' ? 'pro' : 'free'
  } catch {
    return 'free'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [plan, setPlan] = useState<SubscriptionPlan>('free')
  const [planLoading, setPlanLoading] = useState(false)

  const refreshPlan = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      setPlan('free')
      return
    }
    setPlanLoading(true)
    try {
      setPlan(await fetchPlan())
    } finally {
      setPlanLoading(false)
    }
  }, [user])

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }

    let active = true

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
        setUser(data.session?.user ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    void refreshPlan()
  }, [refreshPlan])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) return { error: getSupabaseConfigError() ?? 'Supabase ist nicht konfiguriert.' }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: mapSupabaseAuthError(error?.message) }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) {
      return { error: getSupabaseConfigError() ?? 'Supabase ist nicht konfiguriert.', needsConfirmation: false }
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    const needsConfirmation = Boolean(data.user && !data.session)
    return { error: mapSupabaseAuthError(error?.message), needsConfirmation }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (supabase) await supabase.auth.signOut()
    setPlan('free')
  }, [])

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      plan,
      planLoading,
      isConfigured: isSupabaseConfigured,
      configError: getSupabaseConfigError(),
      configDiagnostics: import.meta.env.DEV ? getSupabaseConfigDiagnostics() : null,
      signIn,
      signUp,
      signOut,
      refreshPlan,
    }),
    [user, session, loading, plan, planLoading, signIn, signUp, signOut, refreshPlan],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
