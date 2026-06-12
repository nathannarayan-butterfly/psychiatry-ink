import type { UiLanguage } from '../types/settings'
import type {
  GoalStatus,
  PlannedSessionStatus,
  ProgressStatus,
  PsychotherapyStatus,
  SessionSetting,
  StageStatus,
  TherapyMethodId,
  TherapyStageId,
} from '../types/psychotherapy'

type LocaleMap = Record<UiLanguage, string>

export const psychotherapyUiTranslations = {
  // ── Card / overview ──────────────────────────────────────────────
  ptCardTitle: { de: 'Psychotherapie', en: 'Psychotherapy', fr: 'Psychothérapie', es: 'Psicoterapia' },
  ptEmptyTitle: {
    de: 'Keine Psychotherapie geplant',
    en: 'No psychotherapy planned',
    fr: 'Aucune psychothérapie planifiée',
    es: 'Sin psicoterapia planificada',
  },
  ptCreatePlan: { de: 'Plan erstellen', en: 'Create plan', fr: 'Créer un plan', es: 'Crear plan' },
  ptOpenPlan: { de: 'Plan öffnen', en: 'Open plan', fr: 'Ouvrir le plan', es: 'Abrir plan' },
  ptDocumentSession: {
    de: '＋ Sitzung dokumentieren',
    en: '＋ Document session',
    fr: '＋ Documenter une séance',
    es: '＋ Documentar sesión',
  },
  ptGenerateSummary: {
    de: 'Zusammenfassung generieren',
    en: 'Generate summary',
    fr: 'Générer un résumé',
    es: 'Generar resumen',
  },
  ptSummaryHeading: {
    de: 'Zusammenfassung (für Verlauf / Arztbrief)',
    en: 'Summary (for progress / discharge letter)',
    fr: 'Résumé (pour évolution / lettre)',
    es: 'Resumen (para evolución / informe)',
  },
  ptCopy: { de: 'Kopieren', en: 'Copy', fr: 'Copier', es: 'Copiar' },
  ptCopied: { de: 'Kopiert', en: 'Copied', fr: 'Copié', es: 'Copiado' },
  ptClose: { de: 'Schließen', en: 'Close', fr: 'Fermer', es: 'Cerrar' },

  // ── Field labels ─────────────────────────────────────────────────
  ptStatus: { de: 'Status', en: 'Status', fr: 'Statut', es: 'Estado' },
  ptCurrentStage: { de: 'Aktuelle Phase', en: 'Current stage', fr: 'Phase actuelle', es: 'Fase actual' },
  ptMainGoal: { de: 'Hauptziel', en: 'Main goal', fr: 'Objectif principal', es: 'Objetivo principal' },
  ptMethod: { de: 'Methode', en: 'Method', fr: 'Méthode', es: 'Método' },
  ptFrequency: { de: 'Frequenz', en: 'Frequency', fr: 'Fréquence', es: 'Frecuencia' },
  ptPlannedDuration: {
    de: 'Geplante Dauer',
    en: 'Planned duration',
    fr: 'Durée prévue',
    es: 'Duración prevista',
  },
  ptLastSession: {
    de: 'Letzte Sitzung',
    en: 'Last session',
    fr: 'Dernière séance',
    es: 'Última sesión',
  },
  ptNextFocus: { de: 'Nächster Fokus', en: 'Next focus', fr: 'Prochain axe', es: 'Próximo enfoque' },
  ptProgress: { de: 'Fortschritt', en: 'Progress', fr: 'Progrès', es: 'Progreso' },
  ptTherapist: { de: 'Therapeut/in', en: 'Therapist', fr: 'Thérapeute', es: 'Terapeuta' },
  ptSetting: { de: 'Setting', en: 'Setting', fr: 'Cadre', es: 'Encuadre' },
  ptStartDate: { de: 'Beginn', en: 'Start date', fr: 'Début', es: 'Inicio' },
  ptReviewDate: { de: 'Review-Termin', en: 'Review date', fr: 'Date de révision', es: 'Fecha de revisión' },
  ptNotSet: { de: '–', en: '–', fr: '–', es: '–' },

  // ── Planning page sections ───────────────────────────────────────
  ptPlanTitle: {
    de: 'Psychotherapieplanung',
    en: 'Psychotherapy planning',
    fr: 'Planification de psychothérapie',
    es: 'Planificación de psicoterapia',
  },
  ptSectionOverview: {
    de: 'Therapieüberblick',
    en: 'Therapy overview',
    fr: 'Aperçu de la thérapie',
    es: 'Visión general',
  },
  ptSectionIndication: {
    de: 'Indikation & Rationale',
    en: 'Indication & rationale',
    fr: 'Indication & justification',
    es: 'Indicación & justificación',
  },
  ptSectionGoals: { de: 'Therapieziele', en: 'Therapy goals', fr: 'Objectifs', es: 'Objetivos' },
  ptSectionStages: {
    de: 'Phasenbasierte Planung',
    en: 'Stage-based planning',
    fr: 'Planification par phases',
    es: 'Planificación por fases',
  },
  ptSectionMethods: {
    de: 'Methoden & Interventionen',
    en: 'Methods & interventions',
    fr: 'Méthodes & interventions',
    es: 'Métodos & intervenciones',
  },
  ptSectionPlannedSessions: {
    de: 'Geplante Sitzungen',
    en: 'Planned sessions',
    fr: 'Séances planifiées',
    es: 'Sesiones planificadas',
  },
  ptSectionSessions: {
    de: 'Sitzungsdokumentation',
    en: 'Session documentation',
    fr: 'Documentation des séances',
    es: 'Documentación de sesiones',
  },
  ptSectionReview: { de: 'Review & Ausblick', en: 'Review & outlook', fr: 'Révision & perspectives', es: 'Revisión & perspectiva' },

  // ── Indication ───────────────────────────────────────────────────
  ptIndication: { de: 'Indikation', en: 'Indication', fr: 'Indication', es: 'Indicación' },
  ptClinicalRationale: {
    de: 'Klinische Rationale',
    en: 'Clinical rationale',
    fr: 'Justification clinique',
    es: 'Justificación clínica',
  },

  // ── Goals ────────────────────────────────────────────────────────
  ptGoalsShort: { de: 'Kurzfristig', en: 'Short-term', fr: 'Court terme', es: 'Corto plazo' },
  ptGoalsMedium: { de: 'Mittelfristig', en: 'Medium-term', fr: 'Moyen terme', es: 'Medio plazo' },
  ptGoalsLong: { de: 'Langfristig', en: 'Long-term', fr: 'Long terme', es: 'Largo plazo' },
  ptAddGoal: { de: '＋ Ziel hinzufügen', en: '＋ Add goal', fr: '＋ Ajouter un objectif', es: '＋ Añadir objetivo' },
  ptGoalPlaceholder: {
    de: 'Ziel beschreiben …',
    en: 'Describe goal …',
    fr: 'Décrire l’objectif …',
    es: 'Describir objetivo …',
  },
  ptNoGoals: { de: 'Keine Ziele erfasst.', en: 'No goals yet.', fr: 'Aucun objectif.', es: 'Sin objetivos.' },

  // ── Stages ───────────────────────────────────────────────────────
  ptAddStage: { de: '＋ Phase hinzufügen', en: '＋ Add stage', fr: '＋ Ajouter une phase', es: '＋ Añadir fase' },
  ptStageNotesPlaceholder: {
    de: 'Notizen zur Phase …',
    en: 'Stage notes …',
    fr: 'Notes de phase …',
    es: 'Notas de fase …',
  },
  ptNoStages: {
    de: 'Keine Phasen ausgewählt.',
    en: 'No stages selected.',
    fr: 'Aucune phase sélectionnée.',
    es: 'Sin fases seleccionadas.',
  },
  ptMoveUp: { de: 'Nach oben', en: 'Move up', fr: 'Monter', es: 'Subir' },
  ptMoveDown: { de: 'Nach unten', en: 'Move down', fr: 'Descendre', es: 'Bajar' },
  ptSelectStage: { de: 'Phase wählen …', en: 'Select stage …', fr: 'Choisir une phase …', es: 'Elegir fase …' },

  // ── Methods ──────────────────────────────────────────────────────
  ptMethodNotesPlaceholder: {
    de: 'Notiz zur Methode …',
    en: 'Method note …',
    fr: 'Note sur la méthode …',
    es: 'Nota del método …',
  },

  // ── Planned sessions ─────────────────────────────────────────────
  ptAddPlannedSession: {
    de: '＋ Geplante Sitzung',
    en: '＋ Planned session',
    fr: '＋ Séance planifiée',
    es: '＋ Sesión planificada',
  },
  ptTopic: { de: 'Thema', en: 'Topic', fr: 'Thème', es: 'Tema' },
  ptGoal: { de: 'Ziel', en: 'Goal', fr: 'Objectif', es: 'Objetivo' },
  ptIntervention: { de: 'Intervention', en: 'Intervention', fr: 'Intervention', es: 'Intervención' },
  ptHomework: { de: 'Hausaufgabe', en: 'Homework', fr: 'Devoir', es: 'Tarea' },
  ptDate: { de: 'Datum', en: 'Date', fr: 'Date', es: 'Fecha' },
  ptNoPlannedSessions: {
    de: 'Keine geplanten Sitzungen.',
    en: 'No planned sessions.',
    fr: 'Aucune séance planifiée.',
    es: 'Sin sesiones planificadas.',
  },

  // ── Session documentation ────────────────────────────────────────
  ptDuration: { de: 'Dauer', en: 'Duration', fr: 'Durée', es: 'Duración' },
  ptPatientReaction: {
    de: 'Reaktion des Patienten',
    en: 'Patient reaction',
    fr: 'Réaction du patient',
    es: 'Reacción del paciente',
  },
  ptRiskAspects: { de: 'Risikoaspekte', en: 'Risk aspects', fr: 'Aspects de risque', es: 'Aspectos de riesgo' },
  ptSaveSession: { de: 'Sitzung speichern', en: 'Save session', fr: 'Enregistrer la séance', es: 'Guardar sesión' },
  ptCancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler', es: 'Cancelar' },
  ptDelete: { de: 'Löschen', en: 'Delete', fr: 'Supprimer', es: 'Eliminar' },
  ptEdit: { de: 'Bearbeiten', en: 'Edit', fr: 'Modifier', es: 'Editar' },
  ptNoSessions: {
    de: 'Noch keine Sitzungen dokumentiert.',
    en: 'No sessions documented yet.',
    fr: 'Aucune séance documentée.',
    es: 'Sin sesiones documentadas.',
  },
  ptGeneratedParagraph: {
    de: 'Generierter Verlaufstext',
    en: 'Generated clinical paragraph',
    fr: 'Paragraphe clinique généré',
    es: 'Párrafo clínico generado',
  },

  // ── Review ───────────────────────────────────────────────────────
  ptReviewProgress: { de: 'Fortschritt', en: 'Progress', fr: 'Progrès', es: 'Progreso' },
  ptReviewBarriers: { de: 'Hindernisse', en: 'Barriers', fr: 'Obstacles', es: 'Obstáculos' },
  ptReviewAdjustment: {
    de: 'Plananpassung',
    en: 'Plan adjustment',
    fr: 'Ajustement du plan',
    es: 'Ajuste del plan',
  },
  ptReviewDischargePrep: {
    de: 'Vorbereitung Entlassbericht',
    en: 'Discharge summary prep',
    fr: 'Préparation du résumé de sortie',
    es: 'Preparación del informe de alta',
  },

  // ── Disclaimer ───────────────────────────────────────────────────
  ptDisclaimer: {
    de: 'Dokumentations- und Planungshilfe. Strukturierte Felder dienen nur der späteren Verlaufsauswertung — keine KI-Diagnose.',
    en: 'Documentation and planning aid. Structured fields only prepare later course analysis — no AI diagnosis.',
    fr: 'Aide à la documentation et à la planification. Les champs structurés ne servent qu’à l’analyse ultérieure — pas de diagnostic IA.',
    es: 'Ayuda de documentación y planificación. Los campos estructurados solo preparan el análisis posterior — sin diagnóstico por IA.',
  },
} as const satisfies Record<string, LocaleMap>

