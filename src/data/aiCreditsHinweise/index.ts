import type { UiLanguage } from '../../types/settings'

export interface AiCreditsActionRow {
  action: string
  economic: number
  standard: number
  gruendlich: number
}

export interface AiCreditsCapacityRow {
  pattern: string
  capacity: string
}

export interface AiCreditsHinweiseContent {
  meta: { title: string; subtitle: string }
  nav: { backLabel: string; backHref: string }
  warnings: { title: string; items: string[] }
  actionTable: {
    title: string
    subtitle: string
    columns: [string, string, string, string]
    rows: AiCreditsActionRow[]
  }
  capacityTable: {
    title: string
    subtitle: string
    columns: [string, string]
    rows: AiCreditsCapacityRow[]
  }
}

export type AiCreditsHinweiseContentByLanguage = Record<UiLanguage, AiCreditsHinweiseContent>

const actionRowsEn: AiCreditsActionRow[] = [
  { action: 'Grammar / rewrite short text', economic: 1, standard: 2, gruendlich: 4 },
  { action: 'Short progress note', economic: 2, standard: 4, gruendlich: 8 },
  { action: 'Psychopathological findings', economic: 3, standard: 6, gruendlich: 12 },
  { action: 'Somatic / neurological findings', economic: 2, standard: 4, gruendlich: 8 },
  { action: 'Laboratory formatting', economic: 2, standard: 4, gruendlich: 8 },
  { action: 'History structuring', economic: 6, standard: 12, gruendlich: 24 },
  { action: 'Diagnosis formulation', economic: 5, standard: 10, gruendlich: 20 },
  { action: 'Medication plan summary', economic: 5, standard: 10, gruendlich: 20 },
  { action: 'Therapy / treatment plan', economic: 6, standard: 12, gruendlich: 24 },
  { action: 'Medical letter section', economic: 12, standard: 24, gruendlich: 48 },
  { action: 'Full medical letter draft', economic: 30, standard: 60, gruendlich: 120 },
  { action: 'Full case summary', economic: 20, standard: 40, gruendlich: 80 },
  { action: 'Risk assessment / forensic formulation', economic: 15, standard: 30, gruendlich: 60 },
  { action: 'Medication interaction check', economic: 5, standard: 10, gruendlich: 20 },
  { action: 'Lab–medication correlation', economic: 6, standard: 12, gruendlich: 24 },
  {
    action: 'Full patient data creation / structured case build',
    economic: 50,
    standard: 100,
    gruendlich: 200,
  },
]

const actionRowsDe: AiCreditsActionRow[] = [
  { action: 'Grammatik / Kurztext umformulieren', economic: 1, standard: 2, gruendlich: 4 },
  { action: 'Kurzer Verlaufseintrag', economic: 2, standard: 4, gruendlich: 8 },
  { action: 'Psychopathologischer Befund', economic: 3, standard: 6, gruendlich: 12 },
  { action: 'Somatischer oder neurologischer Befund', economic: 2, standard: 4, gruendlich: 8 },
  { action: 'Laborbefund-Formatierung', economic: 2, standard: 4, gruendlich: 8 },
  { action: 'Strukturierung der Anamnese', economic: 6, standard: 12, gruendlich: 24 },
  { action: 'Diagnoseformulierung', economic: 5, standard: 10, gruendlich: 20 },
  { action: 'Zusammenfassung des Medikationsplans', economic: 5, standard: 10, gruendlich: 20 },
  { action: 'Therapie- bzw. Behandlungsplan', economic: 6, standard: 12, gruendlich: 24 },
  { action: 'Einzelner Arztbrief-Abschnitt', economic: 12, standard: 24, gruendlich: 48 },
  { action: 'Vollständiger Arztbrief-Entwurf', economic: 30, standard: 60, gruendlich: 120 },
  { action: 'Vollständige Fallzusammenfassung', economic: 20, standard: 40, gruendlich: 80 },
  { action: 'Risikoeinschätzung oder forensische Formulierung', economic: 15, standard: 30, gruendlich: 60 },
  { action: 'Interaktionsprüfung der Medikation', economic: 5, standard: 10, gruendlich: 20 },
  { action: 'Labor-Medikations-Korrelation', economic: 6, standard: 12, gruendlich: 24 },
  {
    action: 'Vollständiger Fallaufbau / komplette Patientenakte',
    economic: 50,
    standard: 100,
    gruendlich: 200,
  },
]

