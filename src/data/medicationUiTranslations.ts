import type { UiLanguage } from '../types/settings'
import type {
  MedicationChangeType,
  MedicationFormulation,
  MedicationStatus,
  SideEffectAttribution,
} from '../types/medicationPlan'

type LocaleMap = Record<UiLanguage, string>

export const medicationUiTranslations = {
  medPageTitle: {
    de: 'Medikationsplan',
    en: 'Medication plan',
    fr: 'Plan médicamenteux',
    es: 'Plan de medicación',
  },
  medDisclaimerDemo: {
    de: 'Dosierungsvorschläge und Kurzinfos sind Demo-Daten — klinische Entscheidung beim behandelnden Arzt.',
    en: 'Dosage suggestions and brief info are demo data — clinical decisions remain with the treating clinician.',
    fr: 'Suggestions posologiques et infos brèves : données démo — décision clinique du médecin traitant.',
    es: 'Sugerencias de dosis e info breve son datos demo — decisión clínica del médico tratante.',
  },
  medAdd: { de: 'Hinzufügen', en: 'Add medication', fr: 'Ajouter', es: 'Añadir' },
  medAddMedication: {
    de: 'Medikament hinzufügen',
    en: 'Add medication',
    fr: 'Ajouter un médicament',
    es: 'Añadir medicamento',
  },
  medEdit: { de: 'Bearbeiten', en: 'Edit', fr: 'Modifier', es: 'Editar' },
  medExport: { de: 'Export', en: 'Export', fr: 'Exporter', es: 'Exportar' },
  medPrint: { de: 'Drucken', en: 'Print', fr: 'Imprimer', es: 'Imprimir' },
  medCopyPlan: { de: 'Plan kopieren', en: 'Copy plan', fr: 'Copier le plan', es: 'Copiar plan' },
  medViewHistory: { de: 'Planverlauf', en: 'Plan history', fr: 'Historique du plan', es: 'Historial del plan' },
  medLastPlan: { de: 'Aktueller Plan', en: 'Current plan', fr: 'Plan actuel', es: 'Plan actual' },
  medEmpty: {
    de: 'Noch keine Medikamente erfasst.',
    en: 'No medications recorded yet.',
    fr: 'Aucun médicament enregistré.',
    es: 'Sin medicamentos registrados.',
  },
  medEmptyHint: {
    de: 'Fügen Sie das erste Präparat hinzu, um den Medikationsplan zu beginnen.',
    en: 'Add the first medication to start the plan.',
    fr: 'Ajoutez le premier médicament pour commencer le plan.',
    es: 'Añada el primer medicamento para iniciar el plan.',
  },
  medSubstance: { de: 'Substanz', en: 'Substance', fr: 'Substance', es: 'Sustancia' },
  medFormulation: { de: 'Darreichungsform', en: 'Formulation', fr: 'Forme galénique', es: 'Formulación' },
  medStrength: {
    de: 'Stärke / Konzentration',
    en: 'Strength / concentration',
    fr: 'Dosage / concentration',
    es: 'Concentración / potencia',
  },
  medStrengthSelect: {
    de: 'Stärke wählen …',
    en: 'Select strength …',
    fr: 'Choisir le dosage …',
    es: 'Elegir concentración …',
  },
  medStrengthCustom: {
    de: 'Freitext …',
    en: 'Custom …',
    fr: 'Texte libre …',
    es: 'Texto libre …',
  },
  medDoseMorning: { de: 'Morgens', en: 'Morning', fr: 'Matin', es: 'Mañana' },
  medDoseNoon: { de: 'Mittags', en: 'Noon', fr: 'Midi', es: 'Mediodía' },
  medDoseEvening: { de: 'Abends', en: 'Evening', fr: 'Soir', es: 'Tarde' },
  medDoseNight: { de: 'Nachts', en: 'Night', fr: 'Nuit', es: 'Noche' },
  medDoseUnit: { de: 'Einheit', en: 'Unit', fr: 'Unité', es: 'Unidad' },
  medDoseExample: {
    de: 'Schema z. B. 7,5-0-0-10 ml (M-M-A-N)',
    en: 'Schedule e.g. 7.5-0-0-10 ml (morning–noon–evening–night)',
    fr: 'Schéma ex. 7,5-0-0-10 ml (M-M-S-N)',
    es: 'Esquema ej. 7,5-0-0-10 ml (M-M-T-N)',
  },
  medDosePerInjection: {
    de: 'Dosis pro Injektion',
    en: 'Dose per injection',
    fr: 'Dose par injection',
    es: 'Dosis por inyección',
  },
  medDosePerPatch: {
    de: 'Dosis (Pflaster)',
    en: 'Dose (patch)',
    fr: 'Dose (patch)',
    es: 'Dosis (parche)',
  },
  medDepotDoseHint: {
    de: 'Menge pro Injektion; Intervall unten (z. B. alle 2 Wochen).',
    en: 'Amount per injection; interval below (e.g. every 2 weeks).',
    fr: 'Quantité par injection ; intervalle ci-dessous (ex. toutes les 2 semaines).',
    es: 'Cantidad por inyección; intervalo abajo (p. ej. cada 2 semanas).',
  },
  medSingleDoseHint: {
    de: 'Einzeldosis pro Applikation.',
    en: 'Single dose per application.',
    fr: 'Dose unique par application.',
    es: 'Dosis única por aplicación.',
  },
  medPrn: { de: 'bei Bedarf', en: 'PRN', fr: 'si besoin', es: 'PRN' },
  medDepotInterval: { de: 'Depot-Intervall', en: 'Depot interval', fr: 'Intervalle dépôt', es: 'Intervalo depósito' },
  medStartDate: { de: 'Beginn', en: 'Start', fr: 'Début', es: 'Inicio' },
  medLastChange: { de: 'Letzte Änderung', en: 'Last change', fr: 'Dernière modif.', es: 'Último cambio' },
  medIndication: { de: 'Indikation', en: 'Indication', fr: 'Indication', es: 'Indicación' },
  medStatus: { de: 'Status', en: 'Status', fr: 'Statut', es: 'Estado' },
  medReasonChange: { de: 'Grund der Änderung', en: 'Reason for change', fr: 'Motif du changement', es: 'Motivo del cambio' },
  medAdherence: { de: 'Compliance', en: 'Adherence', fr: 'Observance', es: 'Adherencia' },
  medFreeText: { de: 'Freitextzeile', en: 'Free-text line', fr: 'Ligne libre', es: 'Línea libre' },
  medSave: { de: 'Speichern', en: 'Save', fr: 'Enregistrer', es: 'Guardar' },
  medCancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler', es: 'Cancelar' },
  medAddSideEffect: { de: 'Nebenwirkung', en: 'Side effect', fr: 'Effet indésirable', es: 'Efecto adverso' },
  medHistoryToggle: { de: 'Verlauf', en: 'History', fr: 'Historique', es: 'Historial' },
  medSectionSideEffects: {
    de: 'Nebenwirkungen / Kausalitätszuordnung',
    en: 'Side Effects / Adverse Effect Attribution',
    fr: 'Effets indésirables / attribution causale',
    es: 'Efectos adversos / atribución causal',
  },
  medGlobalSideEffectHint: {
    de: 'Für unklare Symptome, wenn das verantwortliche Präparat oder die Kombination noch nicht bestimmt ist — z. B. Tremor, Sedierung, Nierenfunktion, EPS, sexuelle Dysfunktion, Obstipation, QT-Bedenken, metabolische Veränderung.',
    en: 'For unclear symptoms when the responsible drug or combination is not yet known — e.g. tremor, sedation, renal change, EPS, sexual dysfunction, constipation, QT concern, metabolic change.',
    fr: 'Pour symptômes peu clairs lorsque le médicament ou la combinaison responsable n’est pas encore identifié — ex. tremblement, sédation, fonction rénale, EPS, dysfonction sexuelle, constipation, QT, changement métabolique.',
    es: 'Para síntomas poco claros cuando el fármaco o combinación responsable aún no se conoce — p. ej. temblor, sedación, función renal, EPS, disfunción sexual, estreñimiento, QT, cambio metabólico.',
  },
  medSuspectedMedication: {
    de: 'Verdächtiges Präparat (optional)',
    en: 'Suspected medication (optional)',
    fr: 'Médicament suspecté (optionnel)',
    es: 'Fármaco sospechoso (opcional)',
  },
  medSectionCombination: {
    de: 'Kombinations-Check',
    en: 'Combination check',
    fr: 'Vérification combinaisons',
    es: 'Control de combinaciones',
  },
  medSectionLab: {
    de: 'Labor-Medikament-Korrelation',
    en: 'Lab–medication correlation',
    fr: 'Corrélation labo–médicament',
    es: 'Correlación laboratorio–medicación',
  },
  medSectionIntelligence: {
    de: 'Medikamenten-Kurzinfo',
    en: 'Medication brief info',
    fr: 'Info brève médicament',
    es: 'Info breve medicamento',
  },
  medCombinationWarning: {
    de: 'Automatischer Interaktions- und Kombinationscheck ist in V1 nicht aktiv — manuelle Prüfung erforderlich.',
    en: 'Automatic interaction and combination check is not active in v1 — manual review required.',
    fr: 'Contrôle automatique des interactions inactif en v1 — vérification manuelle requise.',
    es: 'Control automático de interacciones inactivo en v1 — revisión manual necesaria.',
  },
  medLabPlaceholder: {
    de: 'Beispiele: Nierenfunktion bei Lithium/ACE-Hemmern, Leberwerte bei Valproat, TSH unter Lithium, QT-relevante Kombinationen.',
    en: 'Examples: renal function with lithium/ACE inhibitors, LFTs with valproate, TSH on lithium, QT-relevant combinations.',
    fr: 'Exemples : fonction rénale (lithium/ IEC), bilan hépatique (valproate), TSH sous lithium, combinaisons QT.',
    es: 'Ejemplos: función renal (litio/IECA), perfil hepático (valproato), TSH con litio, combinaciones QT.',
  },
  medSymptom: { de: 'Symptom', en: 'Symptom', fr: 'Symptôme', es: 'Síntoma' },
  medOnset: { de: 'Beginn', en: 'Onset', fr: 'Début', es: 'Inicio' },
  medSeverity: { de: 'Schwere', en: 'Severity', fr: 'Sévérité', es: 'Gravedad' },
  medTemporal: { de: 'Zeitlicher Bezug', en: 'Temporal relation', fr: 'Relation temporelle', es: 'Relación temporal' },
  medActionTaken: { de: 'Maßnahme', en: 'Action taken', fr: 'Mesure', es: 'Medida' },
  medOutcome: { de: 'Verlauf', en: 'Outcome', fr: 'Évolution', es: 'Evolución' },
  medAttribution: { de: 'Zuordnung', en: 'Attribution', fr: 'Attribution', es: 'Atribución' },
  medReportSideEffect: { de: 'Nebenwirkung melden', en: 'Report side effect', fr: 'Signaler un effet', es: 'Informar efecto adverso' },
  medDemoSuggestions: { de: 'Demo-Vorschläge', en: 'Demo suggestions', fr: 'Suggestions démo', es: 'Sugerencias demo' },
  medReferenceDataAvailable: {
    de: '✓ Referenzdaten verfügbar',
    en: '✓ Reference data available',
    fr: '✓ Données de référence disponibles',
    es: '✓ Datos de referencia disponibles',
  },
  medStrengthDemoHint: {
    de: 'Demo-Stärken — kein Referenzeintrag für diese Substanz',
    en: 'Demo strengths — no reference entry for this substance',
    fr: 'Concentrations démo — aucune entrée de référence pour cette substance',
    es: 'Concentraciones demo — sin entrada de referencia para esta sustancia',
  },
  medSectionMonitoring: {
    de: 'Monitoring-Regeln',
    en: 'Monitoring rules',
    fr: 'Règles de surveillance',
    es: 'Reglas de monitorización',
  },
  medSectionMonitoringTimeline: {
    de: 'Monitoring-Zeitplan',
    en: 'Monitoring timeline',
    fr: 'Calendrier de surveillance',
    es: 'Cronograma de monitorización',
  },
  medSectionPreparations: {
    de: 'Verfügbare Präparate',
    en: 'Available preparations',
    fr: 'Préparations disponibles',
    es: 'Preparados disponibles',
  },
  medPreparationsEmpty: {
    de: 'Keine verifizierten KB-Präparate für die aktuellen Medikamente und das gewählte Verordnungsland hinterlegt.',
    en: 'No verified KB preparations are recorded for the current medications and prescribing country.',
    fr: 'Aucune préparation KB vérifiée pour les médicaments actuels et le pays de prescription choisi.',
    es: 'No hay preparados verificados en la KB para los medicamentos actuales y el país de prescripción elegido.',
  },
  medPreparationsCountry: {
    de: 'Verordnungsland',
    en: 'Prescribing country',
    fr: 'Pays de prescription',
    es: 'País de prescripción',
  },
  medInteractionSevere: { de: 'Schwerwiegend', en: 'Severe', fr: 'Sévère', es: 'Grave' },
  medInteractionModerate: { de: 'Moderat', en: 'Moderate', fr: 'Modéré', es: 'Moderada' },
  medInteractionMild: { de: 'Leicht', en: 'Mild', fr: 'Légère', es: 'Leve' },
  medInteractionContraindicated: {
    de: 'Kontraindiziert',
    en: 'Contraindicated',
    fr: 'Contre-indiqué',
    es: 'Contraindicado',
  },
  medNoInteractionsFound: {
    de: 'Keine Wechselwirkungen zwischen den aktuellen Medikamenten in der Referenzdatenbank gefunden.',
    en: 'No interactions between current medications found in the reference database.',
    fr: 'Aucune interaction entre les médicaments actuels trouvée dans la base de données de référence.',
    es: 'No se encontraron interacciones entre los medicamentos actuales en la base de datos de referencia.',
  },
  medReferenceDisclaimer: {
    de: 'Referenzdaten: nur zur Dokumentationsunterstützung — klinische Entscheidung beim behandelnden Arzt.',
    en: 'Reference data: for documentation support only — clinical decisions remain with the treating clinician.',
    fr: 'Données de référence : aide à la documentation uniquement — décision clinique du médecin traitant.',
    es: 'Datos de referencia: solo apoyo a la documentación — decisión clínica del médico tratante.',
  },
  medKurzinfoSource: {
    de: 'Quellen',
    en: 'Sources',
    fr: 'Sources',
    es: 'Fuentes',
  },
  medMonitoringFrequency: {
    de: 'Häufigkeit',
    en: 'Frequency',
    fr: 'Fréquence',
    es: 'Frecuencia',
  },
  medExportFilename: {
    de: 'medikationsplan',
    en: 'medication-plan',
    fr: 'plan-medicamenteux',
    es: 'plan-medicacion',
  },
  // ── Receptor profile section ────────────────────────────────────────────
  medSectionReceptorProfile: {
    de: 'Rezeptorprofil',
    en: 'Receptor profile',
    fr: 'Profil récepteur',
    es: 'Perfil de receptores',
  },
  medSelectSection: {
    de: 'Wähle einen Bereich',
    en: 'Select a section',
    fr: 'Sélectionnez une section',
    es: 'Selecciona una sección',
  },
  medSelectSectionHint: {
    de: 'Klicke links auf einen Bereich, um Details und Grafiken rechts zu öffnen.',
    en: 'Click a section on the left to open its details and graphs on the right.',
    fr: 'Cliquez sur une section à gauche pour afficher ses détails et graphiques à droite.',
    es: 'Haz clic en una sección a la izquierda para ver sus detalles y gráficos a la derecha.',
  },
  medSectionsLabel: {
    de: 'Analysen & Details',
    en: 'Analyses & details',
    fr: 'Analyses et détails',
    es: 'Análisis y detalles',
  },
  medReceptorTabMatrix: {
    de: 'Matrix',
    en: 'Matrix',
    fr: 'Matrice',
    es: 'Matriz',
  },
  medReceptorTabBurden: {
    de: 'Kombinierte Last',
    en: 'Combined burden',
    fr: 'Charge combinée',
    es: 'Carga combinada',
  },
  medReceptorTabRadar: {
    de: 'Radar',
    en: 'Radar',
    fr: 'Radar',
    es: 'Radar',
  },
  medReceptorColMeaning: {
    de: 'Klinische Bedeutung',
    en: 'Clinical meaning',
    fr: 'Signification clinique',
    es: 'Significado clínico',
  },
  medReceptorColReceptor: {
    de: 'Rezeptor',
    en: 'Receptor',
    fr: 'Récepteur',
    es: 'Receptor',
  },
  medReceptorEmpty: {
    de: 'Keine Rezeptorprofile für die aktiven Medikamente hinterlegt. Profile können in der Wissensdatenbank → Psychopharmakologie je Wirkstoff erfasst werden.',
    en: 'No receptor profiles available for the active medications. Profiles can be entered per drug in the Knowledge Base → Psychopharmacology.',
    fr: 'Aucun profil récepteur disponible pour les médicaments actifs. Les profils se saisissent par substance dans la base de connaissances → Psychopharmacologie.',
    es: 'No hay perfiles de receptores para los medicamentos activos. Los perfiles se introducen por fármaco en la base de conocimiento → Psicofarmacología.',
  },
  medReceptorBurdenCombined: {
    de: 'Kombinierte Last',
    en: 'Combined burden',
    fr: 'Charge combinée',
    es: 'Carga combinada',
  },
  medReceptorBurdenApprox: {
    de: 'vereinfachte klinische Näherung',
    en: 'simplified clinical approximation',
    fr: 'approximation clinique simplifiée',
    es: 'aproximación clínica simplificada',
  },
  medReceptorBurdenHigh: {
    de: 'hoch',
    en: 'high',
    fr: 'élevée',
    es: 'alta',
  },
  medReceptorBurdenModerate: {
    de: 'moderat',
    en: 'moderate',
    fr: 'modérée',
    es: 'moderada',
  },
  medReceptorBurdenLow: {
    de: 'gering',
    en: 'low',
    fr: 'faible',
    es: 'baja',
  },
  medReceptorRadarManyHint: {
    de: 'Radar eignet sich am besten für 1–3 Substanzen. Bei mehr Medikamenten bietet die Matrix-Ansicht eine klarere Übersicht.',
    en: 'Radar works best for 1–3 substances. For more medications, the Matrix view is clearer.',
    fr: 'Le radar convient surtout à 1–3 substances. Pour davantage de médicaments, la vue Matrice est plus claire.',
    es: 'El radar funciona mejor con 1–3 sustancias. Para más medicamentos, la vista Matriz es más clara.',
  },
  medReceptorSafetyNote: {
    de: 'Werte sind ein relativer Rezeptoraffinitäts-Index (%) aus der lokalen Wissensdatenbank — keine Rezeptorbesetzung, keine klinische Blockade, keine Dosisäquivalenz oder individuelle Patientenreaktion.',
    en: 'Values are a relative receptor affinity index (%) from the local knowledge base — not receptor occupancy, not clinical blockade, not dose equivalence or individual patient response.',
    fr: 'Les valeurs sont un indice relatif d’affinité des récepteurs (%) issu de la base de connaissances locale — pas l’occupation des récepteurs, pas le blocage clinique, ni l’équivalence de dose ou la réponse individuelle.',
    es: 'Los valores son un índice relativo de afinidad de receptores (%) de la base de conocimiento local — no ocupación de receptores, no bloqueo clínico, ni equivalencia de dosis o respuesta individual.',
  },
  medReceptorLegend: {
    de: 'Legende',
    en: 'Legend',
    fr: 'Légende',
    es: 'Leyenda',
  },
  medReceptorAffinityAxisLabel: {
    de: 'Relative Rezeptoraffinität (%)',
    en: 'Relative receptor affinity (%)',
    fr: 'Affinité relative des récepteurs (%)',
    es: 'Afinidad relativa de receptores (%)',
  },
  medReceptorColAffinity: {
    de: 'Affinität',
    en: 'Affinity',
    fr: 'Affinité',
    es: 'Afinidad',
  },
  medReceptorAffinityIndex: {
    de: 'Affinitätsindex',
    en: 'Affinity index',
    fr: 'Indice d’affinité',
    es: 'Índice de afinidad',
  },
  medReceptorEstimated: {
    de: 'geschätzt',
    en: 'estimated',
    fr: 'estimé',
    es: 'estimado',
  },
  medReceptorEvidence: {
    de: 'Evidenz',
    en: 'Evidence',
    fr: 'Preuve',
    es: 'Evidencia',
  },
  medReceptorLegacyConverted: {
    de: 'Legacy: umgerechnet aus 1–5-Score',
    en: 'Legacy: converted from 1–5 score',
    fr: 'Hérité : converti depuis le score 1–5',
    es: 'Heredado: convertido desde la puntuación 1–5',
  },
  medReceptorLegacyBadge: {
    de: 'Legacy-Rezeptorprofil',
    en: 'Legacy receptor profile',
    fr: 'Profil récepteur hérité',
    es: 'Perfil de receptores heredado',
  },
  medReceptorTooltipDisclaimer: {
    de: 'Relativer Affinitätsindex. Entspricht nicht der Rezeptorbesetzung oder klinischen Blockade.',
    en: 'Relative affinity index. This does not equal receptor occupancy or clinical blockade.',
    fr: 'Indice d’affinité relatif. N’équivaut pas à l’occupation des récepteurs ni au blocage clinique.',
    es: 'Índice de afinidad relativo. No equivale a la ocupación de receptores ni al bloqueo clínico.',
  },
} as const satisfies Record<string, LocaleMap>

