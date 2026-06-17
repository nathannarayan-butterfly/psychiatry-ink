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
}

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
}

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

export const f2PsychoticDisorders: Disorder[] = [
  schizotypalDisorder,
  persistentDelusionalDisorder,
  acuteTransientPsychoticDisorder,
  inducedDelusionalDisorder,
  schizoaffectiveDisorder,
  otherNonorganicPsychosis,
  unspecifiedNonorganicPsychosis,
]
