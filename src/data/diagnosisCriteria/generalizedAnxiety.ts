import type { Disorder } from './schema'
import { UNKNOWN, met } from './schema'
import { domainSignal, durationSignal } from './predicateHelpers'

/**
 * Generalisierte Angststörung — operationalized from ICD-10 F41.1 / ICD-11 6B00.
 * Original wording; clinical facts (frei flottierende Angst, ≥6 Monate,
 * vegetative Begleitsymptome) reference the standard via `sourceRef`.
 */
export const generalizedAnxiety: Disorder = {
  id: 'generalized_anxiety_disorder',
  classification: 'icd10',
  code: 'F41.1',
  name_de: 'Generalisierte Angststörung',
  crosswalkKey: 'F41.1',
  sourceRef: 'operationalisiert nach ICD-10 F41.1 / ICD-11 6B00',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F41.1', label_de: 'Generalisierte Angststörung' },
    icd11: { code: '6B00', label_de: 'Generalisierte Angststörung' },
    dsm5tr: { code: '300.02', label_de: 'Generalized Anxiety Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Panikstörung',
    'Soziale Angststörung / Phobie',
    'Depressive Episode mit Angstanteil',
    'Substanz- oder koffeininduzierte Angst, Hyperthyreose',
  ],
  groups: [
    {
      id: 'f41_1.core',
      label_de: 'Kern: anhaltende, frei flottierende Angst',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 180 },
      criteria: [
        {
          id: 'f41_1.persistent_worry',
          text_de: 'Generalisierte, frei flottierende (nicht situationsgebundene) Anspannung, Sorge und Befürchtungen bezüglich alltäglicher Ereignisse und Probleme an den meisten Tagen',
          citation: [{ classification: 'icd10', code: 'F41.1', ref: 'A' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'anxiety_panic_phobic_symptoms',
            /angst|sorge|bef[üu]rcht|anspannung|nerv[öo]s|besorg/i,
            /keine\s+angst/i,
          ),
        },
        {
          id: 'f41_1.duration',
          text_de: 'Beschwerden bestehen über einen Zeitraum von mindestens mehreren Monaten (Größenordnung ≥ 6 Monate)',
          citation: [{ classification: 'icd10', code: 'F41.1', ref: 'A' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
          operationalRule: durationSignal(180),
        },
      ],
    },
    {
      id: 'f41_1.associated',
      label_de: 'Vegetative/Anspannungssymptome (mindestens 3)',
      logic: 'at_least_n_of',
      threshold: 3,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f41_1.restlessness',
          text_de: 'Ruhelosigkeit, innere Anspannung oder Unfähigkeit, sich zu entspannen („auf dem Sprung sein“)',
          citation: [{ classification: 'icd10', code: 'F41.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', /unruhig|ruhelos|getrieben|gesteigert/i),
        },
        {
          id: 'f41_1.fatigue',
          text_de: 'Leichte Ermüdbarkeit',
          citation: [{ classification: 'icd11', code: '6B00' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', /ersch[öo]pf|erm[üu]d|abgeschlagen/i),
        },
        {
          id: 'f41_1.concentration',
          text_de: 'Konzentrationsschwierigkeiten oder Gefühl der „Leere im Kopf“',
          citation: [{ classification: 'icd10', code: 'F41.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('attention_concentration', /vermindert|gest[öo]rt|konzentration/i, /unauff[äa]llig/i),
        },
        {
          id: 'f41_1.irritability',
          text_de: 'Anhaltende Reizbarkeit oder affektive Labilität',
          citation: [{ classification: 'icd10', code: 'F41.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /reizbar|labil|gereizt/i),
        },
        {
          id: 'f41_1.muscle_tension',
          text_de: 'Muskelverspannung oder -schmerzen sowie andere körperliche Anspannungssymptome',
          citation: [{ classification: 'icd10', code: 'F41.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /verspann|anspannung|muskel|kopfschmerz|zittern/i),
        },
        {
          id: 'f41_1.sleep',
          text_de: 'Ein- oder Durchschlafstörung infolge von Sorgen oder Anspannung',
          citation: [{ classification: 'icd10', code: 'F41.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /schlaf.*(reduziert|gest[öo]rt)|einschlaf|durchschlaf|insomn/i),
        },
        {
          id: 'f41_1.autonomic',
          text_de: 'Vegetative Übererregbarkeit (z. B. Herzklopfen, Schwitzen, Schwindel, Mundtrockenheit, Magen-Darm-Beschwerden)',
          citation: [{ classification: 'icd10', code: 'F41.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('somatic_preoccupation', /herzklopfen|palpit|schwitz|schwindel|[üu]belkeit|magen/i),
        },
      ],
    },
    {
      id: 'f41_1.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f41_1.exclude_substance_medical',
          text_de: 'Angst ist besser durch eine somatische Erkrankung (z. B. Hyperthyreose) oder die Wirkung einer psychotropen Substanz erklärt',
          citation: [{ classification: 'icd10', code: 'F41.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f41_1.exclude_panic_primary',
          text_de: 'Beschwerden sind nicht ausschließlich auf abgrenzbare Panikattacken (F41.0) oder phobische Situationen (F40.-) beschränkt',
          citation: [{ classification: 'icd10', code: 'F41.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const panicOnly = ctx.present('anxiety_panic_phobic_symptoms', /panikattacke|nur\s+situativ|ausschlie[ßs]lich\s+phob/i)
            return panicOnly ? met(panicOnly.label) : UNKNOWN
          },
        },
      ],
    },
  ],
  // ICD-11 6B00 — strukturelle Divergenz: Der Kern ist disjunktiv gefasst —
  // entweder anhaltende, ausgeprägte Sorgen/Befürchtungen (auf mehrere Lebens-
  // bereiche bezogen) ODER frei flottierende Angst (nicht auf bestimmte Sorgen
  // fokussiert) — plus weitere charakteristische Symptome (Muskelanspannung,
  // vegetative Übererregung, Ruhelosigkeit, Konzentration, Schlaf, Reizbarkeit) an
  // den meisten Tagen über mindestens MEHRERE MONATE. ICD-11 verzichtet bewusst auf
  // die starre ICD-10-Schwelle von „6 Monaten“ und formuliert „several months“.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6B00',
    groups: [
      {
        id: '6b00.core',
        label_de: 'Kern: ausgeprägte Sorgen ODER frei flottierende Angst (mindestens eines)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b00.general_apprehension',
            text_de:
              'Ausgeprägte Besorgnis bzw. Befürchtungen, die sich auf mehrere alltägliche Lebensbereiche beziehen (z. B. Familie, Gesundheit, Finanzen, Arbeit) und schwer zu kontrollieren sind',
            citation: [{ classification: 'icd11', code: '6B00', ref: 'apprehension' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'anxiety_panic_phobic_symptoms',
              /sorge|bef[üu]rcht|besorg|grübel.*sorge|mehrere.*bereich/i,
              /keine\s+angst/i,
            ),
          },
          {
            id: '6b00.free_floating',
            text_de:
              'Allgemeine, frei flottierende Angst oder Nervosität, die nicht an bestimmte Sorgen oder Situationen gebunden ist',
            citation: [{ classification: 'icd11', code: '6B00', ref: 'free-floating' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'anxiety_panic_phobic_symptoms', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal(
              'anxiety_panic_phobic_symptoms',
              /frei\s*flottier|allgemein.*angst|nerv[öo]s|innere.*anspannung|diffuse.*angst/i,
              /keine\s+angst/i,
            ),
          },
        ],
      },
      {
        id: '6b00.additional',
        label_de: 'Zusätzliche charakteristische Symptome (mindestens 3)',
        logic: 'at_least_n_of',
        threshold: 3,
        groupType: 'inclusion',
        criteria: [
          {
            id: '6b00.muscle_tension',
            text_de: 'Muskelanspannung oder motorische Unruhe',
            citation: [{ classification: 'icd11', code: '6B00', ref: 'muscle-tension' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('somatic_preoccupation', /verspann|anspannung|muskel|kopfschmerz|zittern/i),
          },
          {
            id: '6b00.autonomic',
            text_de: 'Sympathische vegetative Übererregung (z. B. Herzklopfen, Schwitzen, Zittern, Mundtrockenheit, Magen-Darm-Beschwerden)',
            citation: [{ classification: 'icd11', code: '6B00', ref: 'autonomic' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'somatic_preoccupation', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('somatic_preoccupation', /herzklopfen|palpit|schwitz|schwindel|[üu]belkeit|magen|mundtrocken/i),
          },
          {
            id: '6b00.restlessness',
            text_de: 'Ruhelosigkeit oder Gefühl, ständig „auf dem Sprung“ zu sein',
            citation: [{ classification: 'icd11', code: '6B00', ref: 'restlessness' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('drive_psychomotor_activity', /unruhig|ruhelos|getrieben|gesteigert/i),
          },
          {
            id: '6b00.concentration',
            text_de: 'Konzentrationsschwierigkeiten infolge von Sorgen oder Anspannung',
            citation: [{ classification: 'icd11', code: '6B00', ref: 'concentration' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('attention_concentration', /vermindert|gest[öo]rt|konzentration/i, /unauff[äa]llig/i),
          },
          {
            id: '6b00.irritability',
            text_de: 'Reizbarkeit',
            citation: [{ classification: 'icd11', code: '6B00', ref: 'irritability' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('mood_affect', /reizbar|labil|gereizt/i),
          },
          {
            id: '6b00.sleep',
            text_de: 'Schlafstörung (Ein- oder Durchschlafstörung bzw. unruhiger, nicht erholsamer Schlaf)',
            citation: [{ classification: 'icd11', code: '6B00', ref: 'sleep' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('sleep_appetite_vegetative', /schlaf.*(reduziert|gest[öo]rt)|einschlaf|durchschlaf|insomn/i),
          },
        ],
      },
      {
        id: '6b00.duration',
        label_de: 'Dauer',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 90 },
        criteria: [
          {
            id: '6b00.several_months',
            text_de: 'Die Symptome bestehen an den meisten Tagen über einen Zeitraum von mindestens mehreren Monaten',
            citation: [{ classification: 'icd11', code: '6B00' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
            operationalRule: durationSignal(90),
          },
        ],
      },
      {
        id: '6b00.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6b00.exclude_other',
            text_de:
              'Die Angst ist nicht besser durch eine andere psychische Störung, eine somatische Erkrankung (z. B. Hyperthyreose) oder die Wirkung einer Substanz/eines Medikaments erklärbar',
            citation: [{ classification: 'icd11', code: '6B00' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}