export type MedicationUiKey = keyof typeof medicationUiTranslations

export function translateMedicationUi(language: UiLanguage, key: MedicationUiKey): string {
  return medicationUiTranslations[key][language]
}

const formulationLabels: Record<MedicationFormulation, LocaleMap> = {
  tablet: { de: 'Tablette', en: 'Tablet', fr: 'Comprimé', es: 'Comprimido' },
  solution: { de: 'Lösung', en: 'Solution', fr: 'Solution', es: 'Solución' },
  drops: { de: 'Tropfen', en: 'Drops', fr: 'Gouttes', es: 'Gotas' },
  depot: { de: 'Depot', en: 'Depot', fr: 'Dépôt', es: 'Depósito' },
  injection: { de: 'Injektion', en: 'Injection', fr: 'Injection', es: 'Inyección' },
  capsule: { de: 'Kapsel', en: 'Capsule', fr: 'Gélule', es: 'Cápsula' },
  patch: { de: 'Pflaster', en: 'Patch', fr: 'Patch', es: 'Parche' },
  other: { de: 'Sonstige', en: 'Other', fr: 'Autre', es: 'Otro' },
}

const statusLabels: Record<MedicationStatus, LocaleMap> = {
  active: { de: 'aktiv', en: 'active', fr: 'actif', es: 'activo' },
  paused: { de: 'pausiert', en: 'paused', fr: 'en pause', es: 'en pausa' },
  reduced: { de: 'reduziert', en: 'reduced', fr: 'réduit', es: 'reducido' },
  increased: { de: 'gesteigert', en: 'increased', fr: 'augmenté', es: 'aumentado' },
  discontinued: { de: 'abgesetzt', en: 'discontinued', fr: 'arrêté', es: 'suspendido' },
}

