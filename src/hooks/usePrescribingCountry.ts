import { useCallback, useEffect, useState } from 'react'
import type { PrescribingCountryCode } from '../types/knowledgeBase'

const STORAGE_KEY = 'psychiatry-ink:defaultPrescribingCountry'
const FALLBACK_COUNTRY: PrescribingCountryCode = 'DE'

export const PRESCRIBING_COUNTRIES: PrescribingCountryCode[] = ['DE', 'CH', 'AT', 'UK']

export const PRESCRIBING_COUNTRY_LABELS: Record<PrescribingCountryCode, string> = {
  DE: 'Germany',
  CH: 'Switzerland',
  AT: 'Austria',
  UK: 'United Kingdom',
}

/** Native country names for German UI copy (e.g. preparation list headings). */
export const PRESCRIBING_COUNTRY_NATIVE_LABELS: Record<PrescribingCountryCode, string> = {
  DE: 'Deutschland',
  CH: 'Schweiz',
  AT: 'Österreich',
  UK: 'Vereinigtes Königreich',
}

function readDefaultCountry(): PrescribingCountryCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && PRESCRIBING_COUNTRIES.includes(stored as PrescribingCountryCode)) {
      return stored as PrescribingCountryCode
    }
  } catch {
    // ignore storage errors
  }
  return FALLBACK_COUNTRY
}

export function usePrescribingCountry() {
  const [defaultPrescribingCountry, setDefaultPrescribingCountryState] =
    useState<PrescribingCountryCode>(readDefaultCountry)

  const setDefaultPrescribingCountry = useCallback((country: PrescribingCountryCode) => {
    setDefaultPrescribingCountryState(country)
    try {
      localStorage.setItem(STORAGE_KEY, country)
      window.dispatchEvent(new CustomEvent('psychiatry-ink:prescribing-country-changed'))
    } catch {
      // ignore storage errors
    }
  }, [])

  useEffect(() => {
    const handleChange = () => setDefaultPrescribingCountryState(readDefaultCountry())
    window.addEventListener('psychiatry-ink:prescribing-country-changed', handleChange)
    window.addEventListener('storage', handleChange)
    return () => {
      window.removeEventListener('psychiatry-ink:prescribing-country-changed', handleChange)
      window.removeEventListener('storage', handleChange)
    }
  }, [])

  return { defaultPrescribingCountry, setDefaultPrescribingCountry }
}