export type PsychotherapyUiKey = keyof typeof psychotherapyUiTranslations

export function translatePsychotherapyUi(language: UiLanguage, key: PsychotherapyUiKey): string {
  return psychotherapyUiTranslations[key][language]
}

// ── Enum value translations ────────────────────────────────────────

const STATUS_LABELS: Record<PsychotherapyStatus, LocaleMap> = {
  active: { de: 'Aktiv', en: 'Active', fr: 'Active', es: 'Activa' },
  paused: { de: 'Pausiert', en: 'Paused', fr: 'En pause', es: 'En pausa' },
  completed: { de: 'Abgeschlossen', en: 'Completed', fr: 'Terminée', es: 'Completada' },
  'not-started': { de: 'Nicht begonnen', en: 'Not started', fr: 'Non commencée', es: 'No iniciada' },
}

const PROGRESS_LABELS: Record<ProgressStatus, LocaleMap> = {
  'on-track': { de: 'Im Plan', en: 'On track', fr: 'Dans les temps', es: 'En curso' },
  slow: { de: 'Langsam', en: 'Slow', fr: 'Lent', es: 'Lento' },
  stalled: { de: 'Stagnierend', en: 'Stalled', fr: 'Au point mort', es: 'Estancado' },
  improving: { de: 'Bessernd', en: 'Improving', fr: 'En amélioration', es: 'Mejorando' },
}