const changeTypeLabels: Record<MedicationChangeType, LocaleMap> = {
  start: { de: 'Beginn', en: 'Started', fr: 'Début', es: 'Inicio' },
  increase: { de: 'Erhöhung', en: 'Increase', fr: 'Augmentation', es: 'Aumento' },
  decrease: { de: 'Reduktion', en: 'Decrease', fr: 'Réduction', es: 'Reducción' },
  timing: { de: 'Zeitschema', en: 'Timing', fr: 'Horaire', es: 'Horario' },
  formulation: { de: 'Form', en: 'Formulation', fr: 'Forme', es: 'Formulación' },
  pause: { de: 'Pause', en: 'Pause', fr: 'Pause', es: 'Pausa' },
  discontinue: { de: 'Absetzen', en: 'Discontinue', fr: 'Arrêt', es: 'Suspensión' },
  restart: { de: 'Wiederaufnahme', en: 'Restart', fr: 'Reprise', es: 'Reinicio' },
  prn: { de: 'PRN', en: 'PRN', fr: 'PRN', es: 'PRN' },
  other: { de: 'Sonstige', en: 'Other', fr: 'Autre', es: 'Otro' },
}

const attributionLabels: Record<SideEffectAttribution, LocaleMap> = {
  single: { de: 'Einzelpräparat', en: 'Single drug', fr: 'Médicament seul', es: 'Fármaco único' },
  combination: { de: 'Kombination', en: 'Combination', fr: 'Combinaison', es: 'Combinación' },
  unknown: { de: 'Unklar', en: 'Unknown', fr: 'Inconnu', es: 'Desconocido' },
}

