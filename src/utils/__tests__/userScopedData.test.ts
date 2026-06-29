import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ACTIVE_USER_ID_KEY,
  getStoredActiveUserId,
  purgeClinicalDeviceData,
  reconcileActiveUser,
} from '../userScopedData'
import { DEVICE_PREFERENCES_KEY } from '../devicePreferences'

// Representative clinical (patient-bearing) storage keys that MUST not survive a
// cross-user switch, covering: the case registry, the global Notizen store
// (dokumente archive under the default case), standalone scratch cases, a real
// random-uuid patient case, and the plaintext lab/timeline stores.
const CLINICAL_KEYS = {
  registry: 'psychiatry-ink:case-registry',
  globalNotes: 'psychiatry-ink:dokumenteArchive::default',
  scratchLabviz: 'psychiatry-ink:dokumenteArchive::standalone-labviz',
  scratchTimeline: 'psychiatry-ink:timelines::standalone-timeline',
  patientCase: 'psychiatry-ink:dokumenteArchive::11111111-2222-3333-4444-555555555555',
  labGraphs: 'psychiatry-ink:lab-graphs::default',
} as const

// Keys that MUST be preserved through a purge: device UI/config and the active
// Supabase session token (so a different-user purge never logs the new user out).
// These are localStorage KEY NAMES / test fixtures, not real credentials.
const PRESERVED = {
  devicePrefs: DEVICE_PREFERENCES_KEY,
  knowledgeBase: 'psychiatry-ink:knowledgeBase',
  deviceId: 'psychiatry-ink-device-id',
  authToken: 'sb-projectref-auth-token',
} as const

function seedClinicalData(): void {
  for (const key of Object.values(CLINICAL_KEYS)) {
    localStorage.setItem(key, JSON.stringify([{ secret: 'patient-phi' }]))
  }
  sessionStorage.setItem('psychiatry-ink:active-appointment', 'appt-1')
}

function seedPreservedData(): void {
  for (const key of Object.values(PRESERVED)) {
    localStorage.setItem(key, 'keep-me')
  }
}

describe('userScopedData — purgeClinicalDeviceData', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('removes all clinical localStorage + sessionStorage, preserving device config + auth token', () => {
    seedClinicalData()
    seedPreservedData()
    localStorage.setItem(ACTIVE_USER_ID_KEY, 'user-a')

    purgeClinicalDeviceData()

    for (const [name, key] of Object.entries(CLINICAL_KEYS)) {
      expect(localStorage.getItem(key), `clinical key "${name}" must be purged`).toBeNull()
    }
    expect(sessionStorage.length).toBe(0)

    for (const [name, key] of Object.entries(PRESERVED)) {
      expect(localStorage.getItem(key), `preserved key "${name}" must survive`).toBe('keep-me')
    }
    // The active-user marker is preserved so a later switch is still detectable.
    expect(localStorage.getItem(ACTIVE_USER_ID_KEY)).toBe('user-a')
  })
})

describe('userScopedData — reconcileActiveUser', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('records the user on first login without purging (no prior owner)', () => {
    seedClinicalData()

    const switched = reconcileActiveUser('user-a')

    expect(switched).toBe(false)
    expect(getStoredActiveUserId()).toBe('user-a')
    // Existing data on a device with no recorded owner is treated as this user's.
    expect(localStorage.getItem(CLINICAL_KEYS.globalNotes)).not.toBeNull()
  })

  it('keeps data when the SAME user re-resolves (e.g. token refresh)', () => {
    reconcileActiveUser('user-a')
    seedClinicalData()

    const switched = reconcileActiveUser('user-a')

    expect(switched).toBe(false)
    expect(localStorage.getItem(CLINICAL_KEYS.registry)).not.toBeNull()
  })

  it('purges the prior user data and signals reload when a DIFFERENT user signs in', () => {
    reconcileActiveUser('user-a')
    seedClinicalData()
    seedPreservedData()
    // Simulate user B's session token already written by Supabase before reconcile.
    localStorage.setItem(PRESERVED.authToken, 'user-b-session')

    const switched = reconcileActiveUser('user-b')

    expect(switched).toBe(true)
    expect(getStoredActiveUserId()).toBe('user-b')
    // User A's clinical data is gone...
    for (const key of Object.values(CLINICAL_KEYS)) {
      expect(localStorage.getItem(key)).toBeNull()
    }
    // ...but user B's freshly written session + device config survive.
    expect(localStorage.getItem(PRESERVED.authToken)).toBe('user-b-session')
    expect(localStorage.getItem(PRESERVED.devicePrefs)).toBe('keep-me')
  })

  it('does nothing for a signed-out (null) resolution', () => {
    reconcileActiveUser('user-a')
    seedClinicalData()

    const switched = reconcileActiveUser(null)

    expect(switched).toBe(false)
    expect(localStorage.getItem(CLINICAL_KEYS.globalNotes)).not.toBeNull()
  })

  it('isolates two users end-to-end: B never reads A’s patient data', () => {
    // User A logs in and saves patient data.
    reconcileActiveUser('user-a')
    localStorage.setItem(CLINICAL_KEYS.patientCase, JSON.stringify([{ name: 'Patient of A' }]))
    localStorage.setItem(CLINICAL_KEYS.globalNotes, JSON.stringify([{ content: 'A note' }]))

    // User B signs in on the same browser.
    const switched = reconcileActiveUser('user-b')

    expect(switched).toBe(true)
    expect(localStorage.getItem(CLINICAL_KEYS.patientCase)).toBeNull()
    expect(localStorage.getItem(CLINICAL_KEYS.globalNotes)).toBeNull()
  })
})
