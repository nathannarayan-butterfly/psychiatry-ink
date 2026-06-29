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
import { setupAccountCloudBackup } from '../utils/accountBackup'
import { clearSessionOnLogout } from '../utils/devicePreferences'
import { reconcileActiveUser } from '../utils/userScopedData'
import { downloadPassphraseBackupFile } from '../utils/passphraseRecovery'
import { getAuthEmailRedirectUrl } from '../utils/authEmailRedirect'
import {
  clearPendingSignupPassphrase,
  getPendingSignupPassphrase,
} from '../utils/pendingSignupPassphrase'
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
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signUp: (
    email: string,
    password: string,
    consent?: SignupConsent,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>
  resendConfirmation: (
    email: string,
  ) => Promise<{ error: string | null; rateLimited: boolean }>
  signOut: () => Promise<void>
  refreshPlan: () => Promise<void>
}

/**
 * Consent captured at sign-up. Both the Datenschutz/AGB checkbox
 * (`acceptedTerms`) and the AVV (Auftragsverarbeitungsvertrag / DPA) checkbox
 * (`acceptedAvv`) are required before an account is created.
 */
export interface SignupConsent {
  acceptedTerms: boolean
  acceptedAvv: boolean
  locale: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** True when a sign-in failed only because the email is not yet confirmed. */
function isEmailNotConfirmedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'email_not_confirmed') return true
  return Boolean(error.message && /email not confirmed/i.test(error.message))
}

/** True when Supabase throttled the request (429 / "rate limit" / "after N seconds"). */
function isRateLimitError(
  error: { code?: string; status?: number; message?: string } | null,
): boolean {
  if (!error) return false
  if (error.status === 429) return true
  if (error.code === 'over_email_send_rate_limit') return true
  return Boolean(error.message && /rate limit|after \d+ seconds/i.test(error.message))
}

/**
 * Enforce per-user device isolation for a just-resolved auth user id. When a
 * different user is detected, {@link reconcileActiveUser} purges the previous
 * user's device-local clinical data; we then hard-reload so every module-level
 * cache and the React tree are rebuilt from the now-clean storage. Returns `true`
 * when a reload was triggered so callers skip exposing the in-flight session.
 */
function applyUserIsolation(userId: string | null): boolean {
  const switchedUser = reconcileActiveUser(userId)
  if (switchedUser && typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
    window.location.reload()
    return true
  }
  return false
}

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
        // Isolate device-local clinical data per authenticated user: if a DIFFERENT
        // user now owns this browser, the previous user's patient/case/notes data is
        // purged and the page is hard-reloaded so no stale cache or rendered view can
        // leak across the switch. Runs before we expose the session to the app.
        if (applyUserIsolation(data.session?.user?.id ?? null)) return
        setSession(data.session)
        setUser(data.session?.user ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setLoading(false)
      })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (applyUserIsolation(nextSession?.user?.id ?? null)) return
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

  // Passphrase backup from signup wizard: when email confirmation delayed account
  // creation, apply `setupAccountCloudBackup` on first authenticated session.
  // The parked passphrase is TTL-bounded (see pendingSignupPassphrase) and is
  // cleared on BOTH success and failure: leaving a failed value behind would
  // keep plaintext-equivalent material in localStorage and re-trigger a failing
  // setup on every subsequent session. On failure the user can still set up the
  // backup later via the normal passphrase unlock/restore path in settings.
  useEffect(() => {
    if (!user) return
    const pendingPassphrase = getPendingSignupPassphrase()
    if (!pendingPassphrase) return
    void setupAccountCloudBackup(pendingPassphrase, user.id)
      .then((backup) => {
        downloadPassphraseBackupFile(backup)
      })
      .catch(() => {
        // Non-fatal: fall back to the manual restore path on a later session.
      })
      .finally(() => {
        clearPendingSignupPassphrase()
      })
  }, [user])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) {
      return {
        error: getSupabaseConfigError() ?? 'Supabase ist nicht konfiguriert.',
        needsConfirmation: false,
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return {
      error: mapSupabaseAuthError(error?.message),
      needsConfirmation: isEmailNotConfirmedError(error),
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, consent?: SignupConsent) => {
    const supabase = getSupabase()
    if (!supabase) {
      return { error: getSupabaseConfigError() ?? 'Supabase ist nicht konfiguriert.', needsConfirmation: false }
    }

    // Persist the accepted-consent intent BEFORE the network round-trip so it
    // survives the email-confirmation path (where signUp returns no session and
    // consent can only be recorded once the user is later authenticated). Both
    // the Datenschutz/AGB and the AVV must have been accepted.
    const consentGranted = Boolean(consent?.acceptedTerms && consent?.acceptedAvv)
    if (consentGranted) {
      markPendingLegalConsent(LEGAL_LAST_UPDATED, consent!.locale)
    }

    const emailRedirectTo = getAuthEmailRedirectUrl()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Pin the confirmation link to the canonical app origin so it never falls
      // back to Supabase's stale `localhost:3000` Site URL default. Requires the
      // origin to be in the project's Redirect-URL allow-list.
      ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
    })
    const needsConfirmation = Boolean(data.user && !data.session)

    // When a session already exists (no email confirmation required) record the
    // consent immediately. Non-fatal on failure: the bootstrap effect retries
    // idempotently on the next authenticated load.
    if (!error && data.session && consentGranted) {
      try {
        await recordLegalConsent(consent!.locale)
        clearPendingLegalConsent()
      } catch {
        // Leave the pending marker for the bootstrap retry.
      }
    }

    return { error: mapSupabaseAuthError(error?.message), needsConfirmation }
  }, [])

  const resendConfirmation = useCallback(async (email: string) => {
    const supabase = getSupabase()
    if (!supabase) {
      return {
        error: getSupabaseConfigError() ?? 'Supabase ist nicht konfiguriert.',
        rateLimited: false,
      }
    }
    const trimmed = email.trim()
    if (!trimmed) return { error: mapSupabaseAuthError('email required'), rateLimited: false }

    const emailRedirectTo = getAuthEmailRedirectUrl()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: trimmed,
      // Same production-safe redirect as signUp: the resent link must also land
      // on the deployed app, not localhost.
      ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
    })
    return { error: mapSupabaseAuthError(error?.message), rateLimited: isRateLimitError(error) }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (supabase) await supabase.auth.signOut()
    // Clear ONLY the active session (auth token + e2ee session keys). Patient/case/
    // notes data and the recorded `active-user-id` are deliberately RETAINED so the
    // SAME user re-logging-in on this device keeps their local clinical data (no
    // blank patient names for users without cloud backup). Cross-user isolation is
    // still guaranteed: a DIFFERENT user signing in is detected via the retained
    // `active-user-id` and triggers a full purge before their session renders
    // (see applyUserIsolation / reconcileActiveUser).
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
      resendConfirmation,
      signOut,
      refreshPlan,
    }),
    [
      user,
      session,
      loading,
      plan,
      planLoading,
      signIn,
      signUp,
      resendConfirmation,
      signOut,
      refreshPlan,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
