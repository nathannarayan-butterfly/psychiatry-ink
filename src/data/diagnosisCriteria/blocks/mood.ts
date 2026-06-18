import type { Criterion, Disorder } from '../schema'
import { UNKNOWN, met, notMet } from '../schema'
import { domainSignal, durationSignal } from '../predicateHelpers'

/**
 * Butterfly criteria — block F3: affektive Störungen (Stimmungsstörungen).
 *
 * Operationalisiert nach ICD-10 F30–F39 (mit ICD-11-Crosswalk, wo eindeutig).
 * Die einzelne depressive Episode (F32) ist bereits separat erfasst und hier
 * bewusst ausgelassen.
 *
 * LIZENZ: Jeder `text_de` ist eine ORIGINALE deutsche operationale Paraphrase.
 * Kodiert werden ausschließlich klinische Fakten (Merkmalszahlen, Dauer,
 * Schwellen, Verlaufsgestalt) — kein ICD-/DSM-Wortlaut übernommen. DSM dient nur
 * als Code-/Label-Crosswalk. Jeder Datensatz ist `status: 'draft'` bis zur
 * klinischen Freigabe.
 *
 * AUTO-REGELN: Ein `operationalRule` wird nur dort angehängt, wo die Zuordnung
 * zur strukturierten Phänomenologie (DisorderEvaluationContext) eindeutig und
 * offensichtlich korrekt ist (z. B. gehobene Stimmung → `mood_affect`,
 * gesteigerter Antrieb → `drive_psychomotor_activity`). Alles, was von Verlauf,
 * Längsschnitt-Anamnese (frühere Episoden) oder Spezifizierer-Logik abhängt,
 * bleibt attestierungspflichtig (Klinik-Checkbox), um die Engine ehrlich zu
 * halten.
 */

// Gemeinsame Regexes für die affektive Phänomenologie.
const ELEVATED_MOOD = /man(i|ie|isch)|gehoben|euphor|expansiv|hochstimmung|hochgestimmt|[üu]bersteigert/i
const IRRITABLE_MOOD = /gereizt|reizbar|dysphor/i
const DEPRESSED_MOOD = /gedr[üu]ckt|depress|niedergeschlagen|traurig|dysphor|freudlos|anhedon|interessenverlust/i
const INCREASED_DRIVE = /antrieb.*(gesteigert|erh[öo]ht|vermehrt)|gesteigerter\s+antrieb|[üu]beraktiv|hyperaktiv|rastlos|umtriebig|bewegungsdrang|gesteigerte\s+aktivit/i
const DECREASED_DRIVE = /antriebslos|antriebsminder|antriebsarm|energielos|gehemmt|ersch[öo]pf|m[üu]d/i
const PRESSURE_OF_SPEECH = /redefluss|logorrh|rededrang|sprechdrang|gesteigert.*sprech|ideenflucht/i

