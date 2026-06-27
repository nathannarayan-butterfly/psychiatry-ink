/**
 * Programmatic builder for the deterministic demo patient fixture.
 * Runtime loads locale-specific `demoPatient.{locale}.fixture.json`; builder is source of truth for regen.
 * Keeps imports minimal so Node scripts can run without Vite env.
 */

import type { LaborBefund, LaborCategory } from '../utils/laborArchive'
import {
  DEMO_FIXTURE_VERSION,
  DEMO_SEED_VERSION,
  demoCaseIdForLocale,
  demoPatientIdForLocale,
  demoPatientIdentityForLocale,
} from './constants'
import type { DemoLocale } from './demoLocale'
import { getDemoContent } from './demoContent'
import type { DemoContentModule } from './demoContent/types'
import {
  LAB_BEFUND_1_DATE,
  LAB_BEFUND_2_DATE,
  LAB_BEFUND_ANTHRO_DATE,
  LAB_BEFUND_GLUCOSE_DATE,
} from './demoContent/createModule'
import { buildDemoClinicalIntelligenceState } from './buildDemoClinicalIntelligence'
import { buildDemoIsdmAnalysis } from './buildDemoExtendedModules'
import type { DemoPatientFixture } from './types'

const NOW = '2026-06-14T10:00:00.000Z'

function buildLaborBefundRawText(
  content: DemoContentModule,
  date: string,
  label: string,
  categories: LaborCategory[],
): string {
  const header = content.laborBefundHeader(date, label)
  const body = categories
    .map((cat) => {
      const rows = cat.values
        .map((value) => {
          const flag = value.isAbnormal ? ' !' : ''
          const ref = value.refText ? ` (${value.refText})` : ''
          return `${value.name}: ${value.value} ${value.unit}${ref}${flag}`
        })
        .join('\n')
      return `[${cat.label}]\n${rows}`
    })
    .join('\n\n')
  return `${header}\n\n${body}`
}

function buildLabGraphs(content: DemoContentModule, now: string) {
  const dates = [LAB_BEFUND_1_DATE, LAB_BEFUND_2_DATE]
  const params = content.labGraphParams()
  const med = content.buildMedicationPlanState(now).plans[0]?.medications ?? []

  const entries = dates.flatMap((date, drawIndex) =>
    params
      .filter((param) => {
        const value = drawIndex === 0 ? param.v1 : param.v2
        return !(
          param.parameter.toLowerCase().includes('aripiprazol') &&
          value <= 0
        )
      })
      .map((param, paramIndex) => {
        const value = drawIndex === 0 ? param.v1 : param.v2
        return {
          id: `demo-lab-${drawIndex}-${paramIndex}`,
          date,
          parameter: param.parameter,
          value: Math.round(value * 10) / 10,
          unit: param.unit,
          referenceLow: param.refLow,
          referenceHigh: param.refHigh,
          note: content.labGraphNote(param.parameter, drawIndex),
          createdAt: `${date}T08:00:00.000Z`,
          updatedAt: `${date}T08:00:00.000Z`,
        }
      }),
  )

  const risperidone = med.find((entry) => entry.id === 'demo-med-risperidon')
  const aripiprazole = med.find((entry) => entry.id === 'demo-med-aripiprazol')
  const selectedParameter =
    params.find((param) => param.parameter.toLowerCase().includes('prolactin'))?.parameter ??
    'Prolactin'

  const graphId = 'demo-lab-graph-01'
  return {
    labGraphs: [
      {
        id: graphId,
        title: content.labGraphTitle(),
        entries,
        markers: [
          {
            id: 'demo-med-marker-01',
            date: '2026-06-05',
            medicationName: risperidone?.substance ?? 'Risperidone',
            dose: '3',
            doseUnit: 'mg',
            changeType: 'increased' as const,
            note: content.medMarkerNote('increased'),
            createdAt: '2026-06-05T09:00:00.000Z',
            updatedAt: '2026-06-05T09:00:00.000Z',
          },
          {
            id: 'demo-med-marker-02',
            date: '2026-06-09',
            medicationName: aripiprazole?.substance ?? 'Aripiprazole',
            dose: '10',
            doseUnit: 'mg',
            changeType: 'started' as const,
            note: content.medMarkerNote('started'),
            createdAt: '2026-06-09T09:00:00.000Z',
            updatedAt: '2026-06-09T09:00:00.000Z',
          },
        ],
        selectedParameter,
        dateRangePreset: 'all' as const,
        updatedAt: now,
      },
    ],
    activeLabGraphId: graphId,
  }
}

