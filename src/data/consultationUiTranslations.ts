import type { UiLanguage } from '../types/settings'
import type {
  ConsultationRequestStatus,
  ConsultationSectionKey,
} from '../types/consultation'

type LocaleMap = Record<UiLanguage, string>

export const consultationUiTranslations = {
  // ── Shared / common ──────────────────────────────────────────────────────
  konsileTitle: { de: 'Konsile', en: 'Consultations', fr: 'Consultations', es: 'Interconsultas' },
  requestConsultation: {
    de: 'Konsil anfordern',
    en: 'Request consultation',
    fr: 'Demander une consultation',
    es: 'Solicitar interconsulta',
  },
  print: { de: 'Drucken', en: 'Print', fr: 'Imprimer', es: 'Imprimir' },
  printRequest: {
    de: 'Konsilanfrage drucken',
    en: 'Print consultation request',
    fr: 'Imprimer la demande de consultation',
    es: 'Imprimir solicitud de interconsulta',
  },
  saveDraft: { de: 'Entwurf speichern', en: 'Save draft', fr: 'Enregistrer le brouillon', es: 'Guardar borrador' },
  cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler', es: 'Cancelar' },
  back: { de: '← Zurück', en: '← Back', fr: '← Retour', es: '← Atrás' },
  backToOverview: { de: '← Zur Übersicht', en: '← To overview', fr: '← Vers l’aperçu', es: '← A la vista general' },
  toOverview: { de: 'Zur Übersicht', en: 'To overview', fr: 'Vers l’aperçu', es: 'A la vista general' },
  copied: { de: 'Kopiert', en: 'Copied', fr: 'Copié', es: 'Copiado' },
  sharedMaterial: {
    de: 'Freigegebene Unterlagen',
    en: 'Shared material',
    fr: 'Documents partagés',
    es: 'Documentos compartidos',
  },
  clinicalQuestion: { de: 'Fragestellung', en: 'Clinical question', fr: 'Question clinique', es: 'Pregunta clínica' },
  shortHistory: { de: 'Kurzanamnese', en: 'Brief history', fr: 'Anamnèse brève', es: 'Anamnesis breve' },
  consultationReport: { de: 'Konsilbericht', en: 'Consultation report', fr: 'Rapport de consultation', es: 'Informe de interconsulta' },
  findings: { de: 'Befunde', en: 'Findings', fr: 'Résultats', es: 'Hallazgos' },
  assessment: { de: 'Beurteilung', en: 'Assessment', fr: 'Évaluation', es: 'Valoración' },
  recommendations: { de: 'Empfehlungen', en: 'Recommendations', fr: 'Recommandations', es: 'Recomendaciones' },
  limitations: { de: 'Limitationen', en: 'Limitations', fr: 'Limites', es: 'Limitaciones' },
  followUp: { de: 'Follow-up', en: 'Follow-up', fr: 'Suivi', es: 'Seguimiento' },
  loadFailed: { de: 'Laden fehlgeschlagen', en: 'Loading failed', fr: 'Échec du chargement', es: 'Error al cargar' },

  // ── ConsultationRequestBuilder ─────────────────────────────────────────────
  errSpecialtyRequired: {
    de: 'Fachrichtung angeben.',
    en: 'Specify a specialty.',
    fr: 'Indiquez une spécialité.',
    es: 'Indique una especialidad.',
  },
  errTitleQuestionRequired: {
    de: 'Titel und Fragestellung sind erforderlich.',
    en: 'Title and clinical question are required.',
    fr: 'Le titre et la question clinique sont requis.',
    es: 'El título y la pregunta clínica son obligatorios.',
  },
  errConsultantContactRequired: {
    de: 'Konsiliar-E-Mail oder Benutzer-ID angeben.',
    en: 'Provide a consultant email or user ID.',
    fr: 'Indiquez l’e-mail ou l’ID du consultant.',
    es: 'Indique el correo o el ID del consultor.',
  },
  errAtLeastOneSection: {
    de: 'Mindestens einen Abschnitt freigeben.',
    en: 'Share at least one section.',
    fr: 'Partagez au moins une section.',
    es: 'Comparta al menos una sección.',
  },
  errSendFailed: { de: 'Senden fehlgeschlagen', en: 'Sending failed', fr: 'Échec de l’envoi', es: 'Error al enviar' },
  consultationRequestTitle: {
    de: 'Konsilanfrage',
    en: 'Consultation request',
    fr: 'Demande de consultation',
    es: 'Solicitud de interconsulta',
  },
  consultationSent: {
    de: 'Konsil gesendet',
    en: 'Consultation sent',
    fr: 'Consultation envoyée',
    es: 'Interconsulta enviada',
  },
  consultationSentSubtitle: {
    de: 'Senden Sie diesen Link an den Konsiliar. Er ist nur einmal gültig.',
    en: 'Send this link to the consultant. It is valid only once.',
    fr: 'Envoyez ce lien au consultant. Il n’est valable qu’une seule fois.',
    es: 'Envíe este enlace al consultor. Solo es válido una vez.',
  },
  copyLink: { de: 'Link kopieren', en: 'Copy link', fr: 'Copier le lien', es: 'Copiar enlace' },
  builderSubtitle: {
    de: 'Konsilanfrage erstellen und Unterlagen freigeben',
    en: 'Create a consultation request and share material',
    fr: 'Créer une demande de consultation et partager des documents',
    es: 'Cree una solicitud de interconsulta y comparta documentos',
  },
  sectionConsultantSpecialty: {
    de: 'Konsiliar & Fachrichtung',
    en: 'Consultant & specialty',
    fr: 'Consultant et spécialité',
    es: 'Consultor y especialidad',
  },
  specialty: { de: 'Fachrichtung', en: 'Specialty', fr: 'Spécialité', es: 'Especialidad' },
  customSpecialty: {
    de: 'Eigene Fachrichtung',
    en: 'Custom specialty',
    fr: 'Spécialité personnalisée',
    es: 'Especialidad personalizada',
  },
  consultantEmail: { de: 'Konsiliar E-Mail', en: 'Consultant email', fr: 'E-mail du consultant', es: 'Correo del consultor' },
  consultantUserId: {
    de: 'Konsiliar Benutzer-ID (für registrierte Nutzer)',
    en: 'Consultant user ID (for registered users)',
    fr: 'ID utilisateur du consultant (pour les utilisateurs enregistrés)',
    es: 'ID de usuario del consultor (para usuarios registrados)',
  },
  consultantUserIdPlaceholder: {
    de: 'UUID des Konsiliar-Benutzers',
    en: 'Consultant user UUID',
    fr: 'UUID de l’utilisateur consultant',
    es: 'UUID del usuario consultor',
  },
  accessType: { de: 'Zugriffsart', en: 'Access type', fr: 'Type d’accès', es: 'Tipo de acceso' },
  accessInternal: { de: 'Interner Konsiliar', en: 'Internal consultant', fr: 'Consultant interne', es: 'Consultor interno' },
  accessExternal: { de: 'Externer Konsiliar', en: 'External consultant', fr: 'Consultant externe', es: 'Consultor externo' },
  accessOneTime: {
    de: 'Einmaliger externer Zugang',
    en: 'One-time external access',
    fr: 'Accès externe unique',
    es: 'Acceso externo único',
  },
  sectionQuestion: { de: 'Fragestellung', en: 'Clinical question', fr: 'Question clinique', es: 'Pregunta clínica' },
  title: { de: 'Titel', en: 'Title', fr: 'Titre', es: 'Título' },
  urgency: { de: 'Dringlichkeit', en: 'Urgency', fr: 'Urgence', es: 'Urgencia' },
  urgencyRoutine: { de: 'Routine', en: 'Routine', fr: 'Courante', es: 'Rutinaria' },
  urgencyUrgent: { de: 'Dringend', en: 'Urgent', fr: 'Urgente', es: 'Urgente' },
  urgencyEmergency: { de: 'Notfall', en: 'Emergency', fr: 'Urgence vitale', es: 'Emergencia' },
  examinationRequested: {
    de: 'Direkte Patientenuntersuchung angefordert',
    en: 'Direct patient examination requested',
    fr: 'Examen direct du patient demandé',
    es: 'Se solicita examen directo del paciente',
  },
  deadlineOptional: { de: 'Frist (optional)', en: 'Deadline (optional)', fr: 'Échéance (facultatif)', es: 'Plazo (opcional)' },
  externalAccessWarning: {
    de: 'Externer Konsiliarzugang: Patientenkennzeichen werden gemäß gewähltem Modus reduziert.',
    en: 'External consultant access: patient identifiers are reduced according to the selected mode.',
    fr: 'Accès consultant externe : les identifiants du patient sont réduits selon le mode choisi.',
    es: 'Acceso de consultor externo: los identificadores del paciente se reducen según el modo elegido.',
  },
  identifierMode: { de: 'Kennzeichnungsmodus', en: 'Identifier mode', fr: 'Mode d’identification', es: 'Modo de identificación' },
  identifierDeidentified: { de: 'De-identifiziert', en: 'De-identified', fr: 'Dépersonnalisé', es: 'Anonimizado' },
  identifierPseudonymized: { de: 'Pseudonymisiert', en: 'Pseudonymized', fr: 'Pseudonymisé', es: 'Seudonimizado' },
  identifierFull: {
    de: 'Vollständig (nur intern)',
    en: 'Full (internal only)',
    fr: 'Complet (interne uniquement)',
    es: 'Completo (solo interno)',
  },
  customTextPlaceholder: {
    de: 'Zusätzlicher Freitext…',
    en: 'Additional free text…',
    fr: 'Texte libre supplémentaire…',
    es: 'Texto libre adicional…',
  },
  legalConsentOptional: {
    de: 'Rechtliches / Einwilligung (optional)',
    en: 'Legal / consent (optional)',
    fr: 'Aspects juridiques / consentement (facultatif)',
    es: 'Aspectos legales / consentimiento (opcional)',
  },
  sending: { de: 'Senden…', en: 'Sending…', fr: 'Envoi…', es: 'Enviando…' },
  previewTitle: { de: 'Vorschau — Freigabe', en: 'Preview — sharing', fr: 'Aperçu — partage', es: 'Vista previa — compartir' },
  previewHint: {
    de: 'Diese Abschnitte werden dem Konsiliar übermittelt.',
    en: 'These sections will be sent to the consultant.',
    fr: 'Ces sections seront transmises au consultant.',
    es: 'Estas secciones se enviarán al consultor.',
  },
  previewEmpty: {
    de: 'Noch keine Abschnitte ausgewählt.',
    en: 'No sections selected yet.',
    fr: 'Aucune section sélectionnée pour l’instant.',
    es: 'Aún no hay secciones seleccionadas.',
  },

  // ── ConsultationReportReview ───────────────────────────────────────────────
  errActionFailed: { de: 'Aktion fehlgeschlagen', en: 'Action failed', fr: 'Échec de l’action', es: 'Acción fallida' },
  errArchiveFailed: {
    de: 'Archivieren fehlgeschlagen',
    en: 'Archiving failed',
    fr: 'Échec de l’archivage',
    es: 'Error al archivar',
  },
  errRevokeFailed: {
    de: 'Widerruf fehlgeschlagen',
    en: 'Revocation failed',
    fr: 'Échec de la révocation',
    es: 'Error al revocar',
  },
  errResponseFailed: {
    de: 'Antwort fehlgeschlagen',
    en: 'Response failed',
    fr: 'Échec de la réponse',
    es: 'Error en la respuesta',
  },
  moreInfoRequested: {
    de: 'Weitere Informationen angefordert',
    en: 'More information requested',
    fr: 'Informations complémentaires demandées',
    es: 'Información adicional solicitada',
  },
  responseToConsultantPlaceholder: {
    de: 'Antwort an Konsiliar…',
    en: 'Response to consultant…',
    fr: 'Réponse au consultant…',
    es: 'Respuesta al consultor…',
  },
  sendResponse: { de: 'Antwort senden', en: 'Send response', fr: 'Envoyer la réponse', es: 'Enviar respuesta' },
  copy: { de: 'Kopieren', en: 'Copy', fr: 'Copier', es: 'Copiar' },
  adoptToCaseFileTitle: {
    de: 'Manuell in Fallakte übernehmen',
    en: 'Manually adopt into case file',
    fr: 'Reprendre manuellement dans le dossier',
    es: 'Incorporar manualmente al expediente',
  },
  adoptToCaseFile: {
    de: 'In Fallakte übernehmen',
    en: 'Adopt into case file',
    fr: 'Reprendre dans le dossier',
    es: 'Incorporar al expediente',
  },
  markReviewed: { de: 'Als geprüft markieren', en: 'Mark as reviewed', fr: 'Marquer comme examiné', es: 'Marcar como revisado' },
  archive: { de: 'Archivieren', en: 'Archive', fr: 'Archiver', es: 'Archivar' },
  revokeAccess: { de: 'Zugriff widerrufen', en: 'Revoke access', fr: 'Révoquer l’accès', es: 'Revocar acceso' },
  noSubmittedReport: {
    de: 'Noch kein eingereichter Konsilbericht.',
    en: 'No submitted consultation report yet.',
    fr: 'Aucun rapport de consultation soumis pour l’instant.',
    es: 'Aún no hay un informe de interconsulta enviado.',
  },

  // ── ConsultantRequestWorkspace ─────────────────────────────────────────────
  errSaveFailed: {
    de: 'Speichern fehlgeschlagen',
    en: 'Saving failed',
    fr: 'Échec de l’enregistrement',
    es: 'Error al guardar',
  },
  errSubmitFailed: {
    de: 'Einreichen fehlgeschlagen',
    en: 'Submission failed',
    fr: 'Échec de la soumission',
    es: 'Error al enviar',
  },
  errMoreInfoFailed: {
    de: 'Rückfrage fehlgeschlagen',
    en: 'Query failed',
    fr: 'Échec de la demande',
    es: 'Error en la consulta',
  },
  notFound: { de: 'Nicht gefunden', en: 'Not found', fr: 'Introuvable', es: 'No encontrado' },
  backToRequests: { de: '← Anfragen', en: '← Requests', fr: '← Demandes', es: '← Solicitudes' },
  decryptFailedWarning: {
    de: 'Verschlüsselte Unterlagen konnten nicht entschlüsselt werden. Bitte öffnen Sie die Anfrage erneut über den ursprünglichen Einladungslink (enthält den Schlüssel).',
    en: 'Encrypted material could not be decrypted. Please reopen the request via the original invitation link (it contains the key).',
    fr: 'Les documents chiffrés n’ont pas pu être déchiffrés. Veuillez rouvrir la demande via le lien d’invitation d’origine (il contient la clé).',
    es: 'No se pudieron descifrar los documentos cifrados. Vuelva a abrir la solicitud mediante el enlace de invitación original (contiene la clave).',
  },
  noSharedMaterial: {
    de: 'Keine freigegebenen Unterlagen.',
    en: 'No shared material.',
    fr: 'Aucun document partagé.',
    es: 'Sin documentos compartidos.',
  },
  writeReport: { de: 'Bericht schreiben', en: 'Write report', fr: 'Rédiger le rapport', es: 'Redactar informe' },
  reportSubmittedNotice: {
    de: 'Bericht eingereicht — keine weiteren Änderungen (MVP).',
    en: 'Report submitted — no further changes (MVP).',
    fr: 'Rapport soumis — aucune autre modification (MVP).',
    es: 'Informe enviado — sin más cambios (MVP).',
  },
  patientExamined: { de: 'Patient untersucht', en: 'Patient examined', fr: 'Patient examiné', es: 'Paciente examinado' },
  notApplicable: { de: 'Nicht zutreffend', en: 'Not applicable', fr: 'Non applicable', es: 'No aplica' },
  yes: { de: 'Ja', en: 'Yes', fr: 'Oui', es: 'Sí' },
  no: { de: 'Nein', en: 'No', fr: 'Non', es: 'No' },
  submitReport: { de: 'Bericht einreichen', en: 'Submit report', fr: 'Soumettre le rapport', es: 'Enviar informe' },
  queryToClinicianPlaceholder: {
    de: 'Rückfrage an Kliniker…',
    en: 'Query to clinician…',
    fr: 'Question au clinicien…',
    es: 'Consulta al clínico…',
  },
  raiseQuery: { de: 'Rückfrage stellen', en: 'Raise query', fr: 'Poser une question', es: 'Plantear consulta' },

  // ── ConsultationCaseSection ────────────────────────────────────────────────
  noConsultationRequests: {
    de: 'Noch keine Konsilanfragen',
    en: 'No consultation requests yet',
    fr: 'Aucune demande de consultation',
    es: 'Aún no hay solicitudes de interconsulta',
  },
  openReportForReview: {
    de: 'Konsilbericht zur Prüfung öffnen',
    en: 'Open consultation report for review',
    fr: 'Ouvrir le rapport pour examen',
    es: 'Abrir informe para revisión',
  },

  // ── ConsultationCasePage ───────────────────────────────────────────────────
  backToCaseOverview: {
    de: '← Fallübersicht',
    en: '← Case overview',
    fr: '← Aperçu du cas',
    es: '← Resumen del caso',
  },
  noRequestsForCase: {
    de: 'Noch keine Konsilanfragen für diesen Fall.',
    en: 'No consultation requests for this case yet.',
    fr: 'Aucune demande de consultation pour ce cas.',
    es: 'Aún no hay solicitudes de interconsulta para este caso.',
  },

  // ── ConsultationInvitePage ─────────────────────────────────────────────────
  errInvalidInvite: { de: 'Ungültige Einladung', en: 'Invalid invitation', fr: 'Invitation non valide', es: 'Invitación no válida' },
  errAcceptFailed: {
    de: 'Annahme fehlgeschlagen',
    en: 'Acceptance failed',
    fr: 'Échec de l’acceptation',
    es: 'Error al aceptar',
  },
  supabaseAuthRequired: {
    de: 'Supabase-Authentifizierung erforderlich.',
    en: 'Supabase authentication required.',
    fr: 'Authentification Supabase requise.',
    es: 'Se requiere autenticación de Supabase.',
  },
  inviteTitle: { de: 'Konsil-Einladung', en: 'Consultation invitation', fr: 'Invitation à la consultation', es: 'Invitación a interconsulta' },
  inviteLoginPrompt: {
    de: 'Bitte anmelden, um die Einladung anzunehmen.',
    en: 'Please sign in to accept the invitation.',
    fr: 'Veuillez vous connecter pour accepter l’invitation.',
    es: 'Inicie sesión para aceptar la invitación.',
  },
  signIn: { de: 'Anmelden', en: 'Sign in', fr: 'Se connecter', es: 'Iniciar sesión' },
  inviteFor: { de: 'Für', en: 'For', fr: 'Pour', es: 'Para' },
  acceptInvite: { de: 'Einladung annehmen', en: 'Accept invitation', fr: 'Accepter l’invitation', es: 'Aceptar invitación' },

  // ── ConsultantDashboard ────────────────────────────────────────────────────
  backToDashboard: { de: '← Dashboard', en: '← Dashboard', fr: '← Tableau de bord', es: '← Panel' },
  externalConsultantAccess: {
    de: 'Externer Konsiliarzugang',
    en: 'External consultant access',
    fr: 'Accès consultant externe',
    es: 'Acceso de consultor externo',
  },
  noRequestsInCategory: {
    de: 'Keine Konsilanfragen in dieser Kategorie.',
    en: 'No consultation requests in this category.',
    fr: 'Aucune demande de consultation dans cette catégorie.',
    es: 'No hay solicitudes de interconsulta en esta categoría.',
  },
  filterAll: { de: 'Alle', en: 'All', fr: 'Toutes', es: 'Todas' },
  filterPending: { de: 'Ausstehend', en: 'Pending', fr: 'En attente', es: 'Pendientes' },
  filterInProgress: { de: 'In Bearbeitung', en: 'In progress', fr: 'En cours', es: 'En curso' },
  filterMoreInfo: { de: 'Rückfrage offen', en: 'Query open', fr: 'Question en suspens', es: 'Consulta abierta' },
  filterSubmitted: { de: 'Eingereicht', en: 'Submitted', fr: 'Soumises', es: 'Enviadas' },
  filterArchived: { de: 'Archiviert', en: 'Archived', fr: 'Archivées', es: 'Archivadas' },
} as const satisfies Record<string, LocaleMap>

