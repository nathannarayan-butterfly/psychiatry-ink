import { defaultAufnahmeSections } from '../../data/aufnahmeSections'
import type {
  DischargeSummaryDataModuleCoverage,
  DischargeSummaryDocumentType,
  DischargeSummaryFetchResult,
  DischargeSummaryIdentityBlock,
  DischargeSummaryRegion,
} from '../../types/dischargeSummary'
import { getCaseMeta } from '../../hooks/useCaseRegistry'
import { loadDiagnosen, selectPrimaryCoding } from '../diagnosenArchive'
import { loadPatientMetadata } from '../cryptoVault'
import { loadNotionDocumentSnapshot } from '../notionDocumentActions'
import { loadNotionPageDate } from '../notionPageDate'
import { getInitialEditorContent } from '../workspaceComponents'
import { collectClinicalPayload } from '../workspaceVault'
import { loadVerlaufFeed } from '../verlaufFeed'
import { formatDoseLineGerman } from '../medication/doseLine'
import { isMedicationVisible } from '../medication/planOps'
import { buildDefaultHeaderTemplate } from './export'
import { regionLegalStatusLabel } from './regionSpelling'

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function readDocSections(caseId: string, documentTypeId: string, sectionIds?: string[]): string {
  const snap = loadNotionDocumentSnapshot(documentTypeId, caseId)
  if (!snap?.sectionContents) return ''
  if (!sectionIds) {
    return Object.values(snap.sectionContents)
      .map((v) => stripHtml(String(v ?? '')))
      .filter(Boolean)
      .join('\n\n')
  }
  return sectionIds
    .map((id) => stripHtml(getInitialEditorContent(snap.sectionContents[id], '')))
    .filter(Boolean)
    .join('\n\n')
}

function readAufnahmeSection(caseId: string, sectionId: string): string {
  return readDocSections(caseId, 'aufnahme', [sectionId])
}

function formatDiagnosesEn(caseId: string): string {
  const entries = loadDiagnosen(caseId)
  if (entries.length === 0) return ''

  const psych = entries.filter((e) => e.diagnosisRole === 'main' || !e.diagnosisRole)
  const substance = entries.filter((e) => e.diagnosisRole === 'comorbidity')
  const somatic = entries.filter((e) => e.diagnosisRole === 'somatic_secondary')
  const suspected = entries.filter((e) => e.diagnosisStatus === 'suspected')

  const formatEntry = (entry: (typeof entries)[0], index: number, provisional: boolean) => {
    const { coding } = selectPrimaryCoding(entry)
    const code = coding.code?.trim()
    const label = coding.label?.trim()
    if (!code && !label) return null
    const suffix = provisional ? ' (provisional)' : ''
    return `${index + 1}. ${code ? `${code} ` : ''}${label ?? ''}${suffix}`.trim()
  }

  const lines: string[] = []
  let idx = 0

  if (psych.length) {
    lines.push('Primary psychiatric:')
    for (const entry of psych.filter((e) => e.diagnosisStatus !== 'suspected')) {
      const line = formatEntry(entry, idx, false)
      if (line) {
        lines.push(line)
        idx += 1
      }
    }
  }

  const provPsych = psych.filter((e) => e.diagnosisStatus === 'suspected')
  if (provPsych.length) {
    lines.push('Provisional psychiatric:')
    for (const entry of provPsych) {
      const line = formatEntry(entry, idx, true)
      if (line) {
        lines.push(line)
        idx += 1
      }
    }
  }

  if (substance.length) {
    lines.push('Substance-related:')
    for (const entry of substance) {
      const line = formatEntry(entry, idx, entry.diagnosisStatus === 'suspected')
      if (line) {
        lines.push(line)
        idx += 1
      }
    }
  }

  if (somatic.length) {
    lines.push('Medical / somatic:')
    for (const entry of somatic) {
      const line = formatEntry(entry, idx, entry.diagnosisStatus === 'suspected')
      if (line) {
        lines.push(line)
        idx += 1
      }
    }
  }

  for (const entry of suspected.filter(
    (e) => !psych.includes(e) && !substance.includes(e) && !somatic.includes(e),
  )) {
    const line = formatEntry(entry, idx, true)
    if (line) {
      if (!lines.some((l) => l.startsWith('Provisional'))) lines.push('Provisional:')
      lines.push(line)
      idx += 1
    }
  }

  return lines.join('\n')
}