function buildLaborBefunde(content: DemoContentModule, caseId: string): LaborBefund[] {
  const categories = content.buildLaborCategories()
  const specs: Array<{
    id: string
    date: string
    kind: 'admission' | 'followup' | 'anthro' | 'glucose'
    categories: LaborCategory[]
    createdAt: string
  }> = [
    {
      id: 'demo-labor-befund-01',
      date: LAB_BEFUND_1_DATE,
      kind: 'admission',
      categories: categories.befund1,
      createdAt: `${LAB_BEFUND_1_DATE}T08:15:00.000Z`,
    },
    {
      id: 'demo-labor-befund-02',
      date: LAB_BEFUND_2_DATE,
      kind: 'followup',
      categories: categories.befund2,
      createdAt: `${LAB_BEFUND_2_DATE}T08:15:00.000Z`,
    },
    {
      id: 'demo-labor-befund-anthro',
      date: LAB_BEFUND_ANTHRO_DATE,
      kind: 'anthro',
      categories: categories.anthro,
      createdAt: `${LAB_BEFUND_ANTHRO_DATE}T10:00:00.000Z`,
    },
    {
      id: 'demo-labor-befund-glucose',
      date: LAB_BEFUND_GLUCOSE_DATE,
      kind: 'glucose',
      categories: categories.glucose,
      createdAt: `${LAB_BEFUND_GLUCOSE_DATE}T08:30:00.000Z`,
    },
  ]

  return specs.map((spec) => {
    const label = content.laborBefundLabel(spec.kind)
    return {
      id: spec.id,
      caseId,
      date: spec.date,
      label,
      rawText: buildLaborBefundRawText(content, spec.date, label, spec.categories),
      categories: spec.categories,
      createdAt: spec.createdAt,
    }
  })
}

export function buildDemoPatientFixture(locale: DemoLocale = 'de'): DemoPatientFixture {
  const content = getDemoContent(locale)
  const identity = demoPatientIdentityForLocale(locale)
  const caseId = demoCaseIdForLocale(locale)
  const patientId = demoPatientIdForLocale(locale)
  const admissionDate = content.admissionDate
  const aufnahmeSections = content.buildAufnahmeSections()
  const verlaufFeed = content.buildVerlaufFeed()
  const verlaufAnnotations = content.buildVerlaufAnnotations(verlaufFeed)
  const { labGraphs, activeLabGraphId } = buildLabGraphs(content, NOW)
  const laborBefunde = buildLaborBefunde(content, caseId)
  const diagnoses = content.buildDiagnoses(NOW)
  const medicationPlanState = content.buildMedicationPlanState(NOW)
  const clinicalImprints = content.buildClinicalImprints(NOW, verlaufFeed)
  const workspaceDocs = content.buildWorkspaceDocuments(NOW, aufnahmeSections)
  const { timelines, activeTimelineId } = content.buildTimeline(NOW)
  const isdmInput = content.buildIsdmInput(NOW)
  const butterflyAttestations = content.buildButterflyAttestations()
  const clinicalQuestionNotes = content.buildClinicalQuestionNotes(NOW)
  const anforderungen = content.buildAnforderungen(admissionDate)
  const isdmAnalysis = buildDemoIsdmAnalysis({
    caseId,
    diagnoses,
    clinicalImprints,
    medicationPlanState,
    verlaufFeed,
    isdmInput,
    butterflyAttestations,
  })

  return {
    version: DEMO_FIXTURE_VERSION,
    isDemoPatient: true,
    demoSeedVersion: DEMO_SEED_VERSION,
    demoPatientId: patientId,
    demoCaseId: caseId,
    demoLocale: locale,
    patient: {
      vorname: identity.vorname,
      nachname: identity.nachname,
      geburtsdatum: identity.geburtsdatum,
      geschlecht: identity.geschlecht,
      age: identity.age,
      admissionDate,
      patientId,
      caseId,
    },
    workspace: {
      age: identity.age,
      selectedDocumentType: 'aufnahme',
      documents: workspaceDocs.documents,
      pageHeadings: workspaceDocs.pageHeadings,
      pageDates: workspaceDocs.pageDates,
      pageTimes: {},
      timelines,
      activeTimelineId,
      labGraphs,
      activeLabGraphId,
      diagnoses,
      clinicalImprints,
      isdmAnalysis,
      isdmInput,
      butterflyAttestations,
      clinicalQuestionNotes,
      anforderungen,
      medicationPlanState,
      psychotherapyPlan: content.buildPsychotherapyPlan(NOW),
      complementaryTherapies: content.buildComplementaryTherapies(NOW),
      weitereTherapie: content.buildWeitereTherapie(NOW),
      activeVariantIds: { psychopath: 'free' },
    },
    verlaufFeed,
    verlaufAnnotations,
    laborBefunde,
    befundRecords: [
      {
        id: 'demo-befund-ecg-01',
        caseId,
        type: 'ecg',
        schemaVersion: 1,
        fieldValues: {
          rhythm: ['sinus'],
          rate: '72/min',
          ekg_type: 'linkstyp',
          pq: '160 ms',
          qtc: '410 ms',
          st: ['normal'],
          blocks: ['none'],
          conclusion_preset: ['unremarkable'],
        },
        status: 'vidert',
        examDate: '2026-06-08',
        createdAt: '2026-06-08T10:00:00.000Z',
        updatedAt: '2026-06-08T10:30:00.000Z',
        vidertAt: '2026-06-08T10:30:00.000Z',
      },
      content.buildEegBefund(),
    ],
    sozialtherapie: content.buildSozialtherapie(NOW),
    dokumente: content.buildDokumente(NOW, aufnahmeSections, verlaufFeed, laborBefunde),
    generatedDocuments: content.buildGeneratedDocuments(NOW),
    calendarItems: content.buildCalendarItems(NOW),
    modulePlaceholders: content.buildModulePlaceholders(),
    aiTherapyDemo: content.buildAiTherapyDemo(NOW),
    clinicalIntelligence: buildDemoClinicalIntelligenceState(locale),
  }
}
