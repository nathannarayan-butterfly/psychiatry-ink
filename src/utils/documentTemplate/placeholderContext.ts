import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { loadPatientMetadata } from '../cryptoVault'
import { shortCaseId } from '../caseContext'
import { loadDiagnosen } from '../diagnosenArchive'
import { resolveDiagnosisLabelSync } from '../diagnosisDisplayRequests'
import { loadBefunde } from '../laborArchive'
import { loadNotionPageDate } from '../notionPageDate'
import { formatMedicationOverviewDoseGerman } from '../medication/doseLine'
import { isMedicationVisible } from '../medication/planOps'
import { loadMedicationPlanState } from '../medication/storage'
import type { TemplateRenderContext } from '../../types/documentTemplate'
import { calculateAgeFromIsoDate, formatClinicalDate, parseIsoDateOnly } from '../clinicalDate'
import { resolveAnthropometryFromBefunde } from './anthropometryContext'
import { todayIsoDateSite } from '../siteTimezone'

function formatTime(): string {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function formatDocumentTimestamp(date: Date): string {
  return `${formatClinicalDate(date)} ${formatTime()}`
}

function genderLabel(g?: string): string {
  if (g === 'maennlich') return 'männlich'
  if (g === 'weiblich') return 'weiblich'
  if (g === 'divers') return 'divers'
  return g ?? ''
}

function formatAgeYears(age: number): string {
  return `${age} J.`
}

function resolveAgeLabel(geburtsdatum: string | undefined, storedAge: string | undefined): string | undefined {
  const calculated = calculateAgeFromIsoDate(geburtsdatum)
  if (calculated !== null) return formatAgeYears(calculated)

  const trimmed = storedAge?.trim()
  if (!trimmed) return undefined
  const numeric = trimmed.replace(/[^\d]/g, '')
  if (!numeric) return undefined
  return formatAgeYears(Number(numeric))
}

function calculateLengthOfStayDays(admissionIso: string, dischargeIso?: string): number | null {
  const start = parseIsoDateOnly(admissionIso.trim())
  if (!start) return null
  const endIso = dischargeIso?.trim() || todayIsoDateSite()
  const end = parseIsoDateOnly(endIso)
  if (!end) return null
  const startMs = Date.UTC(start.year, start.month - 1, start.day)
  const endMs = Date.UTC(end.year, end.month - 1, end.day)
  const days = Math.round((endMs - startMs) / 86_400_000)
  return days >= 0 ? days + 1 : null
}

function buildMedicationSummary(caseId: string): string | undefined {
  const state = loadMedicationPlanState(caseId)
  const medications = state?.plans?.[0]?.medications ?? []
  const active = medications.filter((med) => isMedicationVisible(med) && med.status !== 'discontinued')
  if (active.length === 0) return undefined
  return active
    .map((med) => {
      const dose = formatMedicationOverviewDoseGerman(med)
      return dose ? `${med.substance} ${dose}` : med.substance
    })
    .join('; ')
}

function readClinicianDisplayName(): string | undefined {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key?.includes('auth-token')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as {
        user?: { user_metadata?: Record<string, unknown>; email?: string }
      }
      const meta = parsed.user?.user_metadata
      const candidates = [meta?.full_name, meta?.name, meta?.display_name]
      const name = candidates.find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
      if (name) return name.trim()
      if (parsed.user?.email?.trim()) return parsed.user.email.trim()
    }
  } catch {
    // ignore parse errors
  }
  return undefined
}

export interface BuildTemplateRenderContextOptions {
  /** Override generation timestamp (defaults to now). */
  generatedAt?: Date
  clinicianName?: string
}

export async function buildTemplateRenderContext(
  caseId?: string,
  options?: BuildTemplateRenderContextOptions,
): Promise<TemplateRenderContext> {
  const generatedAt = options?.generatedAt ?? new Date()
  const system = {
    date: formatClinicalDate(generatedAt),
    time: formatTime(),
    year: String(generatedAt.getFullYear()),
    documentDate: formatDocumentTimestamp(generatedAt),
  }

  const clinicianName = options?.clinicianName?.trim() || readClinicianDisplayName()
  const clinician = clinicianName ? { name: clinicianName } : undefined

  if (!caseId) {
    return { system, clinician }
  }

  const meta = getCaseMeta(caseId)
  const admissionIso = loadNotionPageDate('aufnahme', caseId)
  const dischargeIso = loadNotionPageDate('entlassung', caseId)
  const stayDays = admissionIso ? calculateLengthOfStayDays(admissionIso, dischargeIso || undefined) : null

  const patient: TemplateRenderContext['patient'] = {
    name: meta?.localName,
    vorname: meta?.localVorname,
    nachname: meta?.localNachname,
    geburtsdatum: meta?.localGeburtsdatum ? formatClinicalDate(meta.localGeburtsdatum) : undefined,
    geschlecht: meta?.localGeschlecht ? genderLabel(meta.localGeschlecht) : undefined,
    age: resolveAgeLabel(meta?.localGeburtsdatum, meta?.localAge),
  }

  try {
    const vault = await loadPatientMetadata(caseId)
    if (vault?.metadata.name) patient.name = vault.metadata.name
    if (vault?.metadata.geburtsdatum) {
      patient.geburtsdatum = formatClinicalDate(vault.metadata.geburtsdatum)
      patient.age = resolveAgeLabel(vault.metadata.geburtsdatum, vault.migratedAge ?? meta?.localAge)
    } else if (vault?.migratedAge && !patient.age) {
      patient.age = resolveAgeLabel(meta?.localGeburtsdatum, vault.migratedAge)
    }
  } catch {
    // ignore vault read errors
  }

  const anthropometry = resolveAnthropometryFromBefunde(loadBefunde(caseId))
  if (anthropometry.height) patient.height = anthropometry.height
  if (anthropometry.weight) patient.weight = anthropometry.weight
  if (anthropometry.bmi) patient.bmi = anthropometry.bmi

  const diagnoses = loadDiagnosen(caseId)
  const primaryCoding = diagnoses[0]?.icd10
  const primaryDiagnosis = primaryCoding
    ? resolveDiagnosisLabelSync(primaryCoding, 'icd10') || primaryCoding.code || undefined
    : undefined

  return {
    patient,
    case: {
      diagnosis: primaryDiagnosis,
      caseId: shortCaseId(caseId),
      aufnahmedatum: admissionIso ? formatClinicalDate(admissionIso) : undefined,
      entlassungsdatum: dischargeIso ? formatClinicalDate(dischargeIso) : undefined,
      aufenthaltsdauer: stayDays != null ? `${stayDays} Tage` : undefined,
      medikationKurz: buildMedicationSummary(caseId),
    },
    clinician,
    system,
  }
}

export function resolveBinding(binding: string | undefined, context: TemplateRenderContext): string {
  if (!binding?.trim()) return ''
  const parts = binding.split('.')
  if (parts.length !== 2) return ''

  const [group, key] = parts as [keyof TemplateRenderContext, string]
  const bucket = context[group]
  if (!bucket || typeof bucket !== 'object') return ''
  const value = (bucket as Record<string, string | undefined>)[key]
  return value?.trim() ?? ''
}
