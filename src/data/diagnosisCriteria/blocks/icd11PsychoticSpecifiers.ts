import type { Disorder } from '../schema'
import { domainSignal } from '../predicateHelpers'

/**
 * ICD-11 6A25 — Symptomatische Manifestationen primärer psychotischer Störungen.
 *
 * ICD-11 führt diese Kategorie als SEPARATE Qualifizierer-Ebene ein, die parallel
 * zur primären psychotischen Diagnose (z. B. 6A20) kodiert wird. Jede
 * Unterkategorie beschreibt ein dominantes Symptomcluster. Da ICD-10 kein
 * direktes Äquivalent hat, tragen die Datensätze einen ICD-10-F29-Anker
 * (Residualpsychose) plus einen DISTINCT `icd11`-Baum für die 6A25.x-Codes.
 *
 * LICENSING: Original deutsche Paraphrasen; `status: 'draft'`.
 */

function specifierDisorder(
  id: string,
  icd11: string,
  name_de: string,
  coreText_de: string,
  domain: 'delusions_overvalued_ideas' | 'perception_hallucinations' | 'mood_affect' | 'drive_psychomotor_activity' | 'memory_cognition',
  presentMatch: RegExp,
): Disorder {
  const prefix = icd11.toLowerCase().replace(/\./g, '_')
  return {
    id,
    classification: 'icd10',
    code: 'F29',
    name_de,
    crosswalkKey: icd11,
    sourceRef: `operationalisiert nach ICD-11 ${icd11} (symptomatische Manifestation primärer psychotischer Störung; ICD-10-Anker F29)`,
    version: 1,
    status: 'draft',
    codingSystems: {
      icd10: { code: 'F29', label_de: 'Nicht näher bezeichnete nichtorganische Psychose (Anker für 6A25-Qualifizierer)' },
      icd11: { code: icd11, label_de: name_de },
      dsm5tr: { code: 'crosswalk', label_de: 'Symptom specifier in primary psychotic disorder (Crosswalk)' },
    },
    differentials_de: [
      'Schizophrenie (6A20) — wenn das vollständige Syndrom erfüllt ist',
      'Akute und vorübergehende psychotische Störung (6A23)',
      'Substanz- oder medikamenteninduzierte psychotische Störung',
      'Affektive Störung mit psychotischen Symptomen',
    ],
    groups: [
      {
        id: `${id}.f29_anchor`,
        label_de: 'Psychotische Symptomatik (ICD-10-Anker)',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: `${id}.f29_symptoms`,
            text_de: 'Psychotische Symptomatik liegt vor; für ICD-11 wird der 6A25-Qualifizierer separat kodiert',
            citation: [{ classification: 'icd10', code: 'F29' }],
            mappingHints: [{ kind: 'isdm_domain', ref: domain, deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(domain, presentMatch),
          },
        ],
      },
    ],
    icd11: {
      sourceRef: `operationalisiert nach ICD-11 ${icd11}`,
      groups: [
        {
          id: `${prefix}.core`,
          label_de: 'Dominantes Symptomcluster (6A25-Qualifizierer)',
          logic: 'all_of',
          groupType: 'inclusion',
          criteria: [
            {
              id: `${prefix}.symptom_cluster`,
              text_de: coreText_de,
              citation: [{ classification: 'icd11', code: icd11 }],
              mappingHints: [{ kind: 'isdm_domain', ref: domain, deepLinkPageId: 'psychopathologie' }],
              allowClinicianAttest: true,
              operationalRule: domainSignal(domain, presentMatch),
            },
            {
              id: `${prefix}.primary_psychosis_context`,
              text_de: 'Die Symptomatik tritt im Rahmen einer primären psychotischen Störung auf und wird als Qualifizierer der aktuellen Episode dokumentiert',
              citation: [{ classification: 'icd11', code: '6A25' }],
              mappingHints: [],
              allowClinicianAttest: true,
            },
          ],
        },
        {
          id: `${prefix}.exclusions`,
          label_de: 'Ausschlüsse',
          logic: 'none_of',
          groupType: 'exclusion',
          criteria: [
            {
              id: `${prefix}.exclude_substance_organic`,
              text_de: 'Das Symptomcluster ist nicht besser durch eine psychotrope Substanz, ein Medikament oder eine organische Ursache allein erklärbar',
              citation: [{ classification: 'icd11', code: icd11 }],
              mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
              allowClinicianAttest: true,
            },
          ],
        },
      ],
    },
  }
}

export const icd11PsychoticSpecifierDisorders: Disorder[] = [
  specifierDisorder(
    'psychotic_positive_symptoms',
    '6A25.0',
    'Positive Symptome bei primären psychotischen Störungen',
    'Dominante positive Symptome (Wahn, Halluzinationen, Desorganisation) sind in der aktuellen Episode ausgeprägt und klinisch leitend',
    'delusions_overvalued_ideas',
    /wahn|halluzin|desorganisiert|positiv.*symptom|stimmen|verfolgung/i,
  ),
  specifierDisorder(
    'psychotic_negative_symptoms',
    '6A25.1',
    'Negative Symptome bei primären psychotischen Störungen',
    'Dominante negative Symptome (Affektverflachung, Antriebs- und Spontaneitätsminderung, sozialer Rückzug, Alogie) sind in der aktuellen Episode ausgeprägt und klinisch leitend',
    'mood_affect',
    /negativ.*symptom|affektverflach|antriebsarm|alogie|sozial.*r[üu]ckzug|spontaneit/i,
  ),
  specifierDisorder(
    'psychotic_depressive_mood_symptoms',
    '6A25.2',
    'Depressive Stimmungssymptome bei primären psychotischen Störungen',
    'Depressive Stimmungssymptome (gedrückte Stimmung, Hoffnungslosigkeit, Anhedonie) sind im Rahmen der psychotischen Episode prominent und klinisch leitend',
    'mood_affect',
    /depress|gedr[üu]ckt|hoffnungslos|anhedon|freudlos/i,
  ),
  specifierDisorder(
    'psychotic_manic_mood_symptoms',
    '6A25.3',
    'Manische Stimmungssymptome bei primären psychotischen Störungen',
    'Manische Stimmungssymptome (gehobene oder gereizte Stimmung, gesteigerter Antrieb) sind im Rahmen der psychotischen Episode prominent und klinisch leitend',
    'mood_affect',
    /man(i|ie)|gehoben|gereizt|gesteigerter\s+antrieb|euphor/i,
  ),
  specifierDisorder(
    'psychotic_psychomotor_symptoms',
    '6A25.4',
    'Psychomotorische Symptome bei primären psychotischen Störungen',
    'Psychomotorische Symptome (Erregung, Rigor, Haltungsverharren, Mutismus oder katatonische Phänomene) sind in der aktuellen Episode ausgeprägt und klinisch leitend',
    'drive_psychomotor_activity',
    /katato|stupor|mutismus|haltungsverharr|psychomotor|erregung|rigor|negativismus/i,
  ),
  specifierDisorder(
    'psychotic_cognitive_symptoms',
    '6A25.5',
    'Kognitive Symptome bei primären psychotischen Störungen',
    'Kognitive Symptome (Aufmerksamkeits- und Gedächtnisstörungen, Verlangsamung, Exekutivdysfunktion) sind in der aktuellen Episode ausgeprägt und klinisch leitend',
    'memory_cognition',
    /kognitiv|ged[äa]chtnis|aufmerksam|exekutiv|verlangsamt|konzentration.*gest[öo]rt/i,
  ),
]