export type ConsultationUiKey = keyof typeof consultationUiTranslations

export function translateConsultationUi(language: UiLanguage, key: ConsultationUiKey): string {
  return consultationUiTranslations[key][language] ?? consultationUiTranslations[key].de
}

// ── Request status labels (localized counterpart of CONSULTATION_STATUS_LABELS) ──
const consultationStatusLabels: Record<ConsultationRequestStatus, LocaleMap> = {
  draft: { de: 'Entwurf', en: 'Draft', fr: 'Brouillon', es: 'Borrador' },
  sent: { de: 'Gesendet', en: 'Sent', fr: 'Envoyé', es: 'Enviado' },
  viewed: { de: 'Geöffnet', en: 'Opened', fr: 'Ouvert', es: 'Abierto' },
  in_progress: { de: 'In Bearbeitung', en: 'In progress', fr: 'En cours', es: 'En curso' },
  more_info_requested: {
    de: 'Weitere Informationen angefordert',
    en: 'More information requested',
    fr: 'Informations complémentaires demandées',
    es: 'Información adicional solicitada',
  },
  submitted: {
    de: 'Bericht eingereicht',
    en: 'Report submitted',
    fr: 'Rapport soumis',
    es: 'Informe enviado',
  },
  cancelled: { de: 'Abgebrochen', en: 'Cancelled', fr: 'Annulé', es: 'Cancelado' },
  archived: { de: 'Archiviert', en: 'Archived', fr: 'Archivé', es: 'Archivado' },
}

