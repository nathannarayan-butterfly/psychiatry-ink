import type { UiLanguage } from '../types/settings'
import type {
  DefaultSozialtherapieArea,
  SozialtherapieStatus,
} from '../types/sozialtherapie'

type LocaleMap = Record<UiLanguage, string>

export const sozialtherapieUiTranslations = {
  // ── Section / overview ───────────────────────────────────────────
  szSectionTitle: {
    de: 'Sozialtherapie',
    en: 'Social Therapy',
    fr: 'Thérapie sociale',
    es: 'Terapia social',
  },
  szEmpty: {
    de: 'Noch keine psychosozialen Themen erfasst.',
    en: 'No psychosocial targets recorded yet.',
    fr: 'Aucun objectif psychosocial enregistré.',
    es: 'Sin objetivos psicosociales registrados.',
  },
  szAddArea: {
    de: '＋ Bereich hinzufügen',
    en: '＋ Add area',
    fr: '＋ Ajouter un domaine',
    es: '＋ Añadir área',
  },
  szCustomArea: {
    de: 'Eigener Bereich',
    en: 'Custom area',
    fr: 'Domaine personnalisé',
    es: 'Área personalizada',
  },
  szCustomAreaPlaceholder: {
    de: 'Bereich benennen …',
    en: 'Name the area …',
    fr: 'Nommer le domaine …',
    es: 'Nombrar el área …',
  },
  szAdd: { de: 'Hinzufügen', en: 'Add', fr: 'Ajouter', es: 'Añadir' },
  szCancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler', es: 'Cancelar' },
  szDelete: { de: 'Löschen', en: 'Delete', fr: 'Supprimer', es: 'Eliminar' },
  szClose: { de: 'Schließen', en: 'Close', fr: 'Fermer', es: 'Cerrar' },
  szConfirmDelete: {
    de: 'Bereich löschen?',
    en: 'Delete this area?',
    fr: 'Supprimer ce domaine ?',
    es: '¿Eliminar esta área?',
  },
  szNotSet: { de: '–', en: '–', fr: '–', es: '–' },

  // ── Field labels ─────────────────────────────────────────────────
  szArea: { de: 'Bereich', en: 'Area', fr: 'Domaine', es: 'Área' },
  szStatus: { de: 'Status', en: 'Status', fr: 'Statut', es: 'Estado' },
  szGoal: { de: 'Therapieziel', en: 'Therapeutic goal', fr: 'Objectif', es: 'Objetivo' },
  szCurrentMeasure: {
    de: 'Aktuelle Maßnahme',
    en: 'Current measure',
    fr: 'Mesure actuelle',
    es: 'Medida actual',
  },
  szResponsibleRole: {
    de: 'Zuständige Rolle',
    en: 'Responsible role',
    fr: 'Rôle responsable',
    es: 'Rol responsable',
  },
  szTasks: { de: 'Aufgaben', en: 'Tasks', fr: 'Tâches', es: 'Tareas' },
  szAddTask: { de: '＋ Aufgabe', en: '＋ Task', fr: '＋ Tâche', es: '＋ Tarea' },
  szTaskPlaceholder: {
    de: 'Aufgabe beschreiben …',
    en: 'Describe task …',
    fr: 'Décrire la tâche …',
    es: 'Describir tarea …',
  },
  szNoTasks: {
    de: 'Keine Aufgaben.',
    en: 'No tasks.',
    fr: 'Aucune tâche.',
    es: 'Sin tareas.',
  },
  szNotes: { de: 'Notizen', en: 'Notes', fr: 'Notes', es: 'Notas' },
  szNextSteps: {
    de: 'Nächste Schritte',
    en: 'Next steps',
    fr: 'Prochaines étapes',
    es: 'Próximos pasos',
  },
  szDates: {
    de: 'Relevante Termine',
    en: 'Relevant dates',
    fr: 'Dates pertinentes',
    es: 'Fechas relevantes',
  },
  szPlaceholderGoal: {
    de: 'Ziel beschreiben …',
    en: 'Describe goal …',
    fr: 'Décrire l’objectif …',
    es: 'Describir objetivo …',
  },
  szPlaceholderMeasure: {
    de: 'Aktuelle Maßnahme …',
    en: 'Current measure …',
    fr: 'Mesure actuelle …',
    es: 'Medida actual …',
  },
  szPlaceholderNotes: {
    de: 'Notizen …',
    en: 'Notes …',
    fr: 'Notes …',
    es: 'Notas …',
  },
  szPlaceholderNextSteps: {
    de: 'Nächste Schritte …',
    en: 'Next steps …',
    fr: 'Prochaines étapes …',
    es: 'Próximos pasos …',
  },
  szPlaceholderDates: {
    de: 'z. B. Termin Sozialdienst 12.06.',
    en: 'e.g. Sozialdienst appt. 12 Jun',
    fr: 'p. ex. RDV service social 12/06',
    es: 'p. ej. cita servicio social 12/06',
  },
  szSelectRole: {
    de: 'Rolle wählen …',
    en: 'Select role …',
    fr: 'Choisir un rôle …',
    es: 'Elegir rol …',
  },
  szPickerTitle: {
    de: 'Bereich auswählen',
    en: 'Choose an area',
    fr: 'Choisir un domaine',
    es: 'Elegir un área',
  },
  szSelectPlaceholder: {
    de: 'Wähle einen Eintrag',
    en: 'Select an entry',
    fr: 'Sélectionnez une entrée',
    es: 'Selecciona una entrada',
  },
  szSelectPlaceholderHint: {
    de: 'Klicke links auf einen Bereich, um Details rechts zu öffnen.',
    en: 'Click an area on the left to open its details on the right.',
    fr: 'Cliquez sur un domaine à gauche pour afficher ses détails à droite.',
    es: 'Haz clic en un área a la izquierda para ver sus detalles a la derecha.',
  },
} as const satisfies Record<string, LocaleMap>

