import type { Disorder, OperationalRule } from './schema'
import { met, notMet, UNKNOWN } from './schema'

/**
 * Alkoholabhängigkeitssyndrom — operationalized from ICD-10 F10.2 / ICD-11 6C40.2.
 * Clinical fact: ≥ 3 of 6 dependence features within a 12-month period. Wording
 * is original; the standard is referenced via `sourceRef`.
 *
 * Each dependence-feature predicate: a present substance-domain finding matching
 * the feature → `met`; documented controlled/occasional use without dependence
 * features → `not_met` (positive evidence against dependence); otherwise
 * `unknown` (becomes a clinician checkbox). This keeps the engine honest — it
 * never infers a dependence feature from silence.
 */
function dependenceFeature(match: RegExp): OperationalRule {
  return (ctx) => {
    const present = ctx.present('substance_related_features', match)
    if (present) return met(present.label)
    const absent = ctx.absent('substance_related_features', match)
    if (absent) return notMet(absent.label)
    if (ctx.substanceControlledUse) {
      return notMet('Dokumentierter kontrollierter/gelegentlicher Konsum ohne Abhängigkeitsmerkmal')
    }
    return UNKNOWN
  }
}

export const alcoholDependence: Disorder = {
  id: 'alcohol_dependence',
  classification: 'icd10',
  code: 'F10.2',
  name_de: 'Alkoholabhängigkeit',
  crosswalkKey: 'F10.2',
  sourceRef: 'operationalisiert nach ICD-10 F10.2 / ICD-11 6C40.2',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F10.2', label_de: 'Psychische und Verhaltensstörung durch Alkohol: Abhängigkeitssyndrom' },
    icd11: { code: '6C40.2', label_de: 'Alkoholabhängigkeit' },
    dsm5tr: { code: '303.90', label_de: 'Alcohol Use Disorder, moderate–severe (Crosswalk)' },
  },
  differentials_de: [
    'Schädlicher Gebrauch / riskanter Konsum (F10.1) ohne Abhängigkeit',
    'Akute Intoxikation (F10.0)',
    'Substanzinduzierte affektive oder Angststörung',
  ],
  groups: [
    {
      id: 'f10_2.dependence',
      label_de: 'Abhängigkeitsmerkmale (mindestens 3 innerhalb von 12 Monaten)',
      logic: 'at_least_n_of',
      threshold: 3,
      groupType: 'inclusion',
      timeWindow: { withinDays: 365 },
      criteria: [
        {
          id: 'f10_2.craving',
          text_de: 'Starkes Verlangen oder eine Art Zwang, Alkohol zu konsumieren (Craving)',
          citation: [{ classification: 'icd10', code: 'F10.2', ref: 'a' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features', deepLinkPageId: 'anamnese' }],
          allowClinicianAttest: true,
          operationalRule: dependenceFeature(/verlangen|craving|suchtdruck|zwang.*konsum/i),
        },
        {
          id: 'f10_2.impaired_control',
          text_de: 'Verminderte Kontrolle über Beginn, Beendigung und Menge des Konsums',
          citation: [{ classification: 'icd10', code: 'F10.2', ref: 'b' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features', deepLinkPageId: 'anamnese' }],
          allowClinicianAttest: true,
          operationalRule: dependenceFeature(/kontrollverlust|verminderte\s+kontrolle|kann.*nicht.*aufh[öo]r|exzessiv/i),
        },
        {
          id: 'f10_2.withdrawal',
          text_de: 'Körperliches Entzugssyndrom bei Reduktion oder Beendigung des Konsums oder Konsum zur Linderung bzw. Vermeidung von Entzugssymptomen',
          citation: [{ classification: 'icd10', code: 'F10.2', ref: 'c' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features', deepLinkPageId: 'anamnese' }],
          allowClinicianAttest: true,
          operationalRule: dependenceFeature(/entzug|withdrawal|tremor.*morgen|entzugssymptom/i),
        },
        {
          id: 'f10_2.tolerance',
          text_de: 'Toleranzentwicklung mit erforderlicher Dosissteigerung für die ursprüngliche Wirkung',
          citation: [{ classification: 'icd10', code: 'F10.2', ref: 'd' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features', deepLinkPageId: 'anamnese' }],
          allowClinicianAttest: true,
          operationalRule: dependenceFeature(/toleranz|tolerance|dosissteiger|mehr.*menge/i),
        },
        {
          id: 'f10_2.neglect',
          text_de: 'Zunehmende Vernachlässigung anderer Interessen und Aktivitäten zugunsten des Konsums sowie erhöhter Zeitaufwand für Beschaffung, Konsum und Erholung',
          citation: [{ classification: 'icd10', code: 'F10.2', ref: 'e' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features', deepLinkPageId: 'anamnese' }],
          allowClinicianAttest: true,
          operationalRule: dependenceFeature(/vernachl[äa]ssig|interessenverlust.*konsum|aufgabe.*aktivit/i),
        },
        {
          id: 'f10_2.persistence_harm',
          text_de: 'Anhaltender Konsum trotz Nachweises eindeutig schädlicher körperlicher, psychischer oder sozialer Folgen',
          citation: [{ classification: 'icd10', code: 'F10.2', ref: 'f' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features', deepLinkPageId: 'anamnese' }],
          allowClinicianAttest: true,
          operationalRule: dependenceFeature(/trotz.*sch[äa]d|fortgesetzt.*trotz|weiter.*trotz.*folgen/i),
        },
      ],
    },
  ],
  // ICD-11 6C40.2 — distinct structure: ≥ 2 of THREE central features (vs ICD-10's
  // ≥ 3 of six) over ≥ 12 months (or ≥ 1 month with continuous use). Folds the
  // six ICD-10 features into impaired control (incl. craving), increasing
  // salience/persistence-despite-harm, and physiological features.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6C40.2',
    groups: [
      {
        id: '6c40_2.dependence',
        label_de:
          'Abhängigkeitsmerkmale nach ICD-11 (mindestens 2 von 3, über ≥ 12 Monate – bei kontinuierlichem Konsum ≥ 1 Monat)',
        logic: 'at_least_n_of',
        threshold: 2,
        groupType: 'inclusion',
        timeWindow: { withinDays: 365 },
        criteria: [
          {
            id: '6c40_2.impaired_control',
            text_de:
              'Beeinträchtigte Kontrolle über den Alkoholkonsum (Beginn, Menge, Umstände oder Beendigung), häufig begleitet von starkem Verlangen (Craving)',
            citation: [{ classification: 'icd11', code: '6C40.2', ref: '1' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features', deepLinkPageId: 'anamnese' }],
            allowClinicianAttest: true,
            operationalRule: dependenceFeature(
              /kontrollverlust|verminderte\s+kontrolle|kann.*nicht.*aufh[öo]r|exzessiv|verlangen|craving|suchtdruck|zwang.*konsum/i,
            ),
          },
          {
            id: '6c40_2.salience',
            text_de:
              'Zunehmender Stellenwert des Alkoholkonsums gegenüber anderen Interessen und Verpflichtungen, mit fortgesetztem Konsum trotz eingetretener schädlicher Folgen',
            citation: [{ classification: 'icd11', code: '6C40.2', ref: '2' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features', deepLinkPageId: 'anamnese' }],
            allowClinicianAttest: true,
            operationalRule: dependenceFeature(
              /vernachl[äa]ssig|interessenverlust.*konsum|aufgabe.*aktivit|trotz.*sch[äa]d|fortgesetzt.*trotz|weiter.*trotz.*folgen|stellenwert|priorit/i,
            ),
          },
          {
            id: '6c40_2.physiological',
            text_de:
              'Physiologische Merkmale: Toleranzentwicklung, Entzugssymptome bei Reduktion oder Beendigung des Konsums oder Konsum zur Vermeidung bzw. Linderung von Entzugssymptomen',
            citation: [{ classification: 'icd11', code: '6C40.2', ref: '3' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features', deepLinkPageId: 'anamnese' }],
            allowClinicianAttest: true,
            operationalRule: dependenceFeature(
              /toleranz|tolerance|dosissteiger|mehr.*menge|entzug|withdrawal|tremor.*morgen|entzugssymptom/i,
            ),
          },
        ],
      },
    ],
  },
}
