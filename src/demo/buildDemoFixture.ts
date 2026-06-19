/**
 * Programmatic builder for the deterministic demo patient fixture.
 * Runtime loads `demoPatient.fixture.json`; this module is the source of truth for regen.
 * Keeps imports minimal so Node scripts can run without Vite env.
 */

import { MEDICATION_PLAN_STATE_VERSION } from '../types/medicationPlan'
import { PSYCHOTHERAPY_PLAN_VERSION } from '../types/psychotherapy'
import {
  COMBINATION_CHECK_STORE_VERSION,
  type CombinationCheckStore,
} from '../types/combinationCheck'
import {
  LAB_MED_CORRELATION_STORE_VERSION,
  type LabMedicationCorrelationStore,
} from '../types/labMedicationCorrelation'
import type { PrepAiCheckCache } from '../utils/prepAiCheck/storage'
import { buildCombinationKeyFromNames } from '../utils/combinationCheck/combinationKey'
import { buildCorrelationKey } from '../utils/labMedicationCorrelation/correlationKey'
import {
  DEMO_CASE_ID,
  DEMO_FIXTURE_VERSION,
  DEMO_PATIENT_ID,
  DEMO_SEED_VERSION,
} from './constants'
import type { LaborBefund, LaborCategory, LaborValue } from '../utils/laborArchive'
import type { DemoPatientFixture } from './types'
import {
  buildDemoAnforderungen,
  buildDemoButterflyAttestations,
  buildDemoClinicalQuestionNotes,
  buildDemoEegBefund,
  buildDemoIsdmAnalysis,
  buildDemoIsdmInput,
} from './buildDemoExtendedModules'

const LAB_BEFUND_1_DATE = '2026-06-05'
const LAB_BEFUND_2_DATE = '2026-06-20'
const LAB_BEFUND_ANTHRO_DATE = '2026-06-10'
const LAB_BEFUND_GLUCOSE_DATE = '2026-06-12'

type LabParamInput = {
  name: string
  value: string
  numericValue: number
  unit: string
  refMin?: number
  refMax?: number
  refText?: string
  isAbnormal?: boolean
}

function labParam(input: LabParamInput): LaborValue {
  const refText =
    input.refText ??
    (input.refMin != null && input.refMax != null
      ? `${input.refMin}–${input.refMax}`
      : input.refMax != null
        ? `< ${input.refMax}`
        : input.refMin != null
          ? `> ${input.refMin}`
          : undefined)
  const isAbnormal =
    input.isAbnormal ??
    ((input.refMin != null && input.numericValue < input.refMin) ||
      (input.refMax != null && input.numericValue > input.refMax))
  return {
    name: input.name,
    value: input.value,
    numericValue: input.numericValue,
    unit: input.unit,
    refMin: input.refMin,
    refMax: input.refMax,
    refText,
    isAbnormal,
  }
}

function labCategory(id: string, label: string, params: LabParamInput[]): LaborCategory {
  return { id, label, values: params.map(labParam) }
}

function buildLaborBefundRawText(date: string, label: string, categories: LaborCategory[]): string {
  const header = `Laborbefund vom ${date}${label ? ` — ${label}` : ''}`
  const body = categories
    .map((cat) => {
      const rows = cat.values
        .map((v) => {
          const flag = v.isAbnormal ? ' !' : ''
          const ref = v.refText ? ` (${v.refText})` : ''
          return `${v.name}: ${v.value} ${v.unit}${ref}${flag}`
        })
        .join('\n')
      return `[${cat.label}]\n${rows}`
    })
    .join('\n\n')
  return `${header}\n\n${body}`
}

const AUFNAHME_SECTION_IDS = [
  'aufnahmeanlass',
  'aktuelle-beschwerden',
  'eigenanamnese',
  'aktuelle-krankheitsanamnese',
  'psychiatrische-vorgeschichte',
  'somatische-anamnese',
  'suchtanamnese',
  'medikamentenanamnese',
  'familienanamnese',
  'biografische-anamnese',
  'sozialanamnese',
  'schul-und-berufsanamnese',
  'forensische-anamnese',
  'traumaanamnese',
  'suizid-und-selbstgefaehrdungsanamnese',
  'fremdgefaehrdungsanamnese',
  'psychopathologischer-befund',
  'somatischer-befund',
  'diagnostische-einschaetzung',
  'therapieplanung-behandlungsplan',
] as const

const NOW = '2026-06-14T10:00:00.000Z'
const ADMISSION = '2026-06-02'
const DEMO_DOB = '1992-08-12'
const DEMO_VORNAME = 'Anna'
const DEMO_NACHNAME = 'Demo'

function sectionMap(
  entries: Record<string, string>,
): Record<string, string> {
  const all: Record<string, string> = {}
  for (const sectionId of AUFNAHME_SECTION_IDS) {
    all[sectionId] = entries[sectionId] ?? ''
  }
  return all
}

function buildAufnahmeSections(): Record<string, string> {
  return sectionMap({
    aufnahmeanlass:
      'Elektive stationäre Aufnahme über die Notaufnahme nach akuter psychotischer Dekompensation mit paranoiden Inhalten, Schlafdefizit und zunehmender Substanzeinnahme. Zuweisung durch den Hausarzt nach telefonischer Rücksprache; keine akute Fremdgefährdung, jedoch eingeschränkte Krankheitseinsicht.',
    'aktuelle-beschwerden':
      'Seit ca. 10–14 Tagen zunehmende innere Unruhe, Schlafdefizit (<3 h/Nacht), Misstrauen gegenüber Nachbarn („werden beobachtet"), gehäufte Telefonate bei Polizei ohne belastbare Anhaltspunkte. Stimmung wechselhaft zwischen gereizt und ängstlich. Appetit reduziert.',
    eigenanamnese:
      'Frau Demo berichtet belastbare Eigenanamnese. Keine bekannte somatische Vorerkrankung von relevanter Bedeutung. Keine Allergien bekannt.',
    'aktuelle-krankheitsanamnese':
      'Erste psychotische Episode mit 22 J. nach Cannabisabusus, damals kurzzeitige stationäre Behandlung. Seitdem mehrere ambulante Phasen mit unregelmäßiger Medikamenteneinnahme. Aktuell erneute Verschlechterung im Kontext von Schlafentzug, Amphetamin-Konsum („Speed" am Wochenende) und beruflichem Stress.',
    'psychiatrische-vorgeschichte':
      'Mehrere vorstationäre Kontakte, zuletzt vor 8 Monaten ambulant wegen depressiver Symptomatik. Frühere Diagnosen: paranoider Schizophrenie-Verdacht (F20.0), episodisch schwere depressive Störung (unsicher). Keine Suizidversuche. Keine längere Zwangsunterbringung.',
    'somatische-anamnese':
      'Keine relevante internistische Vorerkrankung. Gelegentliche Kopfschmerzen bei Schlafmangel. Keine bekannten Medikamentenallergien.',
    suchtanamnese:
      'Cannabis seit Jugend, aktuell ca. 1–2 Joints/Tag. Episodischer Amphetamin-Konsum („Speed"), zuletzt vor Aufnahme am Wochenende. Alkohol gelegentlich, kein täglicher Konsum. Nikotin ca. 15 Zigaretten/Tag. Kein i.v.-Drogenkonsum bekannt.',
    medikamentenanamnese:
      'Vor Aufnahme unregelmäßig Risperidon 2 mg abends (Compliance unsicher), gelegentlich Lorazepam bei Unruhe. Keine regelmäßige Einnahme in den 2 Wochen vor Aufnahme.',
    familienanamnese:
      'Vater mit behandelter Depression (unsicher bezüglich Diagnosestellung). Keine familiäre Belastung durch Psychosen bekannt. Mutter gesund.',
    'biografische-anamnese':
      'Aufgewachsen in urbanem Umfeld, Schulabschluss mittlere Reife, danach Ausbildung im IT-Bereich. Mehrere längere Partnerschaften, aktuell alleinstehend.',
    sozialanamnese:
      'Wohnt allein in Mietwohnung (fiktive Demo-Adresse). Arbeitslos seit 3 Monaten nach Kündigung. Finanzielle Belastung, keine akute Wohnungslosigkeit. Sozialer Kontakt reduziert.',
    'schul-und-berufsanamnese':
      'Berufliche Tätigkeit in IT bis zur Kündigung wegen Fehlzeiten. Keine aktuelle Erwerbstätigkeit.',
    'forensische-anamnese':
      'Keine relevante forensische Vorgeschichte. Keine laufenden Strafverfahren.',
    traumaanamnese:
      'Kein eindeutiges Trauma berichtet. Belastungen im Jugendalter unscharf.',
    'suizid-und-selbstgefaehrdungsanamnese':
      'Passives Todeswünschen gelegentlich („manchmal wäre Ruhe gut"), jedoch keine konkreten Pläne, Absichten oder Vorbereitungen. Kein Suizidversuch in der Vorgeschichte. Schutzfaktoren: ambivalente Bindung an Schwester, therapeutische Beziehung langsam aufbauend. BRMS-Screening: niedriges akutes Risiko; Sicherheitsplan besprochen.',
    fremdgefaehrdungsanamnese:
      'Keine Hinweise auf akute Fremdgefährdung. Keine Waffen. Gelegentlich lautstarkes Verhalten, Nachbarn beschwert.',
    'psychopathologischer-befund':
      'Wach, allseits orientiert. Kontakt mühevoll, misstrauisch. Affekt labil, teils gereizt. Denken formal leicht umständlich, inhaltlich wahnhaft-paranoid (Verfolgungs- und Beobachtungsideen ohne vollständige Einsicht). Keine Sinnestäuschungen zum Untersuchungszeitpunkt eindeutig. Antrieb reduziert. Schlafstörung. Krankheitseinsicht gering.',
    'somatischer-befund':
      'Vitalzeichen stabil. Herz-Lunge unauffällig. Neurologischer Kurzstatus ohne fokal-neurologische Defizite.',
    'diagnostische-einschaetzung':
      'V. a. akute psychotische Episode im Rahmen einer schizophreniformen Störung (F20.0), differentialdiagnostisch schizoaffektive Störung und substanzinduzierte Psychose (F12.2/F15.2). Diagnosen mit Unsicherheit — weiterbeobachtung erforderlich.',
    'therapieplanung-behandlungsplan':
      'Antipsychotische Stabilisierung, Schlafregulation, Suchtmotivation. Psychoedukation, Verlaufsdokumentation. Entlassungsplanung nach Stabilisierung und Wohnungs-/Arbeitsklärung.',
  })
}

