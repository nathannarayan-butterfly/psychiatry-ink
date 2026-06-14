import {
  effectiveAiQuotaMonthly,
  parseMemberSettings,
  type MemberSettings,
} from '../../src/data/org/memberPermissions'
import type { Organisation, OrganisationMember } from '../../src/types/organisation'
import { getKbSupabaseAdmin } from './kbSupabaseAdmin'
import { getMember, getOrganisationById, mapMember } from './orgStore'

export const AI_QUOTA_EXCEEDED_MESSAGE =
  'Ihr monatliches KI-Kontingent ist aufgebraucht. Bitte wenden Sie sich an die Praxisleitung.'

function currentQuotaPeriodStart(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function readMemberSettings(member: OrganisationMember): MemberSettings {
  return parseMemberSettings({
    permissionOverrides: member.permissionOverrides,
    aiQuotaMonthly: member.aiQuotaMonthly,
    aiQuotaUsed: member.aiQuotaUsed,
    aiQuotaPeriodStart: member.aiQuotaPeriodStart,
  })
}

function mergeMemberSettings(
  existing: MemberSettings,
  patch: Partial<MemberSettings>,
): MemberSettings {
  return {
    ...existing,
    ...patch,
    ...(patch.permissionOverrides !== undefined
      ? { permissionOverrides: patch.permissionOverrides }
      : {}),
  }
}

async function persistMemberSettings(
  memberId: string,
  settings: MemberSettings,
): Promise<void> {
  const admin = getKbSupabaseAdmin()
  const { error } = await admin
    .from('org_members')
    .update({ settings })
    .eq('id', memberId)

  if (error) throw new Error(error.message)
}

export interface AiQuotaStatus {
  quotaMonthly: number | null
  quotaUsed: number
  unlimited: boolean
  exceeded: boolean
}

export function resolveAiQuotaStatus(
  member: OrganisationMember,
  organisation: Organisation | null,
): AiQuotaStatus {
  const quotaMonthly = effectiveAiQuotaMonthly(member, organisation?.settings)
  const quotaUsed = member.aiQuotaUsed ?? 0
  const unlimited = quotaMonthly === null
  const exceeded = !unlimited && quotaUsed >= quotaMonthly
  return { quotaMonthly, quotaUsed, unlimited, exceeded }
}

/** Rolls quota counter forward when calendar month changes (UTC). */
export async function ensureCurrentQuotaPeriod(
  member: OrganisationMember,
): Promise<OrganisationMember> {
  const settings = readMemberSettings(member)
  const periodStart = currentQuotaPeriodStart()
  if (settings.aiQuotaPeriodStart === periodStart) return member

  const nextSettings = mergeMemberSettings(settings, {
    aiQuotaPeriodStart: periodStart,
    aiQuotaUsed: 0,
  })
  await persistMemberSettings(member.id, nextSettings)
  return {
    ...member,
    aiQuotaUsed: 0,
    aiQuotaPeriodStart: periodStart,
  }
}

export async function checkAiQuotaForUser(
  userId: string,
  organisationId: string,
): Promise<{ allowed: boolean; status: AiQuotaStatus | null; member: OrganisationMember | null }> {
  const organisation = await getOrganisationById(organisationId)
  if (!organisation || organisation.tier !== 'small_praxis') {
    return { allowed: true, status: null, member: null }
  }

  let member = await getMember(userId, organisationId)
  if (!member) return { allowed: true, status: null, member: null }

  member = await ensureCurrentQuotaPeriod(member)
  const status = resolveAiQuotaStatus(member, organisation)
  return { allowed: !status.exceeded, status, member }
}

export async function incrementAiQuotaUsage(
  userId: string,
  organisationId: string,
): Promise<void> {
  const organisation = await getOrganisationById(organisationId)
  if (!organisation || organisation.tier !== 'small_praxis') return

  let member = await getMember(userId, organisationId)
  if (!member) return

  member = await ensureCurrentQuotaPeriod(member)
  const status = resolveAiQuotaStatus(member, organisation)
  if (status.unlimited) return

  const settings = readMemberSettings(member)
  const nextUsed = (settings.aiQuotaUsed ?? member.aiQuotaUsed ?? 0) + 1
  const nextSettings = mergeMemberSettings(settings, {
    aiQuotaUsed: nextUsed,
    aiQuotaPeriodStart: settings.aiQuotaPeriodStart ?? currentQuotaPeriodStart(),
  })
  await persistMemberSettings(member.id, nextSettings)
}

/** Reload member row after settings mutation (team PATCH responses). */
export async function reloadMember(memberId: string): Promise<OrganisationMember | null> {
  const admin = getKbSupabaseAdmin()
  const { data, error } = await admin.from('org_members').select('*').eq('id', memberId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return mapMember(data as Record<string, unknown>)
}
