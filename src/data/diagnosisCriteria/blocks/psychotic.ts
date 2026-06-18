import type { Disorder } from '../schema'
import { UNKNOWN, met } from '../schema'
import { domainSignal, durationSignal } from '../predicateHelpers'

/**
 * F2 block — schizophrenie-nahe, schizotype und wahnhafte Störungen.
 *
 * Operationalisiert nach ICD-10 F21–F29 (mit ICD-11-Crosswalk, wo eindeutig).
 * Schizophrenie (F20) ist bereits separat erfasst und hier bewusst ausgelassen.
 *
 * LIZENZ: Jeder `text_de` ist eine ORIGINALE deutsche operationale Paraphrase.
 * Es werden ausschließlich klinische Fakten (Merkmalszahlen, Dauer, Schwellen)
 * kodiert — kein ICD-/DSM-Wortlaut übernommen. DSM nur als Code/Label-Crosswalk.
 */

// ICD-11 6A22 (Schizotype Störung) — DELIBERATE icd10==icd11 mapping (no distinct
// `icd11` set). ICD-11 keeps the same enduring (≥ several years) pattern of
// attenuated cognitive-perceptual, affective and interpersonal eccentricities
// below the psychosis threshold; at the granularity this app encodes (the
// multi-feature trait checklist + duration + schizophrenia exclusion) the two
// systems are clinically equivalent. ICD-11 moves the category INTO the
// schizophrenia-spectrum grouping (vs ICD-10's placement near schizophrenia) and
// drops the explicit fixed 2-year threshold in favour of "long-standing", but the
// operationalized requirements are unchanged → ICD-11 mode reuses the F21 tree.
const schizotypalDisorder: Disorder = {
  id: 'schizotypal_disorder',
  classification: 'icd10',
  code: 'F21',
  name_de: 'Schizotype Störung',
  crosswalkKey: 'F21',
  sourceRef: 'operationalisiert nach ICD-10 F21 / ICD-11 6A22',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F21', label_de: 'Schizotype Störung' },
    icd11: { code: '6A22', label_de: 'Schizotype Störung' },
    dsm5tr: { code: '301.22', label_de: 'Schizotypal Personality Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Schizophrenie (F20) — bei eindeutiger psychotischer Symptomatik',
    'Schizoide oder paranoide Persönlichkeitsstörung',
    'Autismus-Spektrum-Störung mit sozialer Eigenart',
    'Beginnende (prodromale) Schizophrenie',
  ],
  groups: [
    {
      id: 'f21.features',
      label_de: 'Charakteristische Merkmale (mindestens 4 von 9, dauerhaft oder episodisch)',
      logic: 'at_least_n_of',
      threshold: 4,
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 730 },
      criteria: [
        {
          id: 'f21.constricted_affect',
          text_de: 'Inadäquater oder eingeschränkter Affekt mit kühl-distanziertem, gefühlsarmem Auftreten',
          citation: [{ classification: 'icd10', code: 'F21', ref: 'a' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /eingeschr[äa]nkt|verflacht|kühl|distanziert|affektarm|inad[äa]quat/i),
        },
        {
          id: 'f21.odd_behavior',
          text_de: 'Eigentümliches, exzentrisches oder seltsames Verhalten und Erscheinungsbild',
          citation: [{ classification: 'icd10', code: 'F21', ref: 'b' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('appearance_behavior', /exzentrisch|seltsam|eigentümlich|bizarr|skurril/i),
        },
        {
          id: 'f21.social_withdrawal',
          text_de: 'Sozialer Rückzug und verarmter Kontakt mit anderen (geringe Beziehungsfähigkeit)',
          citation: [{ classification: 'icd10', code: 'F21', ref: 'c' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /rückzug|isoliert|kontaktarm|vereinsamt|distanziert/i),
        },
        {
          id: 'f21.magical_thinking',
          text_de: 'Ungewöhnliche, magische Überzeugungen, die das Verhalten beeinflussen und nicht den soziokulturellen Normen entsprechen',
          citation: [{ classification: 'icd10', code: 'F21', ref: 'd' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('delusions_overvalued_ideas', /magisch|aberglaub|übersinn|hellseh|telepath|ungewöhnliche.*überzeug/i),
        },
        {
          id: 'f21.suspiciousness',
          text_de: 'Misstrauen oder paranoide Ideen ohne Wahncharakter',
          citation: [{ classification: 'icd10', code: 'F21', ref: 'e' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('delusions_overvalued_ideas', /misstrau|paranoid|argwöhn|beziehungsideen/i),
        },
        {
          id: 'f21.ruminations',
          text_de: 'Zwanghafte Grübeleien ohne inneren Widerstand, häufig mit dysmorphophoben, sexuellen oder aggressiven Inhalten',
          citation: [{ classification: 'icd10', code: 'F21', ref: 'f' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'obsessions_compulsions', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('obsessions_compulsions', /grübel|zwanghaft|ruminier|gedankenkreis/i),
        },
        {
          id: 'f21.unusual_perceptions',
          text_de: 'Ungewöhnliche Wahrnehmungserlebnisse einschließlich Körpergefühlsstörungen sowie Depersonalisation oder Derealisation',
          citation: [{ classification: 'icd10', code: 'F21', ref: 'g' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('perception_hallucinations', /ungewöhnliche.*wahrnehmung|illusion|körpergefühl|depersonal|dereal/i),
        },
        {
          id: 'f21.odd_speech',
          text_de: 'Umständliches, metaphorisches, gekünsteltes oder vages Denken, das sich in eigentümlicher Sprache ohne ausgeprägte Zerfahrenheit äußert',
          citation: [{ classification: 'icd10', code: 'F21', ref: 'h' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'formal_thought_disorder', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('formal_thought_disorder', /umständlich|metaphorisch|gekünstelt|vage|eigentümliche.*sprache/i),
        },
        {
          id: 'f21.quasi_psychotic',
          text_de: 'Gelegentliche vorübergehende quasi-psychotische Episoden mit intensiven Illusionen, akustischen oder anderen Halluzinationen und wahnähnlichen Ideen, meist ohne äußeren Anlass',
          citation: [{ classification: 'icd10', code: 'F21', ref: 'i' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('perception_hallucinations', /vorübergehend.*halluzin|quasi-?psychotisch|kurzzeitig.*wahn|transient/i),
        },
      ],
    },
    {
      id: 'f21.duration',
      label_de: 'Zeitkriterium',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 730 },
      criteria: [
        {
          id: 'f21.duration_two_years',
          text_de: 'Die Merkmale bestehen dauerhaft oder episodisch über einen Zeitraum von mindestens zwei Jahren',
          citation: [{ classification: 'icd10', code: 'F21' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
          operationalRule: durationSignal(730),
        },
      ],
    },
    {
      id: 'f21.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f21.exclude_schizophrenia',
          text_de: 'Die Kriterien einer Schizophrenie (F20) wurden zu keinem Zeitpunkt vollständig erfüllt',
          citation: [{ classification: 'icd10', code: 'F21' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f21.exclude_organic',
          text_de: 'Die Symptomatik ist nicht auf eine organische psychische Störung oder eine psychotrope Substanz zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F21' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

// ICD-11 6A24 (Wahnhafte Störung) — DELIBERATE icd10==icd11 mapping (no distinct
// `icd11` set). Both systems require a single delusion or a set of related
// delusions persisting ≥ 3 months, in the ABSENCE of the other characteristic
// symptoms of schizophrenia (no prominent persistent hallucinations, no
// disorganisation/passivity), and not better explained by an organic, substance
// or mood cause. At the granularity this app encodes (delusion + ≥ 3-month
// duration + schizophrenia/organic exclusions) the operationalizations coincide,
// so ICD-11 mode reuses the F22 tree.
const persistentDelusionalDisorder: Disorder = {
  id: 'persistent_delusional_disorder',
  classification: 'icd10',
  code: 'F22',
  name_de: 'Anhaltende wahnhafte Störung',
  crosswalkKey: 'F22.0',
  sourceRef: 'operationalisiert nach ICD-10 F22 / ICD-11 6A24',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F22.0', label_de: 'Wahnhafte Störung' },
    icd11: { code: '6A24', label_de: 'Wahnhafte Störung' },
    dsm5tr: { code: '297.1', label_de: 'Delusional Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Schizophrenie (F20) — bei zusätzlichen typisch schizophrenen Symptomen',
    'Affektive Störung mit stimmungskongruentem Wahn',
    'Organisch oder substanzbedingt verursachter Wahn',
    'Anhaltende wahnhafte Störung im Rahmen einer Persönlichkeitsstörung',
  ],
  groups: [
    {
      id: 'f22.core',
      label_de: 'Kern: anhaltender Wahn',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 90 },
      criteria: [
        {
          id: 'f22.delusion',
          text_de: 'Ein Wahn oder ein System inhaltlich verbundener Wahnideen (z. B. Verfolgungs-, Größen-, hypochondrischer, Eifersuchts- oder Liebeswahn)',
          citation: [{ classification: 'icd10', code: 'F22', ref: 'a' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal(
            'delusions_overvalued_ideas',
            /wahn|verfolgung|größen|eifersucht|hypochond|liebeswahn|querulant/i,
            /kein.*wahn/i,
          ),
        },
        {
          id: 'f22.duration_three_months',
          text_de: 'Der Wahn besteht über einen Zeitraum von mindestens drei Monaten',
          citation: [{ classification: 'icd10', code: 'F22', ref: 'a' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
          operationalRule: durationSignal(90),
        },
      ],
    },
    {
      id: 'f22.exclusions',
      label_de: 'Ausschlüsse (kein schizophrenes Vollbild, nicht organisch)',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f22.exclude_schizophrenic_symptoms',
          text_de: 'Keine anhaltenden akustischen Halluzinationen, Ich-Störungen oder andere für die Schizophrenie kennzeichnenden Symptome (allenfalls flüchtig vorhanden)',
          citation: [{ classification: 'icd10', code: 'F22', ref: 'b' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const schiz = ctx.present('self_experience_ego_disturbance', /gedankeneingebung|gedankenentzug|gedankenausbreitung|gemacht|passivit[äa]t/i)
            if (schiz) return met(schiz.label)
            const hallu = ctx.present('perception_hallucinations', /anhaltend.*stimmen|kommentier|dialogisch/i)
            return hallu ? met(hallu.label) : UNKNOWN
          },
        },
        {
          id: 'f22.exclude_organic',
          text_de: 'Der Wahn ist nicht durch eine organische psychische Störung, eine Substanzwirkung oder eine vorrangige affektive Störung erklärbar',
          citation: [{ classification: 'icd10', code: 'F22' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const acuteTransientPsychoticDisorder: Disorder = {
  id: 'acute_transient_psychotic_disorder',
  classification: 'icd10',
  code: 'F23',
  name_de: 'Akute vorübergehende psychotische Störung',
  crosswalkKey: 'F23.9',
  sourceRef: 'operationalisiert nach ICD-10 F23 / ICD-11 6A23',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F23.9', label_de: 'Akute vorübergehende psychotische Störung, nicht näher bezeichnet' },
    icd11: { code: '6A23', label_de: 'Akute und vorübergehende psychotische Störung' },
    dsm5tr: { code: '298.8', label_de: 'Brief Psychotic Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Schizophrenie (F20) — bei Symptompersistenz über einen Monat',
    'Affektive Störung mit psychotischen Symptomen',
    'Substanzinduzierte oder organische Psychose',
    'Anhaltende wahnhafte Störung (F22)',
  ],
  groups: [
    {
      id: 'f23.onset',
      label_de: 'Akuter Beginn',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { withinDays: 14 },
      criteria: [
        {
          id: 'f23.acute_onset',
          text_de: 'Akuter Beginn der psychotischen Symptomatik innerhalb von höchstens zwei Wochen aus einem unauffälligen Zustand heraus',
          citation: [{ classification: 'icd10', code: 'F23' }],
          mappingHints: [{ kind: 'course', ref: 'onset' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            if (ctx.coursePattern.onset === 'acute') return met(ctx.coursePattern.summary)
            if (ctx.coursePattern.onset === 'insidious') return { status: 'not_met', evidence: ctx.coursePattern.summary }
            return UNKNOWN
          },
        },
      ],
    },
    {
      id: 'f23.symptoms',
      label_de: 'Psychotische Symptome (mindestens eines)',
      logic: 'any_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f23.delusions',
          text_de: 'Wahnphänomene, die nach Art und Inhalt rasch wechseln können (polymorphes Bild)',
          citation: [{ classification: 'icd10', code: 'F23' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('delusions_overvalued_ideas', /wahn|verfolgung|beziehung|größen|paranoid/i),
        },
        {
          id: 'f23.hallucinations',
          text_de: 'Halluzinationen wechselnder Modalität und Intensität',
          citation: [{ classification: 'icd10', code: 'F23' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('perception_hallucinations', /halluzin|stimmen|optisch|akustisch/i),
        },
        {
          id: 'f23.perplexity',
          text_de: 'Rasch wechselnde, vielgestaltige (polymorphe) Symptomatik mit emotionaler Aufgewühltheit oder Ratlosigkeit',
          citation: [{ classification: 'icd10', code: 'F23', ref: 'F23.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /ratlos|aufgewühlt|wechselnd|verwirrt|perplex/i),
        },
      ],
    },
    {
      id: 'f23.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f23.exclude_organic',
          text_de: 'Die Symptomatik ist nicht auf eine organische psychische Störung oder eine psychotrope Substanz (Intoxikation, Entzug) zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F23' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A23 — DISTINCT structure. ICD-11 makes the POLYMORPHIC, rapidly
  // fluctuating presentation the defining feature: an acute onset within ~2 weeks,
  // psychotic symptoms (delusions, hallucinations, disorganisation) that change
  // rapidly in type and intensity from day to day or within a single day, and a
  // course that typically remits fully within ~3 months (and must not meet the
  // symptom-duration requirement for schizophrenia). ICD-11 abolishes the ICD-10
  // F23.x subtypes (e.g. F23.0 polymorphic without / F23.1 with schizophrenic
  // symptoms, F23.2 acute schizophrenia-like), folding them into this single
  // category with the polymorphic picture as the prototype.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A23',
    groups: [
      {
        id: '6a23.onset',
        label_de: 'Akuter Beginn',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { withinDays: 14 },
        criteria: [
          {
            id: '6a23.acute_onset',
            text_de: 'Akuter Beginn der psychotischen Symptomatik innerhalb von höchstens zwei Wochen aus einem weitgehend unauffälligen Zustand heraus',
            citation: [{ classification: 'icd11', code: '6A23', ref: 'onset' }],
            mappingHints: [{ kind: 'course', ref: 'onset' }],
            allowClinicianAttest: true,
            operationalRule: (ctx) => {
              if (ctx.coursePattern.onset === 'acute') return met(ctx.coursePattern.summary)
              if (ctx.coursePattern.onset === 'insidious') return { status: 'not_met', evidence: ctx.coursePattern.summary }
              return UNKNOWN
            },
          },
        ],
      },
      {
        id: '6a23.symptoms',
        label_de: 'Rasch wechselnde polymorphe psychotische Symptomatik (mindestens eines)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a23.rapidly_changing',
            text_de: 'Polymorphes Bild mit rasch wechselnder Art und Intensität der Symptome (Wechsel von Tag zu Tag oder innerhalb eines Tages) — das charakteristische Merkmal der ICD-11-Kategorie',
            citation: [{ classification: 'icd11', code: '6A23', ref: 'polymorphic' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
          },
          {
            id: '6a23.delusions',
            text_de: 'Wahnphänomene, die nach Art und Inhalt rasch wechseln können',
            citation: [{ classification: 'icd11', code: '6A23', ref: 'delusions' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('delusions_overvalued_ideas', /wahn|verfolgung|beziehung|größen|paranoid/i),
          },
          {
            id: '6a23.hallucinations',
            text_de: 'Halluzinationen wechselnder Modalität und Intensität',
            citation: [{ classification: 'icd11', code: '6A23', ref: 'hallucinations' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('perception_hallucinations', /halluzin|stimmen|optisch|akustisch/i),
          },
        ],
      },
      {
        id: '6a23.course',
        label_de: 'Verlaufskriterium',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a23.transient_remission',
            text_de: 'Die Episode ist vorübergehend: die Symptome bilden sich in der Regel innerhalb von etwa drei Monaten vollständig zurück und überschreiten nicht die für eine Schizophrenie geforderte Symptomdauer',
            citation: [{ classification: 'icd11', code: '6A23', ref: 'course' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: '6a23.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a23.exclude_substance_organic',
            text_de: 'Die Symptomatik ist nicht auf eine psychotrope Substanz, ein Medikament oder eine andere körperliche bzw. organische Ursache zurückzuführen',
            citation: [{ classification: 'icd11', code: '6A23', ref: 'exclude-substance' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

// ICD-11 has NO direct equivalent to ICD-10 F24 (induzierte wahnhafte Störung /
// folie à deux): the shared/induced-delusion category was DISCONTINUED in ICD-11.
// Such presentations are coded under the residual "other/unspecified primary
// psychotic disorder" (6A2Y/6A2Z) or as a delusional disorder in the induced
// person. There is therefore NO faithful distinct ICD-11 criteria set to author —
// the ICD-10 F24 tree is retained as the fallback and this crosswalk GAP is
// documented here (codingSystems.icd11 points at 6A2Z only as a coding stand-in).
const inducedDelusionalDisorder: Disorder = {
  id: 'induced_delusional_disorder',
  classification: 'icd10',
  code: 'F24',
  name_de: 'Induzierte wahnhafte Störung (Folie à deux)',
  crosswalkKey: 'F24',
  sourceRef: 'operationalisiert nach ICD-10 F24 (ICD-11: unter sonstige primäre psychotische Störungen geführt)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F24', label_de: 'Induzierte wahnhafte Störung' },
    icd11: { code: '6A2Z', label_de: 'Primäre psychotische Störungen, nicht näher bezeichnet (Crosswalk)' },
    dsm5tr: { code: '297.3', label_de: 'Shared Psychotic Disorder / Other Specified (Crosswalk)' },
  },
  differentials_de: [
    'Eigenständige wahnhafte Störung (F22) bei beiden Personen',
    'Schizophrenie (F20)',
    'Gemeinsam geteilte realistische, nicht wahnhafte Überzeugungen',
  ],
  groups: [
    {
      id: 'f24.core',
      label_de: 'Kernkriterien der Induktion',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f24.shared_delusion',
          text_de: 'Die betroffene Person teilt einen Wahn oder ein Wahnsystem mit einer anderen Person, die an einer echten wahnhaften Störung leidet',
          citation: [{ classification: 'icd10', code: 'F24', ref: 'a' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('delusions_overvalued_ideas', /geteilt|übernomme|induziert|gemeinsam.*wahn/i),
        },
        {
          id: 'f24.close_relationship',
          text_de: 'Zwischen den Personen besteht eine ungewöhnlich enge, emotional verbundene Beziehung (z. B. familiär oder partnerschaftlich)',
          citation: [{ classification: 'icd10', code: 'F24', ref: 'b' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
        {
          id: 'f24.induction_context',
          text_de: 'Es besteht zeitlicher und inhaltlicher Zusammenhang: Der Wahn wurde durch den Kontakt mit der primär erkrankten Person übernommen und bestand zuvor nicht eigenständig',
          citation: [{ classification: 'icd10', code: 'F24', ref: 'c' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f24.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f24.exclude_primary_psychosis',
          text_de: 'Die induzierte Person erfüllte vor dem Kontakt keine eigenständige psychotische Störung; die Symptomatik ist nicht organisch oder substanzbedingt erklärbar',
          citation: [{ classification: 'icd10', code: 'F24' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

const schizoaffectiveDisorder: Disorder = {
  id: 'schizoaffective_disorder',
  classification: 'icd10',
  code: 'F25',
  name_de: 'Schizoaffektive Störung',
  crosswalkKey: 'F25.9',
  sourceRef: 'operationalisiert nach ICD-10 F25 / ICD-11 6A21',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F25.9', label_de: 'Schizoaffektive Störung, nicht näher bezeichnet' },
    icd11: { code: '6A21', label_de: 'Schizoaffektive Störung' },
    dsm5tr: { code: '295.70', label_de: 'Schizoaffective Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Schizophrenie (F20) mit begleitender affektiver Symptomatik',
    'Affektive Störung mit stimmungsinkongruenten psychotischen Symptomen',
    'Bipolare Störung mit psychotischen Merkmalen',
    'Substanzinduzierte oder organische Psychose',
  ],
  groups: [
    {
      id: 'f25.schizophrenic',
      label_de: 'Schizophrene Symptome (mindestens eines, prominent in derselben Episode)',
      logic: 'any_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f25.ego_disturbance',
          text_de: 'Ich-Störungen wie Gedankeneingebung, -entzug, -ausbreitung oder Kontroll- und Beeinflussungserleben',
          citation: [{ classification: 'icd10', code: 'F25' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'self_experience_ego_disturbance', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('self_experience_ego_disturbance', /gedankeneingebung|gedankenentzug|gedankenausbreitung|gemacht|passivit[äa]t|fremdbeeinfluss/i),
        },
        {
          id: 'f25.hallucinations',
          text_de: 'Kommentierende oder dialogische Stimmen bzw. anhaltende Halluzinationen',
          citation: [{ classification: 'icd10', code: 'F25' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('perception_hallucinations', /kommentier|dialogisch|anhaltend.*stimmen|halluzin/i),
        },
        {
          id: 'f25.bizarre_delusions',
          text_de: 'Bizarrer oder kulturell völlig unangemessener anhaltender Wahn',
          citation: [{ classification: 'icd10', code: 'F25' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('delusions_overvalued_ideas', /bizarr|wahn|verfolgung|beeinfluss|paranoid/i),
        },
        {
          id: 'f25.thought_disorder',
          text_de: 'Formale Denkstörungen mit Zerfahrenheit, Gedankenabreißen oder Neologismen',
          citation: [{ classification: 'icd10', code: 'F25' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'formal_thought_disorder', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('formal_thought_disorder', /zerfahren|inkohärent|gedankenabrei|neologism/i),
        },
      ],
    },
    {
      id: 'f25.affective',
      label_de: 'Affektives Syndrom (manisch oder depressiv, gleichzeitig prominent)',
      logic: 'any_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f25.manic_syndrome',
          text_de: 'Ausgeprägtes manisches Zustandsbild mit gehobener oder gereizter Stimmung und gesteigertem Antrieb',
          citation: [{ classification: 'icd10', code: 'F25', ref: 'F25.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /man(i|ie)|gehoben|euphor|expansiv|gereizt/i),
        },
        {
          id: 'f25.depressive_syndrome',
          text_de: 'Ausgeprägtes depressives Zustandsbild mit gedrückter Stimmung, Interessenverlust und Antriebsminderung',
          citation: [{ classification: 'icd10', code: 'F25', ref: 'F25.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /gedrückt|depress|niedergeschlagen|anhedon|interessenverlust/i),
        },
      ],
    },
    {
      id: 'f25.simultaneity',
      label_de: 'Gleichzeitigkeit',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f25.simultaneous_prominence',
          text_de: 'Schizophrene und affektive Symptome treten innerhalb derselben Krankheitsepisode gleichzeitig oder höchstens wenige Tage versetzt deutlich in Erscheinung',
          citation: [{ classification: 'icd10', code: 'F25' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f25.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f25.exclude_organic',
          text_de: 'Die Symptomatik ist nicht auf eine organische psychische Störung oder eine psychotrope Substanz zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F25' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A21 — DISTINCT structure. ICD-10 F25 only requires PROMINENT
  // affective symptoms alongside schizophrenic symptoms in the same episode.
  // ICD-11 raises the bar: the symptom requirements for SCHIZOPHRENIA (6A20) AND
  // the full diagnostic requirements for a MODERATE-or-SEVERE mood episode
  // (depressive, manic or mixed) must BOTH be met CONCURRENTLY within the same
  // episode of illness. The mood-episode-severity threshold is modelled
  // explicitly here (it has no counterpart in the F25 tree).
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A21',
    groups: [
      {
        id: '6a21.schizophrenic',
        label_de: 'Schizophrene Symptome nach 6A20 erfüllt (mindestens eines prominent in derselben Episode)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a21.delusions',
            text_de: 'Anhaltender Wahn (z. B. Verfolgungs-, Beziehungs- oder bizarrer Wahn)',
            citation: [{ classification: 'icd11', code: '6A21', ref: 'delusions' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('delusions_overvalued_ideas', /wahn|verfolgung|beziehung|größen|bizarr|paranoid/i),
          },
          {
            id: '6a21.hallucinations',
            text_de: 'Anhaltende Halluzinationen, häufig kommentierende oder dialogische Stimmen',
            citation: [{ classification: 'icd11', code: '6A21', ref: 'hallucinations' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('perception_hallucinations', /halluzin|stimmen|kommentier|dialogisch|akustisch/i),
          },
          {
            id: '6a21.disorganised_thinking',
            text_de: 'Desorganisiertes Denken bzw. formale Denkstörung (Zerfahrenheit, Gedankenabreißen, Neologismen)',
            citation: [{ classification: 'icd11', code: '6A21', ref: 'thought-disorder' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'formal_thought_disorder', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('formal_thought_disorder', /zerfahren|inkoh[äa]rent|gedankenabrei|neologism|desorganisiert/i),
          },
          {
            id: '6a21.passivity',
            text_de: 'Beeinflussungs-, Passivitäts- oder Kontrollerleben sowie Ich-Störungen (Gedankeneingebung, -entzug oder -ausbreitung)',
            citation: [{ classification: 'icd11', code: '6A21', ref: 'passivity' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'self_experience_ego_disturbance', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('self_experience_ego_disturbance', /gedankeneingebung|gedankenentzug|gedankenausbreitung|gemacht|passivit[äa]t|fremdbeeinfluss|kontrollerleben/i),
          },
        ],
      },
      {
        id: '6a21.mood_episode',
        label_de: 'Gleichzeitige mittel- bis schwergradige affektive Episode (mindestens eine)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a21.manic_episode',
            text_de: 'Eine manische (oder hypomane bis manische) Episode mittel- bis schwergradiger Ausprägung mit gehobener oder gereizter Stimmung und gesteigertem Antrieb, die die vollständigen Anforderungen einer Affektepisode erfüllt',
            citation: [{ classification: 'icd11', code: '6A21', ref: 'manic' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('mood_affect', /man(i|ie)|gehoben|euphor|expansiv|gereizt/i),
          },
          {
            id: '6a21.depressive_episode',
            text_de: 'Eine depressive Episode mittel- bis schwergradiger Ausprägung mit gedrückter Stimmung, Interessenverlust und Antriebsminderung, die die vollständigen Anforderungen einer Affektepisode erfüllt',
            citation: [{ classification: 'icd11', code: '6A21', ref: 'depressive' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('mood_affect', /gedrückt|depress|niedergeschlagen|anhedon|interessenverlust/i),
          },
          {
            id: '6a21.mixed_episode',
            text_de: 'Eine gemischte Episode mit gleichzeitig oder rasch wechselnd vorhandenen manischen und depressiven Merkmalen mittel- bis schwergradiger Ausprägung',
            citation: [{ classification: 'icd11', code: '6A21', ref: 'mixed' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: '6a21.concurrence',
        label_de: 'Gleichzeitigkeit und Schweregrad',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a21.simultaneous_episode',
            text_de: 'Die schizophrenen Symptome und die affektive Episode treten gleichzeitig innerhalb derselben Krankheitsepisode auf, wobei die affektive Episode mindestens mittelgradig ausgeprägt ist und ihre vollständigen diagnostischen Anforderungen erfüllt',
            citation: [{ classification: 'icd11', code: '6A21', ref: 'concurrence' }],
            mappingHints: [],
            allowClinicianAttest: true,
          },
        ],
      },
      {
        id: '6a21.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a21.exclude_substance_organic',
            text_de: 'Die Symptomatik ist nicht auf eine psychotrope Substanz, ein Medikament oder eine andere körperliche bzw. organische Ursache zurückzuführen',
            citation: [{ classification: 'icd11', code: '6A21', ref: 'exclude-substance' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

// ICD-11 6A2Y (Sonstige näher bezeichnete primäre psychotische Störungen) —
// DELIBERATE icd10==icd11 mapping (no distinct `icd11` set). Both F28 and 6A2Y are
// named residual categories for describable psychotic presentations that do not
// meet the requirements of any specific category; the operationalization
// (psychotic symptoms present + not better assigned + organic/substance exclusion)
// is identical, so ICD-11 mode reuses the F28 tree.
const otherNonorganicPsychosis: Disorder = {
  id: 'other_nonorganic_psychosis',
  classification: 'icd10',
  code: 'F28',
  name_de: 'Sonstige nichtorganische psychotische Störung',
  crosswalkKey: 'F28',
  sourceRef: 'operationalisiert nach ICD-10 F28 / ICD-11 6A2Y',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F28', label_de: 'Sonstige nichtorganische psychotische Störung' },
    icd11: { code: '6A2Y', label_de: 'Sonstige näher bezeichnete primäre psychotische Störungen' },
    dsm5tr: { code: '298.8', label_de: 'Other Specified Schizophrenia Spectrum / Psychotic Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Schizophrenie (F20) oder anhaltende wahnhafte Störung (F22) bei vollständiger Kriterienerfüllung',
    'Akute vorübergehende psychotische Störung (F23)',
    'Schizoaffektive Störung (F25)',
    'Organische oder substanzbedingte Psychose',
  ],
  groups: [
    {
      id: 'f28.core',
      label_de: 'Psychotische Symptomatik, die keiner spezifischen Kategorie zugeordnet werden kann, aber benennbar ist',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f28.psychotic_symptoms',
          text_de: 'Psychotische Symptome (Wahn, Halluzinationen oder formale Denkstörungen) sind vorhanden und klinisch beschreibbar',
          citation: [{ classification: 'icd10', code: 'F28' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const delu = ctx.present('delusions_overvalued_ideas', /wahn|paranoid/i)
            if (delu) return met(delu.label)
            const hallu = ctx.present('perception_hallucinations', /halluzin|stimmen/i)
            if (hallu) return met(hallu.label)
            const formal = ctx.present('formal_thought_disorder', /zerfahren|inkohärent/i)
            return formal ? met(formal.label) : UNKNOWN
          },
        },
        {
          id: 'f28.no_specific_category',
          text_de: 'Das Beschwerdebild erfüllt nicht die vollständigen Kriterien einer Schizophrenie, einer wahnhaften Störung, einer akuten vorübergehenden oder einer schizoaffektiven Störung (benannte Restkategorie)',
          citation: [{ classification: 'icd10', code: 'F28' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f28.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f28.exclude_organic',
          text_de: 'Die psychotische Symptomatik ist nicht auf eine organische psychische Störung oder eine psychotrope Substanz zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F28' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

// ICD-11 6A2Z (Primäre psychotische Störungen, nicht näher bezeichnet) —
// DELIBERATE icd10==icd11 mapping (no distinct `icd11` set). F29 and 6A2Z are both
// the "unspecified" holding category used when psychotic symptoms are clearly
// present but information is insufficient or contradictory for a specific
// diagnosis; the operationalization is identical, so ICD-11 mode reuses the F29
// tree.
const unspecifiedNonorganicPsychosis: Disorder = {
  id: 'unspecified_nonorganic_psychosis',
  classification: 'icd10',
  code: 'F29',
  name_de: 'Nicht näher bezeichnete nichtorganische Psychose',
  crosswalkKey: 'F29',
  sourceRef: 'operationalisiert nach ICD-10 F29 / ICD-11 6A2Z',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F29', label_de: 'Nicht näher bezeichnete nichtorganische Psychose' },
    icd11: { code: '6A2Z', label_de: 'Primäre psychotische Störungen, nicht näher bezeichnet' },
    dsm5tr: { code: '298.9', label_de: 'Unspecified Schizophrenia Spectrum / Other Psychotic Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Sonstige nichtorganische psychotische Störung (F28) bei näher bezeichnetem Bild',
    'Schizophrenie (F20), anhaltende wahnhafte Störung (F22) oder schizoaffektive Störung (F25) bei vollständiger Kriterienerfüllung',
    'Akute vorübergehende psychotische Störung (F23)',
    'Organische oder substanzbedingte Psychose',
  ],
  groups: [
    {
      id: 'f29.core',
      label_de: 'Psychotische Symptomatik ohne ausreichende Information für eine spezifischere Zuordnung',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f29.psychotic_symptoms',
          text_de: 'Eine eindeutig psychotische Symptomatik liegt vor, kann aber mangels ausreichender Information keiner spezifischen Kategorie zugeordnet werden',
          citation: [{ classification: 'icd10', code: 'F29' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const delu = ctx.present('delusions_overvalued_ideas', /wahn|paranoid/i)
            if (delu) return met(delu.label)
            const hallu = ctx.present('perception_hallucinations', /halluzin|stimmen/i)
            if (hallu) return met(hallu.label)
            const formal = ctx.present('formal_thought_disorder', /zerfahren|inkohärent/i)
            return formal ? met(formal.label) : UNKNOWN
          },
        },
        {
          id: 'f29.insufficient_information',
          text_de: 'Die vorliegenden Angaben reichen für eine spezifischere Diagnose nicht aus oder sind widersprüchlich (vorläufige bzw. Verlegenheitskategorie)',
          citation: [{ classification: 'icd10', code: 'F29' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f29.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f29.exclude_organic',
          text_de: 'Die psychotische Symptomatik ist nicht auf eine organische psychische Störung oder eine psychotrope Substanz zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F29' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

export const psychoticDisorders: Disorder[] = [
  schizotypalDisorder,
  persistentDelusionalDisorder,
  acuteTransientPsychoticDisorder,
  inducedDelusionalDisorder,
  schizoaffectiveDisorder,
  otherNonorganicPsychosis,
  unspecifiedNonorganicPsychosis,
]