function buildVerlaufFeed() {
  const entries = [
    { date: `${ADMISSION}T08:30:00.000Z`, content: 'Aufnahme auf Station. Patient misstrauisch, schläft kaum. Risperidon 2 mg fixiert, Lorazepam PRN verordnet.' },
    { date: `${ADMISSION}T14:00:00.000Z`, content: 'Nachmittags zunehmende Unruhe, Lorazepam 1 mg einmalig. Kontakt weiterhin angespannt.' },
    { date: '2026-06-03T09:00:00.000Z', content: 'Nacht 4 h Schlaf. Paranoide Inhalte weiter präsent, jedoch weniger agitiert.' },
    { date: '2026-06-03T16:30:00.000Z', content: 'Psychoedukation Gruppe besucht, passive Teilnahme.' },
    { date: '2026-06-05T10:30:00.000Z', content: 'Aufnahmelabor (05.06.) — Prolaktin deutlich erhöht unter Risperidon 3 mg, sonst Routinepanel ohne relevante Pathologie.' },
    { date: '2026-06-05T09:30:00.000Z', content: 'Risperidon auf 3 mg erhöht wegen persistierender Positivsymptomatik.' },
    { date: '2026-06-06T11:00:00.000Z', content: 'Einzelgespräch: Patient berichtet reduzierte „Beobachtungs"-Erlebnisse, Schlaf 5–6 h.' },
    { date: '2026-06-07T09:00:00.000Z', content: 'Stationsverhalten ruhiger. Motivation für Entlassungsplanung noch gering.' },
    { date: '2026-06-08T10:30:00.000Z', content: 'EKG ohne relevante Pathologie. Besprechung mit Sozialdienst wegen Wohn- und Arbeitssituation.' },
    { date: '2026-06-09T09:00:00.000Z', content: 'Wechsel auf Aripiprazol 10 mg begonnen (Risperidon ausgeschlichen) wegen Prolaktin-Anstieg und Antriebsminderung.' },
    { date: '2026-06-10T14:00:00.000Z', content: 'Sporttherapie zweimal teilgenommen. Stimmung etwas gebessert.' },
    { date: '2026-06-11T09:30:00.000Z', content: 'Keine akute Suizidalität. Krankheitseinsicht langsam zunehmend. Sicherheitsplan aktualisiert.' },
    { date: '2026-06-11T16:00:00.000Z', content: 'Ruhe-EEG (11.06.): leichte diffuse Verlangsamung, keine epileptiformen Entladungen.' },
    { date: '2026-06-12T10:00:00.000Z', content: 'AIMS-Kontrolle: leichte Akathisie, keine Dyskinesie. SAS 1/1/0.' },
    { date: '2026-06-20T11:00:00.000Z', content: 'Verlaufslabor (20.06.) — Prolaktin normalisiert nach Umstellung auf Aripiprazol; Aripiprazol-Spiegel im therapeutischen Bereich. Triglyceride und HbA1c grenzwertig — metabolisches Monitoring fortsetzen.' },
    { date: '2026-06-13T11:00:00.000Z', content: 'Konsil Neurologie angefragt (Demo-Beispiel) — kein akuter Handlungsbedarf.' },
    { date: '2026-06-14T09:00:00.000Z', content: 'Entlassungsplanung: ambulante Weiterbehandlung, Wohnungsbestätigung ausstehend, Medikation stabilisiert auf Aripiprazol 10 mg + Lorazepam PRN.' },
  ]
  return entries.map((e, i) => ({
    id: `demo-verlauf-${String(i + 1).padStart(2, '0')}`,
    date: e.date,
    content: e.content,
    pageType: 'verlauf',
    sectionLabel: 'Verlaufsnotiz',
    source: 'manual' as const,
  }))
}

function buildLabGraphs() {
  const dates = [LAB_BEFUND_1_DATE, LAB_BEFUND_2_DATE]
  const params: Array<[string, number, number, number, number, string]> = [
    ['Leukozyten', 7.2, 6.9, 4.0, 10.0, 'G/l'],
    ['Hämoglobin', 14.1, 14.3, 13.5, 17.5, 'g/dl'],
    ['GOT', 24, 22, 0, 35, 'U/l'],
    ['GPT', 31, 29, 0, 45, 'U/l'],
    ['GGT', 38, 36, 0, 55, 'U/l'],
    ['Kreatinin', 0.88, 0.86, 0.7, 1.2, 'mg/dl'],
    ['Natrium', 141, 142, 136, 145, 'mmol/l'],
    ['Kalium', 4.2, 4.0, 3.5, 5.1, 'mmol/l'],
    ['HbA1c', 5.4, 5.7, 4.0, 6.0, '%'],
    ['Cholesterin gesamt', 188, 192, 0, 200, 'mg/dl'],
    ['Triglyceride', 158, 178, 0, 150, 'mg/dl'],
    ['Prolaktin', 48, 12, 4, 15, 'ng/ml'],
    ['Aripiprazol', 0, 218, 150, 300, 'ng/ml'],
  ]

  const entries = dates.flatMap((date, di) =>
    params
      .filter(([parameter, v1, v2]) => !(parameter === 'Aripiprazol' && (di === 0 ? v1 : v2) <= 0))
      .map(([parameter, v1, v2, refLow, refHigh, unit], pi) => {
      const value = di === 0 ? v1 : v2
      const note =
        parameter === 'Prolaktin' && di === 0
          ? 'Erhöht unter Risperidon'
          : parameter === 'Prolaktin' && di === 1
            ? 'Normalisiert nach Umstellung'
            : parameter === 'Triglyceride' && di === 1
              ? 'Leicht erhöht'
              : parameter === 'HbA1c' && di === 1
                ? 'Grenzwertig'
                : parameter === 'Aripiprazol' && di === 0
                  ? 'Noch nicht therapeutisch (Vor Umstellung)'
                  : parameter === 'Aripiprazol' && di === 1
                    ? 'Therapeutischer Bereich'
                    : ''
      return {
        id: `demo-lab-${di}-${pi}`,
        date,
        parameter,
        value: Math.round(value * 10) / 10,
        unit,
        referenceLow: refLow,
        referenceHigh: refHigh,
        note,
        createdAt: `${date}T08:00:00.000Z`,
        updatedAt: `${date}T08:00:00.000Z`,
      }
    }),
  )

  const graphId = 'demo-lab-graph-01'
  return {
    labGraphs: [
      {
        id: graphId,
        title: 'Labor Verlauf',
        entries,
        markers: [
          {
            id: 'demo-med-marker-01',
            date: '2026-06-05',
            medicationName: 'Risperidon',
            dose: '3',
            doseUnit: 'mg',
            changeType: 'increased' as const,
            note: 'Dosissteigerung',
            createdAt: '2026-06-05T09:00:00.000Z',
            updatedAt: '2026-06-05T09:00:00.000Z',
          },
          {
            id: 'demo-med-marker-02',
            date: '2026-06-09',
            medicationName: 'Aripiprazol',
            dose: '10',
            doseUnit: 'mg',
            changeType: 'started' as const,
            note: 'Umstellung',
            createdAt: '2026-06-09T09:00:00.000Z',
            updatedAt: '2026-06-09T09:00:00.000Z',
          },
        ],
        selectedParameter: 'Prolaktin',
        dateRangePreset: 'all' as const,
        updatedAt: NOW,
      },
    ],
    activeLabGraphId: graphId,
  }
}

