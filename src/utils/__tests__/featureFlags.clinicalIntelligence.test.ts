import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isClinicalIntelligenceDebugMode,
  isClinicalIntelligenceV1Enabled,
} from '../featureFlags'

const ORIGINAL_ENV = { ...import.meta.env }

afterEach(() => {
  for (const key of Object.keys(import.meta.env)) {
    if (
      key === 'VITE_CLINICAL_INTELLIGENCE_V1_ENABLED' ||
      key === 'VITE_CLINICAL_INTELLIGENCE_DEBUG_MODE'
    ) {
      ;(import.meta.env as Record<string, unknown>)[key] = ORIGINAL_ENV[key]
    }
  }
})

describe('clinical intelligence feature flags', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('is disabled by default in Normal Mode', () => {
    vi.stubEnv('VITE_CLINICAL_INTELLIGENCE_V1_ENABLED', '')
    vi.stubEnv('VITE_CLINICAL_INTELLIGENCE_DEBUG_MODE', '')
    expect(isClinicalIntelligenceV1Enabled()).toBe(false)
    expect(isClinicalIntelligenceDebugMode()).toBe(false)
  })

  it('enables CI when VITE_CLINICAL_INTELLIGENCE_V1_ENABLED=true', () => {
    vi.stubEnv('VITE_CLINICAL_INTELLIGENCE_V1_ENABLED', 'true')
    expect(isClinicalIntelligenceV1Enabled()).toBe(true)
  })

  it('does not enable on "1", "yes" or other truthy-ish strings', () => {
    vi.stubEnv('VITE_CLINICAL_INTELLIGENCE_V1_ENABLED', '1')
    expect(isClinicalIntelligenceV1Enabled()).toBe(false)
    vi.stubEnv('VITE_CLINICAL_INTELLIGENCE_V1_ENABLED', 'yes')
    expect(isClinicalIntelligenceV1Enabled()).toBe(false)
  })

  it('debug mode is independent of the main flag', () => {
    vi.stubEnv('VITE_CLINICAL_INTELLIGENCE_V1_ENABLED', 'false')
    vi.stubEnv('VITE_CLINICAL_INTELLIGENCE_DEBUG_MODE', 'true')
    expect(isClinicalIntelligenceV1Enabled()).toBe(false)
    expect(isClinicalIntelligenceDebugMode()).toBe(true)
  })
})
