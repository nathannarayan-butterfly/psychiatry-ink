import type { UiLanguage } from '../types/settings'
import type {
  DefaultWeitereTherapieType,
  WeitereTherapieStatus,
} from '../types/weitereTherapie'

type LocaleMap = Record<UiLanguage, string>

export const weitereTherapieUiTranslations = {
  // ── Section / overview ───────────────────────────────────────────
  wtSectionTitle: {
    de: 'Weitere Therapieverfahren',
    en: 'Other therapeutic procedures',
    fr: 'Autres procédés thérapeutiques',
    es: 'Otros procedimientos terapéuticos',
  },
  wtEmpty: {
    de: 'Noch keine weiteren Therapieverfahren erfasst.',
    en: 'No other therapeutic procedures recorded yet.',
    fr: 'Aucun autre procédé thérapeutique enregistré.',
    es: 'Sin otros procedimientos terapéuticos registrados.',
  },
  wtAddTherapy: {
    de: '＋ Verfahren hinzufügen',
    en: '＋ Add procedure',
    fr: '＋ Ajouter un procédé',
    es: '＋ Añadir procedimiento',
  },
  wtAdd: { de: 'Hinzufügen', en: 'Add', fr: 'Ajouter', es: 'Añadir' },
  wtDelete: { de: 'Löschen', en: 'Delete', fr: 'Supprimer', es: 'Eliminar' },
  wtClose: { de: 'Schließen', en: 'Close', fr: 'Fermer', es: 'Cerrar' },
  wtConfirmDelete: {
    de: 'Verfahren löschen?',
    en: 'Delete this procedure?',
    fr: 'Supprimer ce procédé ?',
    es: '¿Eliminar este procedimiento?',
  },
  wtPickerTitle: {
    de: 'Verfahren auswählen',
    en: 'Choose a procedure',
    fr: 'Choisir un procédé',
    es: 'Elegir un procedimiento',
  },
  wtCustomPlaceholder: {
    de: 'Eigenes Verfahren benennen …',
    en: 'Name a custom procedure …',
    fr: 'Nommer un procédé personnalisé …',
    es: 'Nombrar un procedimiento personalizado …',
  },
  wtSelectPlaceholder: {
    de: 'Wähle ein Verfahren',
    en: 'Select a procedure',
    fr: 'Sélectionnez un procédé',
    es: 'Selecciona un procedimiento',
  },
  wtSelectPlaceholderHint: {
    de: 'Klicke links auf ein Verfahren, um Details rechts zu öffnen.',
    en: 'Click a procedure on the left to open its details on the right.',
    fr: 'Cliquez sur un procédé à gauche pour afficher ses détails à droite.',
    es: 'Haz clic en un procedimiento a la izquierda para ver sus detalles a la derecha.',
  },
  wtYes: { de: 'Ja', en: 'Yes', fr: 'Oui', es: 'Sí' },
  wtNo: { de: 'Nein', en: 'No', fr: 'Non', es: 'No' },

  // ── Common field labels ──────────────────────────────────────────
  wtType: { de: 'Verfahren', en: 'Procedure', fr: 'Procédé', es: 'Procedimiento' },
  wtIndication: {
    de: 'Indikation / Zielsymptom',
    en: 'Indication / target symptom',
    fr: 'Indication / symptôme cible',
    es: 'Indicación / síntoma diana',
  },
  wtClinicalGoal: {
    de: 'Klinisches Ziel',
    en: 'Clinical goal',
    fr: 'Objectif clinique',
    es: 'Objetivo clínico',
  },
  wtStatus: { de: 'Status', en: 'Status', fr: 'Statut', es: 'Estado' },
  wtStartDate: { de: 'Beginn', en: 'Start date', fr: 'Début', es: 'Inicio' },
  wtPlannedSessions: {
    de: 'Geplante Sitzungen',
    en: 'Planned sessions',
    fr: 'Séances planifiées',
    es: 'Sesiones planificadas',
  },
  wtCompletedSessions: {
    de: 'Durchgeführte Sitzungen',
    en: 'Completed sessions',
    fr: 'Séances réalisées',
    es: 'Sesiones realizadas',
  },
  wtFrequency: { de: 'Frequenz', en: 'Frequency', fr: 'Fréquence', es: 'Frecuencia' },
  wtResponsible: {
    de: 'Zuständige Einheit / Person',
    en: 'Responsible unit / person',
    fr: 'Unité / personne responsable',
    es: 'Unidad / persona responsable',
  },
  wtConsentDocumented: {
    de: 'Einwilligung dokumentiert',
    en: 'Consent documented',
    fr: 'Consentement documenté',
    es: 'Consentimiento documentado',
  },
  wtContraindicationsChecked: {
    de: 'Kontraindikationen geprüft',
    en: 'Contraindications checked',
    fr: 'Contre-indications vérifiées',
    es: 'Contraindicaciones verificadas',
  },
  wtMonitoring: {
    de: 'Monitoring-Anforderungen',
    en: 'Monitoring requirements',
    fr: 'Exigences de surveillance',
    es: 'Requisitos de monitorización',
  },
  wtResponse: {
    de: 'Wirkung / Ansprechen',
    en: 'Response / effect',
    fr: 'Réponse / effet',
    es: 'Respuesta / efecto',
  },
  wtSideEffects: {
    de: 'Nebenwirkungen / unerwünschte Ereignisse',
    en: 'Side effects / adverse events',
    fr: 'Effets secondaires / événements indésirables',
    es: 'Efectos secundarios / eventos adversos',
  },
  wtNextReviewDate: {
    de: 'Nächster Review-Termin',
    en: 'Next review date',
    fr: 'Prochaine date de révision',
    es: 'Próxima fecha de revisión',
  },
  wtNotes: { de: 'Freitext / Notizen', en: 'Free notes', fr: 'Notes libres', es: 'Notas libres' },

  // ── Type-specific subsection titles ──────────────────────────────
  wtEktSection: {
    de: 'EKT-spezifische Dokumentation',
    en: 'EKT-specific documentation',
    fr: 'Documentation spécifique ECT',
    es: 'Documentación específica de TEC',
  },
  wtRtmsSection: {
    de: 'rTMS-spezifische Dokumentation',
    en: 'rTMS-specific documentation',
    fr: 'Documentation spécifique rTMS',
    es: 'Documentación específica de rTMS',
  },
  wtNeurofeedbackSection: {
    de: 'Neurofeedback-spezifische Dokumentation',
    en: 'Neurofeedback-specific documentation',
    fr: 'Documentation spécifique au neurofeedback',
    es: 'Documentación específica de neurofeedback',
  },

  // ── EKT-specific fields ──────────────────────────────────────────
  wtEktLegalConsentStatus: {
    de: 'Rechtlicher / Einwilligungsstatus',
    en: 'Legal / consent status',
    fr: 'Statut juridique / consentement',
    es: 'Estado legal / de consentimiento',
  },
  wtEktAnesthesiaClearance: {
    de: 'Anästhesie-Freigabe',
    en: 'Anesthesia clearance',
    fr: 'Autorisation anesthésique',
    es: 'Autorización anestésica',
  },
  wtEktSeizureQuality: {
    de: 'Anfallsqualität / -dauer',
    en: 'Seizure quality / duration',
    fr: 'Qualité / durée de la crise',
    es: 'Calidad / duración de la convulsión',
  },
  wtEktElectrodePlacement: {
    de: 'Elektrodenplatzierung',
    en: 'Electrode placement',
    fr: 'Placement des électrodes',
    es: 'Colocación de electrodos',
  },
  wtEktNumberOfSessions: {
    de: 'Anzahl Sitzungen',
    en: 'Number of sessions',
    fr: 'Nombre de séances',
    es: 'Número de sesiones',
  },
  wtEktCognitiveSideEffects: {
    de: 'Kognitive Nebenwirkungen',
    en: 'Cognitive side effects',
    fr: 'Effets secondaires cognitifs',
    es: 'Efectos secundarios cognitivos',
  },
  wtEktMaintenancePlanning: {
    de: 'Fortführung / Erhaltungs-EKT',
    en: 'Continuation / maintenance EKT',
    fr: 'Poursuite / ECT d’entretien',
    es: 'Continuación / TEC de mantenimiento',
  },

  // ── rTMS-specific fields ─────────────────────────────────────────
  wtRtmsProtocol: { de: 'Protokoll', en: 'Protocol', fr: 'Protocole', es: 'Protocolo' },
  wtRtmsTargetArea: {
    de: 'Zielareal',
    en: 'Target area',
    fr: 'Zone cible',
    es: 'Área diana',
  },
  wtRtmsStimulationFrequency: {
    de: 'Stimulationsfrequenz',
    en: 'Stimulation frequency',
    fr: 'Fréquence de stimulation',
    es: 'Frecuencia de estimulación',
  },
  wtRtmsIntensity: { de: 'Intensität', en: 'Intensity', fr: 'Intensité', es: 'Intensidad' },
  wtRtmsNumberOfPulses: {
    de: 'Anzahl Pulse',
    en: 'Number of pulses',
    fr: 'Nombre d’impulsions',
    es: 'Número de pulsos',
  },
  wtRtmsPlannedSessions: {
    de: 'Geplante Sitzungen',
    en: 'Planned sessions',
    fr: 'Séances planifiées',
    es: 'Sesiones planificadas',
  },
  wtRtmsCompletedSessions: {
    de: 'Durchgeführte Sitzungen',
    en: 'Completed sessions',
    fr: 'Séances réalisées',
    es: 'Sesiones realizadas',
  },
  wtRtmsResponse: {
    de: 'Ansprechen',
    en: 'Response',
    fr: 'Réponse',
    es: 'Respuesta',
  },

  // ── Neurofeedback-specific fields ────────────────────────────────
  wtNfTargetDomain: {
    de: 'Zieldomäne',
    en: 'Target domain',
    fr: 'Domaine cible',
    es: 'Dominio diana',
  },
  wtNfProtocol: { de: 'Protokoll', en: 'Protocol', fr: 'Protocole', es: 'Protocolo' },
  wtNfSessionCount: {
    de: 'Anzahl Sitzungen',
    en: 'Session count',
    fr: 'Nombre de séances',
    es: 'Número de sesiones',
  },
  wtNfTrainingResponse: {
    de: 'Trainingsansprechen',
    en: 'Training response',
    fr: 'Réponse à l’entraînement',
    es: 'Respuesta al entrenamiento',
  },
  wtNfAdherence: {
    de: 'Adhärenz',
    en: 'Adherence',
    fr: 'Observance',
    es: 'Adherencia',
  },
} as const satisfies Record<string, LocaleMap>

