/**
 * Resolve real patient/case data into the renderer's normalized
 * `ResolvedClinicalData`. Every domain is wrapped in try/catch and degrades to
 * empty — binding resolution must never throw or block document rendering.
 */
import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { loadPatientMetadata } from '../cryptoVault'
import { loadDiagnosen, selectPrimaryCoding } from '../diagnosenArchive'
import { resolveDiagnosisLabelSync } from '../diagnosisDisplayRequests'
import { loadMedicationPlanState } from '../medication/storage'
import { getCurrentPlan, isMedicationVisible } from '../medication/planOps'
import { formatMedicationOverviewDoseGerman } from '../medication/doseLine'
import { loadBefunde } from '../laborArchive'
import { loadVerlaufFeed } from '../verlaufFeed'
import { resolveOverviewPsychopathologyText } from '../overview/psychopathFindingOps'
import { loadPsychotherapyPlan } from '../psychotherapy/storage'
import { derivePsychotherapySummary } from '../psychotherapy/derive'
import { loadComplementaryTherapies } from '../complementaryTherapy/storage'
import { loadWeitereTherapie } from '../weitereTherapie/storage'
import { loadSozialtherapie } from '../sozialtherapie/storage'
import { loadNotionDocumentSnapshot } from '../notionDocumentActions'
import { loadNotionPageDate } from '../notionPageDate'
import { htmlToPlainLines } from '../documentTemplate/htmlUtils'
import { calculateAgeFromIsoDate, formatClinicalDate } from '../clinicalDate'
import type {
  ResolvedClinicalData,
  ResolvedDiagnosis,
  ResolvedLabPanel,
  ResolvedMedication,
  ResolvedSocialTherapyItem,
  ResolvedTherapyItem,
  ResolvedVerlaufEntry,
} from './clinicalData'
import { EMPTY_CLINICAL_DATA } from './clinicalData'
import type { VerlaufWindowPreset } from '../../types/clinicalTemplate'

function genderLabel(g?: string): string | undefined {
  if (g === 'maennlich') return 'männlich'
  if (g === 'weiblich') return 'weiblich'
  if (g === 'divers') return 'divers'
  return g || undefined
}

