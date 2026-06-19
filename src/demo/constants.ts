/** Deterministic identifiers for the synthetic demo patient — never real PHI. */

export const DEMO_PATIENT_ID = 'DEMO-0001'
export const DEMO_CASE_ID = 'DEMO-CASE-0001'
export const DEMO_SEED_VERSION = 'v3'

export const DEMO_FIXTURE_VERSION = '1'

export const DEMO_USER_STATE_KEY_PREFIX = 'psychiatry-ink:demo-patient-state'

export function demoUserStateKey(userId: string): string {
  return `${DEMO_USER_STATE_KEY_PREFIX}:${userId.trim() || 'anonymous'}`
}