const actionRowsFr: AiCreditsActionRow[] = [
  { action: 'Grammaire / reformulation d\'un texte court', economic: 1, standard: 2, gruendlich: 4 },
  { action: 'Note d\'évolution courte', economic: 2, standard: 4, gruendlich: 8 },
  { action: 'Examen psychopathologique', economic: 3, standard: 6, gruendlich: 12 },
  { action: 'Examen somatique ou neurologique', economic: 2, standard: 4, gruendlich: 8 },
  { action: 'Mise en forme d\'un bilan biologique', economic: 2, standard: 4, gruendlich: 8 },
  { action: 'Structuration de l\'anamnèse', economic: 6, standard: 12, gruendlich: 24 },
  { action: 'Formulation diagnostique', economic: 5, standard: 10, gruendlich: 20 },
  { action: 'Synthèse du plan médicamenteux', economic: 5, standard: 10, gruendlich: 20 },
  { action: 'Plan thérapeutique ou de traitement', economic: 6, standard: 12, gruendlich: 24 },
  { action: 'Section d\'un courrier médical', economic: 12, standard: 24, gruendlich: 48 },
  { action: 'Brouillon complet de courrier médical', economic: 30, standard: 60, gruendlich: 120 },
  { action: 'Synthèse complète de cas', economic: 20, standard: 40, gruendlich: 80 },
  { action: 'Évaluation du risque ou formulation médico-légale', economic: 15, standard: 30, gruendlich: 60 },
  { action: 'Vérification des interactions médicamenteuses', economic: 5, standard: 10, gruendlich: 20 },
  { action: 'Corrélation biologie–médication', economic: 6, standard: 12, gruendlich: 24 },
  {
    action: 'Construction complète d\'un cas patient structuré',
    economic: 50,
    standard: 100,
    gruendlich: 200,
  },
]

const actionRowsEs: AiCreditsActionRow[] = [
  { action: 'Gramática o reescritura de un texto corto', economic: 1, standard: 2, gruendlich: 4 },
  { action: 'Nota breve de evolución', economic: 2, standard: 4, gruendlich: 8 },
  { action: 'Exploración psicopatológica', economic: 3, standard: 6, gruendlich: 12 },
  { action: 'Exploración somática o neurológica', economic: 2, standard: 4, gruendlich: 8 },
  { action: 'Formateo de una analítica', economic: 2, standard: 4, gruendlich: 8 },
  { action: 'Estructuración de la anamnesis', economic: 6, standard: 12, gruendlich: 24 },
  { action: 'Formulación diagnóstica', economic: 5, standard: 10, gruendlich: 20 },
  { action: 'Resumen del plan de medicación', economic: 5, standard: 10, gruendlich: 20 },
  { action: 'Plan terapéutico o de tratamiento', economic: 6, standard: 12, gruendlich: 24 },
  { action: 'Sección de un informe médico', economic: 12, standard: 24, gruendlich: 48 },
  { action: 'Borrador completo de informe médico', economic: 30, standard: 60, gruendlich: 120 },
  { action: 'Resumen completo del caso', economic: 20, standard: 40, gruendlich: 80 },
  { action: 'Evaluación de riesgo o formulación forense', economic: 15, standard: 30, gruendlich: 60 },
  { action: 'Comprobación de interacciones farmacológicas', economic: 5, standard: 10, gruendlich: 20 },
  { action: 'Correlación laboratorio–medicación', economic: 6, standard: 12, gruendlich: 24 },
  {
    action: 'Construcción completa de un caso clínico estructurado',
    economic: 50,
    standard: 100,
    gruendlich: 200,
  },
]

const capacityRowsEn: AiCreditsCapacityRow[] = [
  { pattern: 'Short routine notes only, Economic', capacity: '150–250 notes' },
  { pattern: 'Mixed progress + findings + small summaries, Economic', capacity: '70–120 actions' },
  { pattern: 'Several medical letter sections, Standard', capacity: '15–25 sections' },
  { pattern: 'Full medical letter drafts, Economic', capacity: '~15–16 drafts' },
  { pattern: 'Full medical letter drafts, Standard', capacity: '~8 drafts' },
  { pattern: 'Full medical letter drafts, Thorough', capacity: '~4 drafts' },
  { pattern: 'Full structured patient cases, Economic', capacity: '~10 cases' },
  { pattern: 'Full structured patient cases, Standard', capacity: '~5 cases' },
  { pattern: 'Full structured patient cases, Thorough', capacity: '~2 cases' },
]

