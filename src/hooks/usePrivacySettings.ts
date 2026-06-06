import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  detectBrowserCountry,
  resolvePrivacyTier,
  type PrivacyTier,
} from '../data/privacyRegions'

const STORAGE_KEY = 'psychiatry-ink-privacy'

interface PrivacySettings {
  countryCode: string
}

function loadPrivacySettings(): PrivacySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PrivacySettings>
      if (parsed.countryCode?.trim()) {
        return { countryCode: parsed.countryCode.trim().toUpperCase() }
      }
    }
  } catch {
    // ignore
  }

  const detected = detectBrowserCountry()
  return { countryCode: detected ?? 'DE' }
}

export function usePrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings>(loadPrivacySettings)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  const tier = useMemo(
    () => resolvePrivacyTier(settings.countryCode),
    [settings.countryCode],
  )

  const setCountryCode = useCallback((countryCode: string) => {
    setSettings({ countryCode: countryCode.trim().toUpperCase() })
  }, [])

  return {
    countryCode: settings.countryCode,
    tier: tier as PrivacyTier,
    setCountryCode,
  }
}
