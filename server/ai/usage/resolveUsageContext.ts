import type { Request } from 'express'
import type { AiFeatureKey } from '../../../src/types/aiUsage'
import { getCurrentOrganisation, ORG_HEADER } from '../../services/orgPermissions'
import type { AiUsageContext } from '../types'

export async function resolveUsageContextFromRequest(
  req: Request,
  userId: string,
  options: {
    caseId?: string | null
    featureKey: AiFeatureKey
    requestKind?: AiUsageContext['requestKind']
    metadata?: Record<string, unknown>
  },
): Promise<AiUsageContext> {
  const org = await getCurrentOrganisation(userId, req.headers[ORG_HEADER])
  return {
    userId,
    organisationId: org?.id ?? null,
    caseId: options.caseId ?? null,
    featureKey: options.featureKey,
    requestKind: options.requestKind,
    metadata: options.metadata,
  }
}
