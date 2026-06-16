/**
 * Section-neutral bridge: map a clinician's question RESOLUTION onto the
 * authoritative clinician-attestation value the deterministic evaluator reads.
 *
 * `present`/`absent` flip the target to met/not_met; `unclear` returns null,
 * which the caller uses to CLEAR any prior attestation (re-opening the target).
 */

import type { ClinicianAttestationValue } from '../diagnosisCriteria/context'
import type { ClinicalQuestionResolution } from './types'

export function resolutionToAttestation(
  resolution: ClinicalQuestionResolution,
): ClinicianAttestationValue | null {
  switch (resolution) {
    case 'present':
      return 'met'
    case 'absent':
      return 'not_met'
    case 'unclear':
      return null
  }
}