const capacityRowsDe: AiCreditsCapacityRow[] = [
  { pattern: 'Nur kurze Routine-Notizen (Wirtschaftlich)', capacity: '150–250 Notizen' },
  { pattern: 'Gemischt: Verlauf, Befund, kurze Zusammenfassungen (Wirtschaftlich)', capacity: '70–120 Aktionen' },
  { pattern: 'Mehrere Arztbrief-Abschnitte (Standard)', capacity: '15–25 Abschnitte' },
  { pattern: 'Vollständige Arztbrief-Entwürfe (Wirtschaftlich)', capacity: 'ca. 15–16 Entwürfe' },
  { pattern: 'Vollständige Arztbrief-Entwürfe (Standard)', capacity: 'ca. 8 Entwürfe' },
  { pattern: 'Vollständige Arztbrief-Entwürfe (Gründlich)', capacity: 'ca. 4 Entwürfe' },
  { pattern: 'Vollständige strukturierte Patientenfälle (Wirtschaftlich)', capacity: 'ca. 10 Fälle' },
  { pattern: 'Vollständige strukturierte Patientenfälle (Standard)', capacity: 'ca. 5 Fälle' },
  { pattern: 'Vollständige strukturierte Patientenfälle (Gründlich)', capacity: 'ca. 2 Fälle' },
]

const capacityRowsFr: AiCreditsCapacityRow[] = [
  { pattern: 'Uniquement des notes de routine courtes (Économique)', capacity: '150 à 250 notes' },
  { pattern: 'Mix d\'évolution, d\'examens et de synthèses courtes (Économique)', capacity: '70 à 120 actions' },
  { pattern: 'Plusieurs sections de courrier médical (Standard)', capacity: '15 à 25 sections' },
  { pattern: 'Brouillons complets de courrier médical (Économique)', capacity: 'env. 15 à 16 brouillons' },
  { pattern: 'Brouillons complets de courrier médical (Standard)', capacity: 'env. 8 brouillons' },
  { pattern: 'Brouillons complets de courrier médical (Approfondi)', capacity: 'env. 4 brouillons' },
  { pattern: 'Cas patients structurés complets (Économique)', capacity: 'env. 10 cas' },
  { pattern: 'Cas patients structurés complets (Standard)', capacity: 'env. 5 cas' },
  { pattern: 'Cas patients structurés complets (Approfondi)', capacity: 'env. 2 cas' },
]

const capacityRowsEs: AiCreditsCapacityRow[] = [
  { pattern: 'Solo notas rutinarias breves (Económico)', capacity: '150 a 250 notas' },
  { pattern: 'Mezcla de evolución, exploraciones y resúmenes breves (Económico)', capacity: '70 a 120 acciones' },
  { pattern: 'Varias secciones de informe médico (Estándar)', capacity: '15 a 25 secciones' },
  { pattern: 'Borradores completos de informe médico (Económico)', capacity: 'aprox. 15 o 16 borradores' },
  { pattern: 'Borradores completos de informe médico (Estándar)', capacity: 'aprox. 8 borradores' },
  { pattern: 'Borradores completos de informe médico (Exhaustivo)', capacity: 'aprox. 4 borradores' },
  { pattern: 'Casos clínicos estructurados completos (Económico)', capacity: 'aprox. 10 casos' },
  { pattern: 'Casos clínicos estructurados completos (Estándar)', capacity: 'aprox. 5 casos' },
  { pattern: 'Casos clínicos estructurados completos (Exhaustivo)', capacity: 'aprox. 2 casos' },
]

