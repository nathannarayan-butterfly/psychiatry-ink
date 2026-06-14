import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { loadPatientMetadata } from '../cryptoVault'
import { shortCaseId } from '../caseContext'
import { loadDiagnosen } from '../diagnosenArchive'
import type { TemplateRenderContext } from '../../types/documentTemplate'

function formatDate(iso?: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('de-DE')
  } catch {
    return iso
  }
}

function formatTime(): string {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function genderLabel(g?: string): string {
  if (g === 'maennlich') return 'männlich'
  if (g === 'weiblich') return 'weiblich'
  if (g === 'divers') return 'divers'
  return g ?? ''
}

export async function buildTemplateRenderContext(caseId?: string): Promise<TemplateRenderContext> {
  const now = new Date()
  const system = {
    date: now.toLocaleDateString('de-DE'),
    time: formatTime(),
    year: String(now.getFullYear()),
  }

  if (!caseId) {
    return { system }
  }

  const meta = getCaseMeta(caseId)
  const patient: TemplateRenderContext['patient'] = {
    name: meta?.localName,
    vorname: meta?.localVorname,
    nachname: meta?.localNachname,
    geburtsdatum: meta?.localGeburtsdatum ? formatDate(meta.localGeburtsdatum) : undefined,
    geschlecht: meta?.localGeschlecht ? genderLabel(meta.localGeschlecht) : undefined,
    age: meta?.localAge,
  }

  try {
    const vault = await loadPatientMetadata(caseId)
    if (vault?.metadata.name) patient.name = vault.metadata.name
    if (vault?.metadata.geburtsdatum) {
      patient.geburtsdatum = formatDate(vault.metadata.geburtsdatum)
    }
    if (vault?.migratedAge && !patient.age) patient.age = vault.migratedAge
  } catch {
    // ignore vault read errors
  }

  const diagnoses = loadDiagnosen(caseId)
  const primaryDiagnosis =
    diagnoses[0]?.icd10?.label ||
    diagnoses[0]?.icd10?.code ||
    undefined

  return {
    patient,
    case: {
      diagnosis: primaryDiagnosis,
      caseId: shortCaseId(caseId),
    },
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