export function translateConsultationStatus(language: UiLanguage, status: ConsultationRequestStatus): string {
  return consultationStatusLabels[status][language] ?? consultationStatusLabels[status].de
}

// ── Shared section labels (localized counterpart of CONSULTATION_SECTION_LABELS) ──
const consultationSectionLabels: Record<ConsultationSectionKey, LocaleMap> = {
  diagnosis: { de: 'Diagnosen', en: 'Diagnoses', fr: 'Diagnostics', es: 'Diagnósticos' },
  anamnesis: { de: 'Anamnese', en: 'History', fr: 'Anamnèse', es: 'Anamnesis' },
  'therapie-verlauf': {
    de: 'Verlauf-Auszüge',
    en: 'Course excerpts',
    fr: 'Extraits d’évolution',
    es: 'Extractos de evolución',
  },
  investigations: {
    de: 'Befunde / Untersuchungen',
    en: 'Findings / investigations',
    fr: 'Résultats / examens',
    es: 'Hallazgos / exploraciones',
  },
  labs: { de: 'Labor / Laborwerte', en: 'Lab / lab values', fr: 'Laboratoire / valeurs', es: 'Laboratorio / valores' },
  imaging: { de: 'Bildgebung', en: 'Imaging', fr: 'Imagerie', es: 'Imagenología' },
  'current-therapy': {
    de: 'Aktuelle Therapie',
    en: 'Current therapy',
    fr: 'Thérapie actuelle',
    es: 'Terapia actual',
  },
  medication: { de: 'Medikation', en: 'Medication', fr: 'Médication', es: 'Medicación' },
  'side-effects': { de: 'Nebenwirkungen', en: 'Side effects', fr: 'Effets indésirables', es: 'Efectos adversos' },
  risk: { de: 'Risiko', en: 'Risk', fr: 'Risque', es: 'Riesgo' },
  documents: {
    de: 'Dokumente / Anhänge',
    en: 'Documents / attachments',
    fr: 'Documents / pièces jointes',
    es: 'Documentos / adjuntos',
  },
  custom_text: { de: 'Freitext', en: 'Free text', fr: 'Texte libre', es: 'Texto libre' },
}

