/**
 * Crosswalk-gap coverage — residual ICD-10 F codes that did not resolve via
 * existing block modules. Organized by chapter (F0–F9). Uses factories from
 * `factories/gapFactories.ts` to minimize duplication.
 *
 * LICENSING: every `text_de` is an ORIGINAL German operational paraphrase.
 * All records ship as `status: 'draft'`.
 */

import type { Disorder } from '../schema'
import {
  dementiaInOtherDisease,
  organicSecondarySyndrome,
  specificCodeDisorder,
  stemAnchorDisorder,
} from '../factories/gapFactories'
import { icd11HarmfulPatternSet, nonPsychoactiveSubstance } from './substanceUse'
import { crosswalkGapDisordersF6F8F9 } from './gapCoverageF6F8F9'

// ---------------------------------------------------------------------------
// F0 — organic / neurocognitive gaps
// ---------------------------------------------------------------------------

const f0GapDisorders: Disorder[] = [
  stemAnchorDisorder({
    id: 'dementia_other_diseases_stem',
    code: 'F02',
    name_de: 'Demenz bei anderenorts klassifizierten Krankheiten',
    crosswalkKey: 'F02',
    sourceRef: 'operationalisiert nach ICD-10 F02 / ICD-11 6D8Z',
    codingSystems: {
      icd10: { code: 'F02', label_de: 'Demenz bei anderenorts klassifizierten Krankheiten' },
      icd11: { code: '6D8Z', label_de: 'Demenz, unbekannte oder nicht näher bezeichnete Ursache' },
      dsm5tr: { code: '294.1x', label_de: 'Major Neurocognitive Disorder due to Another Medical Condition (Crosswalk)' },
    },
    differentials_de: [
      'Demenz bei Alzheimer-Krankheit (F00)',
      'Vaskuläre Demenz (F01)',
      'Primär psychiatrische Störung mit kognitiven Symptomen',
      'Delir (akuter Beginn, fluktuierende Bewusstseinslage)',
    ],
    coreSymptomText_de:
      'Fortschreitendes Demenzsyndrom mit kognitivem Abbau und Alltagsbeeinträchtigung, das einer anderenorts klassifizierten Grunderkrankung zugeordnet wird',
    domain: 'memory_cognition',
    presentMatch: /ged[äa]chtnis|kognitiv|demenz|orientierung|verwirr/i,
    exclusionText_de: 'Das Demenzsyndrom ist nicht besser durch eine primäre psychiatrische Störung oder Substanzwirkung allein erklärbar',
  }),

  dementiaInOtherDisease({
    id: 'dementia_cjd',
    code: 'F02.1',
    name_de: 'Demenz bei Creutzfeldt-Jakob-Krankheit',
    diseaseText_de: 'Nachweis oder begründete Annahme einer Creutzfeldt-Jakob-Krankheit (Prionerkrankung) als ursächlicher Grunderkrankung',
    sourceRef: 'operationalisiert nach ICD-10 F02.1 / ICD-11 6D85.5',
    codingSystems: {
      icd10: { code: 'F02.1', label_de: 'Demenz bei Creutzfeldt-Jakob-Krankheit' },
      icd11: { code: '6D85.5', label_de: 'Demenz bei Prionerkrankung' },
      dsm5tr: { code: '294.1x', label_de: 'Major Neurocognitive Disorder due to Prion Disease (Crosswalk)' },
    },
    differentials_de: ['Schnell progrediente Demenz anderer Ätiologie', 'Delir', 'Depressive Pseudodemenz'],
  }),

  dementiaInOtherDisease({
    id: 'dementia_huntington',
    code: 'F02.2',
    name_de: 'Demenz bei Huntington-Krankheit',
    diseaseText_de: 'Nachweis oder begründete Annahme einer Huntington-Krankheit als ursächlicher Grunderkrankung',
    sourceRef: 'operationalisiert nach ICD-10 F02.2 / ICD-11 6D85.1',
    codingSystems: {
      icd10: { code: 'F02.2', label_de: 'Demenz bei Huntington-Krankheit' },
      icd11: { code: '6D85.1', label_de: 'Demenz bei Huntington-Krankheit' },
      dsm5tr: { code: '294.1x', label_de: 'Major Neurocognitive Disorder due to Huntington’s Disease (Crosswalk)' },
    },
    differentials_de: ['Andere neurodegenerative Demenz', 'Medikamenteninduzierte Chorea', 'Tardive Dyskinesie'],
  }),

  dementiaInOtherDisease({
    id: 'dementia_parkinson',
    code: 'F02.3',
    name_de: 'Demenz bei Morbus Parkinson',
    diseaseText_de: 'Nachweis oder begründete Annahme einer Parkinson-Krankheit als ursächlicher Grunderkrankung',
    sourceRef: 'operationalisiert nach ICD-10 F02.3 / ICD-11 6D85.0',
    codingSystems: {
      icd10: { code: 'F02.3', label_de: 'Demenz bei Morbus Parkinson' },
      icd11: { code: '6D85.0', label_de: 'Demenz bei Parkinson-Krankheit' },
      dsm5tr: { code: '294.1x', label_de: 'Major Neurocognitive Disorder due to Parkinson’s Disease (Crosswalk)' },
    },
    differentials_de: ['Demenz mit Lewy-Körperchen', 'Vaskuläre Demenz', 'Depressive Pseudodemenz'],
  }),

  dementiaInOtherDisease({
    id: 'dementia_hiv',
    code: 'F02.4',
    name_de: 'Demenz bei HIV-Krankheit',
    diseaseText_de: 'Nachweis oder begründete Annahme einer HIV-Infektion als ursächlicher Grunderkrankung',
    sourceRef: 'operationalisiert nach ICD-10 F02.4 / ICD-11 6D85.3',
    codingSystems: {
      icd10: { code: 'F02.4', label_de: 'Demenz bei HIV-Krankheit' },
      icd11: { code: '6D85.3', label_de: 'Demenz bei HIV' },
      dsm5tr: { code: '294.1x', label_de: 'Major Neurocognitive Disorder due to HIV Infection (Crosswalk)' },
    },
    differentials_de: ['HIV-assoziierte Neurokognitionsstörung ohne Demenz', 'Opportunistische ZNS-Infektion', 'Substanzbedingte kognitive Störung'],
  }),

  stemAnchorDisorder({
    id: 'unspecified_dementia',
    code: 'F03',
    name_de: 'Nicht näher bezeichnete Demenz',
    crosswalkKey: 'F03',
    sourceRef: 'operationalisiert nach ICD-10 F03 / ICD-11 6D8Z',
    codingSystems: {
      icd10: { code: 'F03', label_de: 'Nicht näher bezeichnete Demenz' },
      icd11: { code: '6D8Z', label_de: 'Demenz, unbekannte oder nicht näher bezeichnete Ursache' },
      dsm5tr: { code: '294.9', label_de: 'Unspecified Neurocognitive Disorder (Crosswalk)' },
    },
    differentials_de: [
      'Demenz bei Alzheimer-Krankheit (F00)',
      'Vaskuläre Demenz (F01)',
      'Demenz bei anderenorts klassifizierten Krankheiten (F02)',
      'Delir',
    ],
    coreSymptomText_de:
      'Fortschreitendes Demenzsyndrom mit kognitivem Abbau und Alltagsbeeinträchtigung, dessen spezifische Ätiologie nicht näher bezeichnet ist',
    domain: 'memory_cognition',
    presentMatch: /ged[äa]chtnis|kognitiv|demenz|orientierung|verwirr/i,
    holdingCategory: true,
    exclusionText_de: 'Das Demenzsyndrom ist nicht besser durch ein Delir, eine primäre psychiatrische Störung oder Substanzwirkung allein erklärbar',
  }),

  stemAnchorDisorder({
    id: 'organic_mental_disorders_stem',
    code: 'F06',
    name_de: 'Sonstige psychische Störungen infolge von Hirnschädigung, Hirndysfunktion oder körperlicher Krankheit',
    crosswalkKey: 'F06',
    sourceRef: 'operationalisiert nach ICD-10 F06 / ICD-11 6E6Z',
    codingSystems: {
      icd10: { code: 'F06', label_de: 'Sonstige psychische Störungen infolge von Hirnschädigung, Hirndysfunktion oder körperlicher Krankheit' },
      icd11: { code: '6E6Z', label_de: 'Sekundäres psychisches oder Verhaltenssyndrom, nicht näher bezeichnet' },
      dsm5tr: { code: '294.9', label_de: 'Mental Disorder Due to Another Medical Condition (Crosswalk)' },
    },
    differentials_de: [
      'Primäre psychische Störung ohne organische Ursache',
      'Substanz-/medikamenteninduzierte psychische Störung',
      'Delir (F05)',
    ],
    coreSymptomText_de:
      'Psychische Symptomatik (außerhalb der bereits separat erfassten organischen Syndrome), die einer nachgewiesenen oder wahrscheinlichen Hirnschädigung, Hirndysfunktion oder körperlichen Erkrankung zugeordnet wird',
    holdingCategory: true,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine primäre psychische Störung oder durch Substanzwirkung allein erklärbar',
  }),

  organicSecondarySyndrome({
    id: 'organic_catatonic_disorder',
    code: 'F06.1',
    name_de: 'Organische katatone Störung',
    syndromeText_de:
      'Katatonie (z. B. Stupor, Mutismus, Negativismus, Wachsflexibilität, Stereotypien, Manierismen) im Zusammenhang mit einer organischen Ursache',
    sourceRef: 'operationalisiert nach ICD-10 F06.1 / ICD-11 6A4Z',
    codingSystems: {
      icd10: { code: 'F06.1', label_de: 'Organische katatone Störung' },
      icd11: { code: '6A4Z', label_de: 'Katatonie, nicht näher bezeichnet' },
      dsm5tr: { code: '293.89', label_de: 'Catatonia Associated with Another Mental Disorder (Crosswalk)' },
    },
    differentials_de: ['Katatonie bei Schizophrenie', 'Neuroleptisches malignes Syndrom', 'Delir'],
    domain: 'appearance_behavior',
    presentMatch: /kataton|stupor|mutismus|negativismus|wachsflexibilit|manier|stereotyp/i,
  }),

  organicSecondarySyndrome({
    id: 'organic_anxiety_disorder',
    code: 'F06.4',
    name_de: 'Organische Angststörung',
    syndromeText_de: 'Ausgeprägte Angstsymptomatik, die einer organischen Ursache zugeordnet wird',
    sourceRef: 'operationalisiert nach ICD-10 F06.4 / ICD-11 6E63',
    codingSystems: {
      icd10: { code: 'F06.4', label_de: 'Organische Angststörung' },
      icd11: { code: '6E63', label_de: 'Sekundäres Zwangs-Syndrom' },
      dsm5tr: { code: '293.84', label_de: 'Anxiety Disorder Due to Another Medical Condition (Crosswalk)' },
    },
    differentials_de: ['Generalisierte Angststörung (F41.1)', 'Panikstörung (F41.0)', 'Substanzinduzierte Angst'],
    domain: 'anxiety_panic_phobic_symptoms',
    presentMatch: /[äa]ngst|panik|besorgnis|unruhe/i,
    absentMatch: /keine\s+angst|verneint/i,
  }),

  organicSecondarySyndrome({
    id: 'organic_dissociative_disorder',
    code: 'F06.5',
    name_de: 'Organische dissoziative Störung',
    syndromeText_de:
      'Dissoziative Symptomatik (z. B. Depersonalisation, Derealisation, Amnesie, Identitätsstörung), die einer organischen Ursache zugeordnet wird',
    sourceRef: 'operationalisiert nach ICD-10 F06.5 / ICD-11 6E65',
    codingSystems: {
      icd10: { code: 'F06.5', label_de: 'Organische dissoziative Störung' },
      icd11: { code: '6E65', label_de: 'Sekundäres Impulskontroll-Syndrom' },
      dsm5tr: { code: '293.84', label_de: 'Dissociative Disorder Due to Another Medical Condition (Crosswalk)' },
    },
    differentials_de: ['Dissoziative Störungen (F44)', 'PTBS', 'Substanzinduzierte Dissoziation'],
    domain: 'self_experience_ego_disturbance',
    presentMatch: /depersonal|dereal|dissozi|amnesie|fremd.*erleben/i,
  }),

  specificCodeDisorder({
    id: 'organic_mental_disorder_other',
    code: 'F06.8',
    name_de: 'Sonstige näher bezeichnete organische psychische Störungen',
    crosswalkKey: 'F06.8',
    sourceRef: 'operationalisiert nach ICD-10 F06.8 / ICD-11 6E6Z',
    codingSystems: {
      icd10: { code: 'F06.8', label_de: 'Sonstige näher bezeichnete organische psychische Störungen' },
      icd11: { code: '6E6Z', label_de: 'Sekundäres psychisches oder Verhaltenssyndrom, nicht näher bezeichnet' },
      dsm5tr: { code: '294.8', label_de: 'Other Specified Mental Disorder Due to Another Medical Condition (Crosswalk)' },
    },
    differentials_de: ['Spezifische organische Syndrome (F06.0–F06.7)', 'Primäre psychische Störung'],
    coreSymptomText_de:
      'Näher bezeichnete psychische Symptomatik, die einer Hirnschädigung, Hirndysfunktion oder körperlichen Erkrankung zugeordnet wird und keiner der spezifischeren F06-Unterkategorien entspricht',
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine primäre psychische Störung oder Substanzwirkung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'organic_mental_disorder_unspecified',
    code: 'F06.9',
    name_de: 'Nicht näher bezeichnete organische psychische Störung',
    crosswalkKey: 'F06.9',
    sourceRef: 'operationalisiert nach ICD-10 F06.9 / ICD-11 6E6Z',
    codingSystems: {
      icd10: { code: 'F06.9', label_de: 'Nicht näher bezeichnete organische psychische Störung' },
      icd11: { code: '6E6Z', label_de: 'Sekundäres psychisches oder Verhaltenssyndrom, nicht näher bezeichnet' },
      dsm5tr: { code: '294.9', label_de: 'Unspecified Mental Disorder Due to Another Medical Condition (Crosswalk)' },
    },
    differentials_de: ['Spezifische organische Syndrome (F06.0–F06.8)', 'Primäre psychische Störung'],
    coreSymptomText_de:
      'Psychische Symptomatik, die einer organischen Ursache zugeordnet wird, ohne dass eine spezifischere F06-Unterkategorie zutrifft',
    holdingCategory: true,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine primäre psychische Störung oder Substanzwirkung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'postencephalitic_syndrome',
    code: 'F07.1',
    name_de: 'Postenzephalitisches Syndrom',
    crosswalkKey: 'F07.1',
    sourceRef: 'operationalisiert nach ICD-10 F07.1 / ICD-11 6E6Z',
    codingSystems: {
      icd10: { code: 'F07.1', label_de: 'Postenzephalitisches Syndrom' },
      icd11: { code: '6E6Z', label_de: 'Sekundäres psychisches oder Verhaltenssyndrom, nicht näher bezeichnet' },
      dsm5tr: { code: '310.9', label_de: 'Other Specified Neurocognitive Disorder (Crosswalk)' },
    },
    differentials_de: ['Organische Persönlichkeitsstörung (F07.0)', 'Demenz', 'Chronisches Erschöpfungssyndrom'],
    coreSymptomText_de:
      'Anhaltende psychische oder Verhaltensveränderungen (z. B. Erschöpfung, Affektlabilität, Konzentrationsstörung, Schlafstörung) nach einer Enzephalitis oder vergleichbarer zerebraler Infektion/Entzündung',
    domain: 'mood_affect',
    presentMatch: /postenzephal|nach.*enzephalit|ersch[öo]pf|affektlabil|konzentration.*st[öo]r/i,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine primäre affektive oder Angststörung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'organic_personality_disorder_other',
    code: 'F07.8',
    name_de: 'Sonstige organische Persönlichkeits- und Verhaltensstörungen',
    crosswalkKey: 'F07.8',
    sourceRef: 'operationalisiert nach ICD-10 F07.8 / ICD-11 6E6Z',
    codingSystems: {
      icd10: { code: 'F07.8', label_de: 'Sonstige organische Persönlichkeits- und Verhaltensstörungen' },
      icd11: { code: '6E6Z', label_de: 'Sekundäres psychisches oder Verhaltenssyndrom, nicht näher bezeichnet' },
      dsm5tr: { code: '310.9', label_de: 'Personality Change Due to Another Medical Condition (Crosswalk)' },
    },
    differentials_de: ['Organische Persönlichkeitsstörung (F07.0)', 'Primäre Persönlichkeitsstörung (F60)'],
    coreSymptomText_de:
      'Näher bezeichnete, organische Ursache zugeschriebene Veränderung von Persönlichkeit und Verhalten, die keiner spezifischeren F07-Unterkategorie entspricht',
    domain: 'personality_interpersonal_style',
    presentMatch: /pers[öo]nlichkeit.*ver[äa]nder|organisch.*verhalten|hirnsch[äa]dig/i,
    exclusionText_de: 'Die Veränderung ist nicht besser durch eine primäre Persönlichkeitsstörung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'organic_personality_disorder_unspecified',
    code: 'F07.9',
    name_de: 'Nicht näher bezeichnete organische Persönlichkeits- und Verhaltensstörung',
    crosswalkKey: 'F07.9',
    sourceRef: 'operationalisiert nach ICD-10 F07.9 / ICD-11 6E6Z',
    codingSystems: {
      icd10: { code: 'F07.9', label_de: 'Nicht näher bezeichnete organische Persönlichkeits- und Verhaltensstörung' },
      icd11: { code: '6E6Z', label_de: 'Sekundäres psychisches oder Verhaltenssyndrom, nicht näher bezeichnet' },
      dsm5tr: { code: '310.9', label_de: 'Unspecified Personality Change Due to Another Medical Condition (Crosswalk)' },
    },
    differentials_de: ['Organische Persönlichkeitsstörung (F07.0)', 'Primäre Persönlichkeitsstörung (F60)'],
    coreSymptomText_de:
      'Organische Ursache zugeschriebene Veränderung von Persönlichkeit und Verhalten, ohne nähere Spezifizierung',
    domain: 'personality_interpersonal_style',
    presentMatch: /pers[öo]nlichkeit.*ver[äa]nder|organisch.*verhalten/i,
    holdingCategory: true,
    exclusionText_de: 'Die Veränderung ist nicht besser durch eine primäre Persönlichkeitsstörung allein erklärbar',
  }),

  stemAnchorDisorder({
    id: 'unspecified_organic_mental_disorder',
    code: 'F09',
    name_de: 'Nicht näher bezeichnete organische oder symptomatische psychische Störung',
    crosswalkKey: 'F09',
    sourceRef: 'operationalisiert nach ICD-10 F09 / ICD-11 6E0Z',
    codingSystems: {
      icd10: { code: 'F09', label_de: 'Nicht näher bezeichnete organische oder symptomatische psychische Störung' },
      icd11: { code: '6E0Z', label_de: 'Neurokognitive Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '294.9', label_de: 'Unspecified Neurocognitive / Mental Disorder Due to Another Medical Condition (Crosswalk)' },
    },
    differentials_de: [
      'Spezifische organische Syndrome (F00–F07)',
      'Primäre psychische Störung',
      'Substanzbedingte Störung',
    ],
    coreSymptomText_de:
      'Psychische Symptomatik mit Hinweis auf eine organische oder symptomatische Ursache, die keiner spezifischeren F0-Kategorie zugeordnet werden kann',
    holdingCategory: true,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine primäre psychische Störung oder Substanzwirkung allein erklärbar',
  }),
]

// ---------------------------------------------------------------------------
// F1 — substance stem anchors (F15, F19)
// ---------------------------------------------------------------------------

const f1GapDisorders: Disorder[] = [
  stemAnchorDisorder({
    id: 'stimulants_substance_stem',
    code: 'F15',
    name_de: 'Psychische und Verhaltensstörungen durch andere Stimulanzien einschließlich Koffein',
    crosswalkKey: 'F15',
    sourceRef: 'operationalisiert nach ICD-10 F15 / ICD-11 6C48',
    codingSystems: {
      icd10: { code: 'F15', label_de: 'Psychische und Verhaltensstörungen durch andere Stimulanzien einschließlich Koffein' },
      icd11: { code: '6C48', label_de: 'Störungen durch Koffeingebrauch, nicht näher bezeichnet' },
      dsm5tr: { code: '292.9', label_de: 'Stimulant-Related Disorders (Crosswalk)' },
    },
    differentials_de: [
      'Stimulanzien-Abhängigkeit (F15.2)',
      'Stimulanzien-Intoxikation (F15.0)',
      'Primäre psychische Störung ohne Substanzbezug',
    ],
    coreSymptomText_de:
      'Klinisch bedeutsame psychische oder Verhaltensstörung im Zusammenhang mit dem Gebrauch anderer Stimulanzien (einschließlich Koffein), wenn keine spezifischere F15-Unterkategorie angegeben ist',
    domain: 'substance_related_features',
    presentMatch: /amphetamin|stimulan|koffein|speed|ecstasy|mdma/i,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine primäre psychische Störung ohne Substanzbezug erklärbar',
  }),

  stemAnchorDisorder({
    id: 'multiple_substances_stem',
    code: 'F19',
    name_de: 'Psychische und Verhaltensstörungen durch multiplen Substanzgebrauch und andere psychotrope Substanzen',
    crosswalkKey: 'F19',
    sourceRef: 'operationalisiert nach ICD-10 F19 / ICD-11 6C4Z',
    codingSystems: {
      icd10: { code: 'F19', label_de: 'Psychische und Verhaltensstörungen durch multiplen Substanzgebrauch und andere psychotrope Substanzen' },
      icd11: { code: '6C4Z', label_de: 'Störungen durch Substanzgebrauch, nicht näher bezeichnet' },
      dsm5tr: { code: '292.9', label_de: 'Other (or Unknown) Substance-Related Disorders (Crosswalk)' },
    },
    differentials_de: [
      'Abhängigkeit von multiplen Substanzen (F19.2)',
      'Einzelsubstanz-Störungen (F10–F18)',
      'Primäre psychische Störung ohne Substanzbezug',
    ],
    coreSymptomText_de:
      'Klinisch bedeutsame psychische oder Verhaltensstörung im Zusammenhang mit multiplem Substanzgebrauch oder anderen psychotropen Substanzen, wenn keine spezifischere F19-Unterkategorie angegeben ist',
    domain: 'substance_related_features',
    presentMatch: /multiplen\s+substanz|mischkonsum|polysubstanz|polydrug|mehrere\s+substanz/i,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine primäre psychische Störung ohne Substanzbezug erklärbar',
  }),
]

// ---------------------------------------------------------------------------
// F3 — persistent affective disorders (F34 stem, F34.9)
// ---------------------------------------------------------------------------

const f3GapDisorders: Disorder[] = [
  stemAnchorDisorder({
    id: 'persistent_affective_disorders_stem',
    code: 'F34',
    name_de: 'Anhaltende affektive Störungen',
    crosswalkKey: 'F34',
    sourceRef: 'operationalisiert nach ICD-10 F34 / ICD-11 6A6Z',
    codingSystems: {
      icd10: { code: 'F34', label_de: 'Anhaltende affektive Störungen' },
      icd11: { code: '6A6Z', label_de: 'Bipolare oder verwandte Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '296.99', label_de: 'Persistent Depressive / Cyclothymic Disorder (Crosswalk)' },
    },
    differentials_de: ['Zyklothymie (F34.0)', 'Dysthymie (F34.1)', 'Rezidivierende depressive Störung (F33)', 'Bipolare Störung (F31)'],
    coreSymptomText_de:
      'Anhaltende affektive Symptomatik über einen längeren Zeitraum, die den Schweregrad einer depressiven oder manischen Episode nicht erreicht',
    domain: 'mood_affect',
    presentMatch: /dysthym|zyklothym|anhaltend.*stimmung|chronisch.*depress|chronisch.*labil/i,
    exclusionText_de: 'Die Symptomatik ist nicht auf eine psychotrope Substanz oder eine organische psychische Störung zurückzuführen',
  }),

  specificCodeDisorder({
    id: 'persistent_affective_disorder_unspecified',
    code: 'F34.9',
    name_de: 'Anhaltende affektive Störung, nicht näher bezeichnet',
    crosswalkKey: 'F34.9',
    sourceRef: 'operationalisiert nach ICD-10 F34.9 / ICD-11 6A6Z',
    codingSystems: {
      icd10: { code: 'F34.9', label_de: 'Anhaltende affektive Störung, nicht näher bezeichnet' },
      icd11: { code: '6A6Z', label_de: 'Bipolare oder verwandte Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '296.99', label_de: 'Unspecified Persistent Mood Disorder (Crosswalk)' },
    },
    differentials_de: ['Zyklothymie (F34.0)', 'Dysthymie (F34.1)', 'Sonstige anhaltende affektive Störung (F34.8)'],
    coreSymptomText_de:
      'Anhaltende affektive Symptomatik, die keiner spezifischeren F34-Unterkategorie zugeordnet werden kann',
    domain: 'mood_affect',
    presentMatch: /dysthym|zyklothym|anhaltend.*stimmung|chronisch.*depress/i,
    holdingCategory: true,
    exclusionText_de: 'Die Symptomatik ist nicht auf eine psychotrope Substanz oder eine organische psychische Störung zurückzuführen',
  }),
]

// ---------------------------------------------------------------------------
// F4 — neurotic / stress / somatoform gaps
// ---------------------------------------------------------------------------

const f4GapDisorders: Disorder[] = [
  stemAnchorDisorder({
    id: 'phobic_anxiety_disorders_stem',
    code: 'F40',
    name_de: 'Phobische Angststörungen',
    crosswalkKey: 'F40',
    sourceRef: 'operationalisiert nach ICD-10 F40 / ICD-11 6B0Z',
    codingSystems: {
      icd10: { code: 'F40', label_de: 'Phobische Angststörungen' },
      icd11: { code: '6B0Z', label_de: 'Angst- oder furchtbezogene Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '300.09', label_de: 'Phobic Disorder (Crosswalk)' },
    },
    differentials_de: ['Agoraphobie (F40.0)', 'Soziale Phobie (F40.1)', 'Spezifische Phobie (F40.2)', 'Panikstörung (F41.0)'],
    coreSymptomText_de: 'Ausgeprägte, situationsgebundene oder spezifische Angst mit Vermeidung oder Ertragen nur unter Leidensdruck',
    domain: 'anxiety_panic_phobic_symptoms',
    presentMatch: /phob|angst.*situation|vermeid.*angst/i,
    exclusionText_de: 'Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'phobic_anxiety_disorder_other',
    code: 'F40.8',
    name_de: 'Sonstige phobische Angststörungen',
    crosswalkKey: 'F40.8',
    sourceRef: 'operationalisiert nach ICD-10 F40.8 / ICD-11 6B0Z',
    codingSystems: {
      icd10: { code: 'F40.8', label_de: 'Sonstige phobische Angststörungen' },
      icd11: { code: '6B0Z', label_de: 'Angst- oder furchtbezogene Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '300.09', label_de: 'Other Specified Phobic Disorder (Crosswalk)' },
    },
    differentials_de: ['Agoraphobie (F40.0)', 'Soziale Phobie (F40.1)', 'Spezifische Phobie (F40.2)'],
    coreSymptomText_de: 'Näher bezeichnete phobische Angststörung, die keiner der spezifischeren F40-Unterkategorien entspricht',
    domain: 'anxiety_panic_phobic_symptoms',
    presentMatch: /phob|angst.*situation/i,
    exclusionText_de: 'Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'phobic_anxiety_disorder_unspecified',
    code: 'F40.9',
    name_de: 'Phobische Angststörung, nicht näher bezeichnet',
    crosswalkKey: 'F40.9',
    sourceRef: 'operationalisiert nach ICD-10 F40.9 / ICD-11 6B0Z',
    codingSystems: {
      icd10: { code: 'F40.9', label_de: 'Phobische Angststörung, nicht näher bezeichnet' },
      icd11: { code: '6B0Z', label_de: 'Angst- oder furchtbezogene Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '300.09', label_de: 'Unspecified Phobic Disorder (Crosswalk)' },
    },
    differentials_de: ['Agoraphobie (F40.0)', 'Soziale Phobie (F40.1)', 'Spezifische Phobie (F40.2)'],
    coreSymptomText_de: 'Phobische Angstsymptomatik ohne nähere Spezifizierung der Phobie',
    domain: 'anxiety_panic_phobic_symptoms',
    presentMatch: /phob|angst.*situation/i,
    holdingCategory: true,
    exclusionText_de: 'Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar',
  }),

  stemAnchorDisorder({
    id: 'other_anxiety_disorders_stem',
    code: 'F41',
    name_de: 'Sonstige Angststörungen',
    crosswalkKey: 'F41',
    sourceRef: 'operationalisiert nach ICD-10 F41 / ICD-11 6B0Z',
    codingSystems: {
      icd10: { code: 'F41', label_de: 'Sonstige Angststörungen' },
      icd11: { code: '6B0Z', label_de: 'Angst- oder furchtbezogene Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '300.09', label_de: 'Other Anxiety Disorders (Crosswalk)' },
    },
    differentials_de: ['Panikstörung (F41.0)', 'Generalisierte Angststörung (F41.1)', 'Gemischte Angst-Depression (F41.2)'],
    coreSymptomText_de: 'Klinisch bedeutsame Angstsymptomatik, die keiner spezifischeren F41-Unterkategorie zugeordnet ist',
    domain: 'anxiety_panic_phobic_symptoms',
    presentMatch: /[äa]ngst|panik|besorgnis|unruhe/i,
    exclusionText_de: 'Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'mixed_anxiety_disorder_other',
    code: 'F41.3',
    name_de: 'Sonstige gemischte Angststörungen',
    crosswalkKey: 'F41.3',
    sourceRef: 'operationalisiert nach ICD-10 F41.3 / ICD-11 6C9Z',
    codingSystems: {
      icd10: { code: 'F41.3', label_de: 'Sonstige gemischte Angststörungen' },
      icd11: { code: '6C9Z', label_de: 'Störungen mit Störung des Sozialverhaltens, nicht näher bezeichnet' },
      dsm5tr: { code: '300.09', label_de: 'Other Mixed Anxiety Disorder (Crosswalk)' },
    },
    differentials_de: ['Gemischte Angst-Depression (F41.2)', 'Generalisierte Angststörung (F41.1)'],
    coreSymptomText_de: 'Gemischte Angstsymptomatik mit überlappenden Angstmustern, die keiner spezifischeren F41-Unterkategorie entspricht',
    domain: 'anxiety_panic_phobic_symptoms',
    presentMatch: /gemischt.*angst|mehrere.*angst|verschiedene.*[äa]ngst/i,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'anxiety_disorder_other',
    code: 'F41.8',
    name_de: 'Sonstige näher bezeichnete Angststörungen',
    crosswalkKey: 'F41.8',
    sourceRef: 'operationalisiert nach ICD-10 F41.8 / ICD-11 6C9Z',
    codingSystems: {
      icd10: { code: 'F41.8', label_de: 'Sonstige näher bezeichnete Angststörungen' },
      icd11: { code: '6C9Z', label_de: 'Störungen mit Störung des Sozialverhaltens, nicht näher bezeichnet' },
      dsm5tr: { code: '300.09', label_de: 'Other Specified Anxiety Disorder (Crosswalk)' },
    },
    differentials_de: ['Panikstörung (F41.0)', 'Generalisierte Angststörung (F41.1)', 'Phobische Störungen (F40)'],
    coreSymptomText_de: 'Näher bezeichnete Angststörung, die keiner der spezifischeren F41-Unterkategorien entspricht',
    domain: 'anxiety_panic_phobic_symptoms',
    presentMatch: /[äa]ngst|panik|besorgnis/i,
    exclusionText_de: 'Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'anxiety_disorder_unspecified',
    code: 'F41.9',
    name_de: 'Angststörung, nicht näher bezeichnet',
    crosswalkKey: 'F41.9',
    sourceRef: 'operationalisiert nach ICD-10 F41.9 / ICD-11 6B0Z',
    codingSystems: {
      icd10: { code: 'F41.9', label_de: 'Angststörung, nicht näher bezeichnet' },
      icd11: { code: '6B0Z', label_de: 'Angst- oder furchtbezogene Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '300.00', label_de: 'Unspecified Anxiety Disorder (Crosswalk)' },
    },
    differentials_de: ['Panikstörung (F41.0)', 'Generalisierte Angststörung (F41.1)', 'Phobische Störungen (F40)'],
    coreSymptomText_de: 'Klinisch bedeutsame Angstsymptomatik ohne nähere Spezifizierung',
    domain: 'anxiety_panic_phobic_symptoms',
    presentMatch: /[äa]ngst|panik|besorgnis/i,
    holdingCategory: true,
    exclusionText_de: 'Die Angstsymptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar',
  }),

  stemAnchorDisorder({
    id: 'stress_reaction_disorders_stem',
    code: 'F43',
    name_de: 'Reaktion auf schweren Stress und Anpassungsstörungen',
    crosswalkKey: 'F43',
    sourceRef: 'operationalisiert nach ICD-10 F43 / ICD-11 6B4Z',
    codingSystems: {
      icd10: { code: 'F43', label_de: 'Reaktion auf schweren Stress und Anpassungsstörungen' },
      icd11: { code: '6B4Z', label_de: 'Störungen, die spezifisch mit Stress assoziiert sind, nicht näher bezeichnet' },
      dsm5tr: { code: '309.9', label_de: 'Trauma- and Stressor-Related Disorders (Crosswalk)' },
    },
    differentials_de: ['Akute Belastungsreaktion (F43.0)', 'PTBS (F43.1)', 'Anpassungsstörung (F43.2)'],
    coreSymptomText_de: 'Psychische Reaktion auf einen identifizierbaren schweren Stressor mit klinisch bedeutsamer Symptomatik',
    domain: 'mood_affect',
    presentMatch: /belastung|stress|trauma|schock|anpassung/i,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine primäre affektive oder Angststörung ohne Stressorbezug erklärbar',
  }),

  specificCodeDisorder({
    id: 'stress_reaction_other',
    code: 'F43.8',
    name_de: 'Sonstige Reaktionen auf schweren Stress',
    crosswalkKey: 'F43.8',
    sourceRef: 'operationalisiert nach ICD-10 F43.8 / ICD-11 6B4Z',
    codingSystems: {
      icd10: { code: 'F43.8', label_de: 'Sonstige Reaktionen auf schweren Stress' },
      icd11: { code: '6B4Z', label_de: 'Störungen, die spezifisch mit Stress assoziiert sind, nicht näher bezeichnet' },
      dsm5tr: { code: '309.89', label_de: 'Other Specified Trauma- and Stressor-Related Disorder (Crosswalk)' },
    },
    differentials_de: ['Akute Belastungsreaktion (F43.0)', 'PTBS (F43.1)', 'Anpassungsstörung (F43.2)'],
    coreSymptomText_de: 'Näher bezeichnete Reaktion auf schweren Stress, die keiner der spezifischeren F43-Unterkategorien entspricht',
    domain: 'mood_affect',
    presentMatch: /belastung|stress|trauma/i,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine primäre affektive oder Angststörung ohne Stressorbezug erklärbar',
  }),

  specificCodeDisorder({
    id: 'stress_reaction_unspecified',
    code: 'F43.9',
    name_de: 'Reaktion auf schweren Stress, nicht näher bezeichnet',
    crosswalkKey: 'F43.9',
    sourceRef: 'operationalisiert nach ICD-10 F43.9 / ICD-11 6B4Z',
    codingSystems: {
      icd10: { code: 'F43.9', label_de: 'Reaktion auf schweren Stress, nicht näher bezeichnet' },
      icd11: { code: '6B4Z', label_de: 'Störungen, die spezifisch mit Stress assoziiert sind, nicht näher bezeichnet' },
      dsm5tr: { code: '309.9', label_de: 'Unspecified Trauma- and Stressor-Related Disorder (Crosswalk)' },
    },
    differentials_de: ['Akute Belastungsreaktion (F43.0)', 'PTBS (F43.1)', 'Anpassungsstörung (F43.2)'],
    coreSymptomText_de: 'Reaktion auf schweren Stress ohne nähere Spezifizierung',
    domain: 'mood_affect',
    presentMatch: /belastung|stress|trauma/i,
    holdingCategory: true,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine primäre affektive oder Angststörung ohne Stressorbezug erklärbar',
  }),

  stemAnchorDisorder({
    id: 'other_neurotic_disorders_stem',
    code: 'F48',
    name_de: 'Sonstige neurotische Störungen',
    crosswalkKey: 'F48',
    sourceRef: 'operationalisiert nach ICD-10 F48 / ICD-11 6B6Z',
    codingSystems: {
      icd10: { code: 'F48', label_de: 'Sonstige neurotische Störungen' },
      icd11: { code: '6B6Z', label_de: 'Dissoziative Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '300.9', label_de: 'Other Neurotic Disorders (Crosswalk)' },
    },
    differentials_de: ['Neurasthenie (F48.0)', 'Depersonalisation/Derealisation (F48.1)', 'Dissoziative Störungen (F44)'],
    coreSymptomText_de: 'Neurotische Symptomatik, die keiner spezifischeren F4-Unterkategorie zugeordnet ist',
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'neurasthenia',
    code: 'F48.0',
    name_de: 'Neurasthenie',
    crosswalkKey: 'F48.0',
    sourceRef: 'operationalisiert nach ICD-10 F48.0 / ICD-11 6A8Z',
    codingSystems: {
      icd10: { code: 'F48.0', label_de: 'Neurasthenie' },
      icd11: { code: '6A8Z', label_de: 'Stimmungsstörungen, nicht näher bezeichnet' },
      dsm5tr: { code: '300.5', label_de: 'Neurasthenia (Crosswalk)' },
    },
    differentials_de: ['Burnout', 'Depressive Episode', 'Chronisches Erschöpfungssyndrom', 'Somatische Ursache der Müdigkeit'],
    coreSymptomText_de: 'Anhaltende Erschöpfung mit reduzierter Leistungsfähigkeit und vegetativen Beschwerden nach psychischer oder körperlicher Überanstrengung',
    domain: 'sleep_appetite_vegetative',
    presentMatch: /neurasthen|ersch[öo]pf|burnout|m[üu]digkeit.*anhaltend|leistungsabfall/i,
    exclusionText_de: 'Die Erschöpfung ist nicht besser durch eine somatische Erkrankung oder eine depressive Episode allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'depersonalization_derealization_disorder',
    code: 'F48.1',
    name_de: 'Depersonalisations-/Derealisationsstörung',
    crosswalkKey: 'F48.1',
    sourceRef: 'operationalisiert nach ICD-10 F48.1 / ICD-11 6B66',
    codingSystems: {
      icd10: { code: 'F48.1', label_de: 'Depersonalisations-/Derealisationsstörung' },
      icd11: { code: '6B66', label_de: 'Depersonalisations-/Derealisationsstörung' },
      dsm5tr: { code: '300.6', label_de: 'Depersonalization/Derealization Disorder (Crosswalk)' },
    },
    differentials_de: ['Dissoziative Störungen (F44)', 'Panikstörung', 'Substanzinduzierte Dissoziation', 'Schizophrenie'],
    coreSymptomText_de: 'Wiederkehrende oder anhaltende Depersonalisations- und/oder Derealisationserlebnisse bei erhaltenem Realitätsbewusstsein',
    domain: 'self_experience_ego_disturbance',
    presentMatch: /depersonal|dereal|fremd.*erleben|wie.*im.*traum|unwirklich/i,
    exclusionText_de: 'Die Erlebnisse sind nicht besser durch eine andere psychische Störung, Substanzwirkung oder organische Ursache erklärbar',
  }),

  specificCodeDisorder({
    id: 'neurotic_disorder_other',
    code: 'F48.8',
    name_de: 'Sonstige näher bezeichnete neurotische Störungen',
    crosswalkKey: 'F48.8',
    sourceRef: 'operationalisiert nach ICD-10 F48.8 / ICD-11 6E8Z',
    codingSystems: {
      icd10: { code: 'F48.8', label_de: 'Sonstige näher bezeichnete neurotische Störungen' },
      icd11: { code: '6E8Z', label_de: 'Psychische, Verhaltens- oder neurodevelopmentale Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '300.9', label_de: 'Other Specified Neurotic Disorder (Crosswalk)' },
    },
    differentials_de: ['Neurasthenie (F48.0)', 'Depersonalisation/Derealisation (F48.1)'],
    coreSymptomText_de: 'Näher bezeichnete neurotische Störung, die keiner der spezifischeren F48-Unterkategorien entspricht',
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'neurotic_disorder_unspecified',
    code: 'F48.9',
    name_de: 'Neurotische Störung, nicht näher bezeichnet',
    crosswalkKey: 'F48.9',
    sourceRef: 'operationalisiert nach ICD-10 F48.9 / ICD-11 6B6Z',
    codingSystems: {
      icd10: { code: 'F48.9', label_de: 'Neurotische Störung, nicht näher bezeichnet' },
      icd11: { code: '6B6Z', label_de: 'Dissoziative Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '300.9', label_de: 'Unspecified Neurotic Disorder (Crosswalk)' },
    },
    differentials_de: ['Neurasthenie (F48.0)', 'Depersonalisation/Derealisation (F48.1)'],
    coreSymptomText_de: 'Neurotische Symptomatik ohne nähere Spezifizierung',
    holdingCategory: true,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine organische Störung oder Substanzwirkung allein erklärbar',
  }),
]

// ---------------------------------------------------------------------------
// F5 — behavioural syndromes gaps
// ---------------------------------------------------------------------------

const nonDependenceSubstanceAbuse: Disorder = {
  ...specificCodeDisorder({
    id: 'non_dependence_substance_abuse',
    code: 'F55',
    name_de: 'Missbrauch nichtabhängigkeitserzeugender Substanzen',
    crosswalkKey: 'F55',
    sourceRef: 'operationalisiert nach ICD-10 F55 / ICD-11 6C4H.1Z',
    codingSystems: {
      icd10: { code: 'F55', label_de: 'Missbrauch nichtabhängigkeitserzeugender Substanzen' },
      icd11: { code: '6C4H.1Z', label_de: 'Schädliches Konsummuster nicht-psychoaktiver Substanzen, nicht näher bezeichnet' },
      dsm5tr: { code: '292.9', label_de: 'Other Substance-Related Disorder (Crosswalk)' },
    },
    differentials_de: ['Substanzabhängigkeit (F1x.2)', 'Essstörung mit Laxanzien-/Diuretikamissbrauch'],
    coreSymptomText_de:
      'Wiederholter Konsum nichtabhängigkeitserzeugender Substanzen (z. B. Laxanzien, Analgetika, Vitamine, pflanzliche Präparate) mit psychischen oder körperlichen Schäden, ohne Erfüllung der Abhängigkeitskriterien',
    domain: 'substance_related_features',
    presentMatch: /laxanz|analgetik|vitamin|pflanzlich|nichtabh[äa]ngigkeit|missbrauch.*substanz/i,
    exclusionText_de: 'Die Kriterien einer Substanzabhängigkeit sind nicht erfüllt',
  }),
  icd11: icd11HarmfulPatternSet(nonPsychoactiveSubstance),
}

const f5GapDisorders: Disorder[] = [
  stemAnchorDisorder({
    id: 'eating_disorders_stem',
    code: 'F50',
    name_de: 'Essstörungen',
    crosswalkKey: 'F50',
    sourceRef: 'operationalisiert nach ICD-10 F50 / ICD-11 6B8Z',
    codingSystems: {
      icd10: { code: 'F50', label_de: 'Essstörungen' },
      icd11: { code: '6B8Z', label_de: 'Fütterungs- oder Essstörungen, nicht näher bezeichnet' },
      dsm5tr: { code: '307.9', label_de: 'Feeding and Eating Disorders (Crosswalk)' },
    },
    differentials_de: ['Anorexia nervosa (F50.0)', 'Bulimia nervosa (F50.2)', 'Binge-Eating-Störung'],
    coreSymptomText_de: 'Klinisch bedeutsame Störung des Essverhaltens oder der Körperwahrnehmung im Zusammenhang mit dem Essen',
    domain: 'sleep_appetite_vegetative',
    presentMatch: /essst[öo]r|anorex|bulim|binge|k[öo]rperschema|gewichtsphobie|hungern/i,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine somatische Erkrankung oder eine primäre affektive Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'vomiting_psychological',
    code: 'F50.5',
    name_de: 'Erbrechen bei sonstigen psychischen Störungen',
    crosswalkKey: 'F50.5',
    sourceRef: 'operationalisiert nach ICD-10 F50.5 / ICD-11 6B8Z',
    codingSystems: {
      icd10: { code: 'F50.5', label_de: 'Erbrechen bei sonstigen psychischen Störungen' },
      icd11: { code: '6B8Z', label_de: 'Fütterungs- oder Essstörungen, nicht näher bezeichnet' },
      dsm5tr: { code: '307.53', label_de: 'Rumination Disorder (Crosswalk)' },
    },
    differentials_de: ['Bulimia nervosa', 'Gastrointestinale Ursache', 'Schwangerschaftserbrechen'],
    coreSymptomText_de: 'Wiederholtes Erbrechen ohne hinreichende somatische Erklärung, das einer psychischen Störung zugeordnet wird',
    domain: 'sleep_appetite_vegetative',
    presentMatch: /erbrechen|brech|emesis/i,
    exclusionText_de: 'Das Erbrechen ist nicht besser durch eine somatische Erkrankung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'eating_disorder_other',
    code: 'F50.8',
    name_de: 'Sonstige Essstörungen',
    crosswalkKey: 'F50.8',
    sourceRef: 'operationalisiert nach ICD-10 F50.8 / ICD-11 6B8Z',
    codingSystems: {
      icd10: { code: 'F50.8', label_de: 'Sonstige Essstörungen' },
      icd11: { code: '6B8Z', label_de: 'Fütterungs- oder Essstörungen, nicht näher bezeichnet' },
      dsm5tr: { code: '307.59', label_de: 'Other Specified Feeding or Eating Disorder (Crosswalk)' },
    },
    differentials_de: ['Anorexia nervosa (F50.0)', 'Bulimia nervosa (F50.2)', 'Binge-Eating-Störung'],
    coreSymptomText_de: 'Näher bezeichnete Essstörung, die keiner der spezifischeren F50-Unterkategorien entspricht',
    domain: 'sleep_appetite_vegetative',
    presentMatch: /essst[öo]r|essverhalten|k[öo]rperschema/i,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine somatische Erkrankung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'eating_disorder_unspecified',
    code: 'F50.9',
    name_de: 'Essstörung, nicht näher bezeichnet',
    crosswalkKey: 'F50.9',
    sourceRef: 'operationalisiert nach ICD-10 F50.9 / ICD-11 6B8Z',
    codingSystems: {
      icd10: { code: 'F50.9', label_de: 'Essstörung, nicht näher bezeichnet' },
      icd11: { code: '6B8Z', label_de: 'Fütterungs- oder Essstörungen, nicht näher bezeichnet' },
      dsm5tr: { code: '307.9', label_de: 'Unspecified Feeding or Eating Disorder (Crosswalk)' },
    },
    differentials_de: ['Anorexia nervosa (F50.0)', 'Bulimia nervosa (F50.2)'],
    coreSymptomText_de: 'Störung des Essverhaltens ohne nähere Spezifizierung',
    domain: 'sleep_appetite_vegetative',
    presentMatch: /essst[öo]r|essverhalten/i,
    holdingCategory: true,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine somatische Erkrankung allein erklärbar',
  }),

  stemAnchorDisorder({
    id: 'nonorganic_sleep_disorders_stem',
    code: 'F51',
    name_de: 'Nichtorganische Schlafstörungen',
    crosswalkKey: 'F51',
    sourceRef: 'operationalisiert nach ICD-10 F51 / ICD-11 7B2Z',
    codingSystems: {
      icd10: { code: 'F51', label_de: 'Nichtorganische Schlafstörungen' },
      icd11: { code: '7B2Z', label_de: 'Schlaf-Wach-Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '780.52', label_de: 'Insomnia Disorder (Crosswalk)' },
    },
    differentials_de: ['Insomnie (F51.0)', 'Albträume (F51.5)', 'Pavor nocturnus (F51.4)', 'Organische Schlafstörung'],
    coreSymptomText_de: 'Klinisch bedeutsame Schlafstörung ohne hinreichende organische Erklärung',
    domain: 'sleep_appetite_vegetative',
    presentMatch: /schlaf|insomnie|hypersomnie|albtraum|schlaf-wach/i,
    exclusionText_de: 'Die Schlafstörung ist nicht besser durch eine somatische Erkrankung oder Substanzwirkung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'nonorganic_hypersomnia',
    code: 'F51.1',
    name_de: 'Nichtorganische Hypersomnie',
    crosswalkKey: 'F51.1',
    sourceRef: 'operationalisiert nach ICD-10 F51.1 / ICD-11 7A26',
    codingSystems: {
      icd10: { code: 'F51.1', label_de: 'Nichtorganische Hypersomnie' },
      icd11: { code: '7A26', label_de: 'Syndrom des unzureichenden Schlafs' },
      dsm5tr: { code: '780.54', label_de: 'Hypersomnolence Disorder (Crosswalk)' },
    },
    differentials_de: ['Insomnie (F51.0)', 'Depressive Episode mit Hypersomnie', 'Narkolepsie', 'Schlafapnoe'],
    coreSymptomText_de: 'Anhaltende übermäßige Tagesschläfrigkeit oder verlängerte Schlafdauer bei erhaltenem Schlafbedürfnis trotz adäquater Schlafgelegenheit',
    domain: 'sleep_appetite_vegetative',
    presentMatch: /hypersomn|tagesschl[äa]frig|verl[äa]ngert.*schlaf|exzessiv.*schlaf/i,
    exclusionText_de: 'Die Hypersomnie ist nicht besser durch eine somatische Erkrankung oder Substanzwirkung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'sleep_wake_schedule_disorder',
    code: 'F51.2',
    name_de: 'Nichtorganische Störung des Schlaf-Wach-Rhythmus',
    crosswalkKey: 'F51.2',
    sourceRef: 'operationalisiert nach ICD-10 F51.2 / ICD-11 7B2Z',
    codingSystems: {
      icd10: { code: 'F51.2', label_de: 'Nichtorganische Störung des Schlaf-Wach-Rhythmus' },
      icd11: { code: '7B2Z', label_de: 'Schlaf-Wach-Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '307.45', label_de: 'Circadian Rhythm Sleep-Wake Disorder (Crosswalk)' },
    },
    differentials_de: ['Insomnie (F51.0)', 'Schichtarbeit', 'Jetlag', 'Organische Schlafstörung'],
    coreSymptomText_de: 'Persistierende Störung des Schlaf-Wach-Rhythmus mit Einschlaf- oder Aufwachzeitpunkt außerhalb des gewünschten Zeitfensters und damit verbundener Beeinträchtigung',
    domain: 'sleep_appetite_vegetative',
    presentMatch: /schlaf-wach|zirkadian|rhythmus.*schlaf|verz[öo]gert.*einschlaf|fr[üu]h.*aufwach/i,
    exclusionText_de: 'Die Störung ist nicht besser durch eine somatische Erkrankung oder Substanzwirkung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'sleep_disorder_other',
    code: 'F51.8',
    name_de: 'Sonstige nichtorganische Schlafstörungen',
    crosswalkKey: 'F51.8',
    sourceRef: 'operationalisiert nach ICD-10 F51.8 / ICD-11 7B2Z',
    codingSystems: {
      icd10: { code: 'F51.8', label_de: 'Sonstige nichtorganische Schlafstörungen' },
      icd11: { code: '7B2Z', label_de: 'Schlaf-Wach-Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '780.59', label_de: 'Other Specified Insomnia/Sleep Disorder (Crosswalk)' },
    },
    differentials_de: ['Insomnie (F51.0)', 'Hypersomnie (F51.1)', 'Albträume (F51.5)'],
    coreSymptomText_de: 'Näher bezeichnete nichtorganische Schlafstörung, die keiner der spezifischeren F51-Unterkategorien entspricht',
    domain: 'sleep_appetite_vegetative',
    presentMatch: /schlaf|insomnie|hypersomnie/i,
    exclusionText_de: 'Die Schlafstörung ist nicht besser durch eine somatische Erkrankung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'sleep_disorder_unspecified',
    code: 'F51.9',
    name_de: 'Nichtorganische Schlafstörung, nicht näher bezeichnet',
    crosswalkKey: 'F51.9',
    sourceRef: 'operationalisiert nach ICD-10 F51.9 / ICD-11 7B2Z',
    codingSystems: {
      icd10: { code: 'F51.9', label_de: 'Nichtorganische Schlafstörung, nicht näher bezeichnet' },
      icd11: { code: '7B2Z', label_de: 'Schlaf-Wach-Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '780.52', label_de: 'Unspecified Insomnia/Sleep Disorder (Crosswalk)' },
    },
    differentials_de: ['Insomnie (F51.0)', 'Hypersomnie (F51.1)'],
    coreSymptomText_de: 'Nichtorganische Schlafstörung ohne nähere Spezifizierung',
    domain: 'sleep_appetite_vegetative',
    presentMatch: /schlaf|insomnie/i,
    holdingCategory: true,
    exclusionText_de: 'Die Schlafstörung ist nicht besser durch eine somatische Erkrankung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'psychological_factors_somatic',
    code: 'F54',
    name_de: 'Psychologische und Verhaltensfaktoren bei Krankheiten, die anderenorts klassifiziert sind',
    crosswalkKey: 'F54',
    sourceRef: 'operationalisiert nach ICD-10 F54 / ICD-11 6E40',
    codingSystems: {
      icd10: { code: 'F54', label_de: 'Psychologische und Verhaltensfaktoren bei Krankheiten, die anderenorts klassifiziert sind' },
      icd11: { code: '6E40', label_de: 'Psychologische oder Verhaltensfaktoren, die Störungen oder Krankheiten beeinflussen, nicht näher bezeichnet' },
      dsm5tr: { code: '316', label_de: 'Psychological Factors Affecting Other Medical Conditions (Crosswalk)' },
    },
    differentials_de: ['Somatoforme Störung (F45)', 'Körperliche Belastungsstörung', 'Primäre psychische Störung'],
    coreSymptomText_de: 'Psychologische oder Verhaltensfaktoren (z. B. Denkmuster, Emotionen, Krankheitsverhalten), die den Verlauf, die Behandlung oder die Prognose einer anderenorts klassifizierten somatischen Erkrankung nachteilig beeinflussen',
    domain: 'somatic_preoccupation',
    presentMatch: /psychologisch.*faktor|krankheitsverhalten|verst[äa]rk.*symptom|vermeid.*aktivit/i,
    exclusionText_de: 'Die somatische Erkrankung ist nicht allein durch die psychologischen Faktoren verursacht',
  }),

  nonDependenceSubstanceAbuse,

  stemAnchorDisorder({
    id: 'unspecified_behavioural_syndrome',
    code: 'F59',
    name_de: 'Nicht näher bezeichnetes Verhaltenssyndrom mit physiologischen Störungen und körperlichen Faktoren',
    crosswalkKey: 'F59',
    sourceRef: 'operationalisiert nach ICD-10 F59 / ICD-11 6E8Z',
    codingSystems: {
      icd10: { code: 'F59', label_de: 'Nicht näher bezeichnetes Verhaltenssyndrom mit physiologischen Störungen und körperlichen Faktoren' },
      icd11: { code: '6E8Z', label_de: 'Psychische, Verhaltens- oder neurodevelopmentale Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '307.9', label_de: 'Unspecified Behavioral Syndrome (Crosswalk)' },
    },
    differentials_de: ['Essstörungen (F50)', 'Schlafstörungen (F51)', 'Sexuelle Funktionsstörungen (F52)'],
    coreSymptomText_de: 'Verhaltenssyndrom mit physiologischen Störungen und körperlichen Faktoren, das keiner spezifischeren F5-Kategorie zugeordnet werden kann',
    holdingCategory: true,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine somatische Erkrankung allein erklärbar',
  }),
]

export const crosswalkGapDisorders: Disorder[] = [
  ...f0GapDisorders,
  ...f1GapDisorders,
  ...f3GapDisorders,
  ...f4GapDisorders,
  ...f5GapDisorders,
]

/** Full crosswalk-gap registry (F0–F9 residual codes). */
export const allCrosswalkGapDisorders: Disorder[] = [
  ...crosswalkGapDisorders,
  ...crosswalkGapDisordersF6F8F9,
]
