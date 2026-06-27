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
import { attributeReferral } from '../services/aiCreditsApi'
import { recordLegalConsent } from '../services/legalConsentApi'
import { clearSessionOnLogout } from '../utils/devicePreferences'
import { clearStoredReferralCode, getStoredReferralCode } from '../utils/referralCapture'
import {
  clearPendingLegalConsent,
  getPendingLegalConsent,
  markPendingLegalConsent,
} from '../utils/legalConsentPending'
import { LEGAL_LAST_UPDATED } from '../../shared/legalVersion'

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
  signUp: (
    email: string,
    password: string,
    consent?: SignupConsent,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signOut: () => Promise<void>
  refreshPlan: () => Promise<void>
}

/** Consent captured at sign-up: whether the legal terms were accepted + locale. */
export interface SignupConsent {
  acceptedTerms: boolean
  locale: string
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

  // When a user lands via an invite link and then authenticates, attribute the
  // referral exactly once (server-side is idempotent + ignores self-referrals).
  useEffect(() => {
    if (!user) return
    const code = getStoredReferralCode()
    if (!code) return
    void attributeReferral(code)
      .then(() => clearStoredReferralCode())
      .catch(() => {
        // Leave the code stored to retry on the next session; non-fatal.
      })
  }, [user])

  // Durable Datenschutz/AGB consent: if the user accepted at sign-up but their
  // consent could not be recorded then (email-confirmation path → no session),
  // record it now that they are authenticated. The endpoint is idempotent per
  // (user_id, version), so retries are safe and self-deduplicating.
  useEffect(() => {
    if (!user) return
    const pending = getPendingLegalConsent()
    if (!pending) return
    void recordLegalConsent(pending.locale)
      .then(() => clearPendingLegalConsent())
      .catch(() => {
        // Leave the marker stored to retry on the next session; non-fatal.
      })
  }, [user])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) return { error: getSupabaseConfigError() ?? 'Supabase ist nicht konfiguriert.' }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: mapSupabaseAuthError(error?.message) }
  }, [])

  const signUp = useCallback(async (email: string, password: string, consent?: SignupConsent) => {
    const supabase = getSupabase()
    if (!supabase) {
      return { error: getSupabaseConfigError() ?? 'Supabase ist nicht konfiguriert.', needsConfirmation: false }
    }

    // Persist the accepted-terms intent BEFORE the network round-trip so it
    // survives the email-confirmation path (where signUp returns no session and
    // consent can only be recorded once the user is later authenticated).
    if (consent?.acceptedTerms) {
      markPendingLegalConsent(LEGAL_LAST_UPDATED, consent.locale)
    }

    const { data, error } = await supabase.auth.signUp({ email, password })
    const needsConfirmation = Boolean(data.user && !data.session)

    // When a session already exists (no email confirmation required) record the
    // consent immediately. Non-fatal on failure: the bootstrap effect retries
    // idempotently on the next authenticated load.
    if (!error && data.session && consent?.acceptedTerms) {
      try {
        await recordLegalConsent(consent.locale)
        clearPendingLegalConsent()
      } catch {
        // Leave the pending marker for the bootstrap retry.
      }
    }

    return { error: mapSupabaseAuthError(error?.message), needsConfirmation }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (supabase) await supabase.auth.signOut()
    clearSessionOnLogout()
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