function formatDischargeMedication(caseId: string): string {
  const payload = collectClinicalPayload(undefined, caseId)
  const state = payload.medicationPlanState
  const plan = state?.plans?.find((p) => p.id === state.currentPlanId) ?? state?.plans?.[0]
  if (!plan?.medications?.length) return ''

  return plan.medications
    .filter((m) => isMedicationVisible(m) && m.status !== 'discontinued')
    .map((m) => {
      const dose =
        formatDoseLineGerman(
          m.substance,
          m.formulation,
          m.strength,
          m.doseSchedule,
        ) || m.doseLineGerman?.trim()
      const substance = m.substance.trim()
      return dose && dose.toLowerCase().includes(substance.toLowerCase()) ? dose : dose ? `${substance} ${dose}` : substance
    })
    .join('\n')
}

function formatVerlauf(caseId: string): string {
  const blocks: string[] = []
  blocks.push(readDocSections(caseId, 'therapie-verlauf'))
  blocks.push(readDocSections(caseId, 'verlauf'))
  const feed = loadVerlaufFeed(caseId)
    .filter((e) => e.pageType === 'therapie-verlauf' || e.pageType === 'verlauf')
    .map((e) => e.content.trim())
    .filter(Boolean)
  blocks.push(...feed)
  return blocks.filter(Boolean).join('\n\n')
}

function formatDiagnostics(caseId: string): string {
  const payload = collectClinicalPayload(undefined, caseId)
  const labTitles = (payload.labGraphs ?? []).map((g) => g.title || g.id).filter(Boolean)
  const befund = readDocSections(caseId, 'aufnahme', ['somatischer-befund', 'diagnostische-einschaetzung'])
  const parts = [...labTitles.map((t) => `• ${t}`), befund].filter(Boolean)
  return parts.join('\n')
}

function formatRisk(caseId: string): string {
  const riskIds = [
    'suizid-und-selbstgefaehrdungsanamnese',
    'fremdgefaehrdungsanamnese',
    'forensische-anamnese',
  ]
  return readDocSections(caseId, 'aufnahme', riskIds)
}

function formatLegalStatus(caseId: string, region: DischargeSummaryRegion): string {
  const forensic = readAufnahmeSection(caseId, 'forensische-anamnese')
  const header = regionLegalStatusLabel(region)
  if (!forensic.trim()) return ''
  return `${header}:\n${forensic}`
}

function computeAge(dob?: string): string | undefined {
  if (!dob?.trim()) return undefined
  const parsed = new Date(dob)
  if (Number.isNaN(parsed.getTime())) return undefined
  const now = new Date()
  let age = now.getFullYear() - parsed.getFullYear()
  const m = now.getMonth() - parsed.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < parsed.getDate())) age -= 1
  return age >= 0 ? String(age) : undefined
}

async function buildIdentity(caseId: string, region: DischargeSummaryRegion): Promise<DischargeSummaryIdentityBlock> {
  const meta = getCaseMeta(caseId)
  const patient = await loadPatientMetadata(caseId)
  const admission = loadNotionPageDate('aufnahme', caseId)
  const discharge =
    loadNotionPageDate('therapie-verlauf', caseId) || loadNotionPageDate('verlauf', caseId)
  const locale = region === 'US' ? 'en-US' : 'en-GB'

  const treatmentPeriod = [admission, discharge].filter(Boolean).join(' – ')
  const dob = patient?.metadata.geburtsdatum?.trim() || meta?.localGeburtsdatum?.trim()

  return {
    institution: meta?.pageHeading?.trim() || undefined,
    ward: undefined,
    documentDate: new Date().toLocaleDateString(locale),
    patientName: patient?.metadata.name?.trim() || undefined,
    patientDob: dob || undefined,
    patientId: shortCaseRef(caseId),
    patientAge: computeAge(dob),
    patientSex: meta?.localGeschlecht
      ? meta.localGeschlecht === 'maennlich'
        ? 'Male'
        : meta.localGeschlecht === 'weiblich'
          ? 'Female'
          : 'Other / unspecified'
      : undefined,
    patientAddress: undefined,
    admissionDate: admission || undefined,
    dischargeDate: discharge || undefined,
    treatmentPeriod: treatmentPeriod || undefined,
    admissionType: readAufnahmeSection(caseId, 'aufnahmeart') || undefined,
    dischargeDestination: readAufnahmeSection(caseId, 'entlassung-nach') || undefined,
    consultant: undefined,
    responsibleClinician: undefined,
    recipient: undefined,
  }
}

