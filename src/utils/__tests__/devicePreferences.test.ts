import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultAppearanceSettings } from '../../types/settings'
import {
  APPEARANCE_LEGACY_KEY,
  clearSessionOnLogout,
  DEVICE_PREFERENCES_KEY,
  isPreservedDevicePreferenceKey,
  loadAppearanceSettings,
  persistAppearanceSettings,
} from '../devicePreferences'

describe('devicePreferences', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('migrates legacy appearance into the device-preferences bundle', () => {
    localStorage.setItem(
      APPEARANCE_LEGACY_KEY,
      JSON.stringify({ ...defaultAppearanceSettings, preferredAccentColor: 'slate' }),
    )

    const loaded = loadAppearanceSettings()
    expect(loaded.preferredAccentColor).toBe('slate')
    expect(JSON.parse(localStorage.getItem(DEVICE_PREFERENCES_KEY)!).appearance.preferredAccentColor).toBe(
      'slate',
    )
  })

  it('persists appearance synchronously to bundle and legacy key', () => {
    persistAppearanceSettings({
      ...defaultAppearanceSettings,
      preferredAccentColor: 'indigo',
      fontSize: 'lg',
    })

    expect(loadAppearanceSettings().preferredAccentColor).toBe('indigo')
    expect(JSON.parse(localStorage.getItem(APPEARANCE_LEGACY_KEY)!).preferredAccentColor).toBe('indigo')
  })

  it('clearSessionOnLogout preserves device preferences and clears session storage', () => {
    persistAppearanceSettings({
      ...defaultAppearanceSettings,
      preferredAccentColor: 'burgundy',
    })
    localStorage.setItem('psychiatry-ink-language', 'en')
    localStorage.setItem('psychiatry-ink:case-registry', '{"cases":{}}')
    localStorage.setItem('dc:e2ee:discussion-1', 'secret')
    sessionStorage.setItem('psychiatry-ink:active-appointment', 'appt-1')

    clearSessionOnLogout()

    expect(loadAppearanceSettings().preferredAccentColor).toBe('burgundy')
    expect(localStorage.getItem('psychiatry-ink-language')).toBe('en')
    expect(localStorage.getItem('psychiatry-ink:case-registry')).toBe('{"cases":{}}')
    expect(localStorage.getItem('dc:e2ee:discussion-1')).toBeNull()
    expect(sessionStorage.length).toBe(0)
  })

  it('recognizes preserved device preference keys', () => {
    expect(isPreservedDevicePreferenceKey('psychiatry-ink-appearance')).toBe(true)
    expect(isPreservedDevicePreferenceKey('psychiatry-ink:device-preferences')).toBe(true)
    expect(isPreservedDevicePreferenceKey('psychiatry-ink:overview-layout:user-1')).toBe(true)
    expect(isPreservedDevicePreferenceKey('psychiatry-ink:ask-butterfly-mode')).toBe(true)
    expect(isPreservedDevicePreferenceKey('psychiatry-ink:notion-document:foo')).toBe(false)
  })
})
