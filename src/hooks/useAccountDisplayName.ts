import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../context/TranslationContext'

export const ACCOUNT_PROFILE_KEY = 'psychiatry-ink:account-profile'
/** Fired (same tab) whenever the account-profile store is written. */
export const ACCOUNT_PROFILE_CHANGED_EVENT = 'psychiatry-ink:account-profile-changed'

/**
 * Locally persisted clinician profile. `name` is the full display name (e.g.
 * "Dr. Anna Schmidt"); the launcher greeting derives a first name from it and
 * the dashboard shows it verbatim. Mirrored to Supabase auth metadata on save.
 */
export interface AccountProfile {
  name?: string
  email?: string
  specialty?: string
}

const PLACEHOLDER_NAME = 'Dr. —'
const PLACEHOLDER_EMAIL = 'arzt@klinik.example'

export function readAccountProfile(): AccountProfile {
  try {
    const raw = localStorage.getItem(ACCOUNT_PROFILE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as AccountProfile
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * Merge `patch` into the stored profile and persist. String fields are trimmed;
 * empties remove the key. Dispatches a same-tab change event so readers
 * (`useAccountDisplayName`, etc.) update immediately. Never throws.
 */
export function writeAccountProfile(patch: AccountProfile): AccountProfile {
  const next: AccountProfile = { ...readAccountProfile() }

  for (const key of ['name', 'email', 'specialty'] as const) {
    if (!(key in patch)) continue
    const value = patch[key]
    const trimmed = typeof value === 'string' ? value.trim() : ''
    if (trimmed) {
      next[key] = trimmed
    } else {
      delete next[key]
    }
  }

  try {
    localStorage.setItem(ACCOUNT_PROFILE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(ACCOUNT_PROFILE_CHANGED_EVENT))
  } catch {
    // ignore storage errors — caller still gets the merged object back
  }

  return next
}

/** First non-empty string among the given Supabase `user_metadata` keys. */
function metadataString(
  metadata: Record<string, unknown> | undefined,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = metadata?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export function resolveAccountDisplayName(
  profile: AccountProfile,
  fallbackLabel: string,
  authMetadata?: Record<string, unknown>,
): string {
  const name = profile.name?.trim()
  if (name && name !== PLACEHOLDER_NAME) return name

  // `profile.name` is device-local (localStorage) — a device that never saved
  // it locally (a different browser, cleared storage, private window) would
  // otherwise show the "Dr. —" placeholder even though the name was already
  // mirrored to Supabase auth metadata on another device. Fall back to that
  // mirror before giving up, same source `WorkspaceLauncher`'s greeting uses.
  const metaName = metadataString(authMetadata, 'full_name', 'name', 'display_name')
  if (metaName) return metaName

  const email = profile.email?.trim()
  if (email && email !== PLACEHOLDER_EMAIL) {
    const stub = email.split('@')[0]?.trim()
    if (stub) return stub
  }

  return fallbackLabel
}

/**
 * Reactive view of the account-profile store. Re-reads on same-tab writes
 * (via {@link writeAccountProfile}) and cross-tab `storage` events.
 */
export function useAccountProfile(): {
  profile: AccountProfile
  saveProfile: (patch: AccountProfile) => AccountProfile
} {
  const [profile, setProfile] = useState<AccountProfile>(readAccountProfile)

  useEffect(() => {
    const handleChange = () => setProfile(readAccountProfile())
    window.addEventListener(ACCOUNT_PROFILE_CHANGED_EVENT, handleChange)
    window.addEventListener('storage', handleChange)
    return () => {
      window.removeEventListener(ACCOUNT_PROFILE_CHANGED_EVENT, handleChange)
      window.removeEventListener('storage', handleChange)
    }
  }, [])

  const saveProfile = useCallback((patch: AccountProfile) => {
    const next = writeAccountProfile(patch)
    setProfile(next)
    return next
  }, [])

  return { profile, saveProfile }
}

export function useAccountDisplayName(): string {
  const { t } = useTranslation()
  const { profile } = useAccountProfile()
  const { user } = useAuth()
  const authMetadata = user?.user_metadata as Record<string, unknown> | undefined
  return useMemo(
    () => resolveAccountDisplayName(profile, t('dashboardUserFallback'), authMetadata),
    [profile, t, authMetadata],
  )
}
