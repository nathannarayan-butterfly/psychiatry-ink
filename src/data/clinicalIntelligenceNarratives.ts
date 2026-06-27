/**
 * Clinical Intelligence — pre-baked demo narratives in DE / EN / FR / ES.
 *
 * The demo CI run stores English text in persisted state for backwards
 * compatibility. At display time, `localizeClinicalIntelligenceRunForDisplay`
 * overlays these locale-specific clinical paraphrases (licensing-safe originals).
 */

import type { UiLanguage } from '../types/settings'
import type {
  ClinicalIntelligenceDimensionId,
  ClinicalIntelligenceMechanismId,
  ExploratoryNote,
} from '../types/clinicalIntelligence'

type LocaleMap<T> = Record<UiLanguage, T>

export interface CiDimensionalNarrative {
  clinicalSummary: string
  longitudinalPattern: string
  uncertainty: string
  missingData: string
}

export interface CiMechanismNarrative {
  clinicalImplication: string
  treatmentRelevance: string
  uncertainty: string
}

/** Demo dimensional findings — keyed by stable dimension id. */
export const DEMO_DIMENSION_NARRATIVES: Partial<
  Record<ClinicalIntelligenceDimensionId, LocaleMap<CiDimensionalNarrative>>
> = {
  'aberrant-salience-psychotic-meaning': {
    en: {
      clinicalSummary:
        'Persistent persecutory and surveillance beliefs with limited insight; content aligns with first-rank symptom cluster under stress.',
      longitudinalPattern:
        'Escalated over 2 weeks with sleep loss and stimulant use; partial response after antipsychotic switch.',
      uncertainty: 'Substance contribution vs primary psychosis remains partially unresolved.',
      missingData: 'Collateral history from outpatient team not yet available.',
    },
    de: {
      clinicalSummary:
        'Anhaltende Verfolgungs- und Überwachungsüberzeugungen mit eingeschränktem Krankheitseinsicht; Inhalt passt unter Belastung zum Cluster erst-rangiger Symptome.',
      longitudinalPattern:
        'Zunahme über 2 Wochen bei Schlafmangel und täglichem Alkoholkonsum; partielle Besserung nach Antipsychotikumwechsel und Abstinenz.',
      uncertainty:
        'Beitrag von Substanzen vs. primäre Psychose bleibt teilweise ungeklärt.',
      missingData: 'Kollateralanamnese vom ambulanten Team noch nicht verfügbar.',
    },
    fr: {
      clinicalSummary:
        'Croyances persistantes de persécution et de surveillance avec insight limité ; le contenu correspond, sous stress, au cluster de symptômes de premier rang.',
      longitudinalPattern:
        'Aggravation sur 2 semaines avec privation de sommeil et usage de stimulants ; réponse partielle après changement d’antipsychotique.',
      uncertainty:
        'Contribution des substances vs psychose primaire reste partiellement non résolue.',
      missingData: 'Anamnèse collatérale de l’équipe ambulatoire pas encore disponible.',
    },
    es: {
      clinicalSummary:
        'Creencias persistentes de persecución y vigilancia con insight limitado; el contenido encaja, bajo estrés, con el clúster de síntomas de primer rango.',
      longitudinalPattern:
        'Empeoramiento en 2 semanas con privación de sueño y uso de estimulantes; respuesta parcial tras cambio de antipsicótico.',
      uncertainty:
        'Contribución de sustancias frente a psicosis primaria permanece parcialmente sin resolver.',
      missingData: 'Historia colateral del equipo ambulatorio aún no disponible.',
    },
  },
  'sleep-circadian-regulation': {
    en: {
      clinicalSummary:
        'Marked insomnia and circadian disruption — likely both precipitant and maintaining factor.',
      longitudinalPattern:
        'Severe sleep restriction (<3 h/night) preceded decompensation; improving to 5–6 h on ward.',
      uncertainty: '',
      missingData: 'Actigraphy not performed.',
    },
    de: {
      clinicalSummary:
        'Ausgeprägte Insomnie und zirkadiane Störung — wahrscheinlich sowohl Auslöser als auch aufrechterhaltender Faktor.',
      longitudinalPattern:
        'Schwere Schlafrestriktion (<3 h/Nacht) ging der Dekompensation voraus; auf Station Besserung auf 5–6 h.',
      uncertainty: '',
      missingData: 'Aktigraphie nicht durchgeführt.',
    },
    fr: {
      clinicalSummary:
        'Insomnie marquée et perturbation circadienne — probablement facteur déclenchant et mainteneur.',
      longitudinalPattern:
        'Restriction sévère du sommeil (<3 h/nuit) avant la décompensation ; amélioration à 5–6 h à l’unité.',
      uncertainty: '',
      missingData: 'Actigraphie non réalisée.',
    },
    es: {
      clinicalSummary:
        'Insomnio marcado y alteración circadiana — probablemente factor precipitante y mantenedor.',
      longitudinalPattern:
        'Restricción grave del sueño (<3 h/noche) antes de la descompensación; mejora a 5–6 h en planta.',
      uncertainty: '',
      missingData: 'Actigrafía no realizada.',
    },
  },
  'substance-addictive-contribution': {
    en: {
      clinicalSummary:
        'Active substance use likely lowered threshold for psychotic relapse; abstinence is a treatment target.',
      longitudinalPattern:
        'Daily cannabis and episodic amphetamine use in weeks before admission.',
      uncertainty: 'Timeline does not fully explain 5-week symptom course alone.',
      missingData: 'Quantitative toxicology panel pending at discharge.',
    },
    de: {
      clinicalSummary:
        'Aktiver Substanzkonsum hat vermutlich die Schwelle für psychotischen Rückfall gesenkt; Abstinenz ist Behandlungsziel.',
      longitudinalPattern:
        'Täglicher Alkoholkonsum (ca. 0,5–1 l Wein/Tag) in den Wochen vor Aufnahme; Abstinenz seit stationärer Aufnahme.',
      uncertainty: 'Zeitverlauf erklärt den 5-wöchigen Symptomverlauf allein nicht vollständig.',
      missingData: 'Quantitatives Toxikologiepanel bei Entlassung ausstehend.',
    },
    fr: {
      clinicalSummary:
        'Consommation active de substances ayant probablement abaissé le seuil de rechute psychotique ; l’abstinence est un objectif thérapeutique.',
      longitudinalPattern:
        'Cannabis quotidien et usage épisodique d’amphétamines dans les semaines précédant l’admission.',
      uncertainty: 'La chronologie n’explique pas à elle seule l’évolution symptomatique de 5 semaines.',
      missingData: 'Bilan toxicologique quantitatif en attente à la sortie.',
    },
    es: {
      clinicalSummary:
        'Uso activo de sustancias que probablemente redujo el umbral de recaída psicótica; la abstinencia es un objetivo terapéutico.',
      longitudinalPattern:
        'Cannabis diario y uso episódico de anfetaminas en las semanas previas al ingreso.',
      uncertainty: 'La cronología no explica por sí sola el curso sintomático de 5 semanas.',
      missingData: 'Panel toxicológico cuantitativo pendiente al alta.',
    },
  },
  'anxiety-threat-anticipation': {
    en: {
      clinicalSummary:
        'Heightened threat anticipation — may amplify misinterpretation of neutral social cues.',
      longitudinalPattern: 'Situational anxiety in public spaces; overlaps with paranoid ideation.',
      uncertainty: '',
      missingData: '',
    },
    de: {
      clinicalSummary:
        'Erhöhte Bedrohungserwartung — kann Fehldeutung neutraler sozialer Signale verstärken.',
      longitudinalPattern:
        'Situationsangst in öffentlichen Räumen; Überschneidung mit paranoider Ideation.',
      uncertainty: '',
      missingData: '',
    },
    fr: {
      clinicalSummary:
        'Anticipation accrue de menace — peut amplifier la mauvaise interprétation de signaux sociaux neutres.',
      longitudinalPattern:
        'Anxiété situationnelle dans les espaces publics ; recoupement avec l’idéation paranoïde.',
      uncertainty: '',
      missingData: '',
    },
    es: {
      clinicalSummary:
        'Anticipación elevada de amenaza — puede amplificar la mala interpretación de señales sociales neutras.',
      longitudinalPattern:
        'Ansiedad situacional en espacios públicos; solapamiento con ideación paranoide.',
      uncertainty: '',
      missingData: '',
    },
  },
  'negative-deficit-dimension': {
    en: {
      clinicalSummary:
        'Avolition and social disengagement present but less prominent than positive symptoms.',
      longitudinalPattern: 'Reduced drive and social withdrawal over past 3 months.',
      uncertainty: 'May improve as sleep and substance use stabilise.',
      missingData: '',
    },
    de: {
      clinicalSummary:
        'Avolition und sozialer Rückzug vorhanden, aber weniger ausgeprägt als positive Symptome.',
      longitudinalPattern: 'Verminderter Antrieb und sozialer Rückzug in den letzten 3 Monaten.',
      uncertainty: 'Kann sich bei Stabilisierung von Schlaf und Substanzkonsum bessern.',
      missingData: '',
    },
    fr: {
      clinicalSummary:
        'Avolition et retrait social présents mais moins marqués que les symptômes positifs.',
      longitudinalPattern: 'Diminution de la pulsion et retrait social sur les 3 derniers mois.',
      uncertainty: 'Peut s’améliorer avec la stabilisation du sommeil et de la consommation.',
      missingData: '',
    },
    es: {
      clinicalSummary:
        'Avolición y retraimiento social presentes, pero menos prominentes que los síntomas positivos.',
      longitudinalPattern: 'Disminución del impulso y retraimiento social en los últimos 3 meses.',
      uncertainty: 'Puede mejorar al estabilizarse el sueño y el consumo de sustancias.',
      missingData: '',
    },
  },
  'affective-instability-emotion-regulation': {
    en: {
      clinicalSummary:
        'Emotional lability without sustained manic episode — monitor for mood polarity.',
      longitudinalPattern: 'Labile affect between irritable and anxious poles during admission.',
      uncertainty: '',
      missingData: '',
    },
    de: {
      clinicalSummary:
        'Emotionale Labilität ohne anhaltende manische Episode — Stimmungspolarität beobachten.',
      longitudinalPattern:
        'Labile Affektivität zwischen reizbarer und ängstlicher Polung während der Aufnahme.',
      uncertainty: '',
      missingData: '',
    },
    fr: {
      clinicalSummary:
        'Labilité émotionnelle sans épisode maniaque soutenu — surveiller la polarité de l’humeur.',
      longitudinalPattern:
        'Affect labile entre pôles irritable et anxieux pendant l’admission.',
      uncertainty: '',
      missingData: '',
    },
    es: {
      clinicalSummary:
        'Labilidad emocional sin episodio maníaco sostenido — vigilar polaridad del estado de ánimo.',
      longitudinalPattern:
        'Afecto lábil entre polos irritable y ansioso durante el ingreso.',
      uncertainty: '',
      missingData: '',
    },
  },
  'functional-longitudinal-adaptation': {
    en: {
      clinicalSummary:
        'Psychosocial stressors and functional decline — discharge planning must address housing and work.',
      longitudinalPattern:
        'Job loss and housing stress 3 months before admission; occupational function impaired.',
      uncertainty: '',
      missingData: 'Social services assessment in progress.',
    },
    de: {
      clinicalSummary:
        'Psychosoziale Belastungen und Funktionsverlust — Entlassplanung muss Wohnen und Arbeit adressieren.',
      longitudinalPattern:
        'Arbeitsplatzverlust und Wohnstress 3 Monate vor Aufnahme; berufliche Funktion beeinträchtigt.',
      uncertainty: '',
      missingData: 'Sozialdienstliche Beurteilung läuft.',
    },
    fr: {
      clinicalSummary:
        'Facteurs de stress psychosocial et déclin fonctionnel — la planification de sortie doit couvrir logement et travail.',
      longitudinalPattern:
        'Perte d’emploi et stress logement 3 mois avant l’admission ; fonction professionnelle altérée.',
      uncertainty: '',
      missingData: 'Évaluation des services sociaux en cours.',
    },
    es: {
      clinicalSummary:
        'Estresores psicosociales y deterioro funcional — la planificación del alta debe abordar vivienda y trabajo.',
      longitudinalPattern:
        'Pérdida de empleo y estrés habitacional 3 meses antes del ingreso; función ocupacional deteriorada.',
      uncertainty: '',
      missingData: 'Evaluación de servicios sociales en curso.',
    },
  },
}

