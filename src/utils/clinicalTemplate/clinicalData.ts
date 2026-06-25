/**
 * Resolved clinical data consumed by the ClinicalDocumentRenderer.
 *
 * The renderer never reads storage directly — it consumes this normalized,
 * PHI-aware structure. `resolveClinicalData` (see resolveClinicalData.ts)
 * produces the `real` variant from a live case; `createDemoClinicalData`
 * produces the `demo` variant for previews; `EMPTY_CLINICAL_DATA` is the safe
 * fallback when no case is bound.
 */

export type ClinicalDataSource = 'real' | 'demo' | 'empty'

export interface ResolvedDemographics {
  name?: string
  vorname?: string
  nachname?: string
  geburtsdatum?: string
  age?: string
  geschlecht?: string
  address?: string
  kostentraeger?: string
  caseId?: string
}

export interface ResolvedDiagnosis {
  code?: string
  label: string
  role?: string
  status?: string
}

export interface ResolvedMedication {
  substance: string
  dose?: string
  prn: boolean
  indication?: string
}

export interface ResolvedLabValue {
  name: string
  value: string
  unit?: string
  reference?: string
  abnormal: boolean
}

export interface ResolvedLabPanel {
  category: string
  values: ResolvedLabValue[]
}

export interface ResolvedVerlaufEntry {
  date?: string
  text: string
}

export interface ResolvedVerlaufWindow {
  windowLabel?: string
  entries: ResolvedVerlaufEntry[]
}

export type VerlaufWindowKey = '7d' | '14d' | 'admission' | 'all'

export interface ResolvedTherapyItem {
  label: string
  detail?: string
}

export interface ResolvedSocialTherapyItem {
  area: string
  status: string
  goal?: string
  measure?: string
}

export interface ResolvedAnamneseSection {
  sectionId: string
  label: string
  text: string
}

export interface ResolvedClinicalData {
  source: ClinicalDataSource
  demographics: ResolvedDemographics
  admissionReason?: string
  diagnoses: ResolvedDiagnosis[]
  medications: ResolvedMedication[]
  labs: { date?: string; panels: ResolvedLabPanel[] }
  verlauf: ResolvedVerlaufWindow
  /** Verlauf resolved per window preset so blocks can pick their own range. */
  verlaufByPreset?: Partial<Record<VerlaufWindowKey, ResolvedVerlaufWindow>>
  anamnese: { sections: ResolvedAnamneseSection[] }
  psychopathology?: { text: string; date?: string }
  risk?: { text: string }
  therapy: ResolvedTherapyItem[]
  socialTherapy: ResolvedSocialTherapyItem[]
  clinician: { name?: string; title?: string }
  organization: { name?: string; address?: string }
  system: { date: string; documentDate: string }
}

function nowSystem(): { date: string; documentDate: string } {
  const now = new Date()
  const date = now.toLocaleDateString('de-DE')
  const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return { date, documentDate: `${date} ${time}` }
}

export const EMPTY_CLINICAL_DATA: ResolvedClinicalData = {
  source: 'empty',
  demographics: {},
  diagnoses: [],
  medications: [],
  labs: { panels: [] },
  verlauf: { entries: [] },
  anamnese: { sections: [] },
  therapy: [],
  socialTherapy: [],
  clinician: {},
  organization: {},
  system: nowSystem(),
}

/**
 * Synthetic demo patient — no PHI. Used by the builder's demo preview so the
 * clinician sees what each clinical block produces before binding a real case.
 */