const GOAL_STATUS_LABELS: Record<GoalStatus, LocaleMap> = {
  open: { de: 'Offen', en: 'Open', fr: 'Ouvert', es: 'Abierto' },
  'in-progress': { de: 'In Arbeit', en: 'In progress', fr: 'En cours', es: 'En curso' },
  achieved: { de: 'Erreicht', en: 'Achieved', fr: 'Atteint', es: 'Logrado' },
  deferred: { de: 'Zurückgestellt', en: 'Deferred', fr: 'Reporté', es: 'Aplazado' },
}

const STAGE_STATUS_LABELS: Record<StageStatus, LocaleMap> = {
  planned: { de: 'Geplant', en: 'Planned', fr: 'Planifié', es: 'Planificado' },
  active: { de: 'Aktiv', en: 'Active', fr: 'Actif', es: 'Activo' },
  done: { de: 'Abgeschlossen', en: 'Done', fr: 'Terminé', es: 'Hecho' },
  skipped: { de: 'Übersprungen', en: 'Skipped', fr: 'Ignoré', es: 'Omitido' },
}

const PLANNED_SESSION_STATUS_LABELS: Record<PlannedSessionStatus, LocaleMap> = {
  planned: { de: 'Geplant', en: 'Planned', fr: 'Planifié', es: 'Planificado' },
  completed: { de: 'Durchgeführt', en: 'Completed', fr: 'Réalisé', es: 'Realizado' },
  cancelled: { de: 'Abgesagt', en: 'Cancelled', fr: 'Annulé', es: 'Cancelado' },
  moved: { de: 'Verschoben', en: 'Moved', fr: 'Reporté', es: 'Reprogramado' },
}