function plainText(html: string | undefined | null): string {
  if (!html) return ''
  try {
    return htmlToPlainLines(html).trim()
  } catch {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

function nowSystem(): { date: string; documentDate: string } {
  const now = new Date()
  const date = formatClinicalDate(now)
  const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return { date, documentDate: `${date} ${time}` }
}

function resolveDemographics(caseId: string): ResolvedClinicalData['demographics'] {
  const meta = getCaseMeta(caseId)
  const out: ResolvedClinicalData['demographics'] = {
    name: meta?.localName,
    vorname: meta?.localVorname,
    nachname: meta?.localNachname,
    geburtsdatum: meta?.localGeburtsdatum ? formatClinicalDate(meta.localGeburtsdatum) : undefined,
    geschlecht: genderLabel(meta?.localGeschlecht),
    caseId,
  }
  const ageNum = calculateAgeFromIsoDate(meta?.localGeburtsdatum)
  if (ageNum !== null) out.age = `${ageNum} J.`
  else if (meta?.localAge) out.age = meta.localAge
  return out
}

function resolveDiagnoses(caseId: string): ResolvedDiagnosis[] {
  try {
    return loadDiagnosen(caseId).map((entry) => {
      const { coding, version } = selectPrimaryCoding(entry)
      const label =
        resolveDiagnosisLabelSync(coding, version, null, 'de') ||
        entry.displayLabel ||
        coding.code ||
        '—'
      return {
        code: coding.code || undefined,
        label,
        role: entry.diagnosisRole,
        status: entry.diagnosisStatus,
      }
    })
  } catch {
    return []
  }
}

function resolveMedications(caseId: string): ResolvedMedication[] {
  try {
    const state = loadMedicationPlanState(caseId)
    if (!state) return []
    const plan = getCurrentPlan(state) ?? state.plans[0] ?? null
    const meds = plan?.medications ?? []
    return meds
      .filter((med) => isMedicationVisible(med) && med.status !== 'discontinued')
      .map((med) => ({
        substance: med.substance,
        dose: formatMedicationOverviewDoseGerman(med) || undefined,
        prn: Boolean(med.prn),
        indication: med.indication?.trim() || undefined,
      }))
  } catch {
    return []
  }
}

function resolveLabs(caseId: string): ResolvedClinicalData['labs'] {
  try {
    const latest = [...loadBefunde(caseId)].sort((a, b) => b.date.localeCompare(a.date))[0]
    if (!latest) return { panels: [] }
    const panels: ResolvedLabPanel[] = latest.categories.map((cat) => ({
      category: cat.label,
      values: cat.values.map((v) => {
        const reference =
          v.refText?.trim() ||
          (v.refMin != null && v.refMax != null ? `${v.refMin}–${v.refMax}` : undefined)
        return {
          name: v.name,
          value: v.value,
          unit: v.unit?.trim() || undefined,
          reference,
          abnormal: Boolean(v.isAbnormal),
        }
      }),
    }))
    return { date: formatClinicalDate(latest.date), panels }
  } catch {
    return { panels: [] }
  }
}

function windowStartMs(preset: VerlaufWindowPreset, caseId: string): number | null {
  const now = Date.now()
  if (preset === '7d') return now - 7 * 86_400_000
  if (preset === '14d') return now - 14 * 86_400_000
  if (preset === 'admission') {
    const iso = loadNotionPageDate('aufnahme', caseId)
    const ms = iso ? Date.parse(iso) : NaN
    return Number.isNaN(ms) ? null : ms
  }
  return null
}

function windowLabel(preset: VerlaufWindowPreset): string {
  if (preset === '7d') return 'Letzte 7 Tage'
  if (preset === '14d') return 'Letzte 14 Tage'
  if (preset === 'admission') return 'Seit Aufnahme'
  return 'Gesamter Verlauf'
}

export function resolveVerlauf(caseId: string, preset: VerlaufWindowPreset): ResolvedClinicalData['verlauf'] {
  try {
    const start = windowStartMs(preset, caseId)
    const entries: ResolvedVerlaufEntry[] = loadVerlaufFeed(caseId)
      .filter((entry) => {
        if (start == null) return true
        const ms = Date.parse(entry.date)
        return Number.isNaN(ms) ? true : ms >= start
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-50)
      .map((entry) => ({ date: formatClinicalDate(entry.date), text: plainText(entry.content) }))
      .filter((entry) => entry.text.length > 0)
    return { windowLabel: windowLabel(preset), entries }
  } catch {
    return { windowLabel: windowLabel(preset), entries: [] }
  }
}

function resolvePsychopathology(caseId: string): ResolvedClinicalData['psychopathology'] {
  try {
    const result = resolveOverviewPsychopathologyText(caseId)
    const text = plainText(result.text)
    if (!text) return undefined
    return { text, date: result.savedAt ? formatClinicalDate(result.savedAt) : undefined }
  } catch {
    return undefined
  }
}

function resolveRisk(caseId: string): ResolvedClinicalData['risk'] {
  try {
    const sections = loadNotionDocumentSnapshot('aufnahme', caseId)?.sectionContents ?? {}
    const parts: string[] = []
    const suizid = plainText(sections['suizid-und-selbstgefaehrdungsanamnese'])
    const fremd = plainText(sections['fremdgefaehrdungsanamnese'])
    if (suizid) parts.push(`Suizidalität / Selbstgefährdung: ${suizid}`)
    if (fremd) parts.push(`Fremdgefährdung: ${fremd}`)
    if (!parts.length) return undefined
    return { text: parts.join('\n\n') }
  } catch {
    return undefined
  }
}

function resolveTherapy(caseId: string): ResolvedTherapyItem[] {
  const items: ResolvedTherapyItem[] = []
  try {
    const plan = loadPsychotherapyPlan(caseId)
    if (plan) {
      const summary = derivePsychotherapySummary(plan, 'de')
      const detail = [summary.method, summary.frequency, summary.mainGoal].filter(Boolean).join(' · ')
      items.push({ label: 'Psychotherapie', detail: detail || undefined })
    }
  } catch {
    /* ignore */
  }
  try {
    for (const ct of loadComplementaryTherapies(caseId)) {
      const detail = [ct.frequency, ct.mainGoal].filter(Boolean).join(' · ')
      items.push({ label: ct.name, detail: detail || undefined })
    }
  } catch {
    /* ignore */
  }
  try {
    for (const wt of loadWeitereTherapie(caseId)) {
      const detail = [wt.frequency, wt.clinicalGoal].filter(Boolean).join(' · ')
      items.push({ label: wt.type, detail: detail || undefined })
    }
  } catch {
    /* ignore */
  }
  return items
}

function resolveSocialTherapy(caseId: string): ResolvedSocialTherapyItem[] {
  try {
    return loadSozialtherapie(caseId).map((target) => ({
      area: target.area,
      status: target.status,
      goal: target.goal?.trim() || undefined,
      measure: target.currentMeasure?.trim() || undefined,
    }))
  } catch {
    return []
  }
}

function readClinicianName(): string | undefined {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key?.includes('auth-token')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw) as { user?: { user_metadata?: Record<string, unknown>; email?: string } }
      const meta = parsed.user?.user_metadata
      const name = [meta?.full_name, meta?.name, meta?.display_name].find(
        (v): v is string => typeof v === 'string' && v.trim().length > 0,
      )
      if (name) return name.trim()
      if (parsed.user?.email?.trim()) return parsed.user.email.trim()
    }
  } catch {
    /* ignore */
  }
  return undefined
}