export type SozialtherapieUiKey = keyof typeof sozialtherapieUiTranslations

export function translateSozialtherapieUi(language: UiLanguage, key: SozialtherapieUiKey): string {
  return sozialtherapieUiTranslations[key][language]
}

// ── Predefined target areas ────────────────────────────────────────

const AREA_LABELS: Record<DefaultSozialtherapieArea, LocaleMap> = {
  wohnen: { de: 'Wohnen', en: 'Housing', fr: 'Logement', es: 'Vivienda' },
  arbeit: {
    de: 'Arbeit / Tagesstruktur',
    en: 'Work / day structure',
    fr: 'Travail / structure de journée',
    es: 'Trabajo / estructura diaria',
  },
  finanzen: {
    de: 'Finanzen / Behörden',
    en: 'Finances / authorities',
    fr: 'Finances / administrations',
    es: 'Finanzas / autoridades',
  },
  familie: {
    de: 'Familie / soziales Netz',
    en: 'Family / social network',
    fr: 'Famille / réseau social',
    es: 'Familia / red social',
  },
  recht: {
    de: 'Rechtlicher / betreuungsrechtlicher Kontext',
    en: 'Legal / custodial context',
    fr: 'Contexte juridique / curatelle',
    es: 'Contexto legal / tutelar',
  },
  nachsorge: { de: 'Nachsorge', en: 'Aftercare', fr: 'Suivi post-cure', es: 'Atención posterior' },
  sozialdienst: {
    de: 'Sozialdienst-Einbindung',
    en: 'Sozialdienst involvement',
    fr: 'Implication du service social',
    es: 'Implicación del servicio social',
  },
  entlassvorbereitung: {
    de: 'Entlassvorbereitung',
    en: 'Discharge preparation',
    fr: 'Préparation à la sortie',
    es: 'Preparación del alta',
  },
}

const STATUS_LABELS: Record<SozialtherapieStatus, LocaleMap> = {
  open: { de: 'Offen', en: 'Open', fr: 'Ouvert', es: 'Abierto' },
  'in-progress': { de: 'In Bearbeitung', en: 'In progress', fr: 'En cours', es: 'En curso' },
  arranged: { de: 'Organisiert', en: 'Arranged', fr: 'Organisé', es: 'Gestionado' },
  resolved: { de: 'Erledigt', en: 'Resolved', fr: 'Résolu', es: 'Resuelto' },
  'not-relevant': {
    de: 'Nicht relevant',
    en: 'Not relevant',
    fr: 'Non pertinent',
    es: 'No relevante',
  },
}

/** Responsible-role suggestions offered in the detail panel select. */
export const SOZIALTHERAPIE_ROLES = [
  'sozialdienst',
  'bezugspflege',
  'arzt',
  'betreuer',
  'psychologe',
  'angehoerige',
] as const

export type SozialtherapieRole = (typeof SOZIALTHERAPIE_ROLES)[number]

const ROLE_LABELS: Record<SozialtherapieRole, LocaleMap> = {
  sozialdienst: { de: 'Sozialdienst', en: 'Social services', fr: 'Service social', es: 'Servicio social' },
  bezugspflege: {
    de: 'Bezugspflege',
    en: 'Primary nurse',
    fr: 'Infirmier référent',
    es: 'Enfermería de referencia',
  },
  arzt: { de: 'Arzt', en: 'Physician', fr: 'Médecin', es: 'Médico' },
  betreuer: { de: 'Betreuer', en: 'Legal guardian', fr: 'Curateur', es: 'Tutor legal' },
  psychologe: { de: 'Psychologe', en: 'Psychologist', fr: 'Psychologue', es: 'Psicólogo' },
  angehoerige: { de: 'Angehörige', en: 'Relatives', fr: 'Proches', es: 'Familiares' },
}

export function translateSozialtherapieArea(language: UiLanguage, area: string): string {
  return (AREA_LABELS as Record<string, LocaleMap>)[area]?.[language] ?? area
}

export function translateSozialtherapieStatus(
  language: UiLanguage,
  status: SozialtherapieStatus,
): string {
  return STATUS_LABELS[status][language]
}

export function translateSozialtherapieRole(language: UiLanguage, role: string): string {
  return (ROLE_LABELS as Record<string, LocaleMap>)[role]?.[language] ?? role
}