const SETTING_LABELS: Record<SessionSetting, LocaleMap> = {
  individual: { de: 'Einzel', en: 'Individual', fr: 'Individuel', es: 'Individual' },
  group: { de: 'Gruppe', en: 'Group', fr: 'Groupe', es: 'Grupo' },
  family: { de: 'Familie', en: 'Family', fr: 'Famille', es: 'Familia' },
  crisis: { de: 'Krisenintervention', en: 'Crisis', fr: 'Crise', es: 'Crisis' },
  phone: { de: 'Telefon', en: 'Phone', fr: 'Téléphone', es: 'Teléfono' },
  video: { de: 'Video', en: 'Video', fr: 'Vidéo', es: 'Vídeo' },
  other: { de: 'Sonstiges', en: 'Other', fr: 'Autre', es: 'Otro' },
}

const STAGE_LABELS: Record<TherapyStageId, LocaleMap> = {
  stabilization: { de: 'Stabilisierung', en: 'Stabilization', fr: 'Stabilisation', es: 'Estabilización' },
  psychoeducation: { de: 'Psychoedukation', en: 'Psychoeducation', fr: 'Psychoéducation', es: 'Psicoeducación' },
  'symptom-coping': {
    de: 'Symptombewältigung',
    en: 'Symptom coping',
    fr: 'Gestion des symptômes',
    es: 'Afrontamiento de síntomas',
  },
  adherence: { de: 'Adhärenz', en: 'Adherence', fr: 'Observance', es: 'Adherencia' },
  'relapse-prevention': {
    de: 'Rückfallprophylaxe',
    en: 'Relapse prevention',
    fr: 'Prévention de rechute',
    es: 'Prevención de recaídas',
  },
  'social-reintegration': {
    de: 'Soziale Reintegration',
    en: 'Social reintegration',
    fr: 'Réinsertion sociale',
    es: 'Reintegración social',
  },
  'discharge-preparation': {
    de: 'Entlassvorbereitung',
    en: 'Discharge preparation',
    fr: 'Préparation à la sortie',
    es: 'Preparación del alta',
  },
  'forensic-risk-work': {
    de: 'Forensische Risiko-/Deliktarbeit',
    en: 'Forensic risk / offense work',
    fr: 'Travail médico-légal (risque/délit)',
    es: 'Trabajo forense (riesgo/delito)',
  },
}