export async function resolveClinicalData(
  caseId: string | undefined,
  preset: VerlaufWindowPreset = '7d',
): Promise<ResolvedClinicalData> {
  const system = nowSystem()
  const clinician = { name: readClinicianName() }

  if (!caseId) {
    return { ...EMPTY_CLINICAL_DATA, system, clinician }
  }

  const demographics = resolveDemographics(caseId)
  try {
    const vault = await loadPatientMetadata(caseId)
    if (vault?.metadata.name) demographics.name = vault.metadata.name
    if (vault?.metadata.geburtsdatum) {
      demographics.geburtsdatum = formatClinicalDate(vault.metadata.geburtsdatum)
      const ageNum = calculateAgeFromIsoDate(vault.metadata.geburtsdatum)
      if (ageNum !== null) demographics.age = `${ageNum} J.`
    }
  } catch {
    /* ignore vault read errors */
  }

  const sections = (() => {
    try {
      return loadNotionDocumentSnapshot('aufnahme', caseId)?.sectionContents ?? {}
    } catch {
      return {}
    }
  })()

  return {
    source: 'real',
    demographics,
    admissionReason: plainText(sections['aufnahmeanlass']) || undefined,
    diagnoses: resolveDiagnoses(caseId),
    medications: resolveMedications(caseId),
    labs: resolveLabs(caseId),
    verlauf: resolveVerlauf(caseId, preset),
    verlaufByPreset: {
      '7d': resolveVerlauf(caseId, '7d'),
      '14d': resolveVerlauf(caseId, '14d'),
      admission: resolveVerlauf(caseId, 'admission'),
      all: resolveVerlauf(caseId, 'all'),
    },
    psychopathology: resolvePsychopathology(caseId),
    risk: resolveRisk(caseId),
    therapy: resolveTherapy(caseId),
    socialTherapy: resolveSocialTherapy(caseId),
    clinician,
    organization: {},
    system,
  }
}
