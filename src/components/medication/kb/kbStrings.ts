/**
 * Self-contained localized strings + section-grouping metadata for the
 * redesigned Wissensdatenbank reading/editing experience.
 *
 * Kept local (DE primary, plus EN/FR/ES) following the `MedicationExportMenu`
 * pattern so these brand-new components don't churn the concurrently-large
 * `uiTranslations.ts`. TODO: fold into the shared `t()` helper once stable.
 */

import type { DrugSectionKey } from '../../../types/knowledgeBase'
import type { UiLanguage } from '../../../types/settings'

type LocaleMap = Record<UiLanguage, string>

const STRINGS = {
  // ── Section navigation (sticky TOC) ──
  tocTitle: { de: 'Inhalt', en: 'Contents', fr: 'Sommaire', es: 'Contenido' },
  tocJump: { de: 'Zum Abschnitt springen', en: 'Jump to section', fr: 'Aller à la section', es: 'Ir a la sección' },

  /** Reading-mode bookmark tab — opens contribution dialog (section chosen inside). */
  contributionBookmark: { de: 'Beitrag', en: 'Contribute', fr: 'Contribution', es: 'Aportar' },
  contributionBookmarkTitle: {
    de: 'Beitrag einreichen — Abschnitt bearbeiten vorschlagen',
    en: 'Submit contribution — suggest a section edit',
    fr: 'Soumettre une contribution — proposer une modification de section',
    es: 'Enviar aportación — proponer edición de sección',
  },
  contributionDialogTitle: {
    de: 'Beitrag einreichen',
    en: 'Submit contribution',
    fr: 'Soumettre une contribution',
    es: 'Enviar aportación',
  },
  contributionDialogSubtitle: {
    de: 'Abschnitt bearbeiten vorschlagen',
    en: 'Suggest an edit for this section',
    fr: 'Proposer une modification pour cette section',
    es: 'Proponer una edición para esta sección',
  },
  contributionSectionLabel: { de: 'Abschnitt', en: 'Section', fr: 'Section', es: 'Sección' },
  contributionContentLabel: {
    de: 'Vorgeschlagener Inhalt',
    en: 'Proposed content',
    fr: 'Contenu proposé',
    es: 'Contenido propuesto',
  },
  contributionContentPlaceholder: {
    de: 'Ihre Korrektur, Ergänzung oder neue Daten zu diesem Abschnitt …',
    en: 'Your correction, addition, or new data for this section …',
    fr: 'Votre correction, ajout ou nouvelles données pour cette section …',
    es: 'Su corrección, adición o nuevos datos para esta sección …',
  },
  contributionSourceLabel: {
    de: 'Quellenangabe',
    en: 'Source citation',
    fr: 'Citation source',
    es: 'Cita de fuente',
  },
  contributionSourcePlaceholder: {
    de: 'z. B. Fachinformation, Stahl, PMID …',
    en: 'e.g. SmPC, Stahl, PMID …',
    fr: 'p. ex. RCP, Stahl, PMID …',
    es: 'p. ej. ficha técnica, Stahl, PMID …',
  },
  contributionSourceTypeLabel: { de: 'Quellentyp', en: 'Source type', fr: 'Type de source', es: 'Tipo de fuente' },
  contributionSourceType_fachinformation: {
    de: 'Fachinformation',
    en: 'SmPC / label',
    fr: 'RCP / notice',
    es: 'Ficha técnica',
  },
  contributionSourceType_stahl: { de: 'Stahl', en: 'Stahl', fr: 'Stahl', es: 'Stahl' },
  contributionSourceType_literature: { de: 'Literatur', en: 'Literature', fr: 'Littérature', es: 'Literatura' },
  contributionSourceType_guideline: { de: 'Leitlinie', en: 'Guideline', fr: 'Recommandation', es: 'Guía clínica' },
  contributionSourceType_fda_label: { de: 'FDA-Label', en: 'FDA label', fr: 'Label FDA', es: 'Etiqueta FDA' },
  contributionSourceType_unknown: { de: 'Sonstige', en: 'Other', fr: 'Autre', es: 'Otro' },
  contributionSubmit: { de: 'Einreichen', en: 'Submit', fr: 'Soumettre', es: 'Enviar' },
  contributionSubmitting: { de: 'Wird eingereicht …', en: 'Submitting …', fr: 'Envoi …', es: 'Enviando …' },
  contributionSuccess: {
    de: 'Beitrag zur Prüfung eingereicht',
    en: 'Contribution submitted for review',
    fr: 'Contribution soumise pour examen',
    es: 'Aportación enviada para revisión',
  },
  contributionError: {
    de: 'Beitrag konnte nicht eingereicht werden.',
    en: 'Could not submit contribution.',
    fr: 'Impossible de soumettre la contribution.',
    es: 'No se pudo enviar la aportación.',
  },
  contributionReferenceRequired: {
    de: 'Referenz ist erforderlich',
    en: 'Reference is required',
    fr: 'La référence est obligatoire',
    es: 'La referencia es obligatoria',
  },
  contributionLicenseRequired: {
    de: 'Lizenzannahme ist erforderlich',
    en: 'License acceptance is required',
    fr: "L'acceptation de la licence est obligatoire",
    es: 'Se requiere aceptar la licencia',
  },

  contributionPreparationSection: {
    de: 'Verfügbare Präparate',
    en: 'Available preparations',
    fr: 'Préparations disponibles',
    es: 'Preparaciones disponibles',
  },
  contributionPreparationCountryLabel: {
    de: 'Land',
    en: 'Country',
    fr: 'Pays',
    es: 'País',
  },
  contributionPreparationTradeNameLabel: {
    de: 'Handelsname (optional)',
    en: 'Trade name (optional)',
    fr: 'Nom commercial (facultatif)',
    es: 'Nombre comercial (opcional)',
  },
  contributionPreparationStrengthLabel: {
    de: 'Stärke',
    en: 'Strength',
    fr: 'Dosage',
    es: 'Concentración',
  },
  contributionPreparationFormLabel: {
    de: 'Darreichungsform',
    en: 'Dosage form',
    fr: 'Forme galénique',
    es: 'Forma farmacéutica',
  },
  contributionPreparationNotesLabel: {
    de: 'Anmerkungen (optional)',
    en: 'Notes (optional)',
    fr: 'Remarques (facultatif)',
    es: 'Notas (opcional)',
  },
  contributionPreparationAddRow: {
    de: 'Zeile hinzufügen',
    en: 'Add row',
    fr: 'Ajouter une ligne',
    es: 'Añadir fila',
  },
  contributionPreparationRemoveRow: {
    de: 'Zeile entfernen',
    en: 'Remove row',
    fr: 'Supprimer la ligne',
    es: 'Eliminar fila',
  },
  contributionPreparationRowRequired: {
    de: 'Mindestens eine vollständige Zubereitung (Stärke und Darreichungsform) ist erforderlich.',
    en: 'At least one complete preparation (strength and dosage form) is required.',
    fr: 'Au moins une préparation complète (dosage et forme) est requise.',
    es: 'Se requiere al menos una preparación completa (concentración y forma).',
  },

  // ── Section-level actions (graph cards) ──
  sectionComment: {
    de: 'Kommentar zu diesem Abschnitt',
    en: 'Comment on this section',
    fr: 'Commenter cette section',
    es: 'Comentar esta sección',
  },
  sectionAskAi: {
    de: 'KI zu diesem Abschnitt fragen',
    en: 'Ask AI about this section',
    fr: "Demander à l'IA sur cette section",
    es: 'Preguntar a la IA sobre esta sección',
  },
  prepAskAi: {
    de: 'KI fragen',
    en: 'Ask AI',
    fr: "Demander à l'IA",
    es: 'Preguntar a la IA',
  },
  prepAskAiTitle: {
    de: 'KI zu verfügbaren Präparaten fragen',
    en: 'Ask AI about available preparations',
    fr: "Demander à l'IA sur les préparations disponibles",
    es: 'Preguntar a la IA sobre las preparaciones disponibles',
  },
  prepCountryLabel: {
    de: 'Land',
    en: 'Country',
    fr: 'Pays',
    es: 'País',
  },

  // ── Reading-mode highlight colors ──
  highlightColor: { de: 'Markierfarbe', en: 'Highlight colour', fr: 'Couleur de surlignage', es: 'Color de resaltado' },
  highlightColor_yellow: { de: 'Gelb', en: 'Yellow', fr: 'Jaune', es: 'Amarillo' },
  highlightColor_green: { de: 'Grün', en: 'Green', fr: 'Vert', es: 'Verde' },
  highlightColor_blue: { de: 'Blau', en: 'Blue', fr: 'Bleu', es: 'Azul' },
  highlightColor_pink: { de: 'Pink', en: 'Pink', fr: 'Rose', es: 'Rosa' },
  highlightColor_orange: { de: 'Orange', en: 'Orange', fr: 'Orange', es: 'Naranja' },
  highlightColor_purple: { de: 'Lavendel', en: 'Lavender', fr: 'Lavande', es: 'Lavanda' },
  highlightColor_teal: { de: 'Türkis', en: 'Teal', fr: 'Turquoise', es: 'Turquesa' },
  highlightColor_gray: { de: 'Grau', en: 'Gray', fr: 'Gris', es: 'Gris' },
  highlightColor_red: { de: 'Rot', en: 'Red', fr: 'Rouge', es: 'Rojo' },
  highlightColor_beige: { de: 'Beige', en: 'Beige', fr: 'Beige', es: 'Beige' },
  details: { de: 'Details', en: 'Details', fr: 'Détails', es: 'Detalles' },
  showText: { de: 'Volltext anzeigen', en: 'Show full text', fr: 'Afficher le texte', es: 'Mostrar texto' },
  noData: { de: 'Keine strukturierten Daten hinterlegt.', en: 'No structured data recorded.', fr: 'Aucune donnée structurée enregistrée.', es: 'No hay datos estructurados.' },
  estimated: { de: 'geschätzt', en: 'estimated', fr: 'estimé', es: 'estimado' },
  estimatedNote: {
    de: 'Illustrative/geschätzte Werte — gegen Fachinformation prüfen.',
    en: 'Illustrative/estimated values — verify against the SmPC.',
    fr: 'Valeurs illustratives/estimées — vérifier avec le RCP.',
    es: 'Valores ilustrativos/estimados — verificar con la ficha técnica.',
  },

  // ── At-a-glance KPI strip ──
  glanceTitle: { de: 'Steckbrief', en: 'At a glance', fr: 'En bref', es: 'Resumen' },
  glanceClass: { de: 'Klasse', en: 'Class', fr: 'Classe', es: 'Clase' },
  classification: { de: 'Klassifikation', en: 'Classification', fr: 'Classification', es: 'Clasificación' },
  glanceHalfLife: { de: 'Halbwertszeit', en: 'Half-life', fr: 'Demi-vie', es: 'Semivida' },
  glanceTargets: { de: 'Hauptangriffspunkte', en: 'Primary targets', fr: 'Cibles principales', es: 'Dianas principales' },
  glanceQtc: { de: 'QTc-Risiko', en: 'QTc risk', fr: 'Risque QTc', es: 'Riesgo QTc' },
  glancePregnancy: { de: 'Schwangerschaft', en: 'Pregnancy', fr: 'Grossesse', es: 'Embarazo' },
  glanceLactation: { de: 'Stillzeit', en: 'Lactation', fr: 'Allaitement', es: 'Lactancia' },
  glanceDepot: { de: 'Depot', en: 'Depot/LAI', fr: 'Retard/LAI', es: 'Depot/LAI' },
  glanceDepotYes: { de: 'verfügbar', en: 'available', fr: 'disponible', es: 'disponible' },
  glanceDepotNo: { de: 'keine', en: 'none', fr: 'aucun', es: 'ninguno' },
  notSpecified: { de: 'k. A.', en: 'n/a', fr: 'n. d.', es: 's/d' },

  // ── Pharmacokinetics ──
  pkHalfLife: { de: 'HWZ', en: 'Half-life', fr: 'Demi-vie', es: 'Semivida' },
  pkTmax: { de: 'Tmax', en: 'Tmax', fr: 'Tmax', es: 'Tmax' },
  pkSteadyState: { de: 'Steady State', en: 'Steady state', fr: 'État d’équilibre', es: 'Estado estable' },
  pkBioavailability: { de: 'Bioverfügbarkeit', en: 'Bioavailability', fr: 'Biodisponibilité', es: 'Biodisponibilidad' },
  pkProteinBinding: { de: 'Proteinbindung', en: 'Protein binding', fr: 'Liaison protéique', es: 'Unión a proteínas' },
  pkTdm: { de: 'TDM-Bereich', en: 'TDM range', fr: 'Plage TDM', es: 'Rango TDM' },
  pkCurveTitle: { de: 'Konzentrations-Zeit-Verlauf (schematisch)', en: 'Concentration–time curve (schematic)', fr: 'Courbe concentration–temps (schématique)', es: 'Curva concentración–tiempo (esquemática)' },
  pkCurveAxisTime: { de: 'Zeit (h)', en: 'Time (h)', fr: 'Temps (h)', es: 'Tiempo (h)' },
  pkCurveAxisConc: { de: 'rel. Konzentration', en: 'rel. concentration', fr: 'concentration rel.', es: 'concentración rel.' },
  pkSchematicNote: {
    de: 'Schematische Ein-Kompartiment-Darstellung — keine echten Messwerte.',
    en: 'Schematic one-compartment illustration — not real measurements.',
    fr: 'Illustration schématique à un compartiment — pas de mesures réelles.',
    es: 'Ilustración esquemática de un compartimento — no son mediciones reales.',
  },
  hours: { de: 'h', en: 'h', fr: 'h', es: 'h' },
  days: { de: 'Tage', en: 'days', fr: 'jours', es: 'días' },
  weeks: { de: 'Wochen', en: 'weeks', fr: 'semaines', es: 'semanas' },

  // ── Titration / taper ──
  titrationTitle: { de: 'Titrationsverlauf', en: 'Titration schedule', fr: 'Schéma de titration', es: 'Esquema de titulación' },
  taperTitle: { de: 'Absetzverlauf', en: 'Taper schedule', fr: 'Schéma d’arrêt', es: 'Esquema de retirada' },
  titrationAxisDay: { de: 'Tag', en: 'Day', fr: 'Jour', es: 'Día' },
  titrationAxisDose: { de: 'Dosis', en: 'Dose', fr: 'Dose', es: 'Dosis' },
  titrationTarget: { de: 'Zieldosis', en: 'Target', fr: 'Cible', es: 'Objetivo' },
  titrationMax: { de: 'Maximaldosis', en: 'Max', fr: 'Max', es: 'Máx' },
  titrationStop: { de: 'Stopp', en: 'Stop', fr: 'Arrêt', es: 'Parar' },
  colDay: { de: 'Tag', en: 'Day', fr: 'Jour', es: 'Día' },
  colStep: { de: 'Schritt', en: 'Step', fr: 'Étape', es: 'Paso' },
  colDose: { de: 'Dosis', en: 'Dose', fr: 'Dose', es: 'Dosis' },
  colNote: { de: 'Hinweis', en: 'Note', fr: 'Note', es: 'Nota' },

  // ── Depot switching timeline ──
  depotTitle: { de: 'Umstellung oral → Depot (LAI)', en: 'Switch oral → depot (LAI)', fr: 'Passage oral → retard (LAI)', es: 'Cambio oral → depot (LAI)' },
  depotInterval: { de: 'Intervall', en: 'Interval', fr: 'Intervalle', es: 'Intervalo' },
  depotEvery: { de: 'alle', en: 'every', fr: 'tous les', es: 'cada' },
  depotOverlap: { de: 'Orales Overlap', en: 'Oral overlap', fr: 'Chevauchement oral', es: 'Solapamiento oral' },
  depotNoOverlap: { de: 'kein orales Overlap', en: 'no oral overlap', fr: 'pas de chevauchement oral', es: 'sin solapamiento oral' },
  depotLoading: { de: 'Aufsättigung', en: 'Loading', fr: 'Charge', es: 'Carga' },
  depotMaintenance: { de: 'Erhaltung', en: 'Maintenance', fr: 'Entretien', es: 'Mantenimiento' },
  depotOralTaper: { de: 'Orales Antipsychotikum', en: 'Oral antipsychotic', fr: 'Antipsychotique oral', es: 'Antipsicótico oral' },
  depotFirstMaintenance: { de: 'Erste Erhaltungsinjektion', en: 'First maintenance injection', fr: 'Première injection d’entretien', es: 'Primera inyección de mantenimiento' },
  depotEquivalence: { de: 'Dosisäquivalenz', en: 'Dose equivalence', fr: 'Équivalence de dose', es: 'Equivalencia de dosis' },
  depotMonitoring: { de: 'Post-Injektions-Monitoring', en: 'Post-injection monitoring', fr: 'Surveillance post-injection', es: 'Monitorización post-inyección' },
  depotSteadyState: { de: 'Steady State', en: 'Steady state', fr: 'État d’équilibre', es: 'Estado estable' },
  depotFlexWindow: { de: 'Flexibles Fenster', en: 'Flex window', fr: 'Fenêtre flexible', es: 'Ventana flexible' },
  depotShortActing: {
    de: 'Kurzwirksames Acetat — kein Erhaltungsdepot.',
    en: 'Short-acting acetate — not a maintenance depot.',
    fr: 'Acétate à action courte — pas un dépôt d’entretien.',
    es: 'Acetato de acción corta — no es un depot de mantenimiento.',
  },
  axisDay: { de: 'Tag', en: 'Day', fr: 'Jour', es: 'Día' },

  // ── Side effects ──
  seTitle: { de: 'Nebenwirkungen nach Häufigkeit × Schweregrad', en: 'Side effects by frequency × severity', fr: 'Effets indésirables par fréquence × gravité', es: 'Efectos adversos por frecuencia × gravedad' },
  seFrequency: { de: 'Häufigkeit', en: 'Frequency', fr: 'Fréquence', es: 'Frecuencia' },
  seSeverity: { de: 'Schweregrad', en: 'Severity', fr: 'Gravité', es: 'Gravedad' },
  seSystem: { de: 'System', en: 'System', fr: 'Système', es: 'Sistema' },
  seEffect: { de: 'Wirkung', en: 'Effect', fr: 'Effet', es: 'Efecto' },
  seLegend: { de: 'Farbe = Schweregrad · Intensität = Häufigkeit · ⚠ = gefährlich', en: 'Colour = severity · intensity = frequency · ⚠ = dangerous', fr: 'Couleur = gravité · intensité = fréquence · ⚠ = dangereux', es: 'Color = gravedad · intensidad = frecuencia · ⚠ = peligroso' },
  freqVeryCommon: { de: 'sehr häufig', en: 'very common', fr: 'très fréquent', es: 'muy frecuente' },
  freqCommon: { de: 'häufig', en: 'common', fr: 'fréquent', es: 'frecuente' },
  freqUncommon: { de: 'gelegentlich', en: 'uncommon', fr: 'peu fréquent', es: 'poco frecuente' },
  freqRare: { de: 'selten', en: 'rare', fr: 'rare', es: 'raro' },
  freqUnknown: { de: 'unbekannt', en: 'unknown', fr: 'inconnu', es: 'desconocido' },
  sevMild: { de: 'leicht', en: 'mild', fr: 'léger', es: 'leve' },
  sevModerate: { de: 'mäßig', en: 'moderate', fr: 'modéré', es: 'moderado' },
  sevSevere: { de: 'schwer', en: 'severe', fr: 'sévère', es: 'grave' },
  sevDangerous: { de: 'gefährlich', en: 'dangerous', fr: 'dangereux', es: 'peligroso' },

  // ── CYP / QTc ──
  cypTitle: { de: 'CYP450 & Wechselwirkungen', en: 'CYP450 & interactions', fr: 'CYP450 et interactions', es: 'CYP450 e interacciones' },
  cypEnzymes: { de: 'Enzyme', en: 'Enzymes', fr: 'Enzymes', es: 'Enzimas' },
  cypInteractions: { de: 'Wechselwirkungen', en: 'Interactions', fr: 'Interactions', es: 'Interacciones' },
  cypSubstrate: { de: 'Substrat', en: 'Substrate', fr: 'Substrat', es: 'Sustrato' },
  cypInhibitor: { de: 'Inhibitor', en: 'Inhibitor', fr: 'Inhibiteur', es: 'Inhibidor' },
  cypInducer: { de: 'Induktor', en: 'Inducer', fr: 'Inducteur', es: 'Inductor' },
  qtcRisk: { de: 'QTc-Risiko', en: 'QTc risk', fr: 'Risque QTc', es: 'Riesgo QTc' },
  qtcLow: { de: 'niedrig', en: 'low', fr: 'faible', es: 'bajo' },
  qtcModerate: { de: 'moderat', en: 'moderate', fr: 'modéré', es: 'moderado' },
  qtcHigh: { de: 'hoch', en: 'high', fr: 'élevé', es: 'alto' },

  // ── Receptor radar tab ──
  receptorTabRadar: { de: 'Radar', en: 'Radar', fr: 'Radar', es: 'Radar' },
  receptorTabRanked: { de: 'Rangliste', en: 'Ranked', fr: 'Classement', es: 'Ranking' },
  receptorTabList: { de: 'Liste', en: 'List', fr: 'Liste', es: 'Lista' },
  receptorRadarHint: {
    de: 'Relativer Affinitätsindex (0–100) — keine Rezeptorbesetzung.',
    en: 'Relative affinity index (0–100) — not receptor occupancy.',
    fr: 'Indice d’affinité relative (0–100) — pas l’occupation des récepteurs.',
    es: 'Índice de afinidad relativa (0–100) — no ocupación de receptores.',
  },

  // ── Editing structured sections ──
  editAddRow: { de: '+ Zeile', en: '+ Row', fr: '+ Ligne', es: '+ Fila' },
  editAddStep: { de: '+ Schritt', en: '+ Step', fr: '+ Étape', es: '+ Paso' },
  editAddDepot: { de: '+ Depot-Option', en: '+ Depot option', fr: '+ Option retard', es: '+ Opción depot' },
  editAddLoading: { de: '+ Aufsättigung', en: '+ Loading dose', fr: '+ Dose de charge', es: '+ Dosis de carga' },
  editAddEnzyme: { de: '+ Enzym', en: '+ Enzyme', fr: '+ Enzyme', es: '+ Enzima' },
  editAddInteraction: { de: '+ Interaktion', en: '+ Interaction', fr: '+ Interaction', es: '+ Interacción' },
  editRemove: { de: 'Entfernen', en: 'Remove', fr: 'Retirer', es: 'Quitar' },
  editNarrative: { de: 'Beschreibender Text', en: 'Narrative text', fr: 'Texte descriptif', es: 'Texto descriptivo' },
  editPreview: { de: 'Vorschau', en: 'Preview', fr: 'Aperçu', es: 'Vista previa' },
  editName: { de: 'Name', en: 'Name', fr: 'Nom', es: 'Nombre' },
  editBrand: { de: 'Handelsname', en: 'Brand', fr: 'Marque', es: 'Marca' },
  editMarkEstimated: { de: 'als geschätzt markieren', en: 'mark as estimated', fr: 'marquer comme estimé', es: 'marcar como estimado' },

  // ── KI mode / model selector ──
  aiModeLabel: { de: 'KI-Modus', en: 'AI mode', fr: 'Mode IA', es: 'Modo IA' },
  aiModeTitle: {
    de: 'KI-Modell für Generierung & Fragen wählen',
    en: 'Choose the AI model for generation & questions',
    fr: "Choisir le modèle d'IA pour la génération et les questions",
    es: 'Elegir el modelo de IA para generación y preguntas',
  },
  aiModeFast: {
    de: 'Economical (DeepSeek)',
    en: 'Economical (DeepSeek)',
    fr: 'Economical (DeepSeek)',
    es: 'Economical (DeepSeek)',
  },
  aiModeThorough: {
    de: 'Gründlich – höchste Qualität (OpenAI)',
    en: 'Thorough – highest quality (OpenAI)',
    fr: 'Approfondi – qualité maximale (OpenAI)',
    es: 'Exhaustivo – máxima calidad (OpenAI)',
  },
  aiModelResolved: { de: 'Modell', en: 'Model', fr: 'Modèle', es: 'Modelo' },

  // ── Per-user reading-mode notes ──
  notesTitle: { de: 'Notizen', en: 'Notes', fr: 'Notes', es: 'Notas' },
  notesOpen: { de: 'Notizen öffnen', en: 'Open notes', fr: 'Ouvrir les notes', es: 'Abrir notas' },
  notesClose: { de: 'Notizen schließen', en: 'Close notes', fr: 'Fermer les notes', es: 'Cerrar notas' },
  notesPlaceholder: {
    de: 'Persönliche Notizen zu diesem Medikament …',
    en: 'Personal notes on this medication …',
    fr: 'Notes personnelles sur ce médicament …',
    es: 'Notas personales sobre este medicamento …',
  },
  notesPrivate: {
    de: 'Nur für dich · lokal gespeichert',
    en: 'Only you · saved locally',
    fr: 'Visible par vous seul · enregistré localement',
    es: 'Solo para ti · guardado localmente',
  },
  notesBold: { de: 'Fett', en: 'Bold', fr: 'Gras', es: 'Negrita' },
  notesItalic: { de: 'Kursiv', en: 'Italic', fr: 'Italique', es: 'Cursiva' },
  notesUnderline: { de: 'Unterstrichen', en: 'Underline', fr: 'Souligné', es: 'Subrayado' },
  notesHighlight: { de: 'Markieren', en: 'Highlight', fr: 'Surligner', es: 'Resaltar' },
  notesFont: { de: 'Schrift', en: 'Font', fr: 'Police', es: 'Fuente' },
  notesFontSans: { de: 'Serifenlos', en: 'Sans-serif', fr: 'Sans empattement', es: 'Sin serifa' },
  notesFontSerif: { de: 'Serif', en: 'Serif', fr: 'Avec empattement', es: 'Serif' },
  notesFontMono: { de: 'Monospace', en: 'Monospace', fr: 'Monospace', es: 'Monoespaciada' },
  notesFontHandwriting: { de: 'Handschrift', en: 'Handwriting', fr: 'Manuscrite', es: 'Manuscrita' },
} as const