/** Demo mechanism hypotheses — keyed by stable mechanism id. */
export const DEMO_MECHANISM_NARRATIVES: Partial<
  Record<ClinicalIntelligenceMechanismId, LocaleMap<CiMechanismNarrative>>
> = {
  'dopamine-aberrant-salience-dysregulation': {
    en: {
      clinicalImplication:
        'Positive symptoms and salience disturbances fit mesolimbic dopamine dysregulation — antipsychotic response supports this pathway.',
      treatmentRelevance:
        'Continue partial D2 agonist (aripiprazole); monitor for akathisia. Avoid prolactin-elevating agents given prior hyperprolactinaemia on risperidone.',
      uncertainty: 'Stimulant-induced dopamine surge may have contributed acutely.',
    },
    de: {
      clinicalImplication:
        'Positive Symptome und Salienzstörungen passen zu mesolimbaler Dopamin-Dysregulation — Antipsychotikaansprechen stützt diesen Pfad.',
      treatmentRelevance:
        'Partiellen D2-Agonisten (Aripiprazol) fortführen; auf Akathisie achten. Prolaktinerhöhende Mittel vermeiden wegen früherer Hyperprolaktinämie unter Risperidon.',
      uncertainty: 'Stimulanzieninduzierter Dopaminanstieg könnte akut beigetragen haben.',
    },
    fr: {
      clinicalImplication:
        'Symptômes positifs et troubles de saillance compatibles avec une dysrégulation dopaminergique méso-limbique — la réponse aux antipsychotiques soutient cette voie.',
      treatmentRelevance:
        'Poursuivre l’agoniste partiel D2 (aripiprazole) ; surveiller l’akathisie. Éviter les agents élevant la prolactine compte tenu d’une hyperprolactinémie antérieure sous rispéridone.',
      uncertainty: 'Un pic dopaminergique induit par les stimulants a pu contribuer de façon aiguë.',
    },
    es: {
      clinicalImplication:
        'Síntomas positivos y alteraciones de saliencia encajan con disregulación dopaminérgica mesolímbica — la respuesta a antipsicóticos apoya esta vía.',
      treatmentRelevance:
        'Continuar agonista parcial D2 (aripiprazol); vigilar acatisia. Evitar fármacos que eleven prolactina dada hiperprolactinemia previa con risperidona.',
      uncertainty: 'Un pico dopaminérgico inducido por estimulantes pudo contribuir de forma aguda.',
    },
  },
  'stress-system-hpa-axis-dysregulation': {
    en: {
      clinicalImplication:
        'Chronic psychosocial stress and sleep deprivation may have sensitized stress-response systems.',
      treatmentRelevance:
        'Sleep hygiene, stress management, and structured daily routine as adjuncts to antipsychotic therapy.',
      uncertainty: 'No cortisol sampling in this demo dataset.',
    },
    de: {
      clinicalImplication:
        'Chronischer psychosozialer Stress und Schlafentzug könnten Stressreaktionssysteme sensibilisiert haben.',
      treatmentRelevance:
        'Schlafhygiene, Stressmanagement und strukturierter Tagesablauf als Ergänzung zur antipsychotischen Therapie.',
      uncertainty: 'Keine Cortisolbestimmung in diesem Demo-Datensatz.',
    },
    fr: {
      clinicalImplication:
        'Stress psychosocial chronique et privation de sommeil ont pu sensibiliser les systèmes de réponse au stress.',
      treatmentRelevance:
        'Hygiène du sommeil, gestion du stress et routine quotidienne structurée en complément du traitement antipsychotique.',
      uncertainty: 'Pas de dosage de cortisol dans ce jeu de données démo.',
    },
    es: {
      clinicalImplication:
        'Estrés psicosocial crónico y privación de sueño pudieron sensibilizar los sistemas de respuesta al estrés.',
      treatmentRelevance:
        'Higiene del sueño, manejo del estrés y rutina diaria estructurada como complemento a la terapia antipsicótica.',
      uncertainty: 'Sin muestreo de cortisol en este conjunto de datos demo.',
    },
  },
  'glutamate-gaba-dysconnectivity': {
    en: {
      clinicalImplication:
        'Mild formal thought disorder suggests E/I imbalance may contribute alongside dopamine pathways.',
      treatmentRelevance:
        'Consider NMDA-modulating strategies only within specialist pathways — not first-line here.',
      uncertainty: 'Exploratory — insufficient direct evidence.',
    },
    de: {
      clinicalImplication:
        'Leichte Denkstörung legt nahe, dass E/I-Ungleichgewicht neben Dopaminpfaden mitwirken könnte.',
      treatmentRelevance:
        'NMDA-modulierende Strategien nur in spezialisierten Pfaden erwägen — hier nicht First-line.',
      uncertainty: 'Explorativ — unzureichende direkte Evidenz.',
    },
    fr: {
      clinicalImplication:
        'Trouble formel de la pensée léger suggère qu’un déséquilibre E/I pourrait contribuer aux côtés des voies dopaminergiques.',
      treatmentRelevance:
        'Envisager des stratégies modulant le NMDA uniquement dans des filières spécialisées — pas de première intention ici.',
      uncertainty: 'Exploratoire — preuves directes insuffisantes.',
    },
    es: {
      clinicalImplication:
        'Leve trastorno formal del pensamiento sugiere que un desequilibrio E/I podría contribuir junto a vías dopaminérgicas.',
      treatmentRelevance:
        'Considerar estrategias moduladoras del NMDA solo en vías especializadas — no de primera línea aquí.',
      uncertainty: 'Exploratorio — evidencia directa insuficiente.',
    },
  },
  'circadian-sleep-wake-dysregulation': {
    en: {
      clinicalImplication:
        'Sleep loss is a plausible precipitant of psychotic decompensation in this case.',
      treatmentRelevance:
        'Prioritise sleep stabilisation; limit PRN benzodiazepine to avoid dependence.',
      uncertainty: '',
    },
    de: {
      clinicalImplication:
        'Schlafverlust ist in diesem Fall ein plausibler Auslöser psychotischer Dekompensation.',
      treatmentRelevance:
        'Schlafstabilisierung priorisieren; PRN-Benzodiazepine begrenzen, um Abhängigkeit zu vermeiden.',
      uncertainty: '',
    },
    fr: {
      clinicalImplication:
        'La privation de sommeil est un facteur déclenchant plausible de la décompensation psychotique dans ce cas.',
      treatmentRelevance:
        'Prioriser la stabilisation du sommeil ; limiter les benzodiazépines PRN pour éviter la dépendance.',
      uncertainty: '',
    },
    es: {
      clinicalImplication:
        'La pérdida de sueño es un precipitante plausible de la descompensación psicótica en este caso.',
      treatmentRelevance:
        'Priorizar estabilización del sueño; limitar benzodiacepinas PRN para evitar dependencia.',
      uncertainty: '',
    },
  },
}