const METHOD_LABELS: Record<TherapyMethodId, LocaleMap> = {
  supportive: { de: 'Stützend', en: 'Supportive', fr: 'Soutien', es: 'De apoyo' },
  psychoeducation: { de: 'Psychoedukation', en: 'Psychoeducation', fr: 'Psychoéducation', es: 'Psicoeducación' },
  cbt: {
    de: 'Kognitive Verhaltenstherapie',
    en: 'Cognitive behavioral therapy',
    fr: 'Thérapie cognitivo-comportementale',
    es: 'Terapia cognitivo-conductual',
  },
  'motivational-interviewing': {
    de: 'Motivierende Gesprächsführung',
    en: 'Motivational interviewing',
    fr: 'Entretien motivationnel',
    es: 'Entrevista motivacional',
  },
  'addiction-focused': {
    de: 'Suchtspezifisch',
    en: 'Addiction-focused',
    fr: 'Axé sur l’addiction',
    es: 'Enfocado en adicciones',
  },
  'skills-training': {
    de: 'Skills-Training',
    en: 'Skills training',
    fr: 'Entraînement aux compétences',
    es: 'Entrenamiento en habilidades',
  },
  'crisis-intervention': {
    de: 'Krisenintervention',
    en: 'Crisis intervention',
    fr: 'Intervention de crise',
    es: 'Intervención en crisis',
  },
  'relapse-prevention': {
    de: 'Rückfallprävention',
    en: 'Relapse prevention',
    fr: 'Prévention de rechute',
    es: 'Prevención de recaídas',
  },
  'social-skills': {
    de: 'Soziales Kompetenztraining',
    en: 'Social skills training',
    fr: 'Compétences sociales',
    es: 'Habilidades sociales',
  },
  'family-work': { de: 'Angehörigenarbeit', en: 'Family work', fr: 'Travail familial', es: 'Trabajo familiar' },
  'forensic-offense-work': {
    de: 'Deliktbearbeitung',
    en: 'Offense-focused work',
    fr: 'Travail sur le délit',
    es: 'Trabajo sobre el delito',
  },
}

export function translatePsychotherapyStatus(language: UiLanguage, status: PsychotherapyStatus): string {
  return STATUS_LABELS[status][language]
}

export function translateProgressStatus(language: UiLanguage, status: string): string {
  return (PROGRESS_LABELS as Record<string, LocaleMap>)[status]?.[language] ?? status
}

export function translateGoalStatus(language: UiLanguage, status: GoalStatus): string {
  return GOAL_STATUS_LABELS[status][language]
}

export function translateStageStatus(language: UiLanguage, status: StageStatus): string {
  return STAGE_STATUS_LABELS[status][language]
}

export function translatePlannedSessionStatus(language: UiLanguage, status: PlannedSessionStatus): string {
  return PLANNED_SESSION_STATUS_LABELS[status][language]
}

export function translateSessionSetting(language: UiLanguage, setting: SessionSetting): string {
  return SETTING_LABELS[setting][language]
}

export function translateTherapyStage(language: UiLanguage, stageId: TherapyStageId): string {
  return STAGE_LABELS[stageId][language]
}

export function translateTherapyMethod(language: UiLanguage, methodId: TherapyMethodId): string {
  return METHOD_LABELS[methodId][language]
}