export function getFormulationLabel(formulation: MedicationFormulation, language: UiLanguage): string {
  return formulationLabels[formulation][language]
}

export function getStatusLabel(status: MedicationStatus, language: UiLanguage): string {
  return statusLabels[status][language]
}

export function getChangeTypeLabel(changeType: MedicationChangeType, language: UiLanguage): string {
  return changeTypeLabels[changeType][language]
}

export function getAttributionLabel(attribution: SideEffectAttribution, language: UiLanguage): string {
  return attributionLabels[attribution][language]
}

export const COMMON_UNCLEAR_SYMPTOMS: Record<UiLanguage, readonly string[]> = {
  de: [
    'Tremor',
    'Sedierung',
    'Nierenfunktion',
    'EPS',
    'Sexuelle Dysfunktion',
    'Obstipation',
    'QT-Bedenken',
    'Metabolische Veränderung',
  ],
  en: [
    'Tremor',
    'Sedation',
    'Renal change',
    'EPS',
    'Sexual dysfunction',
    'Constipation',
    'QT concern',
    'Metabolic change',
  ],
  fr: [
    'Tremblement',
    'Sédation',
    'Fonction rénale',
    'EPS',
    'Dysfonction sexuelle',
    'Constipation',
    'QT',
    'Changement métabolique',
  ],
  es: [
    'Temblor',
    'Sedación',
    'Función renal',
    'EPS',
    'Disfunción sexual',
    'Estreñimiento',
    'QT',
    'Cambio metabólico',
  ],
}

