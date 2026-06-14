import type { ConsultationRole } from '../types/consultation'
import { isExternalConsultantRole } from '../types/consultation'

const VALID_ROLES: ConsultationRole[] = [
  'clinician',
  'internal_consultant',
  'external_consultant',
  'one_time_external_consultant',
]

function parseIdList(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(/[,;\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export interface ConsultationRoleInput {
  userId: string | null | undefined
  userEmail?: string | null
  appMetadataRole?: string | null
}

export function parseConsultationRole(raw: unknown): ConsultationRole | null {
  if (typeof raw !== 'string') return null
  return VALID_ROLES.includes(raw as ConsultationRole) ? (raw as ConsultationRole) : null
}

/** Client-side consultation role from Supabase app_metadata or dev env allowlists. */
export function resolveConsultationRole(input: ConsultationRoleInput): ConsultationRole | null {
  const fromMeta = parseConsultationRole(input.appMetadataRole)
  if (fromMeta) return fromMeta

  const envExternal = parseIdList(import.meta.env.VITE_EXTERNAL_CONSULTANT_USER_IDS as string | undefined)
  const envInternal = parseIdList(import.meta.env.VITE_INTERNAL_CONSULTANT_USER_IDS as string | undefined)

  const candidates = [input.userId, input.userEmail]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase())

  if (candidates.some((c) => envExternal.includes(c))) return 'external_consultant'
  if (candidates.some((c) => envInternal.includes(c))) return 'internal_consultant'

  return null
}

export function isRestrictedConsultant(role: ConsultationRole | null): boolean {
  return isExternalConsultantRole(role)
}