export type WeitereTherapieUiKey = keyof typeof weitereTherapieUiTranslations

export function translateWeitereTherapieUi(
  language: UiLanguage,
  key: WeitereTherapieUiKey,
): string {
  return weitereTherapieUiTranslations[key][language]
}

// ── Predefined treatment types ─────────────────────────────────────

const TYPE_LABELS: Record<DefaultWeitereTherapieType, LocaleMap> = {
  ekt: {
    de: 'EKT (Elektrokonvulsionstherapie)',
    en: 'EKT (electroconvulsive therapy)',
    fr: 'ECT (électroconvulsivothérapie)',
    es: 'TEC (terapia electroconvulsiva)',
  },
  rtms: { de: 'rTMS', en: 'rTMS', fr: 'rTMS', es: 'rTMS' },
  neurofeedback: {
    de: 'Neurofeedback',
    en: 'Neurofeedback',
    fr: 'Neurofeedback',
    es: 'Neurofeedback',
  },
  lichttherapie: {
    de: 'Lichttherapie',
    en: 'Light therapy',
    fr: 'Luminothérapie',
    es: 'Fototerapia',
  },
  schlafentzug: {
    de: 'Schlafentzug / Wachtherapie',
    en: 'Sleep deprivation / wake therapy',
    fr: 'Privation de sommeil / éveil thérapeutique',
    es: 'Privación de sueño / vigilia terapéutica',
  },
  ketamin: {
    de: 'Ketamin / Esketamin',
    en: 'Ketamine / esketamine',
    fr: 'Kétamine / eskétamine',
    es: 'Ketamina / esketamina',
  },
  biofeedback: { de: 'Biofeedback', en: 'Biofeedback', fr: 'Biofeedback', es: 'Biofeedback' },
  andere: { de: 'Andere', en: 'Other', fr: 'Autre', es: 'Otro' },
}

const STATUS_LABELS: Record<WeitereTherapieStatus, LocaleMap> = {
  planned: { de: 'Geplant', en: 'Planned', fr: 'Planifié', es: 'Planificado' },
  ongoing: { de: 'Laufend', en: 'Ongoing', fr: 'En cours', es: 'En curso' },
  paused: { de: 'Pausiert', en: 'Paused', fr: 'En pause', es: 'En pausa' },
  completed: { de: 'Abgeschlossen', en: 'Completed', fr: 'Terminé', es: 'Completado' },
  declined: { de: 'Abgelehnt', en: 'Declined', fr: 'Refusé', es: 'Rechazado' },
  contraindicated: {
    de: 'Kontraindiziert',
    en: 'Contraindicated',
    fr: 'Contre-indiqué',
    es: 'Contraindicado',
  },
}

export function translateWeitereTherapieType(language: UiLanguage, type: string): string {
  return (TYPE_LABELS as Record<string, LocaleMap>)[type]?.[language] ?? type
}

export function translateWeitereTherapieStatus(
  language: UiLanguage,
  status: WeitereTherapieStatus,
): string {
  return STATUS_LABELS[status][language]
}