export type KbStringKey = keyof typeof STRINGS

export function kbT(language: string, key: KbStringKey): string {
  const lang: UiLanguage =
    language === 'en' || language === 'fr' || language === 'es' ? language : 'de'
  const entry = STRINGS[key] as LocaleMap
  return entry[lang]
}

// ── Section grouping (reading-mode TOC) ───────────────────────────────────────

export type KbGroupId =
  | 'ueberblick'
  | 'pharmakologie'
  | 'einsatz'
  | 'sicherheit'
  | 'populationen'
  | 'referenz'
  | 'weitere'

export const KB_GROUP_LABELS: Record<KbGroupId, LocaleMap> = {
  ueberblick: { de: 'Überblick', en: 'Overview', fr: 'Aperçu', es: 'Resumen' },
  pharmakologie: { de: 'Pharmakologie', en: 'Pharmacology', fr: 'Pharmacologie', es: 'Farmacología' },
  einsatz: { de: 'Klinischer Einsatz', en: 'Clinical use', fr: 'Usage clinique', es: 'Uso clínico' },
  sicherheit: { de: 'Sicherheit', en: 'Safety', fr: 'Sécurité', es: 'Seguridad' },
  populationen: { de: 'Spezielle Populationen', en: 'Special populations', fr: 'Populations spéciales', es: 'Poblaciones especiales' },
  referenz: { de: 'Referenz', en: 'Reference', fr: 'Référence', es: 'Referencia' },
  weitere: { de: 'Weitere', en: 'More', fr: 'Autres', es: 'Más' },
}

