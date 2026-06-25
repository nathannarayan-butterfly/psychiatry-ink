import type { UiLanguage } from '../types/settings'

export const adminUiTranslations = {
  // ── Shared admin chrome ──────────────────────────────────────────────────
  adminBackDashboard: { de: 'Dashboard', en: 'Dashboard', fr: 'Tableau de bord', es: 'Panel' },
  adminRefresh: { de: 'Aktualisieren', en: 'Refresh', fr: 'Actualiser', es: 'Actualizar' },
  adminLoading: { de: 'Laden…', en: 'Loading…', fr: 'Chargement…', es: 'Cargando…' },

  // ── KB Admin: header ─────────────────────────────────────────────────────
  kbHeaderTitle: {
    de: 'Wissensdatenbank — Batch Review',
    en: 'Knowledge Base — Batch Review',
    fr: 'Base de connaissances — Revue par lots',
    es: 'Base de conocimiento — Revisión por lotes',
  },
  kbHeaderIntroBeforeCode: {
    de: 'Normalisierte Wissensdatenbank (',
    en: 'Normalized KB (',
    fr: 'Base de connaissances normalisée (',
    es: 'Base de conocimiento normalizada (',
  },
  kbHeaderIntroAfterCode: {
    de: ') ist die maßgebliche Quelle. Ältere JSONB-Tabellen sind überwiegend lesende Projektionen. KI-Entwürfe erfordern vor der Veröffentlichung eine klinische Prüfung.',
    en: ') is the source of truth. Legacy JSONB tables are read-mostly projections. AI drafts require clinical review before publication.',
    fr: ') est la source de référence. Les anciennes tables JSONB sont des projections principalement en lecture. Les brouillons IA nécessitent une revue clinique avant publication.',
    es: ') es la fuente de referencia. Las tablas JSONB heredadas son proyecciones de solo lectura. Los borradores de IA requieren revisión clínica antes de publicar.',
  },

  // ── KB Admin: server-not-ready alert (wraps inline <code> tokens) ────────
  kbApiNotReadyBeforeCode: {
    de: 'Server API nicht bereit. Starten Sie',
    en: 'Server API not ready. Start',
    fr: 'API serveur indisponible. Lancez',
    es: 'API del servidor no lista. Inicie',
  },
  kbApiNotReadyBetweenCode: {
    de: 'und setzen Sie',
    en: 'and set',
    fr: 'et définissez',
    es: 'y configure',
  },
  kbApiNotReadyAfterCode: {
    de: 'in .env.local (server-only, never VITE_*).',
    en: 'in .env.local (server-only, never VITE_*).',
    fr: 'dans .env.local (côté serveur uniquement, jamais VITE_*).',
    es: 'en .env.local (solo servidor, nunca VITE_*).',
  },

  // ── KB Admin: tabs ───────────────────────────────────────────────────────
  kbTabSubstances: { de: 'Substanzen', en: 'Substances', fr: 'Substances', es: 'Sustancias' },
  kbTabContributions: { de: 'Beiträge', en: 'Contributions', fr: 'Contributions', es: 'Contribuciones' },

  // ── KB Admin: list / filters ─────────────────────────────────────────────
  kbNoPendingContributions: {
    de: 'Keine ausstehenden Beiträge.',
    en: 'No pending contributions.',
    fr: 'Aucune contribution en attente.',
    es: 'Sin contribuciones pendientes.',
  },
  kbAnonymous: { de: 'Anonym', en: 'Anonymous', fr: 'Anonyme', es: 'Anónimo' },
  kbStatus: { de: 'Status', en: 'Status', fr: 'Statut', es: 'Estado' },
  kbStatusAll: {
    de: 'alle (inkl. ai_draft)',
    en: 'all (incl. ai_draft)',
    fr: 'tous (incl. ai_draft)',
    es: 'todos (incl. ai_draft)',
  },
  kbCategory: { de: 'Kategorie', en: 'Category', fr: 'Catégorie', es: 'Categoría' },
  kbCategoryAll: { de: 'alle', en: 'all', fr: 'tous', es: 'todos' },
  kbPublishing: { de: 'Veröffentlichen…', en: 'Publishing…', fr: 'Publication…', es: 'Publicando…' },
  kbApproveAll: { de: 'Alle freigeben', en: 'Approve all', fr: 'Tout approuver', es: 'Aprobar todo' },
  kbConfirmApproveAll: {
    de: '{count} Profil(e) freigeben und in Psychopharmakologie veröffentlichen?',
    en: 'Approve and publish {count} profile(s) to Psychopharmacology?',
    fr: 'Approuver et publier {count} profil(s) dans Psychopharmacologie ?',
    es: '¿Aprobar y publicar {count} perfil(es) en Psicofarmacología?',
  },
  kbBulkComplete: {
    de: 'Massenveröffentlichung abgeschlossen',
    en: 'Bulk publish complete',
    fr: 'Publication en lot terminée',
    es: 'Publicación en lote completada',
  },
  kbBulkPublished: { de: 'veröffentlicht', en: 'published', fr: 'publié(s)', es: 'publicado(s)' },
  kbBulkSkipped: { de: 'übersprungen', en: 'skipped', fr: 'ignoré(s)', es: 'omitido(s)' },
  kbBulkFailed: { de: 'fehlgeschlagen', en: 'failed', fr: 'échoué(s)', es: 'fallido(s)' },
  kbFailedProfiles: {
    de: 'Fehlgeschlagene Profile',
    en: 'Failed profiles',
    fr: 'Profils échoués',
    es: 'Perfiles fallidos',
  },
  kbNoEntries: { de: 'Keine Einträge', en: 'No entries', fr: 'Aucune entrée', es: 'Sin entradas' },

  // ── KB Admin: contribution detail ────────────────────────────────────────
  kbSubmission: { de: 'Einreichung', en: 'Submission', fr: 'Soumission', es: 'Envío' },
  kbSubmitter: { de: 'Einreicher', en: 'Submitter', fr: 'Soumetteur', es: 'Remitente' },
  kbCreated: { de: 'Erstellt', en: 'Created', fr: 'Créé', es: 'Creado' },
  kbSubstance: { de: 'Substanz', en: 'Substance', fr: 'Substance', es: 'Sustancia' },

  // ── KB Admin: substance detail ───────────────────────────────────────────
  kbSelectProfile: {
    de: 'Profil auswählen (AI draft öffnen)',
    en: 'Select a profile (open an AI draft)',
    fr: 'Sélectionnez un profil (ouvrir un brouillon IA)',
    es: 'Seleccione un perfil (abrir un borrador de IA)',
  },
  kbApprove: { de: 'Freigeben', en: 'Approve', fr: 'Approuver', es: 'Aprobar' },
  kbPublish: { de: 'Veröffentlichen', en: 'Publish', fr: 'Publier', es: 'Publicar' },
  kbArchive: { de: 'Archivieren', en: 'Archive', fr: 'Archiver', es: 'Archivar' },
  kbPublishedNotice: {
    de: 'Veröffentlicht → Psychopharmakologie (knowledge_base_drugs id: {id})',
    en: 'Published → Psychopharmacology (knowledge_base_drugs id: {id})',
    fr: 'Publié → Psychopharmacologie (knowledge_base_drugs id : {id})',
    es: 'Publicado → Psicofarmacología (knowledge_base_drugs id: {id})',
  },
  kbRerunTitle: {
    de: 'Anreicherung via CLI erneut ausführen (serverseitig)',
    en: 'Rerun enrichment via CLI (server-side)',
    fr: 'Relancer l’enrichissement via CLI (côté serveur)',
    es: 'Reejecutar enriquecimiento vía CLI (lado servidor)',
  },
  kbRerunButton: {
    de: 'Erneut ausführen (CLI kopieren)',
    en: 'Rerun (copy CLI)',
    fr: 'Relancer (copier CLI)',
    es: 'Reejecutar (copiar CLI)',
  },
  kbRerunHint: {
    de: 'Anreicherung erneut ausführen:',
    en: 'Rerun enrichment:',
    fr: 'Relancer l’enrichissement :',
    es: 'Reejecutar enriquecimiento:',
  },
  kbDataGaps: {
    de: 'Validierungs- / Datenlücken:',
    en: 'Validation / data gaps:',
    fr: 'Lacunes de validation / données :',
    es: 'Lagunas de validación / datos:',
  },
  kbNormalizedProfile: {
    de: 'Normalisiertes Profil',
    en: 'Normalized profile',
    fr: 'Profil normalisé',
    es: 'Perfil normalizado',
  },
  kbClass: { de: 'Klasse', en: 'Class', fr: 'Classe', es: 'Clase' },
  kbSourceQuality: {
    de: 'Quellqualität',
    en: 'Source quality',
    fr: 'Qualité de la source',
    es: 'Calidad de la fuente',
  },
  kbUses: { de: 'Anwendungen', en: 'Uses', fr: 'Indications', es: 'Usos' },
  kbTradeNames: {
    de: 'Handelsnamen',
    en: 'Trade names',
    fr: 'Noms commerciaux',
    es: 'Nombres comerciales',
  },
  kbPrimary: { de: 'primär', en: 'primary', fr: 'principal', es: 'principal' },
  kbReceptorProfile: {
    de: 'Rezeptorprofil',
    en: 'Receptor profile',
    fr: 'Profil récepteur',
    es: 'Perfil de receptores',
  },
  kbReceptor: { de: 'Rezeptor', en: 'Receptor', fr: 'Récepteur', es: 'Receptor' },
  kbAffinityPercent: { de: 'Affinität %', en: 'Affinity %', fr: 'Affinité %', es: 'Afinidad %' },
  kbEffect: { de: 'Effekt', en: 'Effect', fr: 'Effet', es: 'Efecto' },
  kbConfidence: { de: 'Konfidenz', en: 'Confidence', fr: 'Confiance', es: 'Confianza' },
  kbSideEffects: {
    de: 'Nebenwirkungen',
    en: 'Side effects',
    fr: 'Effets indésirables',
    es: 'Efectos adversos',
  },
  kbSystem: { de: 'System', en: 'System', fr: 'Système', es: 'Sistema' },
  kbFrequency: { de: 'Häufigkeit', en: 'Frequency', fr: 'Fréquence', es: 'Frecuencia' },
  kbSeverity: { de: 'Schwere', en: 'Severity', fr: 'Sévérité', es: 'Gravedad' },
  kbDosage: { de: 'Dosierung', en: 'Dosing', fr: 'Posologie', es: 'Dosificación' },
  kbPopulation: { de: 'Population', en: 'Population', fr: 'Population', es: 'Población' },
  kbStartDose: { de: 'Start', en: 'Start', fr: 'Initiale', es: 'Inicial' },
  kbTargetDose: { de: 'Ziel', en: 'Target', fr: 'Cible', es: 'Objetivo' },
  kbNotes: { de: 'Notizen', en: 'Notes', fr: 'Notes', es: 'Notas' },
  kbMonitoring: { de: 'Monitoring', en: 'Monitoring', fr: 'Surveillance', es: 'Monitorización' },
  kbParameter: { de: 'Parameter', en: 'Parameter', fr: 'Paramètre', es: 'Parámetro' },
  kbInterval: { de: 'Intervall', en: 'Interval', fr: 'Intervalle', es: 'Intervalo' },
  kbPriority: { de: 'Priorität', en: 'Priority', fr: 'Priorité', es: 'Prioridad' },
  kbRationale: { de: 'Rationale', en: 'Rationale', fr: 'Justification', es: 'Justificación' },
  kbInteractions: {
    de: 'Interaktionen',
    en: 'Interactions',
    fr: 'Interactions',
    es: 'Interacciones',
  },
  kbInteractsWith: { de: 'Mit', en: 'With', fr: 'Avec', es: 'Con' },
  kbMechanism: { de: 'Mechanismus', en: 'Mechanism', fr: 'Mécanisme', es: 'Mecanismo' },
  kbManagement: { de: 'Management', en: 'Management', fr: 'Conduite à tenir', es: 'Manejo' },
  kbSourcesEvidence: {
    de: 'Quellen / Evidenz',
    en: 'Sources / evidence',
    fr: 'Sources / preuves',
    es: 'Fuentes / evidencia',
  },
  kbNoSources: {
    de: 'Keine Quellen hinterlegt',
    en: 'No sources recorded',
    fr: 'Aucune source enregistrée',
    es: 'Sin fuentes registradas',
  },
  kbContraAndRisks: {
    de: 'Kontraindikationen & Risiken',
    en: 'Contraindications & risks',
    fr: 'Contre-indications et risques',
    es: 'Contraindicaciones y riesgos',
  },
  kbContraindications: {
    de: 'Kontraindikationen',
    en: 'Contraindications',
    fr: 'Contre-indications',
    es: 'Contraindicaciones',
  },
  kbSevereRisks: { de: 'Schwere Risiken', en: 'Serious risks', fr: 'Risques graves', es: 'Riesgos graves' },
  kbCautions: { de: 'Vorsichten', en: 'Cautions', fr: 'Précautions', es: 'Precauciones' },
  kbPregnancyLactation: {
    de: 'Schwangerschaft/Stillzeit',
    en: 'Pregnancy/lactation',
    fr: 'Grossesse/allaitement',
    es: 'Embarazo/lactancia',
  },
  kbGeriatric: { de: 'Geriatrie', en: 'Geriatrics', fr: 'Gériatrie', es: 'Geriatría' },
  kbHepaticRenal: {
    de: 'Leber/Niere',
    en: 'Hepatic/renal',
    fr: 'Hépatique/rénal',
    es: 'Hepático/renal',
  },
  kbMechanismOfAction: {
    de: 'Wirkmechanismus',
    en: 'Mechanism of action',
    fr: 'Mécanisme d’action',
    es: 'Mecanismo de acción',
  },
  kbEditFields: {
    de: 'Bearbeiten (normalisierte Felder)',
    en: 'Edit (normalized fields)',
    fr: 'Modifier (champs normalisés)',
    es: 'Editar (campos normalizados)',
  },
  kbClinicalPearls: {
    de: 'Klinische Merksätze',
    en: 'Clinical pearls',
    fr: 'Points clés cliniques',
    es: 'Perlas clínicas',
  },
  kbSave: { de: 'Speichern', en: 'Save', fr: 'Enregistrer', es: 'Guardar' },
  kbRawVsNormalized: {
    de: 'Roh-KI vs. normalisiert',
    en: 'Raw AI vs normalized',
    fr: 'IA brute vs normalisé',
    es: 'IA en bruto vs normalizado',
  },
  kbHideRawOutput: {
    de: 'Roh-DeepSeek-Ausgabe ausblenden',
    en: 'Hide raw DeepSeek output',
    fr: 'Masquer la sortie brute DeepSeek',
    es: 'Ocultar salida bruta de DeepSeek',
  },
  kbShowRawOutput: {
    de: 'Roh-DeepSeek-Ausgabe anzeigen',
    en: 'Show raw DeepSeek output',
    fr: 'Afficher la sortie brute DeepSeek',
    es: 'Mostrar salida bruta de DeepSeek',
  },
  kbGeneration: { de: 'Generierung', en: 'Generation', fr: 'Génération', es: 'Generación' },
  kbNoGeneration: {
    de: 'Kein KI-Generierungseintrag',
    en: 'No AI generation record',
    fr: 'Aucun enregistrement de génération IA',
    es: 'Sin registro de generación de IA',
  },
  kbRawAiResponse: {
    de: 'Roh-KI-Antwort',
    en: 'Raw AI response',
    fr: 'Réponse IA brute',
    es: 'Respuesta de IA en bruto',
  },
  kbValidatedPayload: {
    de: 'Validierte Nutzlast',
    en: 'Validated payload',
    fr: 'Charge utile validée',
    es: 'Carga útil validada',
  },
  kbValidationErrors: {
    de: 'Validierungsfehler',
    en: 'Validation errors',
    fr: 'Erreurs de validation',
    es: 'Errores de validación',
  },

  // ── KB Admin: status badges ──────────────────────────────────────────────
  kbBadgeAiDraft: { de: 'KI-Entwurf', en: 'AI draft', fr: 'Brouillon IA', es: 'Borrador de IA' },
  kbBadgeNotReviewedTitle: {
    de: 'Klinisch nicht geprüft',
    en: 'Not clinically reviewed',
    fr: 'Non revu cliniquement',
    es: 'No revisado clínicamente',
  },
  kbBadgeUnreviewed: { de: 'Ungeprüft', en: 'Unreviewed', fr: 'Non revu', es: 'Sin revisar' },
  kbBadgeNeedsReview: {
    de: 'Klinische Prüfung erforderlich',
    en: 'Needs clinical review',
    fr: 'Revue clinique requise',
    es: 'Requiere revisión clínica',
  },
  kbBadgeMissingSource: {
    de: 'Offizielle Quelle fehlt',
    en: 'Missing official source',
    fr: 'Source officielle manquante',
    es: 'Falta fuente oficial',
  },
  kbBadgeMissingReceptor: {
    de: 'Rezeptordaten fehlen',
    en: 'Missing receptor data',
    fr: 'Données récepteur manquantes',
    es: 'Faltan datos de receptores',
  },
  kbBadgeMissingMonitoring: {
    de: 'Monitoringdaten fehlen',
    en: 'Missing monitoring data',
    fr: 'Données de surveillance manquantes',
    es: 'Faltan datos de monitorización',
  },

  // ── Audit debug page ─────────────────────────────────────────────────────
  auditTitle: { de: 'Audit-Protokolle', en: 'Audit Logs', fr: 'Journaux d’audit', es: 'Registros de auditoría' },
  auditAccessDenied: {
    de: 'Zugriff verweigert — erfordert Entwicklermodus, KB-Admin oder die Berechtigung audit.view.',
    en: 'Access denied — requires dev mode, KB admin, or audit.view permission.',
    fr: 'Accès refusé — nécessite le mode développeur, l’admin KB ou la permission audit.view.',
    es: 'Acceso denegado — requiere modo desarrollador, administrador de KB o el permiso audit.view.',
  },
  auditSubtitle: {
    de: 'Entwickleransicht — Audit-Trail der Organisation (keine Produktions-UI)',
    en: 'Development view — org audit trail (not production UI)',
    fr: 'Vue développeur — piste d’audit de l’organisation (pas l’UI de production)',
    es: 'Vista de desarrollo — registro de auditoría de la organización (no es la UI de producción)',
  },
  auditAction: { de: 'Aktion', en: 'Action', fr: 'Action', es: 'Acción' },
  auditAllActions: {
    de: 'Alle Aktionen',
    en: 'All actions',
    fr: 'Toutes les actions',
    es: 'Todas las acciones',
  },
  auditCaseId: { de: 'Fall-ID', en: 'Case ID', fr: 'ID du cas', es: 'ID del caso' },
  auditCaseFilterPlaceholder: {
    de: 'Nach Fall filtern…',
    en: 'Filter by case…',
    fr: 'Filtrer par cas…',
    es: 'Filtrar por caso…',
  },
  auditColTimestamp: { de: 'Zeitstempel', en: 'Timestamp', fr: 'Horodatage', es: 'Marca de tiempo' },
  auditColUser: { de: 'Benutzer', en: 'User', fr: 'Utilisateur', es: 'Usuario' },
  auditColCase: { de: 'Fall', en: 'Case', fr: 'Cas', es: 'Caso' },
  auditColDocument: { de: 'Dokument', en: 'Document', fr: 'Document', es: 'Documento' },
  auditColMetadata: { de: 'Metadaten', en: 'Metadata', fr: 'Métadonnées', es: 'Metadatos' },
  auditEmpty: {
    de: 'Noch keine Audit-Protokolle.',
    en: 'No audit logs yet.',
    fr: 'Aucun journal d’audit pour le moment.',
    es: 'Aún no hay registros de auditoría.',
  },
} as const satisfies Record<string, Record<UiLanguage, string>>

export type AdminUiKey = keyof typeof adminUiTranslations

export function translateAdminUi(language: UiLanguage, key: AdminUiKey): string {
  return adminUiTranslations[key][language] ?? adminUiTranslations[key].de
}

export function formatAdminUiTemplate(
  language: UiLanguage,
  key: AdminUiKey,
  vars: Record<string, string | number>,
): string {
  let text = translateAdminUi(language, key)
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value))
  }
  return text
}