function buildLaborBefunde(): LaborBefund[] {
  const befund1Categories: LaborCategory[] = [
    labCategory('blutbild', 'Blutbild', [
      { name: 'Hämoglobin', value: '14,1', numericValue: 14.1, unit: 'g/dl', refMin: 13.5, refMax: 17.5 },
      { name: 'Leukozyten', value: '7,2', numericValue: 7.2, unit: 'G/l', refMin: 4.0, refMax: 10.0 },
      { name: 'Thrombozyten', value: '248', numericValue: 248, unit: 'G/l', refMin: 150, refMax: 400 },
    ]),
    labCategory('leberwerte', 'Leberwerte', [
      { name: 'GOT (AST)', value: '24', numericValue: 24, unit: 'U/l', refMin: 0, refMax: 35 },
      { name: 'GPT (ALT)', value: '31', numericValue: 31, unit: 'U/l', refMin: 0, refMax: 45 },
      { name: 'GGT', value: '38', numericValue: 38, unit: 'U/l', refMin: 0, refMax: 55 },
      { name: 'Bilirubin gesamt', value: '0,7', numericValue: 0.7, unit: 'mg/dl', refMin: 0.1, refMax: 1.2 },
    ]),
    labCategory('nierenwerte', 'Nierenwerte', [
      { name: 'Kreatinin', value: '0,88', numericValue: 0.88, unit: 'mg/dl', refMin: 0.7, refMax: 1.2 },
      { name: 'eGFR (CKD-EPI)', value: '96', numericValue: 96, unit: 'ml/min/1,73m²', refMin: 90, refText: '≥ 90' },
      { name: 'Harnstoff', value: '34', numericValue: 34, unit: 'mg/dl', refMin: 17, refMax: 43 },
    ]),
    labCategory('elektrolyte', 'Elektrolyte', [
      { name: 'Natrium', value: '141', numericValue: 141, unit: 'mmol/l', refMin: 136, refMax: 145 },
      { name: 'Kalium', value: '4,2', numericValue: 4.2, unit: 'mmol/l', refMin: 3.5, refMax: 5.1 },
      { name: 'Chlorid', value: '103', numericValue: 103, unit: 'mmol/l', refMin: 98, refMax: 106 },
    ]),
    labCategory('entzuendung', 'Entzündung', [
      { name: 'CRP', value: '3,2', numericValue: 3.2, unit: 'mg/l', refMin: 0, refMax: 5 },
    ]),
    labCategory('stoffwechsel', 'Stoffwechsel / Lipide', [
      { name: 'Glukose (nüchtern)', value: '94', numericValue: 94, unit: 'mg/dl', refMin: 70, refMax: 100 },
      { name: 'HbA1c', value: '5,4', numericValue: 5.4, unit: '%', refMin: 4.0, refMax: 6.0 },
      { name: 'Cholesterin gesamt', value: '188', numericValue: 188, unit: 'mg/dl', refMax: 200, refText: '< 200' },
      { name: 'LDL-Cholesterin', value: '112', numericValue: 112, unit: 'mg/dl', refMax: 116, refText: '< 116' },
      { name: 'HDL-Cholesterin', value: '48', numericValue: 48, unit: 'mg/dl', refMin: 40, refText: '> 40' },
      { name: 'Triglyceride', value: '158', numericValue: 158, unit: 'mg/dl', refMax: 150, refText: '< 150', isAbnormal: true },
    ]),
    labCategory('hormone', 'Hormone', [
      {
        name: 'Prolaktin',
        value: '48',
        numericValue: 48,
        unit: 'ng/ml',
        refMin: 4,
        refMax: 15,
        isAbnormal: true,
      },
    ]),
    labCategory('muskelenzyme', 'Muskelenzyme', [
      { name: 'CK gesamt', value: '118', numericValue: 118, unit: 'U/l', refMin: 0, refMax: 190 },
    ]),
  ]

  const befund2Categories: LaborCategory[] = [
    labCategory('blutbild', 'Blutbild', [
      { name: 'Hämoglobin', value: '14,3', numericValue: 14.3, unit: 'g/dl', refMin: 13.5, refMax: 17.5 },
      { name: 'Leukozyten', value: '6,9', numericValue: 6.9, unit: 'G/l', refMin: 4.0, refMax: 10.0 },
      { name: 'Thrombozyten', value: '251', numericValue: 251, unit: 'G/l', refMin: 150, refMax: 400 },
    ]),
    labCategory('leberwerte', 'Leberwerte', [
      { name: 'GOT (AST)', value: '22', numericValue: 22, unit: 'U/l', refMin: 0, refMax: 35 },
      { name: 'GPT (ALT)', value: '29', numericValue: 29, unit: 'U/l', refMin: 0, refMax: 45 },
      { name: 'GGT', value: '36', numericValue: 36, unit: 'U/l', refMin: 0, refMax: 55 },
      { name: 'Bilirubin gesamt', value: '0,6', numericValue: 0.6, unit: 'mg/dl', refMin: 0.1, refMax: 1.2 },
    ]),
    labCategory('nierenwerte', 'Nierenwerte', [
      { name: 'Kreatinin', value: '0,86', numericValue: 0.86, unit: 'mg/dl', refMin: 0.7, refMax: 1.2 },
      { name: 'eGFR (CKD-EPI)', value: '98', numericValue: 98, unit: 'ml/min/1,73m²', refMin: 90, refText: '≥ 90' },
      { name: 'Harnstoff', value: '32', numericValue: 32, unit: 'mg/dl', refMin: 17, refMax: 43 },
    ]),
    labCategory('elektrolyte', 'Elektrolyte', [
      { name: 'Natrium', value: '142', numericValue: 142, unit: 'mmol/l', refMin: 136, refMax: 145 },
      { name: 'Kalium', value: '4,0', numericValue: 4.0, unit: 'mmol/l', refMin: 3.5, refMax: 5.1 },
      { name: 'Chlorid', value: '104', numericValue: 104, unit: 'mmol/l', refMin: 98, refMax: 106 },
    ]),
    labCategory('entzuendung', 'Entzündung', [
      { name: 'CRP', value: '1,8', numericValue: 1.8, unit: 'mg/l', refMin: 0, refMax: 5 },
    ]),
    labCategory('stoffwechsel', 'Stoffwechsel / Lipide', [
      { name: 'Glukose (nüchtern)', value: '96', numericValue: 96, unit: 'mg/dl', refMin: 70, refMax: 100 },
      {
        name: 'HbA1c',
        value: '5,8',
        numericValue: 5.8,
        unit: '%',
        refMin: 4.0,
        refMax: 6.0,
        isAbnormal: true,
      },
      { name: 'Cholesterin gesamt', value: '192', numericValue: 192, unit: 'mg/dl', refMax: 200, refText: '< 200' },
      { name: 'LDL-Cholesterin', value: '114', numericValue: 114, unit: 'mg/dl', refMax: 116, refText: '< 116' },
      { name: 'HDL-Cholesterin', value: '46', numericValue: 46, unit: 'mg/dl', refMin: 40, refText: '> 40' },
      {
        name: 'Triglyceride',
        value: '178',
        numericValue: 178,
        unit: 'mg/dl',
        refMax: 150,
        refText: '< 150',
        isAbnormal: true,
      },
    ]),
    labCategory('hormone', 'Hormone', [
      { name: 'Prolaktin', value: '12', numericValue: 12, unit: 'ng/ml', refMin: 4, refMax: 15 },
    ]),
    labCategory('medikamentenspiegel', 'Medikamentenspiegel', [
      {
        name: 'Aripiprazol (Talspiegel)',
        value: '218',
        numericValue: 218,
        unit: 'ng/ml',
        refMin: 150,
        refMax: 300,
        refText: '150–300 (therapeutisch)',
      },
    ]),
  ]

  const label1 = 'Aufnahme — Risperidon 3 mg'
  const label2 = 'Verlaufskontrolle — Aripiprazol 10 mg'
  const labelAnthro = 'Anthropometrie — Verlauf'
  const labelGlucose = 'Nüchternglukose — Zwischenkontrolle'

  const anthroCategories: LaborCategory[] = [
    labCategory('anthropometrie', 'Anthropometrie', [
      {
        name: 'BMI',
        value: '26,4',
        numericValue: 26.4,
        unit: 'kg/m²',
        refMin: 18.5,
        refMax: 24.9,
        isAbnormal: true,
      },
      { name: 'Gewicht', value: '82', numericValue: 82, unit: 'kg' },
      { name: 'Körpergröße', value: '176', numericValue: 176, unit: 'cm' },
    ]),
  ]

  const glucoseCategories: LaborCategory[] = [
    labCategory('stoffwechsel', 'Stoffwechsel', [
      { name: 'Glukose (nüchtern)', value: '98', numericValue: 98, unit: 'mg/dl', refMin: 70, refMax: 100 },
    ]),
  ]

  return [
    {
      id: 'demo-labor-befund-01',
      caseId: DEMO_CASE_ID,
      date: LAB_BEFUND_1_DATE,
      label: label1,
      rawText: buildLaborBefundRawText(LAB_BEFUND_1_DATE, label1, befund1Categories),
      categories: befund1Categories,
      createdAt: `${LAB_BEFUND_1_DATE}T08:15:00.000Z`,
    },
    {
      id: 'demo-labor-befund-02',
      caseId: DEMO_CASE_ID,
      date: LAB_BEFUND_2_DATE,
      label: label2,
      rawText: buildLaborBefundRawText(LAB_BEFUND_2_DATE, label2, befund2Categories),
      categories: befund2Categories,
      createdAt: `${LAB_BEFUND_2_DATE}T08:15:00.000Z`,
    },
    {
      id: 'demo-labor-befund-anthro',
      caseId: DEMO_CASE_ID,
      date: LAB_BEFUND_ANTHRO_DATE,
      label: labelAnthro,
      rawText: buildLaborBefundRawText(LAB_BEFUND_ANTHRO_DATE, labelAnthro, anthroCategories),
      categories: anthroCategories,
      createdAt: `${LAB_BEFUND_ANTHRO_DATE}T10:00:00.000Z`,
    },
    {
      id: 'demo-labor-befund-glucose',
      caseId: DEMO_CASE_ID,
      date: LAB_BEFUND_GLUCOSE_DATE,
      label: labelGlucose,
      rawText: buildLaborBefundRawText(LAB_BEFUND_GLUCOSE_DATE, labelGlucose, glucoseCategories),
      categories: glucoseCategories,
      createdAt: `${LAB_BEFUND_GLUCOSE_DATE}T08:30:00.000Z`,
    },
  ]
}