export function translateConsultationSection(language: UiLanguage, key: ConsultationSectionKey): string {
  return consultationSectionLabels[key][language] ?? consultationSectionLabels[key].de
}

// ── Specialty labels (display only; the German value remains the stored key) ──
const consultationSpecialtyLabels: Record<string, LocaleMap> = {
  Psychiatrie: { de: 'Psychiatrie', en: 'Psychiatry', fr: 'Psychiatrie', es: 'Psiquiatría' },
  Psychosomatik: {
    de: 'Psychosomatik',
    en: 'Psychosomatic medicine',
    fr: 'Médecine psychosomatique',
    es: 'Medicina psicosomática',
  },
  'Forensische Psychiatrie': {
    de: 'Forensische Psychiatrie',
    en: 'Forensic psychiatry',
    fr: 'Psychiatrie médico-légale',
    es: 'Psiquiatría forense',
  },
  Suchtmedizin: {
    de: 'Suchtmedizin',
    en: 'Addiction medicine',
    fr: 'Médecine des addictions',
    es: 'Medicina de adicciones',
  },
  Geriatrie: { de: 'Geriatrie', en: 'Geriatrics', fr: 'Gériatrie', es: 'Geriatría' },
  Neurologie: { de: 'Neurologie', en: 'Neurology', fr: 'Neurologie', es: 'Neurología' },
  'Innere Medizin': { de: 'Innere Medizin', en: 'Internal medicine', fr: 'Médecine interne', es: 'Medicina interna' },
  Kardiologie: { de: 'Kardiologie', en: 'Cardiology', fr: 'Cardiologie', es: 'Cardiología' },
  Nephrologie: { de: 'Nephrologie', en: 'Nephrology', fr: 'Néphrologie', es: 'Nefrología' },
  Endokrinologie: { de: 'Endokrinologie', en: 'Endocrinology', fr: 'Endocrinologie', es: 'Endocrinología' },
  Gynäkologie: { de: 'Gynäkologie', en: 'Gynaecology', fr: 'Gynécologie', es: 'Ginecología' },
  Pädiatrie: { de: 'Pädiatrie', en: 'Paediatrics', fr: 'Pédiatrie', es: 'Pediatría' },
  Radiologie: { de: 'Radiologie', en: 'Radiology', fr: 'Radiologie', es: 'Radiología' },
  Pathologie: { de: 'Pathologie', en: 'Pathology', fr: 'Pathologie', es: 'Patología' },
  Laboratoriumsmedizin: {
    de: 'Laboratoriumsmedizin',
    en: 'Laboratory medicine',
    fr: 'Médecine de laboratoire',
    es: 'Medicina de laboratorio',
  },
  Pharmakologie: { de: 'Pharmakologie', en: 'Pharmacology', fr: 'Pharmacologie', es: 'Farmacología' },
  Rechtsmedizin: { de: 'Rechtsmedizin', en: 'Forensic medicine', fr: 'Médecine légale', es: 'Medicina legal' },
  Sozialmedizin: { de: 'Sozialmedizin', en: 'Social medicine', fr: 'Médecine sociale', es: 'Medicina social' },
  Palliativmedizin: {
    de: 'Palliativmedizin',
    en: 'Palliative medicine',
    fr: 'Médecine palliative',
    es: 'Medicina paliativa',
  },
  Allgemeinmedizin: { de: 'Allgemeinmedizin', en: 'General medicine', fr: 'Médecine générale', es: 'Medicina general' },
  'Sonstige / Freitext': {
    de: 'Sonstige / Freitext',
    en: 'Other / free text',
    fr: 'Autre / texte libre',
    es: 'Otra / texto libre',
  },
}

export function translateConsultationSpecialty(language: UiLanguage, specialty: string): string {
  const entry = consultationSpecialtyLabels[specialty]
  return entry ? (entry[language] ?? entry.de) : specialty
}