const KEY_TO_GROUP: Partial<Record<DrugSectionKey, KbGroupId>> = {
  kurzprofil: 'ueberblick',
  steckbrief: 'ueberblick',
  wirkmechanismus: 'pharmakologie',
  rezeptorprofil: 'pharmakologie',
  pharmakokinetik: 'pharmakologie',
  indikationen: 'einsatz',
  dosierung: 'einsatz',
  umstellung: 'einsatz',
  nebenwirkungen: 'sicherheit',
  kontraindikationen: 'sicherheit',
  wechselwirkungen: 'sicherheit',
  qtc: 'sicherheit',
  kontrollen: 'sicherheit',
  schwangerschaft: 'populationen',
  niereLeber: 'populationen',
  ueberdosierung: 'populationen',
  absetzen: 'populationen',
  besonderheiten: 'referenz',
  merksaetze: 'referenz',
  quellen: 'referenz',
}

export const KB_GROUP_ORDER: KbGroupId[] = [
  'ueberblick',
  'pharmakologie',
  'einsatz',
  'sicherheit',
  'populationen',
  'referenz',
  'weitere',
]

export function groupForSectionKey(key: DrugSectionKey): KbGroupId {
  return KEY_TO_GROUP[key] ?? 'weitere'
}

export function groupLabel(group: KbGroupId, language: string): string {
  const lang: UiLanguage =
    language === 'en' || language === 'fr' || language === 'es' ? language : 'de'
  return KB_GROUP_LABELS[group][lang]
}
