import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isClinicalIntelligenceDebugMode } from '../featureFlags'

/**
 * P0-1 — server twin of the CI debug-mode flag must fail closed in production.
 *
 * Even when an operator misconfigures `CLINICAL_INTELLIGENCE_DEBUG_MODE=true`,
 * the server must refuse to attach diagnostics whenever NODE_ENV=production.
 */

const ORIGINAL_NODE_ENV = process.env.NODE_ENV
const ORIGINAL_DEBUG_FLAG = process.env.CLINICAL_INTELLIGENCE_DEBUG_MODE

beforeEach(() => {
  delete process.env.CLINICAL_INTELLIGENCE_DEBUG_MODE
  process.env.NODE_ENV = 'development'
})

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV
  if (ORIGINAL_DEBUG_FLAG === undefined) {
    delete process.env.CLINICAL_INTELLIGENCE_DEBUG_MODE
  } else {
    process.env.CLINICAL_INTELLIGENCE_DEBUG_MODE = ORIGINAL_DEBUG_FLAG
  }
})

describe('isClinicalIntelligenceDebugMode (server)', () => {
  it('is false by default', () => {
    expect(isClinicalIntelligenceDebugMode()).toBe(false)
  })

  it('is true when explicitly enabled in development', () => {
    process.env.NODE_ENV = 'development'
    process.env.CLINICAL_INTELLIGENCE_DEBUG_MODE = 'true'
    expect(isClinicalIntelligenceDebugMode()).toBe(true)
  })

  it('fails closed in production even when the env flag is set true (P0-1)', () => {
    process.env.NODE_ENV = 'production'
    process.env.CLINICAL_INTELLIGENCE_DEBUG_MODE = 'true'
    expect(isClinicalIntelligenceDebugMode()).toBe(false)
  })

  it('stays disabled in production when the env flag is unset (P0-1)', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.CLINICAL_INTELLIGENCE_DEBUG_MODE
    expect(isClinicalIntelligenceDebugMode()).toBe(false)
  })
})
