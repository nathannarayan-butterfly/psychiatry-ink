import { isClinicalIntelligenceV1Enabled } from '../utils/featureFlags'
import { isDemoCase } from './demoReadOnly'

/** CI is available when the global flag is on, or for the synthetic demo case. */
export function isClinicalIntelligenceAvailableForCase(
  caseId: string | undefined | null,
): boolean {
  if (isClinicalIntelligenceV1Enabled()) return true
  return Boolean(caseId && isDemoCase(caseId))
}