export const aiCreditsHinweiseContentByLanguage: AiCreditsHinweiseContentByLanguage = {
  de: {
    meta: {
      title: 'Informationen zu KI-Credits',
      subtitle: 'Hinweise zur Nutzung von KI-Credits',
    },
    nav: {
      backLabel: 'Zurück zu den Preisen',
      backHref: '/#pricing',
    },
    warnings: {
      title: 'Wichtige Hinweise',
      items: [
        'Der tatsächliche Credit-Verbrauch hängt von mehreren Faktoren ab und kann von den unten genannten Schätzwerten abweichen.',
        'Der Verbrauch hängt vom gewählten KI-Modus ab: „Wirtschaftlich", „Standard" oder „Gründlich".',
        'Die folgenden Tabellen sind eine ungefähre Orientierung — keine Garantie zu Kosten oder Kapazität.',
        'Alle KI-gestützten Ergebnisse erfordern eine ärztliche Prüfung. Vorschläge werden niemals automatisch in die Akte übernommen.',
      ],
    },
    actionTable: {
      title: 'Credits pro Aktion',
      subtitle: 'Ungefährer Credit-Verbrauch je nach KI-Modus',
      columns: ['Aktion', 'Wirtschaftlich', 'Standard', 'Gründlich'],
      rows: actionRowsDe,
    },
    capacityTable: {
      title: 'Monatliche Kapazität mit 500 Credits',
      subtitle: 'Ungefähre Nutzungsmuster in der Einzelnutzung',
      columns: ['Nutzungsmuster', 'Ungefähre monatliche Kapazität'],
      rows: capacityRowsDe,
    },
  },
  en: {
    meta: {
      title: 'AI credit information',
      subtitle: 'AI credit guidance',
    },
    nav: {
      backLabel: 'Back to pricing',
      backHref: '/#pricing',
    },
    warnings: {
      title: 'Important notes',
      items: [
        'Actual credit consumption depends on several factors and may differ from the estimates below.',
        'Credit use varies by AI mode: Economic, Standard, and Thorough.',
        'The tables below are approximate guides — not guarantees of cost or capacity.',
        'All AI-assisted outputs require clinical review. Suggestions are never applied automatically to the record.',
      ],
    },
    actionTable: {
      title: 'Credits per action',
      subtitle: 'Approximate credit cost by AI mode',
      columns: ['Action', 'Economic', 'Standard', 'Thorough'],
      rows: actionRowsEn,
    },
    capacityTable: {
      title: 'Monthly capacity with 500 credits',
      subtitle: 'Approximate usage patterns on the Single User plan',
      columns: ['Usage pattern', 'Approximate monthly capacity'],
      rows: capacityRowsEn,
    },
  },
  fr: {
    meta: {
      title: 'Informations sur les crédits IA',
      subtitle: 'Guide d\'utilisation des crédits IA',
    },
    nav: {
      backLabel: 'Retour aux tarifs',
      backHref: '/#pricing',
    },
    warnings: {
      title: 'À retenir',
      items: [
        'La consommation réelle de crédits dépend de plusieurs facteurs et peut différer des estimations ci-dessous.',
        'La consommation varie selon le mode IA choisi : Économique, Standard ou Approfondi.',
        'Les tableaux ci-dessous donnent un ordre de grandeur — ce ne sont pas des garanties de coût ni de capacité.',
        'Tous les contenus générés par l\'IA exigent une relecture clinique. Aucune suggestion n\'est inscrite automatiquement au dossier.',
      ],
    },
    actionTable: {
      title: 'Crédits par action',
      subtitle: 'Coût approximatif en crédits selon le mode IA',
      columns: ['Action', 'Économique', 'Standard', 'Approfondi'],
      rows: actionRowsFr,
    },
    capacityTable: {
      title: 'Capacité mensuelle avec 500 crédits',
      subtitle: 'Volumes d\'utilisation indicatifs avec l\'offre Utilisateur individuel',
      columns: ['Profil d\'utilisation', 'Capacité mensuelle approximative'],
      rows: capacityRowsFr,
    },
  },
  es: {
    meta: {
      title: 'Información sobre los créditos de IA',
      subtitle: 'Guía de uso de los créditos de IA',
    },
    nav: {
      backLabel: 'Volver a precios',
      backHref: '/#pricing',
    },
    warnings: {
      title: 'A tener en cuenta',
      items: [
        'El consumo real de créditos depende de varios factores y puede diferir de las estimaciones siguientes.',
        'El consumo varía según el modo de IA: Económico, Estándar o Exhaustivo.',
        'Las tablas siguientes son una orientación aproximada — no garantías de coste ni de capacidad.',
        'Todos los contenidos generados por la IA requieren revisión clínica. Ninguna sugerencia se incorpora automáticamente a la historia clínica.',
      ],
    },
    actionTable: {
      title: 'Créditos por acción',
      subtitle: 'Coste aproximado en créditos según el modo de IA',
      columns: ['Acción', 'Económico', 'Estándar', 'Exhaustivo'],
      rows: actionRowsEs,
    },
    capacityTable: {
      title: 'Capacidad mensual con 500 créditos',
      subtitle: 'Volúmenes de uso orientativos en el plan Usuario individual',
      columns: ['Perfil de uso', 'Capacidad mensual aproximada'],
      rows: capacityRowsEs,
    },
  },
}

export function getAiCreditsHinweiseContent(language: UiLanguage): AiCreditsHinweiseContent {
  return aiCreditsHinweiseContentByLanguage[language] ?? aiCreditsHinweiseContentByLanguage.de
}
