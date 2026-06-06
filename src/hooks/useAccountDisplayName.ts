import { useMemo } from 'react'
import { useTranslation } from '../context/TranslationContext'

const ACCOUNT_PROFILE_KEY = 'psychiatry-ink:account-profile'

interface AccountProfile {
  name?: string
  email?: string
}

const PLACEHOLDER_NAME = 'Dr. —'
const PLACEHOLDER_EMAIL = 'arzt@klinik.example'

function readAccountProfile(): AccountProfile {
  try {
    const raw = localStorage.getItem(ACCOUNT_PROFILE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as AccountProfile
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function resolveAccountDisplayName(
  profile: AccountProfile,
  fallbackLabel: string,
): string {
  const name = profile.name?.trim()
  if (name && name !== PLACEHOLDER_NAME) return name

  const email = profile.email?.trim()
  if (email && email !== PLACEHOLDER_EMAIL) {
    const stub = email.split('@')[0]?.trim()
    if (stub) return stub
  }

  return fallbackLabel
}

export function useAccountDisplayName(): string {
  const { t } = useTranslation()
  return useMemo(
    () => resolveAccountDisplayName(readAccountProfile(), t('dashboardUserFallback')),
    [t],
  )
}