function shortCaseRef(caseId: string): string {
  return caseId.slice(0, 8).toUpperCase()
}

const MODULE_DEFS: Array<{
  id: string
  labelEn: string
  probe: (caseId: string) => boolean
}> = [
  { id: 'diagnosis', labelEn: 'Diagnoses', probe: (id) => loadDiagnosen(id).length > 0 },
  { id: 'anamnesis', labelEn: 'History', probe: (id) => Boolean(readDocSections(id, 'aufnahme')) },
  { id: 'psychopath', labelEn: 'MSE', probe: (id) => Boolean(readDocSections(id, 'psychopath')) },
  { id: 'verlauf', labelEn: 'Hospital course', probe: (id) => Boolean(formatVerlauf(id)) },
  { id: 'medication', labelEn: 'Medication', probe: (id) => Boolean(formatDischargeMedication(id)) },
  { id: 'diagnostics', labelEn: 'Investigations', probe: (id) => Boolean(formatDiagnostics(id)) },
  { id: 'risk', labelEn: 'Risk / legal', probe: (id) => Boolean(formatRisk(id)) },
  { id: 'therapy', labelEn: 'Therapy / follow-up', probe: (id) => Boolean(readDocSections(id, 'therapieplanung')) },
]

export async function fetchDischargeSummaryPatientData(
  caseId: string,
  documentType: DischargeSummaryDocumentType,
  region: DischargeSummaryRegion,
): Promise<DischargeSummaryFetchResult & { identity: DischargeSummaryIdentityBlock }> {
  const identity = await buildIdentity(caseId, region)
  const coverage: DischargeSummaryDataModuleCoverage[] = MODULE_DEFS.map((m) => ({
    moduleId: m.id,
    labelEn: m.labelEn,
    available: m.probe(caseId),
  }))

  const missingSummary = coverage.filter((c) => !c.available).map((c) => c.labelEn)
  const sections: DischargeSummaryFetchResult['sections'] = {}

  sections.header = {
    content: buildDefaultHeaderTemplate(documentType, region),
    sourcePreview: 'Header (identifiers merged locally)',
  }

  const diagnosen = formatDiagnosesEn(caseId)
  sections.diagnoses = diagnosen
    ? { content: diagnosen, sourcePreview: 'Diagnosis module' }
    : { content: '', missing: 'No diagnoses documented' }

  sections['reason-for-admission'] = {
    content: readAufnahmeSection(caseId, 'aufnahmeanlass'),
    sourcePreview: 'Admission — reason for admission',
    missing: readAufnahmeSection(caseId, 'aufnahmeanlass')
      ? undefined
      : 'Reason for admission not documented',
  }

  sections['brief-relevant-history'] = {
    content: [
      readAufnahmeSection(caseId, 'aktuelle-beschwerden'),
      readAufnahmeSection(caseId, 'aktuelle-krankheitsanamnese'),
    ]
      .filter(Boolean)
      .join('\n\n'),
    sourcePreview: 'Admission — current history',
  }

  sections['history-presenting-illness'] = sections['brief-relevant-history']

  sections['mse-admission'] = {
    content:
      readAufnahmeSection(caseId, 'psychopathologischer-befund') ||
      readDocSections(caseId, 'psychopath'),
    sourcePreview: 'MSE on admission',
  }

  sections['mse-discharge'] = sections['mse-admission']

  for (const aufnahmeSection of defaultAufnahmeSections) {
    const key = aufnahmeSection.id
    const mappedKey =
      key === 'psychiatrische-vorgeschichte'
        ? 'past-psychiatric-history'
        : key === 'suchtanamnese'
          ? 'substance-use-history'
          : key === 'somatische-anamnese'
            ? 'medical-surgical-history'
            : key === 'familienanamnese'
              ? 'family-history'
              : key === 'sozialanamnese'
                ? 'personal-developmental-social-history'
                : key === 'forensische-anamnese'
                  ? 'forensic-legal-history'
                  : undefined
    if (!mappedKey || sections[mappedKey]?.content) continue
    const text = readAufnahmeSection(caseId, key)
    if (text) sections[mappedKey] = { content: text, sourcePreview: `Admission — ${aufnahmeSection.label}` }
  }

  sections['physical-neurological-examination'] = {
    content: readAufnahmeSection(caseId, 'somatischer-befund'),
    sourcePreview: 'Admission — physical examination',
  }

  sections.investigations = {
    content: formatDiagnostics(caseId),
    sourcePreview: 'Laboratory / investigations',
    missing: formatDiagnostics(caseId) ? undefined : 'No investigations documented',
  }

  sections['medication-discharge'] = {
    content: formatDischargeMedication(caseId),
    sourcePreview: 'Medication plan',
    missing: formatDischargeMedication(caseId) ? undefined : 'No discharge medication documented',
  }

  sections['medication-history'] = sections['medication-discharge']
  sections['medication-changes-admission'] = {
    content: readDocSections(caseId, 'medikation'),
    sourcePreview: 'Medication module',
  }

  sections['allergies-adrs'] = {
    content: readAufnahmeSection(caseId, 'allergien-unvertraeglichkeiten'),
    sourcePreview: 'Admission — allergies',
    missing: readAufnahmeSection(caseId, 'allergien-unvertraeglichkeiten')
      ? undefined
      : 'Allergies not documented',
  }

  sections['risk-assessment-discharge'] = {
    content: formatRisk(caseId),
    sourcePreview: 'Risk assessment modules',
    missing: formatRisk(caseId) ? undefined : 'Risk assessment not documented',
  }
  sections['risk-assessment'] = sections['risk-assessment-discharge']

  sections['discharge-plan-followup'] = {
    content: readDocSections(caseId, 'therapieplanung'),
    sourcePreview: 'Therapy planning',
  }
  sections['discharge-plan'] = sections['discharge-plan-followup']

  sections['information-given-patient'] = {
    content: readAufnahmeSection(caseId, 'aufklaerung-einwilligung'),
    sourcePreview: 'Admission — information / consent',
  }

  sections['capacity-consent-legal'] = {
    content: formatLegalStatus(caseId, region),
    sourcePreview: 'Legal / forensic status',
    missing: formatLegalStatus(caseId, region) ? undefined : 'Legal status not documented',
  }

  const coursePreview = formatVerlauf(caseId)
  if (coursePreview) {
    sections['hospital-course'] = { content: '', sourcePreview: 'Course module (AI default)' }
    sections['treatment-hospital-course'] = sections['hospital-course']
  }

  const sourceSnapshotIds = [
    loadNotionDocumentSnapshot('aufnahme', caseId)?.savedAt,
    loadNotionDocumentSnapshot('psychopath', caseId)?.savedAt,
    loadNotionDocumentSnapshot('therapie-verlauf', caseId)?.savedAt,
  ].filter(Boolean) as string[]

  return {
    sections,
    coverage,
    missingSummary,
    sourceSnapshotIds,
    identity,
  }
}

export async function fetchDischargeSummaryBlankData(): Promise<DischargeSummaryFetchResult> {
  return {
    sections: {},
    coverage: MODULE_DEFS.map((m) => ({
      moduleId: m.id,
      labelEn: m.labelEn,
      available: false,
    })),
    missingSummary: MODULE_DEFS.map((m) => m.labelEn),
    sourceSnapshotIds: [],
  }
}