const f30ManicEpisode: Disorder = {
  id: 'manic_episode',
  classification: 'icd10',
  code: 'F30',
  name_de: 'Manische Episode (einschließlich Hypomanie und Manie mit psychotischen Symptomen)',
  crosswalkKey: 'F30.9',
  sourceRef: 'operationalisiert nach ICD-10 F30 / ICD-11 6A60',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F30.9', label_de: 'Manische Episode, nicht näher bezeichnet' },
    icd11: { code: '6A60', label_de: 'Bipolare Störung Typ I (manische/hypomane Episode)' },
    dsm5tr: { code: '296.0x', label_de: 'Bipolar I Disorder, manic/hypomanic episode (Crosswalk)' },
  },
  differentials_de: [
    'Bipolare affektive Störung (F31) — bei mindestens zwei affektiven Episoden im Verlauf',
    'Schizoaffektive Störung, manischer Typ (F25.0)',
    'Substanzinduzierte (z. B. Stimulanzien, Steroide) oder organische manische Störung',
    'Aufmerksamkeitsdefizit-/Hyperaktivitätsstörung im Erwachsenenalter',
    'Agitierte Form einer gemischten affektiven Episode',
  ],
  groups: [
    {
      id: 'f30.mood_core',
      label_de: 'Leitsymptom Stimmung (gehoben oder gereizt)',
      logic: 'any_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f30.elevated_mood',
          text_de: 'Deutlich gehobene, expansive oder euphorische Stimmung, die nicht den Lebensumständen angemessen ist',
          citation: [{ classification: 'icd10', code: 'F30', ref: 'A' }, { classification: 'icd11', code: '6A60' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', ELEVATED_MOOD, /euthym/i),
        },
        {
          id: 'f30.irritable_mood',
          text_de: 'Ausgeprägt gereizte oder dysphorisch-expansive Stimmungslage',
          citation: [{ classification: 'icd10', code: 'F30', ref: 'A' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', IRRITABLE_MOOD, /euthym/i),
        },
      ],
    },
    {
      id: 'f30.symptoms',
      label_de: 'Begleitsymptome der Manie (mindestens 3; bei nur gereizter Stimmung mindestens 4)',
      logic: 'at_least_n_of',
      threshold: 3,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f30.increased_activity',
          text_de: 'Gesteigerte Aktivität, motorische Unruhe oder vermehrter Antrieb',
          citation: [{ classification: 'icd10', code: 'F30', ref: 'B1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', INCREASED_DRIVE),
        },
        {
          id: 'f30.talkativeness',
          text_de: 'Gesteigerter Rededrang oder vermehrte Gesprächigkeit (Logorrhö)',
          citation: [{ classification: 'icd10', code: 'F30', ref: 'B2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'speech_language', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('speech_language', PRESSURE_OF_SPEECH),
        },
        {
          id: 'f30.distractibility',
          text_de: 'Erhöhte Ablenkbarkeit oder ständiger Wechsel von Aktivitäten und Plänen',
          citation: [{ classification: 'icd10', code: 'F30', ref: 'B4' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('attention_concentration', /ablenkbar|distrakt|sprunghaft|aufmerksamkeit.*wechsel/i),
        },
        {
          id: 'f30.reduced_sleep_need',
          text_de: 'Vermindertes Schlafbedürfnis bei dennoch erhaltener oder gesteigerter Tagesaktivität',
          citation: [{ classification: 'icd10', code: 'F30', ref: 'B5' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /schlafbed[üu]rfnis.*(vermindert|reduziert|gering)|wenig\s+schlaf|kaum\s+schlaf|geringer.*schlafbedarf/i),
        },
        {
          id: 'f30.grandiosity',
          text_de: 'Überhöhtes Selbstwertgefühl oder Größenideen bis hin zur Selbstüberschätzung',
          citation: [{ classification: 'icd10', code: 'F30', ref: 'B6' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('thought_content', /gr[öo][ßs]en|[üu]berlegen|selbst[üu]bersch[äa]tzung|allmacht/i),
        },
        {
          id: 'f30.reckless_behavior',
          text_de: 'Distanzloses, enthemmtes oder leichtsinniges Verhalten mit Verkennung möglicher Folgen (z. B. unbedachte Geldausgaben, riskante Unternehmungen)',
          citation: [{ classification: 'icd10', code: 'F30', ref: 'B7' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('appearance_behavior', /enthemmt|distanzlos|leichtsinn|risiko|r[üu]cksichtslos|kaufrausch|expansiv/i),
        },
        {
          id: 'f30.increased_sociability_libido',
          text_de: 'Gesteigerte Geselligkeit, Betriebsamkeit oder erhöhter Sexualtrieb',
          citation: [{ classification: 'icd10', code: 'F30', ref: 'B3' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /geselli|kontaktfreud|betriebsam|libido|sexual.*gesteigert/i),
        },
      ],
    },
    {
      id: 'f30.duration',
      label_de: 'Zeitkriterium (Manie mindestens 1 Woche; Hypomanie mindestens einige Tage)',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 7 },
      criteria: [
        {
          id: 'f30.duration_one_week',
          text_de: 'Die Symptomatik besteht über mindestens eine Woche (bzw. bei stationärer Behandlungsbedürftigkeit auch kürzer); für eine Hypomanie genügen mehrere aufeinanderfolgende Tage',
          citation: [{ classification: 'icd10', code: 'F30' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
          operationalRule: durationSignal(7),
        },
      ],
    },
    {
      id: 'f30.severity_hypomania',
      label_de: 'Schweregrad-Spezifizierer: Hypomanie (F30.0)',
      logic: 'all_of',
      groupType: 'severity',
      criteria: [
        {
          id: 'f30.hypomania_mild',
          text_de: 'Leicht- bis mittelgradig gehobene Stimmung mit gesteigertem Antrieb über mehrere Tage, ohne erhebliche Beeinträchtigung der Berufstätigkeit oder soziale Ablehnung und ohne psychotische Symptome',
          citation: [{ classification: 'icd10', code: 'F30.0', ref: 'F30.0' }, { classification: 'icd11', code: '6A60' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f30.severity_mania',
      label_de: 'Schweregrad-Spezifizierer: Manie ohne psychotische Symptome (F30.1)',
      logic: 'all_of',
      groupType: 'severity',
      criteria: [
        {
          id: 'f30.mania_marked_impairment',
          text_de: 'Vollständig ausgeprägte Manie mit erheblicher Beeinträchtigung der alltäglichen Lebensführung, jedoch ohne Wahn oder Halluzinationen',
          citation: [{ classification: 'icd10', code: 'F30.1', ref: 'F30.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'functional_impairment' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('functional_impairment', /beeintr[äa]cht|funktionsverlust|arbeitsunf[äa]hig|sozial.*konflikt/i),
        },
      ],
    },
    {
      id: 'f30.severity_psychotic',
      label_de: 'Schweregrad-Spezifizierer: Manie mit psychotischen Symptomen (F30.2)',
      logic: 'any_of',
      groupType: 'severity',
      criteria: [
        {
          id: 'f30.psychotic_delusions',
          text_de: 'Stimmungskongruente Größen- oder (seltener) stimmungsinkongruente Wahnideen',
          citation: [{ classification: 'icd10', code: 'F30.2', ref: 'F30.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('delusions_overvalued_ideas', /gr[öo][ßs]enwahn|wahn|berufung|abstammung|sendung/i),
        },
        {
          id: 'f30.psychotic_hallucinations',
          text_de: 'Halluzinationen im Rahmen der manischen Episode',
          citation: [{ classification: 'icd10', code: 'F30.2', ref: 'F30.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('perception_hallucinations', /halluzin|stimmen/i),
        },
      ],
    },
    {
      id: 'f30.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f30.exclude_organic_substance',
          text_de: 'Die Episode ist nicht auf eine psychotrope Substanz (z. B. Stimulanzien, Kortikosteroide) oder eine organische psychische Störung zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F30' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f30.exclude_schizoaffective',
          text_de: 'Es liegt keine gleichzeitig dominierende schizophrene Symptomatik vor, die eine schizoaffektive Störung nahelegt',
          citation: [{ classification: 'icd10', code: 'F30' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A60 (manische Episode) — DISTINCT structure. ICD-10 F30 makes
  // elevated/irritable MOOD the single lead symptom with activity as one of the
  // accompanying features. ICD-11 instead requires a CORE DYAD: an extreme mood
  // state (Euphorie/Reizbarkeit/Expansivität) AND gleichzeitig gesteigerte
  // Aktivität bzw. subjektiv erhöhte Energie, beide an den meisten Tagen nahezu
  // durchgehend über ≥ 1 Woche (bei stationärer Behandlungsbedürftigkeit auch
  // kürzer), plus mehrere charakteristische Symptome. Modelliert als All-of-Dyade
  // + at_least_n_of-Symptomgruppe + Dauer + Ausschlüsse.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A60',
    groups: [
      {
        id: '6a60.core_dyad',
        label_de: 'Kerndyade: Stimmungsänderung UND gesteigerte Aktivität/Energie (beide erforderlich)',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a60.mood_change',
            text_de:
              'Extremes Stimmungsbild mit Euphorie, Reizbarkeit oder Expansivität an den meisten Tagen und über die meiste Zeit des Tages',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'mood' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: (ctx) => {
              const elevated = ctx.present('mood_affect', ELEVATED_MOOD) ?? ctx.present('mood_affect', IRRITABLE_MOOD)
              if (elevated) return met(elevated.label)
              const euthymic = ctx.absent('mood_affect', /euthym/i)
              return euthymic ? notMet(euthymic.label) : UNKNOWN
            },
          },
          {
            id: '6a60.increased_activity_energy',
            text_de:
              'Gleichzeitig gesteigerte Aktivität oder subjektiv vermehrte Energie (das in ICD-11 verpflichtende zweite Kernmerkmal neben der Stimmungsänderung)',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'activity' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('drive_psychomotor_activity', INCREASED_DRIVE),
          },
        ],
      },
      {
        id: '6a60.symptoms',
        label_de: 'Charakteristische Begleitsymptome (mehrere; mindestens 3)',
        logic: 'at_least_n_of',
        threshold: 3,
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a60.grandiosity',
            text_de: 'Überhöhtes Selbstwertgefühl oder Größenideen bis hin zur Selbstüberschätzung',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'grandiosity' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('thought_content', /gr[öo][ßs]en|[üu]berlegen|selbst[üu]bersch[äa]tzung|allmacht/i),
          },
          {
            id: '6a60.decreased_sleep_need',
            text_de: 'Vermindertes Schlafbedürfnis bei dennoch erhaltener oder gesteigerter Tagesaktivität',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'sleep' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('sleep_appetite_vegetative', /schlafbed[üu]rfnis.*(vermindert|reduziert|gering)|wenig\s+schlaf|kaum\s+schlaf|geringer.*schlafbedarf/i),
          },
          {
            id: '6a60.pressured_speech',
            text_de: 'Gesteigerter Rededrang oder vermehrte, schwer unterbrechbare Gesprächigkeit (Logorrhö)',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'speech' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'speech_language', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('speech_language', PRESSURE_OF_SPEECH),
          },
          {
            id: '6a60.flight_of_ideas',
            text_de: 'Subjektiv beschleunigtes Denken, Gedankenrasen oder Ideenflucht',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'flight-of-ideas' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'formal_thought_disorder', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('formal_thought_disorder', /ideenflucht|gedankenrasen|beschleunigt.*denk|assoziativ.*gelock/i),
          },
          {
            id: '6a60.distractibility',
            text_de: 'Erhöhte Ablenkbarkeit oder ständiger Wechsel von Aktivitäten und Plänen',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'distractibility' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('attention_concentration', /ablenkbar|distrakt|sprunghaft|aufmerksamkeit.*wechsel/i),
          },
          {
            id: '6a60.increased_goal_directed_activity',
            text_de: 'Gesteigerte zielgerichtete Aktivität, Betriebsamkeit oder gesteigerte Geselligkeit bzw. Libido',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'goal-directed' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('personality_interpersonal_style', /geselli|kontaktfreud|betriebsam|libido|sexual.*gesteigert|zielgerichtet.*aktivit/i),
          },
          {
            id: '6a60.risky_behaviour',
            text_de: 'Leichtsinniges oder enthemmtes Verhalten mit Verkennung möglicher Folgen (z. B. unbedachte Geldausgaben, riskante Unternehmungen)',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'risk' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'appearance_behavior', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('appearance_behavior', /enthemmt|distanzlos|leichtsinn|risiko|r[üu]cksichtslos|kaufrausch|expansiv/i),
          },
        ],
      },
      {
        id: '6a60.duration',
        label_de: 'Zeitkriterium (mindestens 1 Woche, bei stationärer Behandlungsbedürftigkeit auch kürzer)',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 7 },
        criteria: [
          {
            id: '6a60.duration_one_week',
            text_de:
              'Die Symptomatik besteht an den meisten Tagen nahezu durchgehend über mindestens eine Woche (oder kürzer, wenn eine stationäre Behandlung erforderlich ist)',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'duration' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
            operationalRule: durationSignal(7),
          },
        ],
      },
      {
        id: '6a60.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a60.exclude_substance_organic',
            text_de:
              'Die Episode ist nicht auf eine psychotrope Substanz, ein Medikament oder eine andere körperliche bzw. organische Ursache zurückzuführen',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'exclude-substance' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

const f31BipolarAffectiveDisorder: Disorder = {
  id: 'bipolar_affective_disorder',
  classification: 'icd10',
  code: 'F31',
  name_de: 'Bipolare affektive Störung',
  crosswalkKey: 'F31.9',
  sourceRef: 'operationalisiert nach ICD-10 F31 / ICD-11 6A60',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F31.9', label_de: 'Bipolare affektive Störung, nicht näher bezeichnet' },
    icd11: { code: '6A60', label_de: 'Bipolare Störung Typ I' },
    dsm5tr: { code: '296.7', label_de: 'Bipolar I Disorder, current episode unspecified (Crosswalk)' },
  },
  differentials_de: [
    'Rezidivierende depressive Störung (F33) — bei ausschließlich depressiven Episoden ohne (hypo-)manische Phasen',
    'Schizoaffektive Störung (F25)',
    'Zyklothymia (F34.0) — bei unterschwelliger, chronischer Schwankung',
    'Emotional instabile Persönlichkeitsstörung (Borderline-Typ)',
    'Substanzinduzierte oder organische affektive Störung',
  ],
  groups: [
    {
      id: 'f31.recurrence',
      label_de: 'Längsschnitt: wiederholte affektive Episoden',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f31.two_episodes',
          text_de: 'Im Verlauf bestanden mindestens zwei deutlich abgrenzbare affektive Episoden, getrennt durch Phasen weitgehender Remission',
          citation: [{ classification: 'icd10', code: 'F31' }],
          mappingHints: [{ kind: 'course', ref: 'episodicity' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            if (ctx.coursePattern.episodicity === 'recurrent') return met(ctx.coursePattern.summary)
            if (ctx.coursePattern.episodicity === 'single_episode') return notMet(ctx.coursePattern.summary)
            return UNKNOWN
          },
        },
        {
          id: 'f31.lifetime_elevated_episode',
          text_de: 'Mindestens eine der Episoden war hypomanisch, manisch oder gemischt (eine ausschließlich depressive Verlaufsform schließt die bipolare Störung aus)',
          citation: [{ classification: 'icd10', code: 'F31' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f31.current_hypomanic',
      label_de: 'Spezifizierer: gegenwärtige hypomanische Episode (F31.0)',
      logic: 'all_of',
      groupType: 'severity',
      criteria: [
        {
          id: 'f31.current_hypomanic_state',
          text_de: 'Aktuell leicht gehobene Stimmung mit gesteigertem Antrieb über mehrere Tage, ohne erhebliche Funktionsbeeinträchtigung und ohne psychotische Symptome',
          citation: [{ classification: 'icd10', code: 'F31.0', ref: 'F31.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', ELEVATED_MOOD, /euthym|gedr[üu]ckt/i),
        },
      ],
    },
    {
      id: 'f31.current_manic',
      label_de: 'Spezifizierer: gegenwärtige manische Episode (F31.1 ohne / F31.2 mit psychotischen Symptomen)',
      logic: 'all_of',
      groupType: 'severity',
      criteria: [
        {
          id: 'f31.current_manic_state',
          text_de: 'Aktuell voll ausgeprägte Manie mit gehobener oder gereizter Stimmung, gesteigertem Antrieb und erheblicher Funktionsbeeinträchtigung',
          citation: [{ classification: 'icd10', code: 'F31.1', ref: 'F31.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const elevated = ctx.present('mood_affect', ELEVATED_MOOD) ?? ctx.present('mood_affect', IRRITABLE_MOOD)
            if (!elevated) return UNKNOWN
            const drive = ctx.present('drive_psychomotor_activity', INCREASED_DRIVE)
            return drive ? met(`${elevated.label}; ${drive.label}`) : met(elevated.label)
          },
        },
        {
          id: 'f31.current_manic_psychotic',
          text_de: 'Spezifizierer F31.2: Begleitend stimmungs(in)kongruente Wahnideen oder Halluzinationen während der manischen Episode',
          citation: [{ classification: 'icd10', code: 'F31.2', ref: 'F31.2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const delu = ctx.present('delusions_overvalued_ideas', /gr[öo][ßs]en|wahn/i)
            if (delu) return met(delu.label)
            const hallu = ctx.present('perception_hallucinations', /halluzin|stimmen/i)
            return hallu ? met(hallu.label) : UNKNOWN
          },
        },
      ],
    },
    {
      id: 'f31.current_mixed',
      label_de: 'Spezifizierer: gegenwärtige gemischte Episode (F31.6)',
      logic: 'all_of',
      groupType: 'severity',
      criteria: [
        {
          id: 'f31.current_mixed_state',
          text_de: 'Aktuell gleichzeitiges oder rasch wechselndes Vorliegen ausgeprägter manischer und depressiver Symptome über mindestens zwei Wochen',
          citation: [{ classification: 'icd10', code: 'F31.6', ref: 'F31.6' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const elevated = ctx.present('mood_affect', ELEVATED_MOOD)
            const depressed = ctx.present('mood_affect', DEPRESSED_MOOD)
            if (elevated && depressed) return met(`${elevated.label}; ${depressed.label}`)
            return UNKNOWN
          },
        },
      ],
    },
    {
      id: 'f31.current_depressed',
      label_de: 'Spezifizierer: gegenwärtige depressive Episode (F31.3 leicht/mittel · F31.4 schwer · F31.5 mit psychotischen Symptomen)',
      logic: 'all_of',
      groupType: 'severity',
      criteria: [
        {
          id: 'f31.current_depressed_state',
          text_de: 'Aktuell depressive Episode mit gedrückter Stimmung, Interessenverlust und Antriebsminderung',
          citation: [{ classification: 'icd10', code: 'F31.3', ref: 'F31.3' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', DEPRESSED_MOOD, /euthym|gehoben/i),
        },
        {
          id: 'f31.current_depressed_psychotic',
          text_de: 'Spezifizierer F31.5: Begleitende synthyme oder parathyme Wahnideen bzw. Halluzinationen während der depressiven Episode',
          citation: [{ classification: 'icd10', code: 'F31.5', ref: 'F31.5' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const delu = ctx.present('delusions_overvalued_ideas', /schuld|verarmung|versündig|nihilist|wahn/i)
            if (delu) return met(delu.label)
            const hallu = ctx.present('perception_hallucinations', /halluzin|stimmen/i)
            return hallu ? met(hallu.label) : UNKNOWN
          },
        },
      ],
    },
    {
      id: 'f31.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f31.exclude_organic_substance',
          text_de: 'Die affektiven Episoden sind nicht auf eine psychotrope Substanz oder eine organische psychische Störung zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F31' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f31.exclude_schizoaffective',
          text_de: 'Die Symptomatik ist nicht besser durch eine schizoaffektive Störung oder eine Schizophrenie erklärbar',
          citation: [{ classification: 'icd10', code: 'F31' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A60/6A61 — DISTINCT structure. ICD-10 F31 has a SINGLE bipolar
  // category. ICD-11 SPLITS it:
  //   • Bipolar Typ I  (6A60): mindestens EINE manische ODER gemischte Episode
  //     im Verlauf (eine depressive Episode ist NICHT erforderlich).
  //   • Bipolar Typ II (6A61): mindestens eine HYPOMANE UND mindestens eine
  //     DEPRESSIVE Episode, jedoch NIE eine voll ausgeprägte manische oder
  //     gemischte Episode.
  // Die Kerngruppe verlangt mindestens eine (hypo-)manische/gemischte Episode;
  // zwei Schweregrad-/Subtyp-Gruppen modellieren die I/II-Unterscheidung, die der
  // ICD-10 F31-Baum nicht abbildet.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A60 (Typ I) / 6A61 (Typ II)',
    groups: [
      {
        id: '6a60_61.core',
        label_de: 'Kern: mindestens eine (hypo-)manische oder gemischte Episode im Verlauf (erforderlich)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a60_61.manic_or_mixed_episode',
            text_de: 'Im Verlauf trat mindestens eine manische oder gemischte Episode auf',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'manic-mixed' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('mood_affect', ELEVATED_MOOD, /euthym|gedr[üu]ckt/i),
          },
          {
            id: '6a60_61.hypomanic_episode',
            text_de: 'Im Verlauf trat mindestens eine hypomane Episode auf (leichter ausgeprägt, ohne erhebliche Funktionsbeeinträchtigung und ohne psychotische Symptome)',
            citation: [{ classification: 'icd11', code: '6A61', ref: 'hypomanic' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('mood_affect', ELEVATED_MOOD, /euthym|gedr[üu]ckt/i),
          },
        ],
      },
      {
        id: '6a60.type_i',
        label_de: 'Subtyp: Bipolar Typ I (6A60) — mindestens eine manische oder gemischte Episode',
        logic: 'all_of',
        groupType: 'severity',
        criteria: [
          {
            id: '6a60.type_i_manic_episode',
            text_de:
              'Eine voll ausgeprägte manische oder gemischte Episode genügt für Typ I; eine depressive Episode ist hierfür nicht erforderlich',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'type-i' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: (ctx) => {
              const elevated = ctx.present('mood_affect', ELEVATED_MOOD) ?? ctx.present('mood_affect', IRRITABLE_MOOD)
              if (!elevated) return UNKNOWN
              const drive = ctx.present('drive_psychomotor_activity', INCREASED_DRIVE)
              return drive ? met(`${elevated.label}; ${drive.label}`) : met(elevated.label)
            },
          },
        ],
      },
      {
        id: '6a61.type_ii',
        label_de: 'Subtyp: Bipolar Typ II (6A61) — mindestens eine hypomane UND eine depressive Episode, nie eine manische',
        logic: 'all_of',
        groupType: 'severity',
        criteria: [
          {
            id: '6a61.type_ii_hypomanic_episode',
            text_de: 'Mindestens eine hypomane Episode im Verlauf, jedoch zu keinem Zeitpunkt eine voll ausgeprägte manische oder gemischte Episode',
            citation: [{ classification: 'icd11', code: '6A61', ref: 'type-ii-hypomanic' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('mood_affect', ELEVATED_MOOD, /euthym|gedr[üu]ckt/i),
          },
          {
            id: '6a61.type_ii_depressive_episode',
            text_de: 'Mindestens eine depressive Episode im Verlauf (für Typ II zusätzlich erforderlich)',
            citation: [{ classification: 'icd11', code: '6A61', ref: 'type-ii-depressive' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('mood_affect', DEPRESSED_MOOD, /euthym|gehoben/i),
          },
        ],
      },
      {
        id: '6a60_61.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a60_61.exclude_substance_organic',
            text_de:
              'Die affektiven Episoden sind nicht auf eine psychotrope Substanz, ein Medikament oder eine andere körperliche bzw. organische Ursache zurückzuführen',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'exclude-substance' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
          {
            id: '6a60_61.exclude_schizoaffective',
            text_de: 'Die Symptomatik ist nicht besser durch eine schizoaffektive Störung oder eine Schizophrenie erklärbar',
            citation: [{ classification: 'icd11', code: '6A60', ref: 'exclude-schizoaffective' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

/**
 * ICD-11 6A71 — depressive-episode symptom clusters for the CURRENT episode of a
 * recurrent depressive disorder. Same three-cluster structure as 6A70 (affective
 * / cognitive-behavioural / neurovegetative, ≥ 5 symptoms incl. ≥ 1 affective),
 * but the disorder additionally requires ≥ 2 episodes separated by symptom-free
 * intervals and no lifetime mania/hypomania. Original German paraphrases only.
 */
const recurrent6a71Affective: Criterion[] = [
  {
    id: '6a71.depressed_mood',
    text_de: 'Gedrückte Stimmung über die meiste Zeit des Tages und nahezu täglich (affektives Cluster der aktuellen Episode)',
    citation: [{ classification: 'icd11', code: '6A71', ref: 'affective-mood' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('mood_affect', /gedr[üu]ckt|depress|niedergeschlagen|traurig|dysphor/i, /euthym|gehoben/i),
  },
  {
    id: '6a71.anhedonia',
    text_de: 'Deutlich vermindertes Interesse oder Freude an Aktivitäten (affektives Cluster der aktuellen Episode)',
    citation: [{ classification: 'icd11', code: '6A71', ref: 'affective-anhedonia' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('mood_affect', /anhedon|interessenverlust|freudlos|interesselos/i),
  },
]

const recurrent6a71CognitiveBehavioural: Criterion[] = [
  {
    id: '6a71.concentration',
    text_de: 'Verminderte Konzentrations- und Aufmerksamkeitsfähigkeit oder ausgeprägte Unschlüssigkeit (kognitiv-behaviorales Cluster)',
    citation: [{ classification: 'icd11', code: '6A71', ref: 'cognitive-concentration' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('attention_concentration', /vermindert|gest[öo]rt|konzentrationsst[öo]rung|unschl[üu]ssig|entscheidung/i, /unauff[äa]llig/i),
  },
  {
    id: '6a71.worthlessness',
    text_de: 'Gefühle von Wertlosigkeit oder unangemessene, übermäßige Schuldgefühle (kognitiv-behaviorales Cluster)',
    citation: [{ classification: 'icd11', code: '6A71', ref: 'cognitive-worthlessness' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('thought_content', /schuld|wertlos|insuffizien|selbstvorw/i),
  },
  {
    id: '6a71.hopelessness',
    text_de: 'Hoffnungslosigkeit bezogen auf die Zukunft (kognitiv-behaviorales Cluster)',
    citation: [{ classification: 'icd11', code: '6A71', ref: 'cognitive-hopelessness' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('thought_content', /hoffnungslos|perspektivlos|aussichtslos/i),
  },
  {
    id: '6a71.suicidality',
    text_de: 'Wiederkehrende Gedanken an den Tod oder an Suizid bzw. suizidales oder selbstschädigendes Verhalten (kognitiv-behaviorales Cluster)',
    citation: [{ classification: 'icd11', code: '6A71', ref: 'cognitive-suicidality' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'risk_self', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('risk_self', /suizid|selbstt[öo]tung|selbstsch[äa]dig|lebensm[üu]de|todeswunsch/i, /verneint|keine\s+suizid/i),
  },
]

const recurrent6a71Neurovegetative: Criterion[] = [
  {
    id: '6a71.sleep',
    text_de: 'Schlafstörung (Ein- oder Durchschlafstörung, Früherwachen oder vermehrtes Schlafbedürfnis), nahezu täglich (neurovegetatives Cluster)',
    citation: [{ classification: 'icd11', code: '6A71', ref: 'neuroveg-sleep' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('sleep_appetite_vegetative', /schlaf.*(reduziert|gest[öo]rt|verschlecht)|insomn|durchschlaf|einschlaf|fr[üu]herwachen/i),
  },
  {
    id: '6a71.appetite',
    text_de: 'Deutliche Veränderung von Appetit oder Gewicht (Minderung oder Steigerung), neurovegetatives Cluster',
    citation: [{ classification: 'icd11', code: '6A71', ref: 'neuroveg-appetite' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('sleep_appetite_vegetative', /appetit|gewicht/i),
  },
  {
    id: '6a71.fatigue',
    text_de: 'Verminderte Energie, ausgeprägte Ermüdbarkeit oder Erschöpfung bereits nach geringer Anstrengung (neurovegetatives Cluster)',
    citation: [{ classification: 'icd11', code: '6A71', ref: 'neuroveg-fatigue' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('drive_psychomotor_activity', DECREASED_DRIVE),
  },
  {
    id: '6a71.psychomotor',
    text_de: 'Psychomotorische Unruhe (Agitiertheit) oder Verlangsamung (Hemmung), subjektiv berichtet oder beobachtbar (neurovegetatives Cluster)',
    citation: [{ classification: 'icd11', code: '6A71', ref: 'neuroveg-psychomotor' }],
    mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
    allowClinicianAttest: true,
    operationalRule: domainSignal('drive_psychomotor_activity', /verlangsamt|gehemmt|agitiert|unruhig|erstarrt/i),
  },
]

const f33RecurrentDepressiveDisorder: Disorder = {
  id: 'recurrent_depressive_disorder',
  classification: 'icd10',
  code: 'F33',
  name_de: 'Rezidivierende depressive Störung',
  crosswalkKey: 'F33.9',
  sourceRef: 'operationalisiert nach ICD-10 F33 / ICD-11 6A71',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F33.9', label_de: 'Rezidivierende depressive Störung, nicht näher bezeichnet' },
    icd11: { code: '6A71', label_de: 'Rezidivierende depressive Störung' },
    dsm5tr: { code: '296.3x', label_de: 'Major Depressive Disorder, recurrent (Crosswalk)' },
  },
  differentials_de: [
    'Depressive Episode (F32) — bei erstmaliger, einzelner Episode',
    'Bipolare affektive Störung (F31) — bei (hypo-)manischen Episoden in der Anamnese',
    'Dysthymia (F34.1) — bei chronisch-unterschwelliger Symptomatik',
    'Anpassungsstörung mit depressiver Reaktion',
    'Organische oder substanzbedingte affektive Störung',
  ],
  groups: [
    {
      id: 'f33.current_episode',
      label_de: 'Gegenwärtige depressive Episode (Kernsymptome, mindestens 2 von 3)',
      logic: 'at_least_n_of',
      threshold: 2,
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 14 },
      criteria: [
        {
          id: 'f33.depressed_mood',
          text_de: 'Gedrückte Stimmung über die meiste Zeit des Tages, weitgehend unabhängig von äußeren Umständen',
          citation: [{ classification: 'icd10', code: 'F33', ref: 'B1' }, { classification: 'icd11', code: '6A71' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /gedr[üu]ckt|depress|niedergeschlagen|traurig|dysphor/i, /euthym|gehoben/i),
        },
        {
          id: 'f33.anhedonia',
          text_de: 'Deutlicher Verlust von Interesse oder Freude an üblicherweise angenehmen Tätigkeiten',
          citation: [{ classification: 'icd10', code: 'F33', ref: 'B2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /anhedon|interessenverlust|freudlos|interesselos/i),
        },
        {
          id: 'f33.reduced_energy',
          text_de: 'Verminderter Antrieb bzw. verminderte Energie oder erhöhte Ermüdbarkeit',
          citation: [{ classification: 'icd10', code: 'F33', ref: 'B3' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', DECREASED_DRIVE),
        },
      ],
    },
    {
      id: 'f33.additional',
      label_de: 'Zusatzsymptome der aktuellen Episode (mindestens 2)',
      logic: 'at_least_n_of',
      threshold: 2,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f33.concentration',
          text_de: 'Verminderte Konzentration und Aufmerksamkeit',
          citation: [{ classification: 'icd10', code: 'F33', ref: 'C4' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('attention_concentration', /vermindert|gest[öo]rt|konzentrationsst[öo]rung/i, /unauff[äa]llig/i),
        },
        {
          id: 'f33.guilt_worthlessness',
          text_de: 'Vermindertes Selbstwertgefühl oder unangemessene Schuld- und Wertlosigkeitsgefühle',
          citation: [{ classification: 'icd10', code: 'F33', ref: 'C1/C2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('thought_content', /schuld|wertlos|insuffizien|selbstvorw/i),
        },
        {
          id: 'f33.suicidality',
          text_de: 'Wiederkehrende Gedanken an den Tod oder Suizid bzw. suizidales Verhalten',
          citation: [{ classification: 'icd10', code: 'F33', ref: 'C3' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'risk_self', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('risk_self', /suizid|selbstt[öo]tung|selbstsch[äa]dig|lebensm[üu]de|todeswunsch/i, /verneint|keine\s+suizid/i),
        },
        {
          id: 'f33.sleep',
          text_de: 'Schlafstörung jeglicher Art',
          citation: [{ classification: 'icd10', code: 'F33', ref: 'C6' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /schlaf.*(reduziert|gest[öo]rt|verschlecht)|insomn|durchschlaf|einschlaf/i),
        },
        {
          id: 'f33.appetite',
          text_de: 'Appetitveränderung mit entsprechender Gewichtsveränderung',
          citation: [{ classification: 'icd10', code: 'F33', ref: 'C7' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /appetit|gewicht/i),
        },
      ],
    },
    {
      id: 'f33.recurrence',
      label_de: 'Längsschnitt: rezidivierender Verlauf',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f33.prior_episode',
          text_de: 'In der Anamnese mindestens eine weitere depressive Episode, getrennt durch ein symptomfreies Intervall von mehreren Monaten',
          citation: [{ classification: 'icd10', code: 'F33', ref: 'A' }],
          mappingHints: [{ kind: 'course', ref: 'episodicity' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            if (ctx.coursePattern.episodicity === 'recurrent') return met(ctx.coursePattern.summary)
            if (ctx.coursePattern.episodicity === 'single_episode') return notMet(ctx.coursePattern.summary)
            return UNKNOWN
          },
        },
      ],
    },
    {
      id: 'f33.severity_psychotic',
      label_de: 'Spezifizierer: gegenwärtige schwere Episode mit psychotischen Symptomen (F33.3)',
      logic: 'any_of',
      groupType: 'severity',
      criteria: [
        {
          id: 'f33.psychotic_delusions',
          text_de: 'Synthyme Wahnideen (z. B. Schuld-, Verarmungs- oder Versündigungswahn, nihilistischer Wahn) während der aktuellen Episode',
          citation: [{ classification: 'icd10', code: 'F33.3', ref: 'F33.3' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'delusions_overvalued_ideas', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('delusions_overvalued_ideas', /schuld|verarmung|versündig|nihilist|wahn/i),
        },
        {
          id: 'f33.psychotic_hallucinations',
          text_de: 'Halluzinationen (häufig anklagende oder beschimpfende Stimmen) während der aktuellen Episode',
          citation: [{ classification: 'icd10', code: 'F33.3', ref: 'F33.3' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'perception_hallucinations', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('perception_hallucinations', /halluzin|stimmen/i),
        },
      ],
    },
    {
      id: 'f33.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f33.exclude_mania',
          text_de: 'Zu keinem Zeitpunkt der Anamnese hypomanische oder manische Episoden in einem Ausmaß, das die Kriterien einer (hypo-)manischen Episode erfüllt (spräche für eine bipolare Störung)',
          citation: [{ classification: 'icd10', code: 'F33', ref: 'B' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const manic = ctx.present('mood_affect', ELEVATED_MOOD)
            return manic ? met(manic.label) : UNKNOWN
          },
        },
        {
          id: 'f33.exclude_organic_substance',
          text_de: 'Die Episoden sind nicht auf eine psychotrope Substanz oder eine organische psychische Störung zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F33' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A71 (rezidivierende depressive Störung) — DISTINCT structure. The
  // CURRENT episode follows the same 6A70 three-cluster rule (≥ 5 symptoms across
  // affective/cognitive-behavioural/neurovegetative clusters incl. ≥ 1 affective,
  // ≥ 2 weeks) — unlike the ICD-10 F33 "≥ 2 core + ≥ 2 additional" rule — plus a
  // longitudinal requirement of ≥ 2 episodes separated by symptom-free intervals
  // of several months and the lifetime mania/hypomania exclusion that anchors the
  // distinction from a bipolar disorder.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A71',
    groups: [
      {
        id: '6a71.affective_core',
        label_de: 'Affektives Kernsymptom der aktuellen Episode (mindestens eines erforderlich)',
        logic: 'any_of',
        groupType: 'inclusion',
        criteria: recurrent6a71Affective,
      },
      {
        id: '6a71.total_symptoms',
        label_de:
          'Gesamtsymptomatik der aktuellen Episode aus allen drei Clustern (mindestens 5, nahezu täglich, einschließlich mindestens eines affektiven Symptoms)',
        logic: 'at_least_n_of',
        threshold: 5,
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 14 },
        criteria: [
          ...recurrent6a71Affective,
          ...recurrent6a71CognitiveBehavioural,
          ...recurrent6a71Neurovegetative,
        ],
      },
      {
        id: '6a71.recurrence',
        label_de: 'Längsschnitt: rezidivierender Verlauf',
        logic: 'all_of',
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a71.recurrent_episodes',
            text_de:
              'Im Verlauf bestanden mindestens zwei depressive Episoden, getrennt durch ein weitgehend symptomfreies Intervall von mehreren Monaten ohne wesentliche Stimmungsstörung',
            citation: [{ classification: 'icd11', code: '6A71', ref: 'recurrence' }],
            mappingHints: [{ kind: 'course', ref: 'episodicity' }],
            allowClinicianAttest: true,
            operationalRule: (ctx) => {
              if (ctx.coursePattern.episodicity === 'recurrent') return met(ctx.coursePattern.summary)
              if (ctx.coursePattern.episodicity === 'single_episode') return notMet(ctx.coursePattern.summary)
              return UNKNOWN
            },
          },
        ],
      },
      {
        id: '6a71.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a71.exclude_mania',
            text_de:
              'Zu keinem Zeitpunkt der Lebensgeschichte traten manische, gemischte oder hypomane Episoden auf (deren Vorliegen spräche für eine bipolare Störung)',
            citation: [{ classification: 'icd11', code: '6A71', ref: 'exclude-mania' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
            allowClinicianAttest: true,
            operationalRule: (ctx) => {
              const manic = ctx.present('mood_affect', ELEVATED_MOOD)
              return manic ? met(manic.label) : UNKNOWN
            },
          },
          {
            id: '6a71.exclude_substance_organic',
            text_de:
              'Die Episoden sind nicht auf eine psychotrope Substanz, ein Medikament oder eine andere körperliche bzw. organische Ursache zurückzuführen',
            citation: [{ classification: 'icd11', code: '6A71', ref: 'exclude-substance' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

const f34Cyclothymia: Disorder = {
  id: 'cyclothymia',
  classification: 'icd10',
  code: 'F34.0',
  name_de: 'Zyklothymia',
  crosswalkKey: 'F34.0',
  sourceRef: 'operationalisiert nach ICD-10 F34.0 / ICD-11 6A62',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F34.0', label_de: 'Zyklothymia' },
    icd11: { code: '6A62', label_de: 'Zyklothyme Störung' },
    dsm5tr: { code: '301.13', label_de: 'Cyclothymic Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Bipolare affektive Störung (F31) — bei voll ausgeprägten affektiven Episoden',
    'Dysthymia (F34.1) — bei rein depressiver chronischer Verstimmung',
    'Emotional instabile Persönlichkeitsstörung',
    'Substanzbedingte Stimmungsschwankungen',
  ],
  groups: [
    {
      id: 'f34_0.core',
      label_de: 'Kern: chronische Stimmungsinstabilität',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 730 },
      criteria: [
        {
          id: 'f34_0.mood_instability',
          text_de: 'Anhaltende Instabilität der Stimmung mit zahlreichen Phasen leicht gehobener und leicht gedrückter Stimmung, die jeweils nicht die Schwere einer (hypo-)manischen oder depressiven Episode erreichen',
          citation: [{ classification: 'icd10', code: 'F34.0', ref: 'A' }, { classification: 'icd11', code: '6A62' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const elevated = ctx.present('mood_affect', ELEVATED_MOOD)
            const depressed = ctx.present('mood_affect', DEPRESSED_MOOD)
            if (elevated && depressed) return met(`${elevated.label}; ${depressed.label}`)
            const swings = ctx.present('mood_affect', /schwank|labil|wechselnd|instabil/i)
            return swings ? met(swings.label) : UNKNOWN
          },
        },
        {
          id: 'f34_0.duration_two_years',
          text_de: 'Die Stimmungsschwankungen bestehen über einen Zeitraum von mindestens zwei Jahren (bei Beginn im Erwachsenenalter)',
          citation: [{ classification: 'icd10', code: 'F34.0', ref: 'A' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
          operationalRule: durationSignal(730),
        },
      ],
    },
    {
      id: 'f34_0.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f34_0.exclude_full_episodes',
          text_de: 'Die Stimmungsauslenkungen erfüllen zu keinem Zeitpunkt die vollständigen Kriterien einer manischen, hypomanischen oder depressiven Episode (sonst bipolare bzw. rezidivierende depressive Störung)',
          citation: [{ classification: 'icd10', code: 'F34.0', ref: 'B' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f34_0.exclude_organic_substance',
          text_de: 'Die Stimmungsinstabilität ist nicht auf eine psychotrope Substanz oder eine organische psychische Störung zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F34.0' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A62 (zyklothyme Störung) — DISTINCT citation tree (structurally close
  // to ICD-10 F34.0 but anchored to the ICD-11 code with its own ids). Persistent
  // mood instability over ≥ 2 years with NUMEROUS distinct hypomanic AND
  // depressive periods, each sub-threshold for a full episode, present for more
  // of the time than not and without a symptom-free interval longer than a few
  // months.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A62',
    groups: [
      {
        id: '6a62.core',
        label_de: 'Kern: anhaltende Stimmungsinstabilität mit zahlreichen hypomanen und depressiven Phasen',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 730 },
        criteria: [
          {
            id: '6a62.mood_instability',
            text_de:
              'Anhaltende Instabilität der Stimmung mit zahlreichen voneinander unterscheidbaren Phasen hypomaner und depressiver Symptomatik, die jeweils unterschwellig bleiben (keine voll ausgeprägte Episode)',
            citation: [{ classification: 'icd11', code: '6A62', ref: 'instability' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: (ctx) => {
              const elevated = ctx.present('mood_affect', ELEVATED_MOOD)
              const depressed = ctx.present('mood_affect', DEPRESSED_MOOD)
              if (elevated && depressed) return met(`${elevated.label}; ${depressed.label}`)
              const swings = ctx.present('mood_affect', /schwank|labil|wechselnd|instabil/i)
              return swings ? met(swings.label) : UNKNOWN
            },
          },
          {
            id: '6a62.duration_two_years',
            text_de: 'Die Stimmungsinstabilität besteht über einen Zeitraum von mindestens zwei Jahren und mehr als die Hälfte der Zeit',
            citation: [{ classification: 'icd11', code: '6A62', ref: 'duration' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
            operationalRule: durationSignal(730),
          },
        ],
      },
      {
        id: '6a62.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a62.exclude_full_episodes',
            text_de:
              'Die Stimmungsauslenkungen erfüllten zu keinem Zeitpunkt die vollständigen Kriterien einer manischen, gemischten, hypomanen oder depressiven Episode (sonst bipolare bzw. depressive Störung)',
            citation: [{ classification: 'icd11', code: '6A62', ref: 'exclude-episodes' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
            allowClinicianAttest: true,
          },
          {
            id: '6a62.exclude_substance_organic',
            text_de: 'Die Stimmungsinstabilität ist nicht auf eine psychotrope Substanz, ein Medikament oder eine andere körperliche bzw. organische Ursache zurückzuführen',
            citation: [{ classification: 'icd11', code: '6A62', ref: 'exclude-substance' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

const f34Dysthymia: Disorder = {
  id: 'dysthymia',
  classification: 'icd10',
  code: 'F34.1',
  name_de: 'Dysthymia',
  crosswalkKey: 'F34.1',
  sourceRef: 'operationalisiert nach ICD-10 F34.1 / ICD-11 6A72',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F34.1', label_de: 'Dysthymia' },
    icd11: { code: '6A72', label_de: 'Dysthyme Störung' },
    dsm5tr: { code: '300.4', label_de: 'Persistent Depressive Disorder (Dysthymia) (Crosswalk)' },
  },
  differentials_de: [
    'Rezidivierende depressive Störung (F33) — bei voll ausgeprägten Episoden',
    'Depressive Episode (F32)',
    'Zyklothymia (F34.0) — bei bipolarer Schwankung',
    'Anpassungsstörung',
    'Organische oder substanzbedingte affektive Störung',
  ],
  groups: [
    {
      id: 'f34_1.core',
      label_de: 'Kern: chronisch gedrückte Stimmung',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 730 },
      criteria: [
        {
          id: 'f34_1.chronic_low_mood',
          text_de: 'Über mindestens zwei Jahre anhaltende oder ständig wiederkehrende gedrückte Stimmung, wobei symptomfreie Intervalle nur wenige Wochen dauern und keine hypomanen Phasen auftreten',
          citation: [{ classification: 'icd10', code: 'F34.1', ref: 'A' }, { classification: 'icd11', code: '6A72' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /gedr[üu]ckt|depress|niedergeschlagen|freudlos|missmut/i, /euthym|gehoben/i),
        },
        {
          id: 'f34_1.duration_two_years',
          text_de: 'Die depressive Verstimmung besteht über einen Zeitraum von mindestens zwei Jahren',
          citation: [{ classification: 'icd10', code: 'F34.1', ref: 'A' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
          operationalRule: durationSignal(730),
        },
      ],
    },
    {
      id: 'f34_1.additional',
      label_de: 'Begleitsymptome der Verstimmung (mindestens 2)',
      logic: 'at_least_n_of',
      threshold: 2,
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f34_1.reduced_energy',
          text_de: 'Verminderter Antrieb oder verminderte Aktivität',
          citation: [{ classification: 'icd10', code: 'F34.1', ref: 'B1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('drive_psychomotor_activity', DECREASED_DRIVE),
        },
        {
          id: 'f34_1.sleep',
          text_de: 'Schlafstörungen',
          citation: [{ classification: 'icd10', code: 'F34.1', ref: 'B2' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('sleep_appetite_vegetative', /schlaf.*(reduziert|gest[öo]rt|verschlecht)|insomn|durchschlaf|einschlaf/i),
        },
        {
          id: 'f34_1.low_self_esteem',
          text_de: 'Vermindertes Selbstvertrauen oder Gefühle der Unzulänglichkeit',
          citation: [{ classification: 'icd10', code: 'F34.1', ref: 'B3' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('thought_content', /selbstvertrauen|unzul[äa]nglich|insuffizien|wertlos|minderwert/i),
        },
        {
          id: 'f34_1.concentration',
          text_de: 'Konzentrationsschwierigkeiten',
          citation: [{ classification: 'icd10', code: 'F34.1', ref: 'B4' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('attention_concentration', /vermindert|gest[öo]rt|konzentrationsst[öo]rung/i, /unauff[äa]llig/i),
        },
        {
          id: 'f34_1.hopelessness',
          text_de: 'Häufiges Grübeln, Pessimismus oder Gefühl der Hoffnungslosigkeit',
          citation: [{ classification: 'icd10', code: 'F34.1', ref: 'B7' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('thought_content', /hoffnungslos|perspektivlos|pessimis|gr[üu]bel/i),
        },
        {
          id: 'f34_1.social_withdrawal',
          text_de: 'Sozialer Rückzug oder verminderte Gesprächigkeit',
          citation: [{ classification: 'icd10', code: 'F34.1', ref: 'B8' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'personality_interpersonal_style', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('personality_interpersonal_style', /r[üu]ckzug|isoliert|kontaktarm|zur[üu]ckgezogen/i),
        },
      ],
    },
    {
      id: 'f34_1.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f34_1.exclude_recurrent_depression',
          text_de: 'Die Schwere und Dauer der einzelnen Phasen erfüllt nicht die Kriterien einer (auch leichten) rezidivierenden depressiven Störung',
          citation: [{ classification: 'icd10', code: 'F34.1', ref: 'C' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
        },
        {
          id: 'f34_1.exclude_mania',
          text_de: 'Keine hypomanischen Phasen in der Anamnese (spräche für eine Zyklothymia oder bipolare Störung)',
          citation: [{ classification: 'icd10', code: 'F34.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const manic = ctx.present('mood_affect', ELEVATED_MOOD)
            return manic ? met(manic.label) : UNKNOWN
          },
        },
        {
          id: 'f34_1.exclude_organic_substance',
          text_de: 'Die Verstimmung ist nicht auf eine psychotrope Substanz oder eine organische psychische Störung zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F34.1' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A72 (dysthyme Störung) — DISTINCT citation tree. Persistent depressed
  // mood most of the day, more days than not, over ≥ 2 years, accompanied by
  // additional depressive symptoms, WITHOUT a symptom-free period longer than ~2
  // months, and NOT meeting the full requirements of a depressive episode for the
  // majority of the time. Anchored to the ICD-11 code with its own ids.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A72',
    groups: [
      {
        id: '6a72.core',
        label_de: 'Kern: chronisch gedrückte Stimmung über mindestens zwei Jahre',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 730 },
        criteria: [
          {
            id: '6a72.chronic_low_mood',
            text_de:
              'Anhaltend gedrückte Stimmung über die meiste Zeit des Tages und an mehr Tagen als nicht, ohne symptomfreies Intervall von mehr als etwa zwei Monaten',
            citation: [{ classification: 'icd11', code: '6A72', ref: 'mood' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('mood_affect', /gedr[üu]ckt|depress|niedergeschlagen|freudlos|missmut/i, /euthym|gehoben/i),
          },
          {
            id: '6a72.duration_two_years',
            text_de: 'Die depressive Verstimmung besteht über einen Zeitraum von mindestens zwei Jahren',
            citation: [{ classification: 'icd11', code: '6A72', ref: 'duration' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
            operationalRule: durationSignal(730),
          },
        ],
      },
      {
        id: '6a72.additional',
        label_de: 'Begleitsymptome der Verstimmung (mindestens 2)',
        logic: 'at_least_n_of',
        threshold: 2,
        groupType: 'inclusion',
        criteria: [
          {
            id: '6a72.reduced_energy',
            text_de: 'Verminderter Antrieb oder verminderte Aktivität',
            citation: [{ classification: 'icd11', code: '6A72', ref: 'energy' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'drive_psychomotor_activity', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('drive_psychomotor_activity', DECREASED_DRIVE),
          },
          {
            id: '6a72.sleep',
            text_de: 'Schlafstörungen',
            citation: [{ classification: 'icd11', code: '6A72', ref: 'sleep' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('sleep_appetite_vegetative', /schlaf.*(reduziert|gest[öo]rt|verschlecht)|insomn|durchschlaf|einschlaf/i),
          },
          {
            id: '6a72.appetite',
            text_de: 'Veränderter Appetit (Minderung oder Steigerung)',
            citation: [{ classification: 'icd11', code: '6A72', ref: 'appetite' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'sleep_appetite_vegetative', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('sleep_appetite_vegetative', /appetit|gewicht/i),
          },
          {
            id: '6a72.low_self_esteem',
            text_de: 'Vermindertes Selbstvertrauen oder Gefühle der Unzulänglichkeit',
            citation: [{ classification: 'icd11', code: '6A72', ref: 'self-esteem' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('thought_content', /selbstvertrauen|unzul[äa]nglich|insuffizien|wertlos|minderwert/i),
          },
          {
            id: '6a72.concentration',
            text_de: 'Konzentrationsschwierigkeiten oder Unschlüssigkeit',
            citation: [{ classification: 'icd11', code: '6A72', ref: 'concentration' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'attention_concentration', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('attention_concentration', /vermindert|gest[öo]rt|konzentrationsst[öo]rung|unschl[üu]ssig/i, /unauff[äa]llig/i),
          },
          {
            id: '6a72.hopelessness',
            text_de: 'Häufiges Grübeln, Pessimismus oder Gefühl der Hoffnungslosigkeit',
            citation: [{ classification: 'icd11', code: '6A72', ref: 'hopelessness' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'thought_content', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: domainSignal('thought_content', /hoffnungslos|perspektivlos|pessimis|gr[üu]bel/i),
          },
        ],
      },
      {
        id: '6a72.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a72.exclude_depressive_episode',
            text_de:
              'Die Symptomatik erfüllt die vollständigen Kriterien einer depressiven Episode über die meiste Zeit der ersten zwei Jahre nicht (sonst rezidivierende depressive Störung)',
            citation: [{ classification: 'icd11', code: '6A72', ref: 'exclude-episode' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
            allowClinicianAttest: true,
          },
          {
            id: '6a72.exclude_mania',
            text_de: 'Keine hypomanen, manischen oder gemischten Episoden in der Anamnese (spräche für eine zyklothyme oder bipolare Störung)',
            citation: [{ classification: 'icd11', code: '6A72', ref: 'exclude-mania' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect' }],
            allowClinicianAttest: true,
            operationalRule: (ctx) => {
              const manic = ctx.present('mood_affect', ELEVATED_MOOD)
              return manic ? met(manic.label) : UNKNOWN
            },
          },
          {
            id: '6a72.exclude_substance_organic',
            text_de: 'Die Verstimmung ist nicht auf eine psychotrope Substanz, ein Medikament oder eine andere körperliche bzw. organische Ursache zurückzuführen',
            citation: [{ classification: 'icd11', code: '6A72', ref: 'exclude-substance' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

const f38MixedAffectiveEpisode: Disorder = {
  id: 'mixed_affective_episode',
  classification: 'icd10',
  code: 'F38.00',
  name_de: 'Gemischte affektive Episode',
  crosswalkKey: 'F38.0',
  sourceRef: 'operationalisiert nach ICD-10 F38.00 (gemischte affektive Episode) / ICD-11 6A60.x (gemischte Episode)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F38.00', label_de: 'Gemischte affektive Episode' },
    icd11: { code: '6A60.3', label_de: 'Bipolare Störung Typ I, aktuelle gemischte Episode' },
    dsm5tr: { code: '296.x', label_de: 'Mood episode with mixed features (Crosswalk)' },
  },
  differentials_de: [
    'Bipolare affektive Störung, gegenwärtig gemischte Episode (F31.6) — bei bekanntem bipolarem Längsschnitt',
    'Manische Episode mit gereizt-dysphorischer Stimmung (F30)',
    'Agitierte depressive Episode (F32)',
    'Substanzinduzierte oder organische affektive Störung',
  ],
  groups: [
    {
      id: 'f38_0.core',
      label_de: 'Kern: gemischte affektive Symptomatik',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 14 },
      criteria: [
        {
          id: 'f38_0.mixed_symptoms',
          text_de: 'Gleichzeitiges oder innerhalb weniger Stunden rasch wechselndes Vorliegen ausgeprägter manischer und depressiver Symptome über mindestens zwei Wochen',
          citation: [{ classification: 'icd10', code: 'F38.00', ref: 'A' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: (ctx) => {
            const elevated = ctx.present('mood_affect', ELEVATED_MOOD) ?? ctx.present('mood_affect', IRRITABLE_MOOD)
            const depressed = ctx.present('mood_affect', DEPRESSED_MOOD)
            if (elevated && depressed) return met(`${elevated.label}; ${depressed.label}`)
            return UNKNOWN
          },
        },
        {
          id: 'f38_0.duration_two_weeks',
          text_de: 'Die gemischte Symptomatik besteht über einen Zeitraum von mindestens zwei Wochen',
          citation: [{ classification: 'icd10', code: 'F38.00', ref: 'A' }],
          mappingHints: [{ kind: 'course', ref: 'duration' }],
          allowClinicianAttest: true,
          operationalRule: durationSignal(14),
        },
      ],
    },
    {
      id: 'f38_0.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f38_0.exclude_organic_substance',
          text_de: 'Die Episode ist nicht auf eine psychotrope Substanz oder eine organische psychische Störung zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F38.00' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
  // ICD-11 6A60.3 (gemischte Episode) — DISTINCT structure. ICD-10 F38.00 is a
  // STAND-ALONE mixed affective episode. ICD-11 does NOT have a free-standing
  // category: a mixed episode is coded only WITHIN a bipolar disorder (here as the
  // Typ-I mixed presentation, 6A60.3). It requires several prominent symptoms of
  // BOTH poles — manic AND depressive — present simultaneously or in rapid
  // alternation, on most days over ≥ 2 weeks.
  icd11: {
    sourceRef: 'operationalisiert nach ICD-11 6A60.3 (gemischte Episode innerhalb der bipolaren Störung Typ I)',
    groups: [
      {
        id: '6a60_3.core',
        label_de: 'Kern: prominente manische UND depressive Symptome in derselben Episode',
        logic: 'all_of',
        groupType: 'inclusion',
        timeWindow: { minDurationDays: 14 },
        criteria: [
          {
            id: '6a60_3.mixed_symptoms',
            text_de:
              'Mehrere ausgeprägte manische und mehrere ausgeprägte depressive Symptome liegen gleichzeitig oder in raschem Wechsel an den meisten Tagen vor',
            citation: [{ classification: 'icd11', code: '6A60.3', ref: 'mixed' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
            allowClinicianAttest: true,
            operationalRule: (ctx) => {
              const elevated = ctx.present('mood_affect', ELEVATED_MOOD) ?? ctx.present('mood_affect', IRRITABLE_MOOD)
              const depressed = ctx.present('mood_affect', DEPRESSED_MOOD)
              if (elevated && depressed) return met(`${elevated.label}; ${depressed.label}`)
              return UNKNOWN
            },
          },
          {
            id: '6a60_3.duration_two_weeks',
            text_de: 'Die gemischte Symptomatik besteht an den meisten Tagen über einen Zeitraum von mindestens zwei Wochen',
            citation: [{ classification: 'icd11', code: '6A60.3', ref: 'duration' }],
            mappingHints: [{ kind: 'course', ref: 'duration' }],
            allowClinicianAttest: true,
            operationalRule: durationSignal(14),
          },
        ],
      },
      {
        id: '6a60_3.exclusions',
        label_de: 'Ausschlüsse',
        logic: 'none_of',
        groupType: 'exclusion',
        criteria: [
          {
            id: '6a60_3.exclude_substance_organic',
            text_de:
              'Die Episode ist nicht auf eine psychotrope Substanz, ein Medikament oder eine andere körperliche bzw. organische Ursache zurückzuführen',
            citation: [{ classification: 'icd11', code: '6A60.3', ref: 'exclude-substance' }],
            mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
            allowClinicianAttest: true,
          },
        ],
      },
    ],
  },
}

// ICD-11 6A7Y (sonstige näher bezeichnete Stimmungsstörungen) — DELIBERATE
// icd10==icd11 mapping (no distinct `icd11` set). Both F34.8 and 6A7Y are named
// residual categories for a describable persistent affective presentation that
// does not meet any specific category; the operationalization (persistent
// affective symptoms present + not otherwise classifiable + organic/substance
// exclusion) is identical, so ICD-11 mode reuses the F34.8 tree.
const f34OtherPersistentMoodDisorder: Disorder = {
  id: 'other_persistent_mood_disorder',
  classification: 'icd10',
  code: 'F34.8',
  name_de: 'Sonstige anhaltende affektive Störung',
  crosswalkKey: 'F34.8',
  sourceRef: 'operationalisiert nach ICD-10 F34.8 / ICD-11 6A7Y (sonstige näher bezeichnete Stimmungsstörungen)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F34.8', label_de: 'Sonstige anhaltende affektive Störung' },
    icd11: { code: '6A7Y', label_de: 'Sonstige näher bezeichnete Stimmungsstörungen' },
    dsm5tr: { code: '311', label_de: 'Other Specified Depressive Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Zyklothymia (F34.0)',
    'Dysthymia (F34.1)',
    'Rezidivierende depressive Störung (F33)',
    'Organische oder substanzbedingte affektive Störung',
  ],
  groups: [
    {
      id: 'f34_8.core',
      label_de: 'Anhaltende affektive Symptomatik außerhalb der definierten Kategorien',
      logic: 'all_of',
      groupType: 'inclusion',
      timeWindow: { minDurationDays: 730 },
      criteria: [
        {
          id: 'f34_8.persistent_affective',
          text_de: 'Chronisch anhaltende affektive Symptomatik, die nicht hinreichend schwer oder lang ist, um die Kriterien einer Zyklothymia oder Dysthymia zu erfüllen, aber klinisch bedeutsam bleibt',
          citation: [{ classification: 'icd10', code: 'F34.8' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /gedr[üu]ckt|depress|labil|schwank|missmut|dysphor/i, /euthym/i),
        },
        {
          id: 'f34_8.not_otherwise_classifiable',
          text_de: 'Das Beschwerdebild lässt sich keiner spezifischeren anhaltenden affektiven Störung (Zyklothymia, Dysthymia) eindeutig zuordnen (benannte Restkategorie)',
          citation: [{ classification: 'icd10', code: 'F34.8' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f34_8.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f34_8.exclude_organic_substance',
          text_de: 'Die Symptomatik ist nicht auf eine psychotrope Substanz oder eine organische psychische Störung zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F34.8' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

// ICD-11 6A7Y (sonstige näher bezeichnete Stimmungsstörungen) — DELIBERATE
// icd10==icd11 mapping (no distinct `icd11` set). Both F38 and 6A7Y are named
// residual "other specified" categories for a nameable affective presentation
// (e.g. recurrent brief depressive episodes) that does not meet any of the
// defined categories; the operationalization coincides, so ICD-11 mode reuses
// the F38 tree.
const f38OtherMoodDisorder: Disorder = {
  id: 'other_mood_disorder',
  classification: 'icd10',
  code: 'F38',
  name_de: 'Sonstige affektive Störung',
  crosswalkKey: 'F38.8',
  sourceRef: 'operationalisiert nach ICD-10 F38 / ICD-11 6A7Y (sonstige näher bezeichnete Stimmungsstörungen)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F38.8', label_de: 'Sonstige näher bezeichnete affektive Störung' },
    icd11: { code: '6A7Y', label_de: 'Sonstige näher bezeichnete Stimmungsstörungen' },
    dsm5tr: { code: '296.99', label_de: 'Other Specified Bipolar/Depressive Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Manische Episode (F30) bzw. depressive Episode (F32) bei vollständiger Kriterienerfüllung',
    'Bipolare affektive Störung (F31) oder rezidivierende depressive Störung (F33)',
    'Gemischte affektive Episode (F38.00)',
    'Organische oder substanzbedingte affektive Störung',
  ],
  groups: [
    {
      id: 'f38_8.core',
      label_de: 'Näher bezeichnete affektive Störung außerhalb der übrigen Kategorien',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f38_8.affective_symptoms',
          text_de: 'Klinisch bedeutsame affektive Symptomatik (z. B. rezidivierende kurze depressive Episoden), die benennbar ist, aber die Kriterien der übrigen affektiven Kategorien nicht erfüllt',
          citation: [{ classification: 'icd10', code: 'F38' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /gedr[üu]ckt|depress|gehoben|man(i|ie)|labil|schwank/i, /euthym/i),
        },
        {
          id: 'f38_8.not_classifiable_elsewhere',
          text_de: 'Die Symptomatik erfüllt nicht die vollständigen Kriterien einer manischen, depressiven, bipolaren, rezidivierenden depressiven oder anhaltenden affektiven Störung (benannte Restkategorie)',
          citation: [{ classification: 'icd10', code: 'F38' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f38_8.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f38_8.exclude_organic_substance',
          text_de: 'Die Symptomatik ist nicht auf eine psychotrope Substanz oder eine organische psychische Störung zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F38' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

// ICD-11 6A7Z (Stimmungsstörungen, nicht näher bezeichnet) — DELIBERATE
// icd10==icd11 mapping (no distinct `icd11` set). F39 and 6A7Z are both the
// "unspecified" holding category used when affective symptoms are clearly
// present but information is insufficient or contradictory for a specific
// diagnosis; the operationalization is identical, so ICD-11 mode reuses the F39
// tree.
const f39UnspecifiedMoodDisorder: Disorder = {
  id: 'unspecified_mood_disorder',
  classification: 'icd10',
  code: 'F39',
  name_de: 'Nicht näher bezeichnete affektive Störung',
  crosswalkKey: 'F39',
  sourceRef: 'operationalisiert nach ICD-10 F39 / ICD-11 6A7Z (Stimmungsstörungen, nicht näher bezeichnet)',
  version: 1,
  status: 'draft',
  codingSystems: {
    icd10: { code: 'F39', label_de: 'Nicht näher bezeichnete affektive Störung' },
    icd11: { code: '6A7Z', label_de: 'Stimmungsstörungen, nicht näher bezeichnet' },
    dsm5tr: { code: '296.90', label_de: 'Unspecified Mood Disorder (Crosswalk)' },
  },
  differentials_de: [
    'Sonstige affektive Störung (F38) bei näher bezeichnetem Bild',
    'Manische (F30) oder depressive Episode (F32) bei vollständiger Kriterienerfüllung',
    'Bipolare affektive Störung (F31) oder rezidivierende depressive Störung (F33)',
    'Organische oder substanzbedingte affektive Störung',
  ],
  groups: [
    {
      id: 'f39.core',
      label_de: 'Affektive Symptomatik ohne ausreichende Information für eine spezifischere Zuordnung',
      logic: 'all_of',
      groupType: 'inclusion',
      criteria: [
        {
          id: 'f39.affective_symptoms',
          text_de: 'Eine klinisch bedeutsame affektive Symptomatik liegt vor, kann aber mangels ausreichender Information keiner spezifischen affektiven Kategorie zugeordnet werden',
          citation: [{ classification: 'icd10', code: 'F39' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'mood_affect', deepLinkPageId: 'psychopathologie' }],
          allowClinicianAttest: true,
          operationalRule: domainSignal('mood_affect', /gedr[üu]ckt|depress|gehoben|man(i|ie)|labil|schwank|dysphor/i, /euthym/i),
        },
        {
          id: 'f39.insufficient_information',
          text_de: 'Die vorliegenden Angaben reichen für eine spezifischere affektive Diagnose nicht aus oder sind widersprüchlich (vorläufige bzw. Verlegenheitskategorie)',
          citation: [{ classification: 'icd10', code: 'F39' }],
          mappingHints: [],
          allowClinicianAttest: true,
        },
      ],
    },
    {
      id: 'f39.exclusions',
      label_de: 'Ausschlüsse',
      logic: 'none_of',
      groupType: 'exclusion',
      criteria: [
        {
          id: 'f39.exclude_organic_substance',
          text_de: 'Die affektive Symptomatik ist nicht auf eine psychotrope Substanz oder eine organische psychische Störung zurückzuführen',
          citation: [{ classification: 'icd10', code: 'F39' }],
          mappingHints: [{ kind: 'isdm_domain', ref: 'substance_related_features' }],
          allowClinicianAttest: true,
        },
      ],
    },
  ],
}

export const moodDisorders: Disorder[] = [
  f30ManicEpisode,
  f31BipolarAffectiveDisorder,
  f33RecurrentDepressiveDisorder,
  f34Cyclothymia,
  f34Dysthymia,
  f38MixedAffectiveEpisode,
  f34OtherPersistentMoodDisorder,
  f38OtherMoodDisorder,
  f39UnspecifiedMoodDisorder,
]
