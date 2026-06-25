import { defaultAufnahmeSections } from '../../data/aufnahmeSections'
import type {
  ArztbriefDataModuleCoverage,
  ArztbriefFetchResult,
  ArztbriefIdentityBlock,
} from '../../types/arztbrief'
import type { ArztbriefDocumentType } from '../../types/arztbrief'
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

function formatDiagnoses(caseId: string): string {
  const entries = loadDiagnosen(caseId)
  if (entries.length === 0) return ''

  const psych = entries.filter((e) => e.diagnosisRole === 'main' || !e.diagnosisRole)
  const substance = entries.filter((e) => e.diagnosisRole === 'comorbidity')
  const somatic = entries.filter((e) => e.diagnosisRole === 'somatic_secondary')
  const suspected = entries.filter((e) => e.diagnosisStatus === 'suspected')

  const formatEntry = (entry: typeof entries[0], index: number) => {
    const { coding } = selectPrimaryCoding(entry)
    const code = coding.code?.trim()
    const label = coding.label?.trim()
    if (!code && !label) return null
    return `${index + 1}. ${code ? `${code} ` : ''}${label ?? ''}`.trim()
  }

  const lines: string[] = []
  let idx = 0
  for (const entry of [...psych, ...substance, ...somatic, ...suspected]) {
    const line = formatEntry(entry, idx)
    if (line) {
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
      if (dose && dose.toLowerCase().includes(substance.toLowerCase())) return dose
      return dose ? `${substance} ${dose}` : substance
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

async function buildIdentity(caseId: string): Promise<ArztbriefIdentityBlock> {
  const meta = getCaseMeta(caseId)
  const patient = await loadPatientMetadata(caseId)
  const admission = loadNotionPageDate('aufnahme', caseId)
  const discharge = loadNotionPageDate('therapie-verlauf', caseId) || loadNotionPageDate('verlauf', caseId)

  const treatmentPeriod = [admission, discharge].filter(Boolean).join(' – ')

  return {
    institution: meta?.pageHeading?.trim() || undefined,
    ward: undefined,
    letterDate: new Date().toLocaleDateString('de-DE'),
    patientName: patient?.metadata.name?.trim() || undefined,
    patientDob: patient?.metadata.geburtsdatum?.trim() || meta?.localGeburtsdatum?.trim() || undefined,
    treatmentPeriod: treatmentPeriod || undefined,
    recipient: undefined,
  }
}

const MODULE_DEFS: Array<{
  id: string
  labelDe: string
  labelEn: string
  probe: (caseId: string) => boolean
}> = [
  { id: 'diagnosis', labelDe: 'Diagnosen', labelEn: 'Diagnoses', probe: (id) => loadDiagnosen(id).length > 0 },
  { id: 'anamnesis', labelDe: 'Anamnese', labelEn: 'History', probe: (id) => Boolean(readDocSections(id, 'aufnahme')) },
  { id: 'psychopath', labelDe: 'Psychopathologie', labelEn: 'MSE', probe: (id) => Boolean(readDocSections(id, 'psychopath')) },
  { id: 'verlauf', labelDe: 'Verlauf', labelEn: 'Course', probe: (id) => Boolean(formatVerlauf(id)) },
  { id: 'medication', labelDe: 'Medikation', labelEn: 'Medication', probe: (id) => Boolean(formatDischargeMedication(id)) },
  { id: 'diagnostics', labelDe: 'Diagnostik', labelEn: 'Diagnostics', probe: (id) => Boolean(formatDiagnostics(id)) },
  { id: 'risk', labelDe: 'Risiko / Recht', labelEn: 'Risk / legal', probe: (id) => Boolean(formatRisk(id)) },
]

export async function fetchArztbriefPatientData(
  caseId: string,
  documentType: ArztbriefDocumentType,
): Promise<ArztbriefFetchResult & { identity: ArztbriefIdentityBlock }> {
  const identity = await buildIdentity(caseId)
  const coverage: ArztbriefDataModuleCoverage[] = MODULE_DEFS.map((m) => ({
    moduleId: m.id,
    labelDe: m.labelDe,
    labelEn: m.labelEn,
    available: m.probe(caseId),
  }))

  const missingSummary = coverage.filter((c) => !c.available).map((c) => c.labelDe)

  const sections: ArztbriefFetchResult['sections'] = {}

  sections.header = {
    content: buildDefaultHeaderTemplate(documentType),
    sourcePreview: 'Briefkopf (Identifikatoren werden lokal eingefügt)',
  }

  const diagnosen = formatDiagnoses(caseId)
  sections.diagnosen = diagnosen
    ? { content: diagnosen, sourcePreview: 'Diagnosenmodul' }
    : { content: '', missing: 'Keine Diagnosen dokumentiert' }

  sections.aufnahmeanlass = {
    content: readAufnahmeSection(caseId, 'aufnahmeanlass'),
    sourcePreview: 'Aufnahme — Aufnahmeanlass',
    missing: readAufnahmeSection(caseId, 'aufnahmeanlass') ? undefined : 'Aufnahmeanlass nicht dokumentiert',
  }

  sections.kurzanamnese = {
    content: [
      readAufnahmeSection(caseId, 'aktuelle-beschwerden'),
      readAufnahmeSection(caseId, 'aktuelle-krankheitsanamnese'),
    ]
      .filter(Boolean)
      .join('\n\n'),
    sourcePreview: 'Aufnahme — aktuelle Anamnese',
  }

  sections.zwischenanamnese = sections.kurzanamnese

  sections.aufnahmebefund = {
    content: readAufnahmeSection(caseId, 'psychopathologischer-befund') || readDocSections(caseId, 'psychopath'),
    sourcePreview: 'Psychopathologischer Befund',
  }

  sections['psychischer-befund'] = sections.aufnahmebefund

  for (const aufnahmeSection of defaultAufnahmeSections) {
    const key = aufnahmeSection.id
    if (key === 'aufnahmeanlass' || key === 'psychopathologischer-befund') continue
    const mappedKey =
      key === 'suchtanamnese'
        ? 'suchtanamnese'
        : key === 'somatische-anamnese'
          ? 'somatische-anamnese'
          : key === 'familienanamnese'
            ? 'familienanamnese'
            : key === 'sozialanamnese'
              ? 'sozialanamnese'
              : key === 'forensische-anamnese'
                ? 'forensische-anamnese'
                : key === 'psychiatrische-vorgeschichte'
                  ? 'psychiatrische-anamnese'
                  : key === 'eigenanamnese'
                    ? 'fremdbefunde'
                    : undefined
    if (!mappedKey || sections[mappedKey]?.content) continue
    const text = readAufnahmeSection(caseId, key)
    if (text) sections[mappedKey] = { content: text, sourcePreview: `Aufnahme — ${aufnahmeSection.label}` }
  }

  sections['neurologischer-befund'] = {
    content:
      readAufnahmeSection(caseId, 'neurologischer-befund') ||
      readAufnahmeSection(caseId, 'somatischer-befund'),
    sourcePreview: 'Aufnahme — neurologischer Befund',
  }
  sections['allgemeinmedizinischer-befund'] = sections['neurologischer-befund']
  sections['koerperlich-vegetativ'] = {
    content: readAufnahmeSection(caseId, 'aktuelle-beschwerden'),
    sourcePreview: 'Aufnahme — Beschwerden',
  }

  sections.diagnostik = {
    content: formatDiagnostics(caseId),
    sourcePreview: 'Labor / Diagnostik',
    missing: formatDiagnostics(caseId) ? undefined : 'Keine Diagnostik dokumentiert',
  }

  sections['medikation-entlassung'] = {
    content: formatDischargeMedication(caseId),
    sourcePreview: 'Medikationsplan',
    missing: formatDischargeMedication(caseId) ? undefined : 'Keine Entlassungsmedikation dokumentiert',
  }

  const introAdmission = loadNotionPageDate('aufnahme', caseId)
  const introDischarge = loadNotionPageDate('therapie-verlauf', caseId)
  sections.intro = {
    content: introAdmission
      ? `Wir berichten über ${identity.patientName ? 'den Patienten' : 'die Patientin'}, die sich vom ${introAdmission}${introDischarge ? ` bis ${introDischarge}` : ''} in unserer stationären Behandlung befand.`
      : '',
    sourcePreview: 'Aufnahme-/Entlassungsdaten',
    missing: introAdmission ? undefined : 'Aufnahmedatum nicht gesetzt',
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

export async function fetchArztbriefBlankData(): Promise<ArztbriefFetchResult> {
  return {
    sections: {},
    coverage: MODULE_DEFS.map((m) => ({
      moduleId: m.id,
      labelDe: m.labelDe,
      labelEn: m.labelEn,
      available: false,
    })),
    missingSummary: MODULE_DEFS.map((m) => m.labelDe),
    sourceSnapshotIds: [],
  }
}
