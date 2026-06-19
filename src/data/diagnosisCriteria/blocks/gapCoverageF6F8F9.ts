/**
 * Crosswalk-gap coverage — F6 (personality/behaviour), F8 (neurodevelopmental),
 * F9 (childhood-onset) residual codes.
 */

import type { Disorder } from '../schema'
import {
  paraphiliaDisorder,
  specificCodeDisorder,
  stemAnchorDisorder,
} from '../factories/gapFactories'

// ---------------------------------------------------------------------------
// F6 — personality and behaviour gaps
// ---------------------------------------------------------------------------

const f6GapDisorders: Disorder[] = [
  stemAnchorDisorder({
    id: 'enduring_personality_change_stem',
    code: 'F62',
    name_de: 'Dauerhafte Persönlichkeitsveränderung, nicht Folge von Hirnschädigung oder -krankheit',
    crosswalkKey: 'F62',
    sourceRef: 'operationalisiert nach ICD-10 F62 / ICD-11 6E8Z',
    codingSystems: {
      icd10: { code: 'F62', label_de: 'Dauerhafte Persönlichkeitsveränderung, nicht Folge von Hirnschädigung oder -krankheit' },
      icd11: { code: '6E8Z', label_de: 'Psychische, Verhaltens- oder neurodevelopmentale Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '309.89', label_de: 'Personality Change Due to Catastrophic Experience (Crosswalk)' },
    },
    differentials_de: ['Organische Persönlichkeitsstörung (F07)', 'PTBS (F43.1)', 'Primäre Persönlichkeitsstörung (F60)'],
    coreSymptomText_de: 'Dauerhafte, tiefgreifende Veränderung der Persönlichkeit nach einer belastenden Lebensumstände, ohne Hinweis auf organische Ursache',
    domain: 'personality_interpersonal_style',
    presentMatch: /pers[öo]nlichkeit.*ver[äa]nder|dauerhaft.*charakter|nach.*katastrophe|nach.*haft/i,
    exclusionText_de: 'Die Veränderung ist nicht Folge einer Hirnschädigung oder -krankheit',
  }),

  specificCodeDisorder({
    id: 'personality_change_catastrophic',
    code: 'F62.0',
    name_de: 'Dauerhafte Persönlichkeitsveränderung nach katastrophaler Belastung',
    crosswalkKey: 'F62.0',
    sourceRef: 'operationalisiert nach ICD-10 F62.0 / ICD-11 6B4Z',
    codingSystems: {
      icd10: { code: 'F62.0', label_de: 'Dauerhafte Persönlichkeitsveränderung nach katastrophaler Belastung' },
      icd11: { code: '6B4Z', label_de: 'Störungen, die spezifisch mit Stress assoziiert sind, nicht näher bezeichnet' },
      dsm5tr: { code: '309.89', label_de: 'Personality Change Due to Catastrophic Experience (Crosswalk)' },
    },
    differentials_de: ['PTBS (F43.1)', 'Anpassungsstörung (F43.2)', 'Organische Persönlichkeitsstörung (F07)'],
    coreSymptomText_de: 'Dauerhafte Veränderung von Persönlichkeit und Verhalten nach einer extrem belastenden Erfahrung (z. B. längerer Haft, Katastrophe, Krieg), die über eine akute Belastungsreaktion hinausgeht',
    domain: 'personality_interpersonal_style',
    presentMatch: /nach.*katastrophe|nach.*haft|nach.*krieg|dauerhaft.*ver[äa]nder/i,
    exclusionText_de: 'Die Veränderung ist nicht Folge einer Hirnschädigung oder -krankheit und nicht besser durch PTBS allein erklärbar',
  }),

  stemAnchorDisorder({
    id: 'habit_impulse_disorders_stem',
    code: 'F63',
    name_de: 'Habit- und Impulsstörungen',
    crosswalkKey: 'F63',
    sourceRef: 'operationalisiert nach ICD-10 F63 / ICD-11 6C7Z',
    codingSystems: {
      icd10: { code: 'F63', label_de: 'Habit- und Impulsstörungen' },
      icd11: { code: '6C7Z', label_de: 'Impulskontrollstörungen, nicht näher bezeichnet' },
      dsm5tr: { code: '312.39', label_de: 'Impulse-Control Disorders (Crosswalk)' },
    },
    differentials_de: ['Pathologisches Spielen (F63.0)', 'Pyromanie (F63.1)', 'Kleptomanie (F63.2)', 'Trichotillomanie (F63.3)'],
    coreSymptomText_de: 'Wiederholtes, schwer kontrollierbares Verhalten mit innerem Drang und Erleichterung oder Befriedigung danach',
    domain: 'obsessions_compulsions',
    presentMatch: /impuls|zwang|pathologisch.*spiel|brandstift|klepto|trichotillo/i,
    exclusionText_de: 'Das Verhalten ist nicht besser durch eine andere psychische Störung oder Substanzwirkung erklärbar',
  }),

  specificCodeDisorder({
    id: 'habit_impulse_disorder_other',
    code: 'F63.8',
    name_de: 'Sonstige Habit- und Impulsstörungen',
    crosswalkKey: 'F63.8',
    sourceRef: 'operationalisiert nach ICD-10 F63.8 / ICD-11 6C7Z',
    codingSystems: {
      icd10: { code: 'F63.8', label_de: 'Sonstige Habit- und Impulsstörungen' },
      icd11: { code: '6C7Z', label_de: 'Impulskontrollstörungen, nicht näher bezeichnet' },
      dsm5tr: { code: '312.89', label_de: 'Other Specified Disruptive, Impulse-Control Disorder (Crosswalk)' },
    },
    differentials_de: ['Pathologisches Spielen (F63.0)', 'Pyromanie (F63.1)', 'Kleptomanie (F63.2)'],
    coreSymptomText_de: 'Näher bezeichnete Habit- oder Impulsstörung, die keiner der spezifischeren F63-Unterkategorien entspricht',
    domain: 'obsessions_compulsions',
    presentMatch: /impuls|zwang|wiederholt.*verhalten/i,
    exclusionText_de: 'Das Verhalten ist nicht besser durch eine andere psychische Störung erklärbar',
  }),

  specificCodeDisorder({
    id: 'habit_impulse_disorder_unspecified',
    code: 'F63.9',
    name_de: 'Habit- und Impulsstörung, nicht näher bezeichnet',
    crosswalkKey: 'F63.9',
    sourceRef: 'operationalisiert nach ICD-10 F63.9 / ICD-11 6C7Z',
    codingSystems: {
      icd10: { code: 'F63.9', label_de: 'Habit- und Impulsstörung, nicht näher bezeichnet' },
      icd11: { code: '6C7Z', label_de: 'Impulskontrollstörungen, nicht näher bezeichnet' },
      dsm5tr: { code: '312.9', label_de: 'Unspecified Disruptive, Impulse-Control Disorder (Crosswalk)' },
    },
    differentials_de: ['Pathologisches Spielen (F63.0)', 'Pyromanie (F63.1)', 'Kleptomanie (F63.2)'],
    coreSymptomText_de: 'Habit- oder Impulsstörung ohne nähere Spezifizierung',
    domain: 'obsessions_compulsions',
    presentMatch: /impuls|zwang/i,
    holdingCategory: true,
    exclusionText_de: 'Das Verhalten ist nicht besser durch eine andere psychische Störung erklärbar',
  }),

  stemAnchorDisorder({
    id: 'gender_identity_disorders_stem',
    code: 'F64',
    name_de: 'Störungen der Geschlechtsidentität',
    crosswalkKey: 'F64',
    sourceRef: 'operationalisiert nach ICD-10 F64 / ICD-11 HA6Z',
    codingSystems: {
      icd10: { code: 'F64', label_de: 'Störungen der Geschlechtsidentität' },
      icd11: { code: 'HA6Z', label_de: 'Geschlechtsinkongruenz, nicht näher bezeichnet' },
      dsm5tr: { code: '302.9', label_de: 'Gender Dysphoria (Crosswalk)' },
    },
    differentials_de: ['Geschlechtsdysphorie im Erwachsenenalter (F64.0)', 'Geschlechtsdysphorie im Kindesalter (F64.2)', 'Transvestismus ohne Geschlechtsdysphorie'],
    coreSymptomText_de: 'Anhaltende Inkongruenz zwischen erlebtem Geschlecht und dem bei der Geburt zugewiesenen Geschlecht mit Leidensdruck und/oder Funktionsbeeinträchtigung',
    domain: 'self_experience_ego_disturbance',
    presentMatch: /geschlechtsdysphor|geschlechtsinkongru|transgender|transident/i,
    exclusionText_de: 'Die Inkongruenz ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'gender_dysphoria_adult',
    code: 'F64.0',
    name_de: 'Geschlechtsdysphorie bei Jugendlichen und Erwachsenen',
    crosswalkKey: 'F64.0',
    sourceRef: 'operationalisiert nach ICD-10 F64.0 / ICD-11 HA60',
    codingSystems: {
      icd10: { code: 'F64.0', label_de: 'Geschlechtsdysphorie bei Jugendlichen und Erwachsenen' },
      icd11: { code: 'HA60', label_de: 'Geschlechtsinkongruenz des Jugend- oder Erwachsenenalters' },
      dsm5tr: { code: '302.85', label_de: 'Gender Dysphoria in Adolescents and Adults (Crosswalk)' },
    },
    differentials_de: ['Geschlechtsdysphorie im Kindesalter (F64.2)', 'Transvestismus (F64.1)', 'Körperdysmorphe Störung'],
    coreSymptomText_de: 'Anhaltende Inkongruenz zwischen erlebtem Geschlecht und dem bei der Geburt zugewiesenen Geschlecht mit Wunsch nach geschlechtsangleichenden Maßnahmen und Leidensdruck und/oder Funktionsbeeinträchtigung',
    domain: 'self_experience_ego_disturbance',
    presentMatch: /geschlechtsdysphor|geschlechtsinkongru|transgender|transident|anderes\s+geschlecht/i,
    exclusionText_de: 'Die Inkongruenz ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'dual_role_transvestism',
    code: 'F64.1',
    name_de: 'Zwitterrolle-Transvestismus',
    crosswalkKey: 'F64.1',
    sourceRef: 'operationalisiert nach ICD-10 F64.1 / ICD-11 6D3Z',
    codingSystems: {
      icd10: { code: 'F64.1', label_de: 'Zwitterrolle-Transvestismus' },
      icd11: { code: '6D3Z', label_de: 'Paraphile Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '302.3', label_de: 'Transvestic Disorder (Crosswalk)' },
    },
    differentials_de: ['Geschlechtsdysphorie (F64.0)', 'Fetischistischer Transvestismus (F65.1)'],
    coreSymptomText_de: 'Wiederholtes Tragen von Kleidung des anderen Geschlechts, um vorübergehend sowohl männliche als auch weibliche Identität zu erleben, ohne Wunsch nach dauerhafter Geschlechtsumwandlung und ohne primäre sexuelle Erregung durch das Cross-Dressing',
    exclusionText_de: 'Das Verhalten ist nicht besser durch Geschlechtsdysphorie oder einen primären Fetischismus erklärbar',
  }),

  specificCodeDisorder({
    id: 'gender_dysphoria_childhood',
    code: 'F64.2',
    name_de: 'Geschlechtsdysphorie im Kindesalter',
    crosswalkKey: 'F64.2',
    sourceRef: 'operationalisiert nach ICD-10 F64.2 / ICD-11 HA61',
    codingSystems: {
      icd10: { code: 'F64.2', label_de: 'Geschlechtsdysphorie im Kindesalter' },
      icd11: { code: 'HA61', label_de: 'Geschlechtsinkongruenz des Kindesalters' },
      dsm5tr: { code: '302.6', label_de: 'Gender Dysphoria in Children (Crosswalk)' },
    },
    differentials_de: ['Geschlechtsuntypisches Verhalten ohne Dysphorie', 'Geschlechtsdysphorie im Erwachsenenalter (F64.0)'],
    coreSymptomText_de: 'Anhaltende Inkongruenz zwischen erlebtem Geschlecht und dem bei der Geburt zugewiesenen Geschlecht mit deutlichem Wunsch, das andere Geschlecht zu sein oder als anderes Geschlecht behandelt zu werden, und Leidensdruck und/oder Funktionsbeeinträchtigung',
    domain: 'self_experience_ego_disturbance',
    presentMatch: /geschlechtsdysphor|geschlechtsinkongru|anderes\s+geschlecht.*kind/i,
    exclusionText_de: 'Die Inkongruenz ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'gender_identity_disorder_other',
    code: 'F64.8',
    name_de: 'Sonstige Störungen der Geschlechtsidentität',
    crosswalkKey: 'F64.8',
    sourceRef: 'operationalisiert nach ICD-10 F64.8 / ICD-11 HA6Z',
    codingSystems: {
      icd10: { code: 'F64.8', label_de: 'Sonstige Störungen der Geschlechtsidentität' },
      icd11: { code: 'HA6Z', label_de: 'Geschlechtsinkongruenz, nicht näher bezeichnet' },
      dsm5tr: { code: '302.89', label_de: 'Other Specified Gender Dysphoria (Crosswalk)' },
    },
    differentials_de: ['Geschlechtsdysphorie (F64.0/F64.2)', 'Zwitterrolle-Transvestismus (F64.1)'],
    coreSymptomText_de: 'Näher bezeichnete Störung der Geschlechtsidentität, die keiner der spezifischeren F64-Unterkategorien entspricht',
    domain: 'self_experience_ego_disturbance',
    presentMatch: /geschlechtsdysphor|geschlechtsinkongru/i,
    exclusionText_de: 'Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'gender_identity_disorder_unspecified',
    code: 'F64.9',
    name_de: 'Störung der Geschlechtsidentität, nicht näher bezeichnet',
    crosswalkKey: 'F64.9',
    sourceRef: 'operationalisiert nach ICD-10 F64.9 / ICD-11 HA60',
    codingSystems: {
      icd10: { code: 'F64.9', label_de: 'Störung der Geschlechtsidentität, nicht näher bezeichnet' },
      icd11: { code: 'HA60', label_de: 'Geschlechtsinkongruenz des Jugend- oder Erwachsenenalters' },
      dsm5tr: { code: '302.9', label_de: 'Unspecified Gender Dysphoria (Crosswalk)' },
    },
    differentials_de: ['Geschlechtsdysphorie (F64.0/F64.2)'],
    coreSymptomText_de: 'Störung der Geschlechtsidentität ohne nähere Spezifizierung',
    domain: 'self_experience_ego_disturbance',
    presentMatch: /geschlechtsdysphor|geschlechtsinkongru/i,
    holdingCategory: true,
    exclusionText_de: 'Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  stemAnchorDisorder({
    id: 'sexual_preference_disorders_stem',
    code: 'F65',
    name_de: 'Störungen der Sexualpräferenz',
    crosswalkKey: 'F65',
    sourceRef: 'operationalisiert nach ICD-10 F65 / ICD-11 6D3Z',
    codingSystems: {
      icd10: { code: 'F65', label_de: 'Störungen der Sexualpräferenz' },
      icd11: { code: '6D3Z', label_de: 'Paraphile Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '302.9', label_de: 'Paraphilic Disorders (Crosswalk)' },
    },
    differentials_de: ['Fetischismus (F65.0)', 'Exhibitionismus (F65.2)', 'Voyeurismus (F65.3)', 'Pädophilie (F65.4)'],
    coreSymptomText_de: 'Wiederkehrende, intensivierte sexuelle Fantasien, Impulse oder Verhaltensweisen mit atypischer Sexualpräferenz, die zu Leidensdruck oder Beeinträchtigung führen oder ein Risiko für Dritte darstellen',
    exclusionText_de: 'Bei einvernehmlichen sexuellen Praktiken zwischen Erwachsenen ohne Leidensdruck ist keine Störung anzunehmen',
  }),

  paraphiliaDisorder({
    id: 'fetishism',
    code: 'F65.0',
    name_de: 'Fetischismus',
    preferenceText_de: 'Wiederkehrende, intensive sexuelle Erregung durch unbelebte Objekte oder spezifische Körperteile (außer Kleidung des anderen Geschlechts), mit wiederholtem Verhalten oder Fantasien',
    sourceRef: 'operationalisiert nach ICD-10 F65.0 / ICD-11 6D36',
    codingSystems: {
      icd10: { code: 'F65.0', label_de: 'Fetischismus' },
      icd11: { code: '6D36', label_de: 'Paraphile Störung mit solitärem oder einvernehmlichem Verhalten' },
      dsm5tr: { code: '302.81', label_de: 'Fetishistic Disorder (Crosswalk)' },
    },
    differentials_de: ['Fetischistischer Transvestismus (F65.1)', 'Normophile sexuelle Präferenz'],
  }),

  paraphiliaDisorder({
    id: 'fetishistic_transvestism',
    code: 'F65.1',
    name_de: 'Fetischistischer Transvestismus',
    preferenceText_de: 'Wiederkehrende, intensive sexuelle Erregung durch das Tragen von Kleidung des anderen Geschlechts, mit wiederholtem Verhalten oder Fantasien',
    sourceRef: 'operationalisiert nach ICD-10 F65.1 / ICD-11 6D36',
    codingSystems: {
      icd10: { code: 'F65.1', label_de: 'Fetischistischer Transvestismus' },
      icd11: { code: '6D36', label_de: 'Paraphile Störung mit solitärem oder einvernehmlichem Verhalten' },
      dsm5tr: { code: '302.3', label_de: 'Transvestic Disorder (Crosswalk)' },
    },
    differentials_de: ['Geschlechtsdysphorie (F64.0)', 'Zwitterrolle-Transvestismus (F64.1)'],
  }),

  paraphiliaDisorder({
    id: 'exhibitionism',
    code: 'F65.2',
    name_de: 'Exhibitionismus',
    preferenceText_de: 'Wiederkehrende, intensive sexuelle Erregung durch das Entblößen des eigenen Genitales vor einer nicht einverstandenen Person, mit wiederholtem Verhalten oder Fantasien',
    sourceRef: 'operationalisiert nach ICD-10 F65.2 / ICD-11 6D30',
    codingSystems: {
      icd10: { code: 'F65.2', label_de: 'Exhibitionismus' },
      icd11: { code: '6D30', label_de: 'Exhibitionistische Störung' },
      dsm5tr: { code: '302.4', label_de: 'Exhibitionistic Disorder (Crosswalk)' },
    },
    differentials_de: ['Voyeurismus (F65.3)', 'Antisoziale Persönlichkeitsstörung'],
  }),

  paraphiliaDisorder({
    id: 'voyeurism',
    code: 'F65.3',
    name_de: 'Voyeurismus',
    preferenceText_de: 'Wiederkehrende, intensive sexuelle Erregung durch das heimliche Beobachten unsicherer oder nackter Personen, mit wiederholtem Verhalten oder Fantasien',
    sourceRef: 'operationalisiert nach ICD-10 F65.3 / ICD-11 6D31',
    codingSystems: {
      icd10: { code: 'F65.3', label_de: 'Voyeurismus' },
      icd11: { code: '6D31', label_de: 'Voyeuristische Störung' },
      dsm5tr: { code: '302.82', label_de: 'Voyeuristic Disorder (Crosswalk)' },
    },
    differentials_de: ['Exhibitionismus (F65.2)', 'Stalking ohne sexuelle Motivation'],
  }),

  paraphiliaDisorder({
    id: 'paedophilia',
    code: 'F65.4',
    name_de: 'Pädophilie',
    preferenceText_de: 'Wiederkehrende, intensive sexuelle Erregung durch präpubertäre oder früh pubertäre Kinder (in der Regel ≤ 13 Jahre), mit wiederholtem Verhalten oder Fantasien',
    sourceRef: 'operationalisiert nach ICD-10 F65.4 / ICD-11 6D32',
    codingSystems: {
      icd10: { code: 'F65.4', label_de: 'Pädophilie' },
      icd11: { code: '6D32', label_de: 'Pädophile Störung' },
      dsm5tr: { code: '302.2', label_de: 'Pedophilic Disorder (Crosswalk)' },
    },
    differentials_de: ['Hebephilie', 'Antisoziale Persönlichkeitsstörung', 'Intellektuelle Entwicklungsstörung mit unangemessenem Sexualverhalten'],
  }),

  paraphiliaDisorder({
    id: 'sadomasochism',
    code: 'F65.5',
    name_de: 'Sadomasochismus',
    preferenceText_de: 'Wiederkehrende, intensive sexuelle Erregung durch das Zufügen von Schmerz/Humiliation oder das Erleiden von Schmerz/Humiliation, mit wiederholtem Verhalten oder Fantasien',
    sourceRef: 'operationalisiert nach ICD-10 F65.5 / ICD-11 6D36',
    codingSystems: {
      icd10: { code: 'F65.5', label_de: 'Sadomasochismus' },
      icd11: { code: '6D36', label_de: 'Paraphile Störung mit solitärem oder einvernehmlichem Verhalten' },
      dsm5tr: { code: '302.84', label_de: 'Sexual Masochism / Sadism Disorder (Crosswalk)' },
    },
    differentials_de: ['Einvernehmliche BDSM-Praktiken ohne Leidensdruck', 'Antisoziale Persönlichkeitsstörung'],
  }),

  paraphiliaDisorder({
    id: 'multiple_sexual_preferences',
    code: 'F65.6',
    name_de: 'Multiple Störungen der Sexualpräferenz',
    preferenceText_de: 'Wiederkehrende, intensive sexuelle Erregung durch mehrere atypische Sexualpräferenzen (z. B. Kombination aus Fetischismus, Exhibitionismus und Voyeurismus), mit wiederholtem Verhalten oder Fantasien',
    sourceRef: 'operationalisiert nach ICD-10 F65.6 / ICD-11 6D3Z',
    codingSystems: {
      icd10: { code: 'F65.6', label_de: 'Multiple Störungen der Sexualpräferenz' },
      icd11: { code: '6D3Z', label_de: 'Paraphile Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '302.9', label_de: 'Other Specified Paraphilic Disorder (Crosswalk)' },
    },
    differentials_de: ['Einzelne Paraphilie (F65.0–F65.5)'],
  }),

  paraphiliaDisorder({
    id: 'sexual_preference_disorder_other',
    code: 'F65.8',
    name_de: 'Sonstige Störungen der Sexualpräferenz',
    preferenceText_de: 'Näher bezeichnete atypische Sexualpräferenz, die keiner der spezifischeren F65-Unterkategorien entspricht, mit wiederholtem Verhalten oder Fantasien',
    sourceRef: 'operationalisiert nach ICD-10 F65.8 / ICD-11 6D3Z',
    codingSystems: {
      icd10: { code: 'F65.8', label_de: 'Sonstige Störungen der Sexualpräferenz' },
      icd11: { code: '6D3Z', label_de: 'Paraphile Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '302.89', label_de: 'Other Specified Paraphilic Disorder (Crosswalk)' },
    },
    differentials_de: ['Spezifische Paraphilien (F65.0–F65.6)'],
  }),

  paraphiliaDisorder({
    id: 'sexual_preference_disorder_unspecified',
    code: 'F65.9',
    name_de: 'Störung der Sexualpräferenz, nicht näher bezeichnet',
    preferenceText_de: 'Atypische Sexualpräferenz ohne nähere Spezifizierung, mit wiederholtem Verhalten oder Fantasien und Leidensdruck oder Beeinträchtigung',
    sourceRef: 'operationalisiert nach ICD-10 F65.9 / ICD-11 6D3Z',
    codingSystems: {
      icd10: { code: 'F65.9', label_de: 'Störung der Sexualpräferenz, nicht näher bezeichnet' },
      icd11: { code: '6D3Z', label_de: 'Paraphile Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '302.9', label_de: 'Unspecified Paraphilic Disorder (Crosswalk)' },
    },
    differentials_de: ['Spezifische Paraphilien (F65.0–F65.8)'],
  }),

  stemAnchorDisorder({
    id: 'psychosexual_development_disorders_stem',
    code: 'F66',
    name_de: 'Psychologische und Verhaltensstörungen im Zusammenhang mit sexueller Entwicklung und -orientierung',
    crosswalkKey: 'F66',
    sourceRef: 'operationalisiert nach ICD-10 F66 / ICD-11 QA15.1',
    codingSystems: {
      icd10: { code: 'F66', label_de: 'Psychologische und Verhaltensstörungen im Zusammenhang mit sexueller Entwicklung und -orientierung' },
      icd11: { code: 'QA15.1', label_de: 'Beratung im Zusammenhang mit sexuellem Verhalten und -orientierung' },
      dsm5tr: { code: '302.9', label_de: 'Other Specified Sexual Dysfunction / Development (Crosswalk)' },
    },
    differentials_de: ['Geschlechtsdysphorie (F64)', 'Egodystone sexuelle Orientierung (F66.1)', 'Sexuelle Beziehungsstörung (F66.2)'],
    coreSymptomText_de: 'Psychologische oder Verhaltensstörung im Zusammenhang mit sexueller Entwicklung oder -orientierung mit Leidensdruck und/oder Funktionsbeeinträchtigung',
    domain: 'self_experience_ego_disturbance',
    presentMatch: /sexuell.*orientierung|sexuell.*entwicklung|egodyston|beziehungsst[öo]r.*sexuell/i,
    exclusionText_de: 'Die sexuelle Orientierung an sich ist keine Störung; nur assoziierte Leidensdruck- oder Funktionsstörungen werden hier kodiert',
  }),

  specificCodeDisorder({
    id: 'sexual_maturation_disorder',
    code: 'F66.0',
    name_de: 'Störung der sexuellen Reifung',
    crosswalkKey: 'F66.0',
    sourceRef: 'operationalisiert nach ICD-10 F66.0 / ICD-11 QA15.1',
    codingSystems: {
      icd10: { code: 'F66.0', label_de: 'Störung der sexuellen Reifung' },
      icd11: { code: 'QA15.1', label_de: 'Beratung im Zusammenhang mit sexuellem Verhalten und -orientierung' },
      dsm5tr: { code: '302.9', label_de: 'Sexual Maturation Disorder (Crosswalk)' },
    },
    differentials_de: ['Normale Pubertätsentwicklung', 'Geschlechtsdysphorie (F64)'],
    coreSymptomText_de: 'Unsicherheit, Verwirrung oder Leidensdruck im Zusammenhang mit der sexuellen Reifung und der Entwicklung der sexuellen Identität',
    domain: 'self_experience_ego_disturbance',
    presentMatch: /sexuell.*reifung|pubert[äa]t.*unsicher|sexuelle\s+identit[äa]t.*verwirr/i,
    exclusionText_de: 'Die Unsicherheit ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'egodystonic_sexual_orientation',
    code: 'F66.1',
    name_de: 'Egodystone sexuelle Orientierung',
    crosswalkKey: 'F66.1',
    sourceRef: 'operationalisiert nach ICD-10 F66.1 / ICD-11 QA15.1',
    codingSystems: {
      icd10: { code: 'F66.1', label_de: 'Egodystone sexuelle Orientierung' },
      icd11: { code: 'QA15.1', label_de: 'Beratung im Zusammenhang mit sexuellem Verhalten und -orientierung' },
      dsm5tr: { code: '302.9', label_de: 'Egodystonic Sexual Orientation (Crosswalk)' },
    },
    differentials_de: ['Interne Homo-/Transphobie', 'Depressive Episode', 'Anpassungsstörung'],
    coreSymptomText_de: 'Leidensdruck und/oder Funktionsbeeinträchtigung aufgrund der eigenen sexuellen Orientierung, ohne Wunsch nach einer Veränderung der Orientierung selbst',
    domain: 'mood_affect',
    presentMatch: /egodyston|orientierung.*leid|scham.*orientierung|konflikt.*orientierung/i,
    exclusionText_de: 'Die sexuelle Orientierung an sich ist keine Störung; nur der assoziierte Leidensdruck wird hier erfasst',
  }),

  specificCodeDisorder({
    id: 'sexual_relationship_disorder',
    code: 'F66.2',
    name_de: 'Sexuelle Beziehungsstörung',
    crosswalkKey: 'F66.2',
    sourceRef: 'operationalisiert nach ICD-10 F66.2 / ICD-11 QA15.1',
    codingSystems: {
      icd10: { code: 'F66.2', label_de: 'Sexuelle Beziehungsstörung' },
      icd11: { code: 'QA15.1', label_de: 'Beratung im Zusammenhang mit sexuellem Verhalten und -orientierung' },
      dsm5tr: { code: '302.9', label_de: 'Sexual Relationship Disorder (Crosswalk)' },
    },
    differentials_de: ['Paartherapeutische Konflikte ohne Störung', 'Sexuelle Funktionsstörung (F52)'],
    coreSymptomText_de: 'Leidensdruck und/oder Funktionsbeeinträchtigung in der sexuellen Beziehung zu einem Partner, unabhängig von der sexuellen Orientierung',
    domain: 'personality_interpersonal_style',
    presentMatch: /sexuell.*beziehung|intimit[äa]t.*st[öo]r|partnerschaft.*sexuell/i,
    exclusionText_de: 'Die Beziehungsschwierigkeiten sind nicht besser durch eine primäre affektive oder Angststörung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'psychosexual_development_disorder_other',
    code: 'F66.8',
    name_de: 'Sonstige psychosexuelle Entwicklungsstörungen',
    crosswalkKey: 'F66.8',
    sourceRef: 'operationalisiert nach ICD-10 F66.8 / ICD-11 QA15.1',
    codingSystems: {
      icd10: { code: 'F66.8', label_de: 'Sonstige psychosexuelle Entwicklungsstörungen' },
      icd11: { code: 'QA15.1', label_de: 'Beratung im Zusammenhang mit sexuellem Verhalten und -orientierung' },
      dsm5tr: { code: '302.89', label_de: 'Other Specified Psychosexual Development Disorder (Crosswalk)' },
    },
    differentials_de: ['Geschlechtsdysphorie (F64)', 'Spezifische F66-Unterkategorien'],
    coreSymptomText_de: 'Näher bezeichnete psychosexuelle Entwicklungsstörung, die keiner der spezifischeren F66-Unterkategorien entspricht',
    domain: 'self_experience_ego_disturbance',
    presentMatch: /sexuell.*entwicklung|psychosexuell/i,
    exclusionText_de: 'Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'psychosexual_development_disorder_unspecified',
    code: 'F66.9',
    name_de: 'Psychosexuelle Entwicklungsstörung, nicht näher bezeichnet',
    crosswalkKey: 'F66.9',
    sourceRef: 'operationalisiert nach ICD-10 F66.9 / ICD-11 QA15.1',
    codingSystems: {
      icd10: { code: 'F66.9', label_de: 'Psychosexuelle Entwicklungsstörung, nicht näher bezeichnet' },
      icd11: { code: 'QA15.1', label_de: 'Beratung im Zusammenhang mit sexuellem Verhalten und -orientierung' },
      dsm5tr: { code: '302.9', label_de: 'Unspecified Psychosexual Development Disorder (Crosswalk)' },
    },
    differentials_de: ['Geschlechtsdysphorie (F64)', 'Spezifische F66-Unterkategorien'],
    coreSymptomText_de: 'Psychosexuelle Entwicklungsstörung ohne nähere Spezifizierung',
    domain: 'self_experience_ego_disturbance',
    presentMatch: /sexuell.*entwicklung|psychosexuell/i,
    holdingCategory: true,
    exclusionText_de: 'Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  stemAnchorDisorder({
    id: 'other_adult_personality_behaviour_stem',
    code: 'F68',
    name_de: 'Sonstige Störungen der erwachsenen Persönlichkeit und des Verhaltens',
    crosswalkKey: 'F68',
    sourceRef: 'operationalisiert nach ICD-10 F68 / ICD-11 6D5Z',
    codingSystems: {
      icd10: { code: 'F68', label_de: 'Sonstige Störungen der erwachsenen Persönlichkeit und des Verhaltens' },
      icd11: { code: '6D5Z', label_de: 'Artifizielle Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '300.19', label_de: 'Other Specified Personality Disorder (Crosswalk)' },
    },
    differentials_de: ['Artifizielle Störung (F68.1)', 'Symptomüberspitzung (F68.0)', 'Primäre Persönlichkeitsstörung (F60)'],
    coreSymptomText_de: 'Störung der erwachsenen Persönlichkeit oder des Verhaltens, die keiner spezifischeren F68-Unterkategorie zugeordnet ist',
    domain: 'personality_interpersonal_style',
    presentMatch: /pers[öo]nlichkeit|verhalten.*auff[äa]llig|symptom.*[üu]berspitz/i,
    exclusionText_de: 'Die Störung ist nicht besser durch eine primäre Persönlichkeitsstörung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'elaboration_physical_symptoms',
    code: 'F68.0',
    name_de: 'Überspitzung körperlicher Symptome aus psychologischen Gründen',
    crosswalkKey: 'F68.0',
    sourceRef: 'operationalisiert nach ICD-10 F68.0 / ICD-11 6E8Z',
    codingSystems: {
      icd10: { code: 'F68.0', label_de: 'Überspitzung körperlicher Symptome aus psychologischen Gründen' },
      icd11: { code: '6E8Z', label_de: 'Psychische, Verhaltens- oder neurodevelopmentale Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '300.19', label_de: 'Factitious Disorder Imposed on Self (Crosswalk)' },
    },
    differentials_de: ['Somatoforme Störung (F45)', 'Artifizielle Störung (F68.1)', 'Malingering'],
    coreSymptomText_de: 'Übertriebene Darstellung oder Überspitzung tatsächlich vorhandener körperlicher Symptome aus psychologischen Gründen (z. B. um Aufmerksamkeit oder Unterstützung zu erhalten), ohne bewusste Täuschungsabsicht',
    domain: 'somatic_preoccupation',
    presentMatch: /[üu]berspitz|dramatis|[üu]bertrieb.*symptom|krankheitsverhalten/i,
    exclusionText_de: 'Es liegt keine bewusste Täuschung oder Simulation vor (sonst F68.1)',
  }),

  specificCodeDisorder({
    id: 'factitious_disorder',
    code: 'F68.1',
    name_de: 'Artifizielle Störung (factitious disorder)',
    crosswalkKey: 'F68.1',
    sourceRef: 'operationalisiert nach ICD-10 F68.1 / ICD-11 6D50',
    codingSystems: {
      icd10: { code: 'F68.1', label_de: 'Absichtliche Erzeugung oder Vortäuschung von Symptomen oder Behinderungen' },
      icd11: { code: '6D50', label_de: 'Artifizielle Störung, selbstbezogen' },
      dsm5tr: { code: '300.19', label_de: 'Factitious Disorder (Crosswalk)' },
    },
    differentials_de: ['Malingering', 'Somatoforme Störung (F45)', 'Symptomüberspitzung (F68.0)'],
    coreSymptomText_de: 'Wiederholte, absichtliche Erzeugung oder Vortäuschung körperlicher oder psychischer Symptome oder Behinderungen, um in der Rolle eines kranken oder verletzten Patienten behandelt zu werden',
    domain: 'somatic_preoccupation',
    presentMatch: /factitious|vort[äa]usch|simulation|k[üu]nstlich.*symptom|krankenrolle/i,
    exclusionText_de: 'Die Symptome sind nicht besser durch eine somatoforme Störung ohne Täuschungsabsicht erklärbar',
  }),

  specificCodeDisorder({
    id: 'adult_personality_behaviour_disorder_other',
    code: 'F68.8',
    name_de: 'Sonstige näher bezeichnete Störungen der erwachsenen Persönlichkeit und des Verhaltens',
    crosswalkKey: 'F68.8',
    sourceRef: 'operationalisiert nach ICD-10 F68.8 / ICD-11 6E8Z',
    codingSystems: {
      icd10: { code: 'F68.8', label_de: 'Sonstige näher bezeichnete Störungen der erwachsenen Persönlichkeit und des Verhaltens' },
      icd11: { code: '6E8Z', label_de: 'Psychische, Verhaltens- oder neurodevelopmentale Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '300.89', label_de: 'Other Specified Personality Disorder (Crosswalk)' },
    },
    differentials_de: ['Artifizielle Störung (F68.1)', 'Symptomüberspitzung (F68.0)', 'Primäre Persönlichkeitsstörung (F60)'],
    coreSymptomText_de: 'Näher bezeichnete Störung der erwachsenen Persönlichkeit oder des Verhaltens, die keiner der spezifischeren F68-Unterkategorien entspricht',
    domain: 'personality_interpersonal_style',
    presentMatch: /pers[öo]nlichkeit|verhalten.*auff[äa]llig/i,
    exclusionText_de: 'Die Störung ist nicht besser durch eine primäre Persönlichkeitsstörung allein erklärbar',
  }),
]

// ---------------------------------------------------------------------------
// F8 — neurodevelopmental gaps
// ---------------------------------------------------------------------------

const f8GapDisorders: Disorder[] = [
  specificCodeDisorder({
    id: 'mixed_specific_developmental_disorder',
    code: 'F83',
    name_de: 'Gemischte spezifische Entwicklungsstörungen',
    crosswalkKey: 'F83',
    sourceRef: 'operationalisiert nach ICD-10 F83 / ICD-11 6A0Z',
    codingSystems: {
      icd10: { code: 'F83', label_de: 'Gemischte spezifische Entwicklungsstörungen' },
      icd11: { code: '6A0Z', label_de: 'Neurodevelopmentale Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '315.9', label_de: 'Specific Learning Disorder with Mixed Features (Crosswalk)' },
    },
    differentials_de: ['Legasthenie (F81.0)', 'Rechenstörung (F81.2)', 'Intellektuelle Entwicklungsstörung (F70–F79)'],
    coreSymptomText_de: 'Kombinierte, spezifische Entwicklungsstörungen in mindestens zwei Bereichen (z. B. Sprache und motorische Koordination oder Lesen und Rechnen), die nicht allein durch eine allgemeine intellektuelle Entwicklungsstörung erklärbar sind',
    domain: 'memory_cognition',
    presentMatch: /gemischt.*entwicklung|mehrere.*entwicklungsst[öo]r|kombiniert.*lern/i,
    exclusionText_de: 'Der Leistungsrückstand ist nicht allein durch eine intellektuelle Entwicklungsstörung oder soziale Deprivation erklärbar',
  }),

  specificCodeDisorder({
    id: 'other_psychological_development_disorder',
    code: 'F88',
    name_de: 'Sonstige Störungen der psychologischen Entwicklung',
    crosswalkKey: 'F88',
    sourceRef: 'operationalisiert nach ICD-10 F88 / ICD-11 6A0Z',
    codingSystems: {
      icd10: { code: 'F88', label_de: 'Sonstige Störungen der psychologischen Entwicklung' },
      icd11: { code: '6A0Z', label_de: 'Neurodevelopmentale Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '315.9', label_de: 'Other Specified Neurodevelopmental Disorder (Crosswalk)' },
    },
    differentials_de: ['ADHS (F90)', 'Autismus-Spektrum (F84)', 'Spezifische Entwicklungsstörungen (F80–F83)'],
    coreSymptomText_de: 'Näher bezeichnete Störung der psychologischen Entwicklung, die keiner der spezifischeren F8-Unterkategorien entspricht',
    domain: 'memory_cognition',
    presentMatch: /entwicklungsst[öo]r|entwicklungsverz[öo]ger/i,
    exclusionText_de: 'Die Störung ist nicht besser durch eine intellektuelle Entwicklungsstörung oder eine primäre psychische Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'unspecified_psychological_development_disorder',
    code: 'F89',
    name_de: 'Nicht näher bezeichnete Störung der psychologischen Entwicklung',
    crosswalkKey: 'F89',
    sourceRef: 'operationalisiert nach ICD-10 F89 / ICD-11 6A0Z',
    codingSystems: {
      icd10: { code: 'F89', label_de: 'Nicht näher bezeichnete Störung der psychologischen Entwicklung' },
      icd11: { code: '6A0Z', label_de: 'Neurodevelopmentale Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '315.9', label_de: 'Unspecified Neurodevelopmental Disorder (Crosswalk)' },
    },
    differentials_de: ['ADHS (F90)', 'Autismus-Spektrum (F84)', 'Spezifische Entwicklungsstörungen (F80–F83)'],
    coreSymptomText_de: 'Störung der psychologischen Entwicklung ohne nähere Spezifizierung',
    domain: 'memory_cognition',
    presentMatch: /entwicklungsst[öo]r|entwicklungsverz[öo]ger/i,
    holdingCategory: true,
    exclusionText_de: 'Die Störung ist nicht besser durch eine intellektuelle Entwicklungsstörung allein erklärbar',
  }),
]

// ---------------------------------------------------------------------------
// F9 — childhood-onset gaps
// ---------------------------------------------------------------------------

const f9GapDisorders: Disorder[] = [
  stemAnchorDisorder({
    id: 'childhood_emotional_disorders_stem',
    code: 'F93',
    name_de: 'Emotionale Störungen mit Beginn in der Kindheit',
    crosswalkKey: 'F93',
    sourceRef: 'operationalisiert nach ICD-10 F93 / ICD-11 6B0Z',
    codingSystems: {
      icd10: { code: 'F93', label_de: 'Emotionale Störungen mit Beginn in der Kindheit' },
      icd11: { code: '6B0Z', label_de: 'Angst- oder furchtbezogene Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '313.89', label_de: 'Other Specified Childhood Emotional Disorder (Crosswalk)' },
    },
    differentials_de: ['Trennungsangst (F93.0)', 'Phobische Angst im Kindesalter (F93.1)', 'Soziale Angst im Kindesalter (F93.2)'],
    coreSymptomText_de: 'Emotionale Störung mit Beginn in der Kindheit, die keiner spezifischeren F93-Unterkategorie zugeordnet ist',
    domain: 'anxiety_panic_phobic_symptoms',
    presentMatch: /kind.*angst|kind.*emotion|trennungsangst|kindesalter.*[äa]ngst/i,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine primäre affektive oder Angststörung des Erwachsenenalters allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'childhood_phobic_anxiety',
    code: 'F93.1',
    name_de: 'Phobische Angststörung im Kindesalter',
    crosswalkKey: 'F93.1',
    sourceRef: 'operationalisiert nach ICD-10 F93.1 / ICD-11 6C9Z',
    codingSystems: {
      icd10: { code: 'F93.1', label_de: 'Phobische Angststörung im Kindesalter' },
      icd11: { code: '6C9Z', label_de: 'Störungen mit Störung des Sozialverhaltens, nicht näher bezeichnet' },
      dsm5tr: { code: '300.23', label_de: 'Specific Phobia in Children (Crosswalk)' },
    },
    differentials_de: ['Spezifische Phobie (F40.2)', 'Trennungsangst (F93.0)', 'Normaler Entwicklungsangst'],
    coreSymptomText_de: 'Ausgeprägte, altersunangemessene Angst vor bestimmten Objekten oder Situationen mit Vermeidung oder Ertragen nur unter Leidensdruck, mit Beginn in der Kindheit',
    domain: 'anxiety_panic_phobic_symptoms',
    presentMatch: /kind.*phob|phob.*kind|angst.*objekt|angst.*situation.*kind/i,
    exclusionText_de: 'Die Angst ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'childhood_social_anxiety',
    code: 'F93.2',
    name_de: 'Soziale Angststörung im Kindesalter',
    crosswalkKey: 'F93.2',
    sourceRef: 'operationalisiert nach ICD-10 F93.2 / ICD-11 6C9Z',
    codingSystems: {
      icd10: { code: 'F93.2', label_de: 'Soziale Angststörung im Kindesalter' },
      icd11: { code: '6C9Z', label_de: 'Störungen mit Störung des Sozialverhaltens, nicht näher bezeichnet' },
      dsm5tr: { code: '300.23', label_de: 'Social Anxiety Disorder in Children (Crosswalk)' },
    },
    differentials_de: ['Soziale Phobie (F40.1)', 'Mutismus (F94.0)', 'Autismus-Spektrum (F84)'],
    coreSymptomText_de: 'Ausgeprägte, altersunangemessene Angst in sozialen Situationen mit Vermeidung oder Ertragen nur unter Leidensdruck, mit Beginn in der Kindheit',
    domain: 'anxiety_panic_phobic_symptoms',
    presentMatch: /sozial.*angst.*kind|kind.*sozial.*angst|sch[üu]chtern.*ausgepr[äa]gt/i,
    exclusionText_de: 'Die Angst ist nicht besser durch Autismus-Spektrum-Störung oder Mutismus allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'sibling_rivalry_disorder',
    code: 'F93.3',
    name_de: 'Geschwisterrivalität',
    crosswalkKey: 'F93.3',
    sourceRef: 'operationalisiert nach ICD-10 F93.3 / ICD-11 6C9Z',
    codingSystems: {
      icd10: { code: 'F93.3', label_de: 'Geschwisterrivalität' },
      icd11: { code: '6C9Z', label_de: 'Störungen mit Störung des Sozialverhaltens, nicht näher bezeichnet' },
      dsm5tr: { code: '313.89', label_de: 'Sibling Relational Problem (Crosswalk)' },
    },
    differentials_de: ['Normale Geschwisterrivalität', 'Verhaltensstörung (F91)', 'Anpassungsstörung nach Geschwistergeburt'],
    coreSymptomText_de: 'Ausgeprägte Eifersucht, Rivalität oder aggressives Verhalten gegenüber einem Geschwisterkind, das über altersübliche Reaktionen auf die Geburt oder Anwesenheit eines Geschwisters hinausgeht und zu Funktionsbeeinträchtigung führt',
    domain: 'mood_affect',
    presentMatch: /geschwister|rivalit[äa]t|eifersucht.*geschwister|aggressiv.*geschwister/i,
    exclusionText_de: 'Das Verhalten ist nicht besser durch eine Verhaltensstörung oder eine primäre affektive Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'childhood_emotional_disorder_other',
    code: 'F93.8',
    name_de: 'Sonstige emotionale Störungen mit Beginn in der Kindheit',
    crosswalkKey: 'F93.8',
    sourceRef: 'operationalisiert nach ICD-10 F93.8 / ICD-11 6C9Z',
    codingSystems: {
      icd10: { code: 'F93.8', label_de: 'Sonstige emotionale Störungen mit Beginn in der Kindheit' },
      icd11: { code: '6C9Z', label_de: 'Störungen mit Störung des Sozialverhaltens, nicht näher bezeichnet' },
      dsm5tr: { code: '313.89', label_de: 'Other Specified Childhood Emotional Disorder (Crosswalk)' },
    },
    differentials_de: ['Trennungsangst (F93.0)', 'Phobische Angst im Kindesalter (F93.1)'],
    coreSymptomText_de: 'Näher bezeichnete emotionale Störung mit Beginn in der Kindheit, die keiner der spezifischeren F93-Unterkategorien entspricht',
    domain: 'mood_affect',
    presentMatch: /kind.*emotion|emotion.*kindesalter/i,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'childhood_emotional_disorder_unspecified',
    code: 'F93.9',
    name_de: 'Emotionale Störung mit Beginn in der Kindheit, nicht näher bezeichnet',
    crosswalkKey: 'F93.9',
    sourceRef: 'operationalisiert nach ICD-10 F93.9 / ICD-11 6C9Z',
    codingSystems: {
      icd10: { code: 'F93.9', label_de: 'Emotionale Störung mit Beginn in der Kindheit, nicht näher bezeichnet' },
      icd11: { code: '6C9Z', label_de: 'Störungen mit Störung des Sozialverhaltens, nicht näher bezeichnet' },
      dsm5tr: { code: '313.9', label_de: 'Unspecified Childhood Emotional Disorder (Crosswalk)' },
    },
    differentials_de: ['Trennungsangst (F93.0)', 'Phobische Angst im Kindesalter (F93.1)'],
    coreSymptomText_de: 'Emotionale Störung mit Beginn in der Kindheit ohne nähere Spezifizierung',
    domain: 'mood_affect',
    presentMatch: /kind.*emotion|emotion.*kindesalter/i,
    holdingCategory: true,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  stemAnchorDisorder({
    id: 'childhood_social_functioning_disorders_stem',
    code: 'F94',
    name_de: 'Störungen des Sozialverhaltens mit Beginn in Kindheit und Jugend',
    crosswalkKey: 'F94',
    sourceRef: 'operationalisiert nach ICD-10 F94 / ICD-11 6B0Z',
    codingSystems: {
      icd10: { code: 'F94', label_de: 'Störungen des Sozialverhaltens mit Beginn in Kindheit und Jugend' },
      icd11: { code: '6B0Z', label_de: 'Angst- oder furchtbezogene Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '313.89', label_de: 'Other Specified Childhood Social Functioning Disorder (Crosswalk)' },
    },
    differentials_de: ['Elektiver Mutismus (F94.0)', 'Reaktive Bindungsstörung (F94.1)', 'Bindungsstörung mit Enthemmung (F94.2)'],
    coreSymptomText_de: 'Störung des Sozialverhaltens mit Beginn in Kindheit oder Jugend, die keiner spezifischeren F94-Unterkategorie zugeordnet ist',
    domain: 'personality_interpersonal_style',
    presentMatch: /sozial.*kind|bindung.*kind|mutismus|sozialverhalten.*kind/i,
    exclusionText_de: 'Die Störung ist nicht besser durch Autismus-Spektrum-Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'childhood_social_functioning_disorder_other',
    code: 'F94.8',
    name_de: 'Sonstige Störungen des Sozialverhaltens mit Beginn in Kindheit und Jugend',
    crosswalkKey: 'F94.8',
    sourceRef: 'operationalisiert nach ICD-10 F94.8 / ICD-11 6C9Z',
    codingSystems: {
      icd10: { code: 'F94.8', label_de: 'Sonstige Störungen des Sozialverhaltens mit Beginn in Kindheit und Jugend' },
      icd11: { code: '6C9Z', label_de: 'Störungen mit Störung des Sozialverhaltens, nicht näher bezeichnet' },
      dsm5tr: { code: '313.89', label_de: 'Other Specified Childhood Social Functioning Disorder (Crosswalk)' },
    },
    differentials_de: ['Elektiver Mutismus (F94.0)', 'Bindungsstörungen (F94.1/F94.2)'],
    coreSymptomText_de: 'Näher bezeichnete Störung des Sozialverhaltens mit Beginn in Kindheit oder Jugend, die keiner der spezifischeren F94-Unterkategorien entspricht',
    domain: 'personality_interpersonal_style',
    presentMatch: /sozial.*kind|sozialverhalten.*kind/i,
    exclusionText_de: 'Die Störung ist nicht besser durch Autismus-Spektrum-Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'childhood_social_functioning_disorder_unspecified',
    code: 'F94.9',
    name_de: 'Störung des Sozialverhaltens mit Beginn in Kindheit und Jugend, nicht näher bezeichnet',
    crosswalkKey: 'F94.9',
    sourceRef: 'operationalisiert nach ICD-10 F94.9 / ICD-11 6C9Z',
    codingSystems: {
      icd10: { code: 'F94.9', label_de: 'Störung des Sozialverhaltens mit Beginn in Kindheit und Jugend, nicht näher bezeichnet' },
      icd11: { code: '6C9Z', label_de: 'Störungen mit Störung des Sozialverhaltens, nicht näher bezeichnet' },
      dsm5tr: { code: '313.9', label_de: 'Unspecified Childhood Social Functioning Disorder (Crosswalk)' },
    },
    differentials_de: ['Elektiver Mutismus (F94.0)', 'Bindungsstörungen (F94.1/F94.2)'],
    coreSymptomText_de: 'Störung des Sozialverhaltens mit Beginn in Kindheit oder Jugend ohne nähere Spezifizierung',
    domain: 'personality_interpersonal_style',
    presentMatch: /sozial.*kind|sozialverhalten.*kind/i,
    holdingCategory: true,
    exclusionText_de: 'Die Störung ist nicht besser durch Autismus-Spektrum-Störung allein erklärbar',
  }),

  stemAnchorDisorder({
    id: 'childhood_behavioural_emotional_disorders_stem',
    code: 'F98',
    name_de: 'Sonstige Verhaltens- und emotionale Störungen mit Beginn in der Kindheit und Jugend',
    crosswalkKey: 'F98',
    sourceRef: 'operationalisiert nach ICD-10 F98 / ICD-11 6B0Z',
    codingSystems: {
      icd10: { code: 'F98', label_de: 'Sonstige Verhaltens- und emotionale Störungen mit Beginn in der Kindheit und Jugend' },
      icd11: { code: '6B0Z', label_de: 'Angst- oder furchtbezogene Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '313.9', label_de: 'Other Childhood Behavioral and Emotional Disorders (Crosswalk)' },
    },
    differentials_de: ['Enuresis (F98.0)', 'Enkopresis (F98.1)', 'Pica (F98.3)', 'Stereotype Bewegungsstörung (F98.4)'],
    coreSymptomText_de: 'Verhaltens- oder emotionale Störung mit Beginn in Kindheit oder Jugend, die keiner spezifischeren F98-Unterkategorie zugeordnet ist',
    domain: 'appearance_behavior',
    presentMatch: /kind.*verhalten|verhalten.*kind|enuresis|enkopresis|pica/i,
    exclusionText_de: 'Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'pica_childhood',
    code: 'F98.3',
    name_de: 'Pica im Kindesalter',
    crosswalkKey: 'F98.3',
    sourceRef: 'operationalisiert nach ICD-10 F98.3 / ICD-11 6B84',
    codingSystems: {
      icd10: { code: 'F98.3', label_de: 'Pica im Kindesalter' },
      icd11: { code: '6B84', label_de: 'Pica' },
      dsm5tr: { code: '307.52', label_de: 'Pica (Crosswalk)' },
    },
    differentials_de: ['Normales exploratives Verhalten im Kleinkindalter', 'Intellektuelle Entwicklungsstörung', 'Zwangsstörung'],
    coreSymptomText_de: 'Wiederholtes oder anhaltendes Essen nicht essbarer Substanzen (z. B. Erde, Farbe, Sand, Papier) über ein altersgerechtes Maß hinaus, über mindestens einen Monat',
    domain: 'sleep_appetite_vegetative',
    presentMatch: /pica|nicht\s+essbar|erde.*essen|farbe.*essen|papier.*essen/i,
    exclusionText_de: 'Das Verhalten ist nicht besser durch eine intellektuelle Entwicklungsstörung oder kulturelle Praxis allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'childhood_behavioural_disorder_other',
    code: 'F98.8',
    name_de: 'Sonstige näher bezeichnete Verhaltens- und emotionale Störungen mit Beginn in der Kindheit und Jugend',
    crosswalkKey: 'F98.8',
    sourceRef: 'operationalisiert nach ICD-10 F98.8 / ICD-11 6E8Z',
    codingSystems: {
      icd10: { code: 'F98.8', label_de: 'Sonstige näher bezeichnete Verhaltens- und emotionale Störungen mit Beginn in der Kindheit und Jugend' },
      icd11: { code: '6E8Z', label_de: 'Psychische, Verhaltens- oder neurodevelopmentale Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '313.89', label_de: 'Other Specified Childhood Behavioral Disorder (Crosswalk)' },
    },
    differentials_de: ['Enuresis (F98.0)', 'Enkopresis (F98.1)', 'Pica (F98.3)'],
    coreSymptomText_de: 'Näher bezeichnete Verhaltens- oder emotionale Störung mit Beginn in Kindheit oder Jugend, die keiner der spezifischeren F98-Unterkategorien entspricht',
    domain: 'appearance_behavior',
    presentMatch: /kind.*verhalten|verhalten.*kind/i,
    exclusionText_de: 'Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'childhood_behavioural_disorder_unspecified',
    code: 'F98.9',
    name_de: 'Verhaltens- und emotionale Störung mit Beginn in der Kindheit und Jugend, nicht näher bezeichnet',
    crosswalkKey: 'F98.9',
    sourceRef: 'operationalisiert nach ICD-10 F98.9 / ICD-11 6E8Z',
    codingSystems: {
      icd10: { code: 'F98.9', label_de: 'Verhaltens- und emotionale Störung mit Beginn in der Kindheit und Jugend, nicht näher bezeichnet' },
      icd11: { code: '6E8Z', label_de: 'Psychische, Verhaltens- oder neurodevelopmentale Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '313.9', label_de: 'Unspecified Childhood Behavioral Disorder (Crosswalk)' },
    },
    differentials_de: ['Enuresis (F98.0)', 'Enkopresis (F98.1)', 'Pica (F98.3)'],
    coreSymptomText_de: 'Verhaltens- oder emotionale Störung mit Beginn in Kindheit oder Jugend ohne nähere Spezifizierung',
    domain: 'appearance_behavior',
    presentMatch: /kind.*verhalten|verhalten.*kind/i,
    holdingCategory: true,
    exclusionText_de: 'Die Störung ist nicht besser durch eine andere psychische Störung allein erklärbar',
  }),

  specificCodeDisorder({
    id: 'unspecified_mental_disorder',
    code: 'F99',
    name_de: 'Nicht näher bezeichnete psychische Störung',
    crosswalkKey: 'F99',
    sourceRef: 'operationalisiert nach ICD-10 F99 / ICD-11 6E8Z',
    codingSystems: {
      icd10: { code: 'F99', label_de: 'Nicht näher bezeichnete psychische Störung' },
      icd11: { code: '6E8Z', label_de: 'Psychische, Verhaltens- oder neurodevelopmentale Störungen, nicht näher bezeichnet' },
      dsm5tr: { code: '300.9', label_de: 'Unspecified Mental Disorder (Crosswalk)' },
    },
    differentials_de: [
      'Spezifische psychische Störung bei vollständiger Kriterienerfüllung',
      'Organische oder substanzbedingte Störung',
      'Normale Reaktion auf Lebensumstände',
    ],
    coreSymptomText_de:
      'Eine klinisch bedeutsame psychische Symptomatik liegt vor, kann aber mangels ausreichender Information keiner spezifischen psychischen Störung zugeordnet werden',
    holdingCategory: true,
    exclusionText_de: 'Die Symptomatik ist nicht besser durch eine somatische Erkrankung allein erklärbar',
  }),
]

export const crosswalkGapDisordersF6F8F9: Disorder[] = [
  ...f6GapDisorders,
  ...f8GapDisorders,
  ...f9GapDisorders,
]