function buildDemoAiTherapyStores(): DemoPatientFixture['aiTherapyDemo'] {
  const comboKeyAL = buildCombinationKeyFromNames('Aripiprazol', 'Lorazepam')
  const prolactinKey = buildCorrelationKey('risperidon', 'prolaktin')

  const combinationCheck: CombinationCheckStore = {
    version: COMBINATION_CHECK_STORE_VERSION,
    caseId: DEMO_CASE_ID,
    updatedAt: NOW,
    findings: [
      {
        id: 'demo-cc-kb-01',
        caseId: DEMO_CASE_ID,
        combinationKey: comboKeyAL,
        substanceAName: 'Aripiprazol',
        substanceBName: 'Lorazepam',
        interactionType: 'additive_side_effect',
        severity: 'moderate',
        mainRisk: 'Additive Sedierung und verminderte Vigilanz',
        mechanism:
          'Beide Substanzen wirken zentral dämpfend; Benzodiazepine verstärken sedierende Effekte von Antipsychotika.',
        monitoring: 'Sedierung, Schwindel, Sturzgefahr; Atemdepression bei hohen Benzodiazepin-Dosen beachten.',
        clinicalManagement:
          'Lorazepam nur bei Bedarf in niedriger Dosis; Patient über verminderte Fahrtüchtigkeit aufklären.',
        source: 'knowledge_base',
        status: 'verified_kb',
        kbResult: {
          combinationKey: comboKeyAL,
          substanceAId: 'aripiprazol',
          substanceBId: 'lorazepam',
          substanceAName: 'Aripiprazol',
          substanceBName: 'Lorazepam',
          interactionType: 'additive_side_effect',
          severity: 'moderate',
          mainRisk: 'Additive Sedierung und verminderte Vigilanz',
          mechanism: 'Zentral dämpfende Wirkung beider Substanzen',
          monitoring: 'Sedierung, Atemfrequenz bei PRN-Einsatz',
          clinicalManagement: 'Benzodiazepin-Dosis minimieren',
          source: 'knowledge_base',
          kbInteractionId: 'demo-kb-cc-01',
        },
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'demo-cc-ai-01',
        caseId: DEMO_CASE_ID,
        combinationKey: comboKeyAL,
        substanceAName: 'Aripiprazol',
        substanceBName: 'Lorazepam',
        interactionType: 'additive_side_effect',
        severity: 'moderate',
        mainRisk: 'Verstärkte Sedierung und kognitive Verlangsamung',
        mechanism:
          'Partielle D2-Agonismus plus GABA-A-Modulation — klinisch relevant bei gleichzeitiger Einnahme.',
        monitoring: 'Tagesform, Sturzprotokoll, PRN-Frequenz dokumentieren',
        clinicalManagement:
          'PRN-Schema beibehalten; bei wiederholtem Bedarf alternative Anxiolyse erwägen.',
        source: 'clinician_accepted',
        status: 'accepted',
        aiResult: {
          combinationKey: comboKeyAL,
          substanceAName: 'Aripiprazol',
          substanceBName: 'Lorazepam',
          interactionType: 'additive_side_effect',
          severity: 'moderate',
          mainRisk: 'Verstärkte Sedierung und kognitive Verlangsamung',
          mechanism: 'Zentralnervöse Dämpfung durch kombinierte Wirkung',
          monitoring: 'Sedierungsskala, PRN-Protokoll',
          clinicalManagement: 'Niedrigste wirksame Lorazepam-Dosis',
          rationale: 'Plausibel bei gleichzeitiger antipsychotischer und anxiolytischer Medikation.',
        },
        aiRunId: 'demo-cc-run-01',
        provenance: 'DeepSeek (deepseek-chat)',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'demo-cc-kb-02',
        caseId: DEMO_CASE_ID,
        combinationKey: buildCombinationKeyFromNames('Aripiprazol', 'Cannabis'),
        substanceAName: 'Aripiprazol',
        substanceBName: 'Cannabis',
        interactionType: 'pharmacodynamic',
        severity: 'low',
        mainRisk: 'Mögliche Verstärkung psychotischer Symptome bei fortgesetztem Konsum',
        mechanism: 'Cannabinoide können antipsychotische Wirkung konterkarieren',
        monitoring: 'Psychopathologie, Konsumverlauf',
        clinicalManagement: 'Suchtmotivation und Abstinenz als Therapieziel',
        source: 'knowledge_base',
        status: 'verified_kb',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    aiRuns: [
      {
        id: 'demo-cc-run-01',
        caseId: DEMO_CASE_ID,
        combinationKey: comboKeyAL,
        status: 'accepted',
        thorough: false,
        result: {
          combinationKey: comboKeyAL,
          substanceAName: 'Aripiprazol',
          substanceBName: 'Lorazepam',
          interactionType: 'additive_side_effect',
          severity: 'moderate',
          mainRisk: 'Verstärkte Sedierung und kognitive Verlangsamung',
          monitoring: 'Sedierungsskala, PRN-Protokoll',
          clinicalManagement: 'Niedrigste wirksame Lorazepam-Dosis',
        },
        dbResult: null,
        hasConflict: false,
        createdAt: NOW,
        reviewedAt: NOW,
        aiProvider: 'deepseek',
        aiModelLabel: 'DeepSeek (deepseek-chat)',
      },
    ],
    kbSubmissionCandidates: [],
  }

  const labMedCorrelation: LabMedicationCorrelationStore = {
    version: LAB_MED_CORRELATION_STORE_VERSION,
    caseId: DEMO_CASE_ID,
    updatedAt: NOW,
    findings: [
      {
        id: 'demo-lmc-01',
        caseId: DEMO_CASE_ID,
        correlationKey: prolactinKey,
        labParameter: 'prolaktin',
        labParameterLabel: 'Prolaktin',
        labValue: '48',
        labUnit: 'ng/ml',
        refRange: '4–15',
        abnormality: 'high',
        labDate: LAB_BEFUND_1_DATE,
        trend: 'rising',
        substanceId: 'risperidon',
        substanceName: 'Risperidon',
        medicationId: 'demo-med-risperidon',
        medStartDate: '2026-06-02',
        lastDoseChangeDate: '2026-06-09',
        temporalPlausibility: 'highly_plausible',
        zusammenhang:
          'Deutlich erhöhtes Prolaktin unter Risperidon — typischer D2-Antagonismus, Hyperprolaktinämie als Umstellungsgrund.',
        mechanism: 'Risperidon blockiert tuberoinfundibuläre D2-Rezeptoren → Prolaktin-Anstieg',
        recommendation:
          'Umstellung auf Aripiprazol bereits erfolgt; Prolaktin-Kontrolle in 2–4 Wochen wiederholen.',
        monitoring: 'Prolaktin, ggf. klinische Symptome (Galaktorrhoe, Libidoverlust)',
        correlationStrength: 'concerning',
        source: 'knowledge_base',
        status: 'verified_kb',
        kbResult: {
          correlationKey: prolactinKey,
          substanceId: 'risperidon',
          substanceName: 'Risperidon',
          labParameter: 'prolaktin',
          labParameterLabelDe: 'Prolaktin',
          correlationStrength: 'concerning',
          zusammenhang: 'Risperidon-assoziierter Prolaktin-Anstieg',
          recommendation: 'Antipsychotikum mit geringerem Prolaktin-Potenzial erwägen',
          source: 'knowledge_base',
          kbRuleId: 'demo-kb-lmc-01',
        },
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'demo-lmc-02',
        caseId: DEMO_CASE_ID,
        correlationKey: buildCorrelationKey('aripiprazol', 'cholesterin_gesamt'),
        labParameter: 'cholesterin_gesamt',
        labParameterLabel: 'Cholesterin gesamt',
        labValue: '192',
        labUnit: 'mg/dl',
        refRange: '<200',
        abnormality: 'normal_but_changed',
        labDate: LAB_BEFUND_2_DATE,
        trend: 'stable',
        substanceId: 'aripiprazol',
        substanceName: 'Aripiprazol',
        medicationId: 'demo-med-aripiprazol',
        medStartDate: '2026-06-09',
        temporalPlausibility: 'plausible',
        zusammenhang:
          'Cholesterin im oberen Normbereich — bei längerer antipsychotischer Therapie metabolisches Monitoring empfohlen.',
        recommendation: 'Lipidprofil bei Verlaufskontrolle, Lebensstilberatung',
        monitoring: 'Cholesterin, Triglyceride, HbA1c jährlich',
        correlationStrength: 'monitoring_required',
        source: 'clinician_accepted',
        status: 'accepted',
        aiResult: {
          correlationKey: buildCorrelationKey('aripiprazol', 'cholesterin_gesamt'),
          substanceName: 'Aripiprazol',
          labParameter: 'cholesterin_gesamt',
          labParameterLabelDe: 'Cholesterin gesamt',
          correlationStrength: 'monitoring_required',
          zusammenhang: 'Metabolisches Monitoring unter Antipsychotika',
          recommendation: 'Verlaufskontrolle Lipide bei stationärer Aufnahme und Entlassung',
          temporalPlausibility: 'plausible',
          provenance: 'DeepSeek (deepseek-chat)',
        },
        aiRunId: 'demo-lmc-run-01',
        provenance: 'DeepSeek (deepseek-chat)',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'demo-lmc-03',
        caseId: DEMO_CASE_ID,
        correlationKey: buildCorrelationKey('aripiprazol', 'prolaktin'),
        labParameter: 'prolaktin',
        labParameterLabel: 'Prolaktin',
        labValue: '12',
        labUnit: 'ng/ml',
        refRange: '4–15',
        abnormality: 'normal',
        labDate: LAB_BEFUND_2_DATE,
        trend: 'falling',
        substanceId: 'aripiprazol',
        substanceName: 'Aripiprazol',
        medicationId: 'demo-med-aripiprazol',
        medStartDate: '2026-06-09',
        temporalPlausibility: 'plausible',
        zusammenhang:
          'Prolaktin unter Aripiprazol rückläufig gegenüber Aufnahmewert — erwartbar nach Umstellung von Risperidon.',
        recommendation: 'Weitere Kontrolle in 2 Wochen; klinische Symptomatik erfassen',
        monitoring: 'Prolaktin-Verlauf',
        correlationStrength: 'plausible',
        source: 'ai_suggestion',
        status: 'pending_clinician_review',
        aiResult: {
          correlationKey: buildCorrelationKey('aripiprazol', 'prolaktin'),
          substanceName: 'Aripiprazol',
          labParameter: 'prolaktin',
          labParameterLabelDe: 'Prolaktin',
          correlationStrength: 'plausible',
          zusammenhang: 'Rückgang nach Antipsychotikum-Wechsel',
          recommendation: 'Verlaufskontrolle empfohlen',
          temporalPlausibility: 'plausible',
        },
        aiRunId: 'demo-lmc-run-02',
        provenance: 'DeepSeek (deepseek-chat)',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    aiRuns: [
      {
        id: 'demo-lmc-run-01',
        caseId: DEMO_CASE_ID,
        findingId: 'demo-lmc-02',
        correlationKey: buildCorrelationKey('aripiprazol', 'cholesterin_gesamt'),
        provider: 'deepseek',
        status: 'accepted',
        inputSnapshot: { labDate: LAB_BEFUND_2_DATE, substance: 'Aripiprazol' },
        outputJson: {
          correlationKey: buildCorrelationKey('aripiprazol', 'cholesterin_gesamt'),
          substanceName: 'Aripiprazol',
          labParameter: 'cholesterin_gesamt',
          labParameterLabelDe: 'Cholesterin gesamt',
          correlationStrength: 'monitoring_required',
          zusammenhang: 'Metabolisches Monitoring unter Antipsychotika',
          recommendation: 'Verlaufskontrolle Lipide',
        },
        createdAt: NOW,
        reviewedAt: NOW,
      },
      {
        id: 'demo-lmc-run-02',
        caseId: DEMO_CASE_ID,
        findingId: 'demo-lmc-03',
        correlationKey: buildCorrelationKey('aripiprazol', 'prolaktin'),
        provider: 'deepseek',
        status: 'pending_clinician_review',
        inputSnapshot: { labDate: LAB_BEFUND_2_DATE, substance: 'Aripiprazol' },
        outputJson: {
          correlationKey: buildCorrelationKey('aripiprazol', 'prolaktin'),
          substanceName: 'Aripiprazol',
          labParameter: 'prolaktin',
          labParameterLabelDe: 'Prolaktin',
          correlationStrength: 'plausible',
          zusammenhang: 'Rückgang nach Antipsychotikum-Wechsel',
          recommendation: 'Verlaufskontrolle empfohlen',
        },
        createdAt: NOW,
      },
    ],
    kbSubmissionCandidates: [],
  }

  const prepAiCheck: PrepAiCheckCache = {
    version: 1,
    caseId: DEMO_CASE_ID,
    updatedAt: NOW,
    entries: [
      {
        medicationId: 'demo-med-aripiprazol',
        substance: 'Aripiprazol',
        cachedAt: NOW,
        response: {
          preparations: [
            {
              brandName: 'Abilify',
              strength: '10 mg',
              form: 'Tabletten',
              availabilityNote: 'Standardpräparat in Deutschland',
              sourceHint: 'Fachinformation',
            },
            {
              brandName: 'Aripiprazol-ratiopharm',
              strength: '10 mg',
              form: 'Tabletten',
              availabilityNote: 'Generikum verfügbar',
            },
          ],
          disclaimer:
            'KI-gestützte Marktübersicht — Verfügbarkeit und Packungsgrößen vor Verordnung prüfen.',
          country: 'DE',
          model: { provider: 'deepseek', modelId: 'deepseek-chat', label: 'DeepSeek (deepseek-chat)' },
          source: 'deepseek',
          sourceLabel: 'DeepSeek (deepseek-chat)',
        },
      },
      {
        medicationId: 'demo-med-lorazepam',
        substance: 'Lorazepam',
        cachedAt: NOW,
        response: {
          preparations: [
            {
              brandName: 'Tavor',
              strength: '1 mg',
              form: 'Tabletten',
              availabilityNote: 'Btm — dokumentationspflichtig',
            },
            {
              brandName: 'Lorazepam',
              strength: '1 mg',
              form: 'Tabletten',
              availabilityNote: 'Generikum',
            },
          ],
          disclaimer:
            'KI-gestützte Marktübersicht — Btm-Vorschriften und Verfügbarkeit vor Verordnung prüfen.',
          country: 'DE',
          model: { provider: 'deepseek', modelId: 'deepseek-chat', label: 'DeepSeek (deepseek-chat)' },
          source: 'deepseek',
          sourceLabel: 'DeepSeek (deepseek-chat)',
        },
      },
    ],
  }

  return { combinationCheck, labMedCorrelation, prepAiCheck }
}

export function buildDemoPatientFixture(): DemoPatientFixture {
  const aufnahmeSections = buildAufnahmeSections()
  const verlaufFeed = buildVerlaufFeed()
  const { labGraphs, activeLabGraphId } = buildLabGraphs()
  const laborBefunde = buildLaborBefunde()
  const timelineId = 'demo-timeline-01'

  const diagnoses = [
    {
      id: 'demo-dx-01',
      icd10: { code: 'F20.0', label: 'Paranoide Schizophrenie', overridden: false },
      icd11: { code: '6A20.0', label: 'Schizophrenie, erste Episode', overridden: false },
      dsm: { code: '295.30', label: 'Schizophrenia, paranoid type', overridden: false },
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'demo-dx-02',
      icd10: {
        code: 'F12.2',
        label: 'Psychische und Verhaltensstörungen durch Cannabinoide : Abhängigkeitssyndrom',
        overridden: false,
      },
      icd11: { code: '6C41.2', label: 'Cannabisabhängigkeit', overridden: false },
      dsm: { code: '304.30', label: 'Cannabisgebrauchsstörung, schwer', overridden: false },
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'demo-dx-03',
      icd10: {
        code: 'F15.2',
        label:
          'Psychische und Verhaltensstörungen durch andere Stimulanzien, einschließlich Koffein : Abhängigkeitssyndrom',
        overridden: false,
      },
      icd11: {
        code: '6C45.2',
        label: 'Störungen durch Amphetamin oder ähnlich wirkende Substanzen, Abhängigkeitssyndrom',
        overridden: false,
      },
      dsm: { code: '304.40', label: 'Stimulanziengebrauchsstörung, schwer', overridden: false },
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]

  const medicationPlanState = {
    version: MEDICATION_PLAN_STATE_VERSION,
    updatedAt: NOW,
    currentPlanId: 'demo-med-plan-01',
    plans: [
      {
        id: 'demo-med-plan-01',
        caseId: DEMO_CASE_ID,
        createdAt: NOW,
        isCurrent: true,
        medications: [
          {
            id: 'demo-med-aripiprazol',
            substance: 'Aripiprazol',
            formulation: 'tablet' as const,
            strength: '10 mg',
            doseSchedule: { morning: '1', noon: '', evening: '', night: '', unit: 'Stk.' },
            doseLineGerman: 'Aripiprazol 10-0-0-0 mg',
            prn: false,
            startDate: '2026-06-09',
            indication: 'Antipsychotische Stabilisierung',
            status: 'active' as const,
            reasonForChange: 'Umstellung von Risperidon wegen Hyperprolaktinämie',
            sideEffects: ['leichte Akathisie'],
            adherenceNote: 'Einnahme morgens, aktuell regelmäßig',
            freeTextLine: '',
            introducedAt: '2026-06-09T09:00:00.000Z',
            lastChangeAt: '2026-06-09T09:00:00.000Z',
            lastChangeType: 'start' as const,
            history: [
              {
                id: 'demo-med-hist-01',
                changedAt: '2026-06-09T09:00:00.000Z',
                changeType: 'start' as const,
                note: 'Beginn nach Ausschleichen Risperidon',
                snapshot: {
                  substance: 'Aripiprazol',
                  formulation: 'tablet' as const,
                  strength: '10 mg',
                  doseSchedule: { morning: '1', noon: '', evening: '', night: '', unit: 'Stk.' },
                  doseLineGerman: 'Aripiprazol 10-0-0-0 mg',
                  status: 'active' as const,
                  reasonForChange: 'Umstellung',
                },
              },
            ],
          },
          {
            id: 'demo-med-risperidon',
            substance: 'Risperidon',
            formulation: 'tablet' as const,
            strength: '3 mg',
            doseSchedule: { morning: '', noon: '', evening: '1', night: '', unit: 'Stk.' },
            doseLineGerman: 'Risperidon 0-0-3-0 mg (ausgeschlichen)',
            prn: false,
            startDate: '2026-06-02',
            indication: 'Akute Psychose',
            status: 'discontinued' as const,
            reasonForChange: 'Ausgeschlichen zugunsten Aripiprazol',
            sideEffects: ['Prolaktin-Anstieg', 'Antriebsminderung'],
            adherenceNote: '',
            freeTextLine: '',
            introducedAt: '2026-06-02T08:00:00.000Z',
            lastChangeAt: '2026-06-09T08:00:00.000Z',
            lastChangeType: 'discontinue' as const,
            history: [],
          },
          {
            id: 'demo-med-lorazepam',
            substance: 'Lorazepam',
            formulation: 'tablet' as const,
            strength: '1 mg',
            doseSchedule: { morning: '', noon: '', evening: '', night: '', unit: 'mg', prn: true },
            doseLineGerman: 'Lorazepam 1 mg bei Bedarf (max. 2 mg/24 h)',
            prn: true,
            startDate: '2026-06-02',
            indication: 'Akute Unruhe / Agitation',
            status: 'active' as const,
            reasonForChange: '',
            sideEffects: [],
            adherenceNote: 'Selten nachgefragt, zuletzt vor 3 Tagen',
            freeTextLine: '',
            introducedAt: '2026-06-02T08:00:00.000Z',
            lastChangeAt: '2026-06-02T08:00:00.000Z',
            lastChangeType: 'prn' as const,
            history: [],
          },
        ],
      },
    ],
    sideEffectReports: [
      {
        id: 'demo-se-01',
        symptom: 'Akathisie',
        onsetDate: '2026-06-12',
        severity: 'leicht',
        suspectedMedicationId: 'demo-med-aripiprazol',
        temporalRelation: 'Tage nach Umstellung',
        actionTaken: 'Beobachtung, ggf. Dosisanpassung',
        outcome: 'stabil',
        note: 'AIMS/SAS dokumentiert — keine Dyskinesie',
        attribution: 'single' as const,
      },
    ],
    labCorrelationNotes: 'Prolaktin unter Risperidon erhöht, nach Umstellung Rückgang erwartet.',
  }

  const clinicalImprints = {
    version: 1,
    updatedAt: NOW,
    imprints: verlaufFeed.slice(0, 12).map((entry, i) => ({
      imprintKey: `verlauf:${entry.id}`,
      patientId: DEMO_PATIENT_ID,
      caseId: DEMO_CASE_ID,
      sourceType: 'verlauf' as const,
      sourceId: entry.id,
      sourceDate: entry.date.slice(0, 10),
      createdAt: entry.date,
      readableClinicalSentence: entry.content,
      clinicalDomain: 'psychopathology' as const,
      symptoms: i % 2 === 0 ? ['Paranoia', 'Schlafstörung'] : ['Unruhe'],
      severity: i > 4 ? 'mittel' : 'deutlich',
      courseDirection: i > 6 ? ('improved' as const) : ('worsened' as const),
      affect: 'labil',
      drive: 'reduziert',
      thoughtForm: 'leicht umständlich',
      thoughtContent: 'wahnhaft-paranoid',
      perception: null,
      selfDisturbance: null,
      cognition: 'orientiert',
      sleep: 'gestört',
      cooperation: 'eingeschränkt',
      insight: 'gering',
      riskSelf: 'passiv',
      riskOthers: 'nein',
      aggression: 'nein',
      suicidality: 'nein',
      functioning: 'eingeschränkt',
      socialInteraction: 'reduziert',
      hygieneSelfCare: 'adäquat',
      medicationMentioned: ['Risperidon', 'Aripiprazol'],
      medicationResponse: i > 6 ? 'teilweise' : null,
      sideEffects: i > 5 ? 'Akathisie leicht' : null,
      adherence: 'verbessert',
      diagnosisHints: ['F20.0'],
      differentialDiagnosisHints: ['F12.2', 'substanzinduzierte Psychose'],
      uncertainty: 'Diagnose weiterhin mit Unsicherheit',
      evidenceStrength: 'direct_observation' as const,
      evidenceText: entry.content,
      evidenceQuoteRange: null,
      analysisEligible: true,
      excludeReason: null,
    })),
  }

  const isdmInput = buildDemoIsdmInput()
  const butterflyAttestations = buildDemoButterflyAttestations()
  const clinicalQuestionNotes = buildDemoClinicalQuestionNotes()
  const anforderungen = buildDemoAnforderungen(ADMISSION)
  const isdmAnalysis = buildDemoIsdmAnalysis({
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
    demoPatientId: DEMO_PATIENT_ID,
    demoCaseId: DEMO_CASE_ID,
    patient: {
      vorname: DEMO_VORNAME,
      nachname: DEMO_NACHNAME,
      geburtsdatum: DEMO_DOB,
      geschlecht: 'weiblich',
      age: '33',
      admissionDate: ADMISSION,
      patientId: DEMO_PATIENT_ID,
      caseId: DEMO_CASE_ID,
    },
    workspace: {
      age: '33',
      selectedDocumentType: 'aufnahme',
      documents: {
        aufnahme: {
          documentTypeId: 'aufnahme',
          pageHeading: `Aufnahme — ${DEMO_VORNAME} ${DEMO_NACHNAME}`,
          sectionContents: aufnahmeSections,
          savedAt: NOW,
        },
        verlauf: {
          documentTypeId: 'verlauf',
          pageHeading: 'Verlaufsdokumentation',
          sectionContents: {
            psychopathologie: 'Wechselhafte Stimmung, paranoid-misstrauische Grundhaltung, zuletzt ruhiger.',
            stationsverhalten: 'An Gesprächen teilweise beteiligt, Sporttherapie besucht.',
            risiko: 'Keine akute Suizidalität oder Fremdgefährdung.',
            'compliance-krankheitseinsicht': 'Einnahme aktuell regelmäßig, Einsicht langsam zunehmend.',
            'medikation-vertraeglichkeit': 'Umstellung auf Aripiprazol, leichte Akathisie.',
            'besondere-ereignisse': 'Keine.',
            somatik: 'Labor ohne relevante Auffälligkeiten außer Prolaktin.',
            'beurteilung-plan': 'Weiterführung ambulant planen.',
          },
          savedAt: NOW,
        },
        psychopath: {
          documentTypeId: 'psychopath',
          pageHeading: 'Psychopathologischer Befund',
          sectionContents: {
            free: 'Wach und allseits orientiert. Affekt labil. Denkinhalt paranoid. Keine halluzinatorischen Erlebnisse zum Untersuchungszeitpunkt.',
          },
          savedAt: NOW,
        },
        'therapie-verlauf': {
          documentTypeId: 'therapie-verlauf',
          pageHeading: 'Therapieverlauf',
          sectionContents: {
            body: 'Stabilisierung unter Antipsychotikum, psychoedukative Gruppe, Sporttherapie.',
          },
          savedAt: NOW,
        },
        medikation: {
          documentTypeId: 'medikation',
          pageHeading: 'Medikation',
          sectionContents: { body: 'Siehe Medikationsplan — Aripiprazol 10 mg, Lorazepam PRN.' },
          savedAt: NOW,
        },
        therapieplanung: {
          documentTypeId: 'therapieplanung',
          pageHeading: 'Therapieplanung',
          sectionContents: {
            body: 'Stabilisierung, Suchtarbeit, Entlassungsvorbereitung mit Sozialdienst.',
          },
          savedAt: NOW,
        },
      },
      pageHeadings: {
        aufnahme: `Aufnahme — ${DEMO_VORNAME} ${DEMO_NACHNAME}`,
        verlauf: 'Verlaufsdokumentation',
        psychopath: 'Psychopathologischer Befund',
        'therapie-verlauf': 'Therapieverlauf',
        medikation: 'Medikation',
        therapieplanung: 'Therapieplanung',
      },
      pageDates: {
        aufnahme: ADMISSION,
        verlauf: '2026-06-14',
      },
      pageTimes: {},
      timelines: [
        {
          id: timelineId,
          title: 'Krankheitsverlauf',
          layout: 'horizontal',
          entries: [
            { id: 'demo-tl-1', heading: 'Erste Episode', subheading: '22 J.', priority: 'high', dateKind: 'age', dateValue: '22', sortKey: 1991, displayDate: '22 J.', visible: true },
            { id: 'demo-tl-2', heading: 'Dekompensation', subheading: 'Aktuell', priority: 'critical', dateKind: 'ddmmyy', dateValue: '02.06.26', sortKey: 20260602, displayDate: '02.06.2026', visible: true },
            { id: 'demo-tl-3', heading: 'Stabilisierung', subheading: 'Station', priority: 'medium', dateKind: 'ddmmyy', dateValue: '10.06.26', sortKey: 20260610, displayDate: '10.06.2026', visible: true },
          ],
          updatedAt: NOW,
        },
      ],
      activeTimelineId: timelineId,
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
      psychotherapyPlan: {
        version: PSYCHOTHERAPY_PLAN_VERSION,
        updatedAt: NOW,
        overview: {
          status: 'active',
          therapist: 'Dr. Muster (Demo)',
          setting: 'individual',
          frequency: '1×/Woche',
          startDate: '2026-06-06',
        },
        indication: 'Psychose, geringe Krankheitseinsicht',
        goals: {
          shortTerm: [{ id: 'demo-goal-1', text: 'Krankheitseinsicht fördern', status: 'in-progress' }],
          mediumTerm: [{ id: 'demo-goal-2', text: 'Rückfallprävention Substanzkonsum', status: 'open' }],
          longTerm: [],
        },
        stages: [
          { id: 'demo-stage-1', stageId: 'stabilization', status: 'active', order: 1 },
          { id: 'demo-stage-2', stageId: 'psychoeducation', status: 'planned', order: 2 },
        ],
        methods: [{ id: 'demo-method-1', methodId: 'supportive', selected: true, notes: 'Einzelsettings' }],
        plannedSessions: [],
        sessions: [
          {
            id: 'demo-psy-1',
            date: '2026-06-06',
            setting: 'individual',
            duration: '50 min',
            topic: 'Psychoedukation Psychose',
            intervention: 'Psychoedukation',
            patientReaction: 'misstrauisch, teilnehmend',
            progress: 'on-track',
            riskAspects: 'keine akute Suizidalität',
            nextFocus: 'Compliance',
            generatedParagraph: 'Psychoedukatives Einzelgespräch — Patient zeigt sich zunächst misstrauisch.',
            createdAt: NOW,
          },
          {
            id: 'demo-psy-2',
            date: '2026-06-11',
            setting: 'individual',
            duration: '50 min',
            topic: 'Entlassungsplanung',
            intervention: 'Motivierende Gesprächsführung',
            patientReaction: 'kooperativ',
            progress: 'slow',
            riskAspects: 'Wohnungssicherung offen',
            nextFocus: 'Ambulante Anbindung',
            generatedParagraph: 'Gespräch zur Entlassungsplanung — Motivation vorhanden.',
            createdAt: NOW,
          },
        ],
        review: { progress: 'langsam verbessernd' },
      },
      complementaryTherapies: [
        {
          id: 'demo-komp-1',
          name: 'Sporttherapie',
          status: 'active',
          frequency: '2×/Woche',
          mainGoal: 'Antrieb und Schlafregulation',
          participationStatus: 'regelmäßige Teilnahme',
          startDate: '2026-06-04',
          createdAt: NOW,
          updatedAt: NOW,
          sessions: [{ id: 'demo-komp-s1', date: '2026-06-06', note: 'Teilnahme 45 min' }],
        },
        {
          id: 'demo-komp-2',
          name: 'Psychoedukation',
          status: 'active',
          frequency: '1×/Woche',
          mainGoal: 'Krankheitsbild und Medikation',
          participationStatus: 'passiv',
          startDate: '2026-06-03',
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      weitereTherapie: [
        {
          id: 'demo-weitere-1',
          type: 'Schlafhygiene-Training',
          status: 'ongoing',
          indication: 'Schlafstörung',
          startDate: '2026-06-05',
          responsible: 'Pflege',
          notes: 'Strukturierter Tagesablauf, Bildschirmzeit reduziert.',
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      activeVariantIds: { psychopath: 'free' },
    },
    verlaufFeed,
    laborBefunde,
    befundRecords: [
      {
        id: 'demo-befund-ecg-01',
        caseId: DEMO_CASE_ID,
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
      buildDemoEegBefund(),
    ],
    sozialtherapie: [
      {
        id: 'demo-sozial-1',
        area: 'wohnen',
        status: 'in-progress',
        goal: 'Wohnungssicherung bis Entlassung',
        currentMeasure: 'Sozialdienst kontaktiert Vermieter',
        responsibleRole: 'Sozialdienst',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'demo-sozial-2',
        area: 'arbeit',
        status: 'open',
        goal: 'Wiedereingliederung IT-Bereich',
        currentMeasure: 'Arbeitsagentur-Termin geplant',
        responsibleRole: 'Sozialdienst',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    dokumente: [
      {
        id: 'demo-doc-anamnese',
        caseId: DEMO_CASE_ID,
        category: 'anamnese',
        title: 'Anamnese — Aufnahme',
        content: 'Vollständige Aufnahmeanamnese (Demo).',
        date: `${ADMISSION}T12:00:00.000Z`,
        source: 'manual',
        pageType: 'aufnahme',
        sectionContents: aufnahmeSections,
      },
      {
        id: 'demo-doc-verlauf',
        caseId: DEMO_CASE_ID,
        category: 'arztbrief',
        title: 'Verlaufszusammenfassung',
        content: verlaufFeed.map((e) => e.content).join('\n\n'),
        date: '2026-06-14T08:00:00.000Z',
        source: 'manual',
        pageType: 'verlauf',
      },
      {
        id: 'demo-doc-medplan',
        caseId: DEMO_CASE_ID,
        category: 'formulare',
        title: 'Medikationsplan',
        content: 'Aripiprazol 10 mg 1-0-0; Lorazepam 1 mg PRN',
        date: '2026-06-14T08:00:00.000Z',
        source: 'manual',
        pageType: 'medikation',
      },
      {
        id: 'demo-doc-arztbrief',
        caseId: DEMO_CASE_ID,
        category: 'arztbrief',
        title: 'Arztbrief (Entwurf)',
        content: 'Entlassungsbrief — Demo-Entwurf mit Verlauf und Medikation.',
        date: '2026-06-14T09:00:00.000Z',
        source: 'draft',
        pageType: 'therapie-verlauf',
      },
      ...laborBefunde.map((befund) => {
        const [year, month, day] = befund.date.split('-')
        return {
          id: `demo-doc-${befund.id}`,
          caseId: DEMO_CASE_ID,
          category: 'laborbefunde' as const,
          title: `Lab vom ${day}.${month}.${year}${befund.label ? ` — ${befund.label}` : ''}`,
          content: befund.rawText,
          date: `${befund.date}T09:00:00.000Z`,
          source: 'manual' as const,
          pageType: 'labor',
          sourceRefId: befund.id,
        }
      }),
    ],
    generatedDocuments: [
      {
        id: 'demo-gen-doc-01',
        templateId: 'demo-template-intern',
        templateVersion: 1,
        caseId: DEMO_CASE_ID,
        patientId: DEMO_PATIENT_ID,
        title: `Entlassungsplan ${DEMO_VORNAME} ${DEMO_NACHNAME}`,
        status: 'draft',
        fieldValues: {
          patient_name: `${DEMO_VORNAME} ${DEMO_NACHNAME}`,
          admission_date: ADMISSION,
          discharge_plan: 'Ambulante Weiterbehandlung, Medikation Aripiprazol 10 mg',
        },
        renderedText: `Entlassungsplan für ${DEMO_VORNAME} ${DEMO_NACHNAME} — Demo-Dokument.`,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    calendarItems: [
      {
        id: 'demo-cal-01',
        type: 'consultation',
        title: `Visite — ${DEMO_VORNAME} ${DEMO_NACHNAME}`,
        patientId: DEMO_PATIENT_ID,
        caseId: DEMO_CASE_ID,
        startTime: '2026-06-14T09:00:00.000Z',
        endTime: '2026-06-14T09:30:00.000Z',
        status: 'scheduled',
        priority: 'normal',
        createdBy: 'demo-user',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'demo-cal-02',
        type: 'medication_review',
        title: 'Medikationsreview',
        caseId: DEMO_CASE_ID,
        startTime: '2026-06-15T10:00:00.000Z',
        endTime: '2026-06-15T10:30:00.000Z',
        status: 'scheduled',
        createdBy: 'demo-user',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'demo-cal-03',
        type: 'other',
        title: 'Psychoedukation Gruppe',
        caseId: DEMO_CASE_ID,
        startTime: '2026-06-16T14:00:00.000Z',
        endTime: '2026-06-16T15:00:00.000Z',
        status: 'scheduled',
        createdBy: 'demo-user',
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'demo-cal-04',
        type: 'consultation',
        title: 'Entlassungsgespräch mit Sozialdienst',
        caseId: DEMO_CASE_ID,
        startTime: '2026-06-17T11:00:00.000Z',
        endTime: '2026-06-17T11:45:00.000Z',
        status: 'scheduled',
        priority: 'high',
        createdBy: 'demo-user',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    modulePlaceholders: {
      consultation: {
        title: 'Konsil Neurologie (Demo)',
        question: 'Abklärung bei Kopfschmerzen unter Antipsychotika',
        specialty: 'Neurologie',
        status: 'draft',
      },
      discussCase: {
        title: 'Fallbesprechung Team (Demo)',
        purpose: 'Entlassungsplanung und Risiko',
        status: 'draft',
      },
    },
    aiTherapyDemo: buildDemoAiTherapyStores(),
  }
}