export function createDemoClinicalData(lang: 'de' | 'en' = 'de'): ResolvedClinicalData {
  const de = lang === 'de'
  return {
    source: 'demo',
    demographics: {
      name: 'Muster, Maria',
      vorname: 'Maria',
      nachname: 'Muster',
      geburtsdatum: '14.03.1987',
      age: de ? '39 J.' : '39 yrs',
      geschlecht: de ? 'weiblich' : 'female',
      address: 'Musterstraße 12, 10115 Berlin',
      kostentraeger: de ? 'AOK Nordost' : 'AOK Nordost (statutory)',
      caseId: 'DEMO-2041',
    },
    admissionReason: de
      ? 'Notfallmäßige Aufnahme bei akuter depressiver Episode mit Suizidgedanken nach psychosozialer Belastungssituation.'
      : 'Emergency admission for an acute depressive episode with suicidal ideation following a psychosocial crisis.',
    diagnoses: [
      { code: 'F33.2', label: de ? 'Rezidivierende depressive Störung, gegenwärtig schwere Episode ohne psychotische Symptome' : 'Recurrent depressive disorder, current episode severe without psychotic symptoms', role: de ? 'Hauptdiagnose' : 'Primary', status: de ? 'gesichert' : 'confirmed' },
      { code: 'F41.1', label: de ? 'Generalisierte Angststörung' : 'Generalized anxiety disorder', role: de ? 'Nebendiagnose' : 'Secondary', status: de ? 'gesichert' : 'confirmed' },
      { code: 'E66.0', label: de ? 'Adipositas durch übermäßige Kalorienzufuhr' : 'Obesity due to excess calories', role: de ? 'Nebendiagnose' : 'Secondary' },
    ],
    medications: [
      { substance: 'Sertralin', dose: '0-0-100 mg', prn: false, indication: de ? 'Depression' : 'Depression' },
      { substance: 'Quetiapin', dose: '0-0-0-50 mg', prn: false, indication: de ? 'Schlafstörung' : 'Insomnia' },
      { substance: 'Lorazepam', dose: '0,5 mg', prn: true, indication: de ? 'Akute Anspannung' : 'Acute agitation' },
    ],
    labs: {
      date: '12.06.2026',
      panels: [
        {
          category: de ? 'Blutbild' : 'Blood count',
          values: [
            { name: 'Hb', value: '11,8', unit: 'g/dl', reference: '12,0–16,0', abnormal: true },
            { name: 'Leukozyten', value: '6,4', unit: '/nl', reference: '4,0–10,0', abnormal: false },
          ],
        },
        {
          category: de ? 'Klinische Chemie' : 'Clinical chemistry',
          values: [
            { name: 'Natrium', value: '129', unit: 'mmol/l', reference: '135–145', abnormal: true },
            { name: 'TSH', value: '2,1', unit: 'mU/l', reference: '0,4–4,0', abnormal: false },
          ],
        },
      ],
    },
    verlauf: {
      windowLabel: de ? 'Letzte 7 Tage' : 'Last 7 days',
      entries: [
        { date: '18.06.2026', text: de ? 'Stimmung weiterhin gedrückt, Antrieb leicht gebessert. Keine akute Suizidalität, glaubhafte Absprachefähigkeit.' : 'Mood still low, drive slightly improved. No acute suicidality, credible safety agreement.' },
        { date: '20.06.2026', text: de ? 'Teilnahme an Ergotherapie. Schlaf unter Quetiapin gebessert.' : 'Participated in occupational therapy. Sleep improved on quetiapine.' },
      ],
    },
    verlaufByPreset: {
      '7d': {
        windowLabel: de ? 'Letzte 7 Tage' : 'Last 7 days',
        entries: [
          { date: '18.06.2026', text: de ? 'Stimmung weiterhin gedrückt, Antrieb leicht gebessert. Keine akute Suizidalität.' : 'Mood still low, drive slightly improved. No acute suicidality.' },
          { date: '20.06.2026', text: de ? 'Teilnahme an Ergotherapie. Schlaf unter Quetiapin gebessert.' : 'Participated in occupational therapy. Sleep improved on quetiapine.' },
        ],
      },
      '14d': {
        windowLabel: de ? 'Letzte 14 Tage' : 'Last 14 days',
        entries: [
          { date: '08.06.2026', text: de ? 'Aufnahme bei akuter Suizidalität, engmaschige Beobachtung.' : 'Admission for acute suicidality, close observation.' },
          { date: '14.06.2026', text: de ? 'Beginn Sertralin, gute Verträglichkeit.' : 'Sertraline started, well tolerated.' },
          { date: '20.06.2026', text: de ? 'Teilnahme an Ergotherapie. Schlaf gebessert.' : 'Participated in occupational therapy. Sleep improved.' },
        ],
      },
      admission: {
        windowLabel: de ? 'Seit Aufnahme' : 'Since admission',
        entries: [
          { date: '08.06.2026', text: de ? 'Aufnahme bei akuter Suizidalität.' : 'Admission for acute suicidality.' },
          { date: '20.06.2026', text: de ? 'Deutliche Stabilisierung unter Therapie.' : 'Marked stabilization under treatment.' },
        ],
      },
      all: {
        windowLabel: de ? 'Gesamter Verlauf' : 'Full course',
        entries: [
          { date: '08.06.2026', text: de ? 'Aufnahme bei akuter Suizidalität.' : 'Admission for acute suicidality.' },
          { date: '20.06.2026', text: de ? 'Deutliche Stabilisierung unter Therapie.' : 'Marked stabilization under treatment.' },
        ],
      },
    },
    anamnese: {
      sections: de
        ? [
            {
              sectionId: 'aufnahmeanlass',
              label: 'Aufnahmeanlass',
              text: 'Notfallmäßige Aufnahme bei akuter depressiver Episode mit Suizidgedanken nach psychosozialer Belastungssituation.',
            },
            {
              sectionId: 'aktuelle-krankheitsanamnese',
              label: 'Aktuelle Krankheitsanamnese',
              text: 'Seit ca. 6 Wochen zunehmende Antriebsarmut, Schlafstörung und Hoffnungslosigkeit. Kein Anhalt für Manie oder Psychose.',
            },
            {
              sectionId: 'psychiatrische-vorgeschichte',
              label: 'Psychiatrische Vorgeschichte',
              text: '2019 stationäre Behandlung bei depressiver Episode, ambulante KVT, gut anschlussfähig.',
            },
            {
              sectionId: 'medikamentenanamnese',
              label: 'Medikamentenanamnese',
              text: 'Sertralin 100 mg abends, Quetiapin 50 mg zur Nacht, Lorazepam bei Bedarf.',
            },
          ]
        : [
            {
              sectionId: 'aufnahmeanlass',
              label: 'Reason for admission',
              text: 'Emergency admission for an acute depressive episode with suicidal ideation following a psychosocial crisis.',
            },
            {
              sectionId: 'aktuelle-krankheitsanamnese',
              label: 'Current illness history',
              text: 'For approximately 6 weeks: increasing loss of drive, insomnia and hopelessness. No evidence of mania or psychosis.',
            },
            {
              sectionId: 'psychiatrische-vorgeschichte',
              label: 'Psychiatric history',
              text: '2019 inpatient treatment for depressive episode, outpatient CBT, good engagement.',
            },
            {
              sectionId: 'medikamentenanamnese',
              label: 'Medication history',
              text: 'Sertraline 100 mg at night, quetiapine 50 mg at night, lorazepam as needed.',
            },
          ],
    },
    psychopathology: {
      date: '20.06.2026',
      text: de
        ? 'Wach, bewusstseinsklar, allseits orientiert. Im Kontakt zugewandt. Stimmung deutlich gedrückt, Affekt eingeschränkt schwingungsfähig. Antrieb reduziert. Kein Anhalt für Wahn, Halluzinationen oder Ich-Störungen. Keine akute Suizidalität.'
        : 'Awake, alert, fully oriented. Cooperative. Mood markedly depressed, affect with reduced range. Drive reduced. No evidence of delusions, hallucinations or ego disturbances. No acute suicidality.',
    },
    risk: {
      text: de
        ? 'Suizidalität: aktuell glaubhaft distanziert, Absprachefähigkeit gegeben. Fremdgefährdung: kein Anhalt.'
        : 'Suicidality: currently credibly distanced, able to make a safety agreement. Risk to others: none.',
    },
    therapy: [
      { label: de ? 'Psychotherapie (KVT)' : 'Psychotherapy (CBT)', detail: de ? '2×/Woche, Fokus Aktivierung und Grübelreduktion' : '2×/week, focus on activation and rumination' },
      { label: de ? 'Ergotherapie' : 'Occupational therapy', detail: de ? '3×/Woche' : '3×/week' },
    ],
    socialTherapy: [
      { area: de ? 'Wohnsituation' : 'Housing', status: de ? 'in Bearbeitung' : 'in progress', goal: de ? 'Klärung Mietrückstände' : 'Resolve rent arrears', measure: de ? 'Kontakt Sozialdienst' : 'Social services contact' },
      { area: de ? 'Berufliche Wiedereingliederung' : 'Vocational reintegration', status: de ? 'offen' : 'open' },
    ],
    clinician: { name: 'Dr. med. A. Beispiel', title: de ? 'Oberärztin' : 'Attending physician' },
    organization: { name: de ? 'Klinik für Psychiatrie und Psychotherapie' : 'Department of Psychiatry and Psychotherapy', address: 'Musterklinik, 10115 Berlin' },
    system: nowSystem(),
  }
}