export const DEMO_MEDICATION_SUGGESTIONS: Record<
  string,
  { formulation: MedicationFormulation; strength: string; unit: string }[]
> = {
  haloperidol: [
    { formulation: 'solution', strength: '2 mg/ml', unit: 'ml' },
    { formulation: 'tablet', strength: '5 mg', unit: 'mg' },
    { formulation: 'drops', strength: '2 mg/ml', unit: 'ml' },
  ],
  risperidon: [
    { formulation: 'tablet', strength: '2 mg', unit: 'mg' },
    { formulation: 'tablet', strength: '4 mg', unit: 'mg' },
    { formulation: 'depot', strength: '25 mg', unit: 'mg' },
    { formulation: 'depot', strength: '50 mg', unit: 'mg' },
  ],
  lithium: [
    { formulation: 'tablet', strength: '664 mg', unit: 'mg' },
    { formulation: 'tablet', strength: '450 mg', unit: 'mg' },
  ],
  valproat: [
    { formulation: 'tablet', strength: '500 mg', unit: 'mg' },
    { formulation: 'solution', strength: '57 mg/ml', unit: 'ml' },
  ],
  quetiapin: [
    { formulation: 'tablet', strength: '25 mg', unit: 'mg' },
    { formulation: 'tablet', strength: '100 mg', unit: 'mg' },
  ],
}

export const DEMO_INTELLIGENCE: Record<string, { summary: string }> = {
  haloperidol: {
    summary: 'Typische Antipsychotika-Wirkung; QT- und EPS-Monitoring bei höheren Dosen.',
  },
  lithium: {
    summary: 'Engmaschige Spiegelkontrolle, Nieren- und Schilddrüsenfunktion beachten.',
  },
  valproat: {
    summary: 'Leberwerte und Blutbild überwachen; teratogenes Risiko bei Frauen im gebärfähigen Alter.',
  },
}