/** Single dimensional exploratory note in the demo run. */
export const DEMO_DIMENSIONAL_EXPLORATORY: LocaleMap<ExploratoryNote> = {
  en: {
    topic: 'Trauma-related limbic hyperreactivity',
    rationale: 'No clear trauma narrative documented — insufficient evidence for dimensional scoring.',
  },
  de: {
    topic: 'Traumabezogene limbische Hyperreaktivität',
    rationale:
      'Keine klare Traumanamnese dokumentiert — unzureichende Evidenz für dimensionsbezogene Bewertung.',
  },
  fr: {
    topic: 'Hyperréactivité limbique liée au traumatisme',
    rationale:
      'Pas de récit traumatique clair documenté — preuves insuffisantes pour une notation dimensionnelle.',
  },
  es: {
    topic: 'Hiperreactividad límbica relacionada con trauma',
    rationale:
      'Sin relato traumático claro documentado — evidencia insuficiente para puntuación dimensional.',
  },
}

export function getDemoDimensionalNarrative(
  dimensionId: ClinicalIntelligenceDimensionId,
  language: UiLanguage,
): CiDimensionalNarrative | null {
  return DEMO_DIMENSION_NARRATIVES[dimensionId]?.[language] ?? null
}

export function getDemoMechanismNarrative(
  mechanismId: ClinicalIntelligenceMechanismId,
  language: UiLanguage,
): CiMechanismNarrative | null {
  return DEMO_MECHANISM_NARRATIVES[mechanismId]?.[language] ?? null
}

export function getDemoDimensionalExploratory(language: UiLanguage): ExploratoryNote {
  return DEMO_DIMENSIONAL_EXPLORATORY[language]
}
