import type { UiLanguage } from '../types/settings'

export const laborExtraUiTranslations = {
  // ── Common actions ────────────────────────────────────────────────────────
  close: { de: 'Schließen', en: 'Close', fr: 'Fermer', es: 'Cerrar' },
  copy: { de: 'Kopieren', en: 'Copy', fr: 'Copier', es: 'Copiar' },
  reject: { de: 'Ablehnen', en: 'Reject', fr: 'Refuser', es: 'Rechazar' },
  accept: { de: 'Annehmen', en: 'Accept', fr: 'Accepter', es: 'Aceptar' },
  cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler', es: 'Cancelar' },
  edit: { de: 'Bearbeiten', en: 'Edit', fr: 'Modifier', es: 'Editar' },
  apply: { de: 'Übernehmen', en: 'Apply', fr: 'Appliquer', es: 'Aplicar' },
  analyze: { de: 'Analysieren', en: 'Analyze', fr: 'Analyser', es: 'Analizar' },
  print: { de: 'Drucken', en: 'Print', fr: 'Imprimer', es: 'Imprimir' },
  delete: { de: 'Löschen', en: 'Delete', fr: 'Supprimer', es: 'Eliminar' },

  // ── Table column headers ──────────────────────────────────────────────────
  colParameter: { de: 'Parameter', en: 'Parameter', fr: 'Paramètre', es: 'Parámetro' },
  colValue: { de: 'Wert', en: 'Value', fr: 'Valeur', es: 'Valor' },
  colUnit: { de: 'Einheit', en: 'Unit', fr: 'Unité', es: 'Unidad' },
  colReference: { de: 'Referenz', en: 'Reference', fr: 'Référence', es: 'Referencia' },
  colTrend: { de: 'Trend', en: 'Trend', fr: 'Tendance', es: 'Tendencia' },

  // ── Status words / badges ─────────────────────────────────────────────────
  date: { de: 'Datum', en: 'Date', fr: 'Date', es: 'Fecha' },
  copiedExcl: { de: 'Kopiert!', en: 'Copied!', fr: 'Copié !', es: '¡Copiado!' },
  savedExcl: { de: 'Gespeichert!', en: 'Saved!', fr: 'Enregistré !', es: '¡Guardado!' },
  error: { de: 'Fehler', en: 'Error', fr: 'Erreur', es: 'Error' },
  pdf: { de: 'PDF', en: 'PDF', fr: 'PDF', es: 'PDF' },
  newBadge: { de: 'neu', en: 'new', fr: 'nouveau', es: 'nuevo' },
  pinAria: { de: 'Pin', en: 'Pin', fr: 'Épingler', es: 'Fijar' },
  savedToDocuments: {
    de: 'In Dokumente gespeichert',
    en: 'Saved to documents',
    fr: 'Enregistré dans les documents',
    es: 'Guardado en documentos',
  },

  // ── Minimum-reports hints ─────────────────────────────────────────────────
  min2Befunde: {
    de: 'Mindestens 2 Befunde erforderlich',
    en: 'At least 2 reports required',
    fr: 'Au moins 2 bilans requis',
    es: 'Se requieren al menos 2 informes',
  },
  min2BefundeGraph: {
    de: 'Mindestens 2 Befunde für Verlaufsgrafik erforderlich.',
    en: 'At least 2 reports required for a trend graph.',
    fr: 'Au moins 2 bilans requis pour un graphique d’évolution.',
    es: 'Se requieren al menos 2 informes para un gráfico de evolución.',
  },
  min2BefundeVerlaufanalyse: {
    de: 'Mindestens 2 Befunde für Verlaufsanalyse erforderlich',
    en: 'At least 2 reports required for trend analysis',
    fr: 'Au moins 2 bilans requis pour l’analyse d’évolution',
    es: 'Se requieren al menos 2 informes para el análisis de evolución',
  },

  // ── AI labels / titles ────────────────────────────────────────────────────
  aiAnalyzing: { de: 'KI analysiert…', en: 'AI analyzing…', fr: 'Analyse IA…', es: 'IA analizando…' },
  analyzeWithAi: {
    de: 'Mit KI analysieren',
    en: 'Analyze with AI',
    fr: 'Analyser avec l’IA',
    es: 'Analizar con IA',
  },
  structureWithAi: {
    de: 'Mit KI strukturieren',
    en: 'Structure with AI',
    fr: 'Structurer avec l’IA',
    es: 'Estructurar con IA',
  },
  kiAnalyseTitle: { de: 'KI-Analyse', en: 'AI analysis', fr: 'Analyse IA', es: 'Análisis con IA' },
  kiVerlaufanalyseTitle: {
    de: 'KI-Verlaufsanalyse',
    en: 'AI trend analysis',
    fr: 'Analyse d’évolution IA',
    es: 'Análisis de evolución con IA',
  },
  kiVerlaufsanalyseShort: {
    de: 'KI Verlaufsanalyse',
    en: 'AI trend analysis',
    fr: 'Analyse d’évolution IA',
    es: 'Análisis de evolución IA',
  },
  aiAnalyzingShort: { de: 'analysiert…', en: 'analyzing…', fr: 'analyse…', es: 'analizando…' },
  aiAnalyzeBtn: {
    de: 'KI analysieren',
    en: 'Analyze with AI',
    fr: 'Analyser avec l’IA',
    es: 'Analizar con IA',
  },
  analyzeAllAi: {
    de: 'Alle Befunde mit KI analysieren (Verlaufsanalyse)',
    en: 'Analyze all reports with AI (trend analysis)',
    fr: 'Analyser tous les bilans avec l’IA (analyse d’évolution)',
    es: 'Analizar todos los informes con IA (análisis de evolución)',
  },

  // ── Paste zone ────────────────────────────────────────────────────────────
  labelOptional: {
    de: 'Bezeichnung (optional)',
    en: 'Label (optional)',
    fr: 'Libellé (optionnel)',
    es: 'Etiqueta (opcional)',
  },
  labelPlaceholder: {
    de: 'z. B. Aufnahmelabor',
    en: 'e.g. admission labs',
    fr: 'p. ex. bilan d’admission',
    es: 'p. ej. analítica de ingreso',
  },
  pastePlaceholder: {
    de: 'Laborbefund hier einfügen (Strg+V) — wird automatisch strukturiert',
    en: 'Paste lab report here (Ctrl+V) — automatically structured',
    fr: 'Collez le bilan ici (Ctrl+V) — structuré automatiquement',
    es: 'Pegue el informe aquí (Ctrl+V) — se estructura automáticamente',
  },
  featureStructuring: {
    de: '📊 KI-Strukturierung',
    en: '📊 AI structuring',
    fr: '📊 Structuration IA',
    es: '📊 Estructuración con IA',
  },
  featureAnalysis: {
    de: '🔬 KI-Analyse',
    en: '🔬 AI analysis',
    fr: '🔬 Analyse IA',
    es: '🔬 Análisis con IA',
  },
  featureGraphs: {
    de: '📈 Grafiken & Verläufe',
    en: '📈 Graphs & trends',
    fr: '📈 Graphiques et évolutions',
    es: '📈 Gráficos y evoluciones',
  },
  featureCopyPrintPdf: {
    de: '📋 Kopieren · Drucken · PDF',
    en: '📋 Copy · Print · PDF',
    fr: '📋 Copier · Imprimer · PDF',
    es: '📋 Copiar · Imprimir · PDF',
  },
  structuring: {
    de: 'Wird strukturiert…',
    en: 'Structuring…',
    fr: 'Structuration…',
    es: 'Estructurando…',
  },
  previewDetected: {
    de: '{count} Parameter in {cats} Kategorien erkannt',
    en: '{count} parameters detected in {cats} categories',
    fr: '{count} paramètres détectés dans {cats} catégories',
    es: '{count} parámetros detectados en {cats} categorías',
  },
  autoStructuringFailed: {
    de: 'Automatische Strukturierung nicht möglich',
    en: 'Automatic structuring not possible',
    fr: 'Structuration automatique impossible',
    es: 'Estructuración automática no posible',
  },
  noLabValuesDetected: {
    de: 'Keine Laborwerte erkannt',
    en: 'No lab values detected',
    fr: 'Aucune valeur de laboratoire détectée',
    es: 'No se detectaron valores de laboratorio',
  },
  aiStructuringError: {
    de: 'KI-Strukturierung fehlgeschlagen. Bitte versuche es erneut.',
    en: 'AI structuring failed. Please try again.',
    fr: 'Échec de la structuration IA. Veuillez réessayer.',
    es: 'Falló la estructuración con IA. Inténtelo de nuevo.',
  },
  aiAnalysisError: {
    de: 'KI-Analyse fehlgeschlagen. Bitte versuche es erneut.',
    en: 'AI analysis failed. Please try again.',
    fr: 'Échec de l’analyse IA. Veuillez réessayer.',
    es: 'Falló el análisis con IA. Inténtelo de nuevo.',
  },
  aiVerlaufError: {
    de: 'KI-Verlaufsanalyse fehlgeschlagen. Bitte versuche es erneut.',
    en: 'AI trend analysis failed. Please try again.',
    fr: 'Échec de l’analyse d’évolution IA. Veuillez réessayer.',
    es: 'Falló el análisis de evolución con IA. Inténtelo de nuevo.',
  },

  // ── Patient assignment ────────────────────────────────────────────────────
  comingSoon: { de: 'Kommt bald', en: 'Coming soon', fr: 'Bientôt disponible', es: 'Próximamente' },

  // ── Graph modal / dialog ──────────────────────────────────────────────────
  courseSuffix: { de: 'Verlauf', en: 'Trend', fr: 'Évolution', es: 'Evolución' },
  minimize: { de: 'Verkleinern', en: 'Minimize', fr: 'Réduire', es: 'Minimizar' },
  maximize: { de: 'Maximieren', en: 'Maximize', fr: 'Agrandir', es: 'Maximizar' },
  graphCopyImageTitle: {
    de: 'Grafik als Bild in die Zwischenablage kopieren',
    en: 'Copy graph as image to clipboard',
    fr: 'Copier le graphique comme image dans le presse-papiers',
    es: 'Copiar el gráfico como imagen al portapapeles',
  },
  graphPrintTitle: {
    de: 'Grafik drucken',
    en: 'Print graph',
    fr: 'Imprimer le graphique',
    es: 'Imprimir gráfico',
  },
  graphPdfTitle: {
    de: 'Grafik als PDF exportieren',
    en: 'Export graph as PDF',
    fr: 'Exporter le graphique en PDF',
    es: 'Exportar gráfico como PDF',
  },
  graphCloseSaveTitle: {
    de: 'Grafik schließen und im linken Panel speichern',
    en: 'Close graph and save it in the left panel',
    fr: 'Fermer le graphique et l’enregistrer dans le panneau gauche',
    es: 'Cerrar el gráfico y guardarlo en el panel izquierdo',
  },
  closeX: { de: '✕ Schließen', en: '✕ Close', fr: '✕ Fermer', es: '✕ Cerrar' },
  graphBtn: { de: '📈 Grafik', en: '📈 Graph', fr: '📈 Graphique', es: '📈 Gráfico' },
  showGraph: {
    de: 'Grafik anzeigen',
    en: 'Show graph',
    fr: 'Afficher le graphique',
    es: 'Mostrar gráfico',
  },
  selectParams: {
    de: 'Parameter auswählen',
    en: 'Select parameters',
    fr: 'Sélectionner les paramètres',
    es: 'Seleccionar parámetros',
  },
  selectParamsHint: {
    de: 'Wähle die Parameter für die Verlaufsgrafik aus:',
    en: 'Select the parameters for the trend graph:',
    fr: 'Sélectionnez les paramètres pour le graphique d’évolution :',
    es: 'Seleccione los parámetros para el gráfico de evolución:',
  },
  createGraph: {
    de: 'Grafik erstellen',
    en: 'Create graph',
    fr: 'Créer le graphique',
    es: 'Crear gráfico',
  },

  // ── Category section ──────────────────────────────────────────────────────
  previousPrefix: { de: 'Vorher:', en: 'Previous:', fr: 'Avant :', es: 'Anterior:' },
  removeWidget: {
    de: 'Widget entfernen',
    en: 'Remove widget',
    fr: 'Retirer le widget',
    es: 'Quitar widget',
  },
  pinAsWidget: {
    de: 'Als Dashboard-Widget anheften',
    en: 'Pin as dashboard widget',
    fr: 'Épingler comme widget de tableau de bord',
    es: 'Fijar como widget del panel',
  },
  widgetRemoved: { de: 'Widget entfernt', en: 'Widget removed', fr: 'Widget retiré', es: 'Widget eliminado' },
  widgetPinned: {
    de: 'Als Dashboard-Widget angeheftet',
    en: 'Pinned as dashboard widget',
    fr: 'Épinglé comme widget de tableau de bord',
    es: 'Fijado como widget del panel',
  },

  // ── Cumulative view + print/export ────────────────────────────────────────
  cumulativeLabReport: {
    de: 'Kumulativer Laborbefund',
    en: 'Cumulative lab report',
    fr: 'Bilan biologique cumulé',
    es: 'Informe de laboratorio acumulado',
  },
  printedOn: { de: 'Ausdruck:', en: 'Printed:', fr: 'Impression :', es: 'Impresión:' },
  copyVerlaufanalyse: {
    de: 'Verlaufsanalyse kopieren',
    en: 'Copy trend analysis',
    fr: 'Copier l’analyse d’évolution',
    es: 'Copiar análisis de evolución',
  },
  deleteVerlaufanalyse: {
    de: 'Verlaufsanalyse löschen',
    en: 'Delete trend analysis',
    fr: 'Supprimer l’analyse d’évolution',
    es: 'Eliminar análisis de evolución',
  },
  verlaufanalyseCopiedToast: {
    de: 'Verlaufsanalyse kopiert',
    en: 'Trend analysis copied',
    fr: 'Analyse d’évolution copiée',
    es: 'Análisis de evolución copiado',
  },
  kiVerlaufSavedToast: {
    de: 'KI-Verlaufsanalyse in Dokumente gespeichert',
    en: 'AI trend analysis saved to documents',
    fr: 'Analyse d’évolution IA enregistrée dans les documents',
    es: 'Análisis de evolución con IA guardado en documentos',
  },
  kiVerlaufDeleteConfirm: {
    de: 'KI-Verlaufsanalyse löschen?',
    en: 'Delete AI trend analysis?',
    fr: 'Supprimer l’analyse d’évolution IA ?',
    es: '¿Eliminar el análisis de evolución con IA?',
  },
  kiVerlaufDeletedToast: {
    de: 'KI-Verlaufsanalyse gelöscht',
    en: 'AI trend analysis deleted',
    fr: 'Analyse d’évolution IA supprimée',
    es: 'Análisis de evolución con IA eliminado',
  },
  docTitleKiVerlaufPrefix: {
    de: 'KI-Verlaufsanalyse: Labor',
    en: 'AI trend analysis: Lab',
    fr: 'Analyse d’évolution IA : Labo',
    es: 'Análisis de evolución con IA: Laboratorio',
  },
  noLabReport: {
    de: 'Kein Laborbefund vorhanden',
    en: 'No lab report available',
    fr: 'Aucun bilan de laboratoire',
    es: 'No hay informe de laboratorio',
  },

  // ── Verlauf card / overview ───────────────────────────────────────────────
  spiegelBadge: { de: 'Spiegel', en: 'Level', fr: 'Taux', es: 'Nivel' },
  spiegelAlwaysShown: {
    de: 'Medikamentenspiegel — immer angezeigt',
    en: 'Drug levels — always shown',
    fr: 'Taux médicamenteux — toujours affichés',
    es: 'Niveles del fármaco — siempre mostrados',
  },
  spiegelAlwaysShownSentence: {
    de: 'Medikamentenspiegel werden immer angezeigt.',
    en: 'Drug levels are always shown.',
    fr: 'Les taux médicamenteux sont toujours affichés.',
    es: 'Los niveles del fármaco se muestran siempre.',
  },
  curatedForMedication: {
    de: 'Kuratiert für aktuelle Medikation: {drugs}',
    en: 'Curated for current medication: {drugs}',
    fr: 'Sélectionné pour la médication actuelle : {drugs}',
    es: 'Seleccionado para la medicación actual: {drugs}',
  },
  noMedRelevance: {
    de: 'Keine medikationsbasierte Relevanz erkannt — alle Parameter werden angezeigt.',
    en: 'No medication-based relevance detected — all parameters are shown.',
    fr: 'Aucune pertinence basée sur la médication — tous les paramètres sont affichés.',
    es: 'No se detectó relevancia según la medicación — se muestran todos los parámetros.',
  },
  verlaufEmptyNoBefunde: {
    de: 'Noch keine Laborbefunde — füge einen Befund hinzu, um Verlaufsgrafiken zu sehen.',
    en: 'No lab reports yet — add a report to see trend graphs.',
    fr: 'Aucun bilan de laboratoire — ajoutez-en un pour voir les graphiques d’évolution.',
    es: 'Aún no hay informes de laboratorio — añada uno para ver los gráficos de evolución.',
  },
  verlaufNeedTwoNumeric: {
    de: 'Mindestens zwei Laborbefunde mit numerischen Werten sind nötig, um Verlaufsgrafiken zu erstellen.',
    en: 'At least two lab reports with numeric values are required to build trend graphs.',
    fr: 'Au moins deux bilans avec des valeurs numériques sont nécessaires pour créer des graphiques d’évolution.',
    es: 'Se necesitan al menos dos informes con valores numéricos para crear gráficos de evolución.',
  },
  verlaufOnlyOne: {
    de: ' Aktuell ist nur ein Befund vorhanden.',
    en: ' Currently only one report is available.',
    fr: ' Actuellement, un seul bilan est disponible.',
    es: ' Actualmente solo hay un informe disponible.',
  },
  laborverlaufTitle: {
    de: 'Laborverlauf',
    en: 'Lab trends',
    fr: 'Évolution biologique',
    es: 'Evolución de laboratorio',
  },
  subtitleAll: {
    de: '{count} Parameter · {befunde} Befunde · {range}',
    en: '{count} parameters · {befunde} reports · {range}',
    fr: '{count} paramètres · {befunde} bilans · {range}',
    es: '{count} parámetros · {befunde} informes · {range}',
  },
  subtitleRelevant: {
    de: '{count} relevante Parameter · {befunde} Befunde · {range}',
    en: '{count} relevant parameters · {befunde} reports · {range}',
    fr: '{count} paramètres pertinents · {befunde} bilans · {range}',
    es: '{count} parámetros relevantes · {befunde} informes · {range}',
  },
  onlyAbnormal: {
    de: 'Nur auffällige ({count})',
    en: 'Abnormal only ({count})',
    fr: 'Anormaux uniquement ({count})',
    es: 'Solo anómalos ({count})',
  },
  showRelevantOnly: {
    de: 'Nur relevante anzeigen',
    en: 'Show relevant only',
    fr: 'Afficher uniquement les pertinents',
    es: 'Mostrar solo relevantes',
  },
  showAllValues: {
    de: 'Alle Werte anzeigen ({count})',
    en: 'Show all values ({count})',
    fr: 'Afficher toutes les valeurs ({count})',
    es: 'Mostrar todos los valores ({count})',
  },
  noAbnormalInCourse: {
    de: 'Keine auffälligen Parameter im Verlauf.',
    en: 'No abnormal parameters over time.',
    fr: 'Aucun paramètre anormal au fil du temps.',
    es: 'Ningún parámetro anómalo en la evolución.',
  },
  noAbnormalRelevantInCourse: {
    de: 'Keine auffälligen relevanten Parameter im Verlauf.',
    en: 'No abnormal relevant parameters over time.',
    fr: 'Aucun paramètre pertinent anormal au fil du temps.',
    es: 'Ningún parámetro relevante anómalo en la evolución.',
  },

  // ── Main page ─────────────────────────────────────────────────────────────
  labReportSaved: {
    de: 'Laborbefund gespeichert',
    en: 'Lab report saved',
    fr: 'Bilan enregistré',
    es: 'Informe de laboratorio guardado',
  },
  labReportDeleteConfirm: {
    de: 'Laborbefund löschen?',
    en: 'Delete lab report?',
    fr: 'Supprimer le bilan ?',
    es: '¿Eliminar el informe de laboratorio?',
  },
  labReportWord: {
    de: 'Laborbefund',
    en: 'Lab report',
    fr: 'Bilan de laboratoire',
    es: 'Informe de laboratorio',
  },
  befundCopied: { de: 'Befund kopiert', en: 'Report copied', fr: 'Bilan copié', es: 'Informe copiado' },
  kiAnalyseSavedToast: {
    de: 'KI-Analyse in Dokumente gespeichert',
    en: 'AI analysis saved to documents',
    fr: 'Analyse IA enregistrée dans les documents',
    es: 'Análisis con IA guardado en documentos',
  },
  docTitleKiAnalysePrefix: {
    de: 'KI-Analyse:',
    en: 'AI analysis:',
    fr: 'Analyse IA :',
    es: 'Análisis con IA:',
  },
  analyseCopied: { de: 'Analyse kopiert', en: 'Analysis copied', fr: 'Analyse copiée', es: 'Análisis copiado' },
  kiAnalyseDeleteConfirm: {
    de: 'KI-Analyse löschen?',
    en: 'Delete AI analysis?',
    fr: 'Supprimer l’analyse IA ?',
    es: '¿Eliminar el análisis con IA?',
  },
  kiAnalyseDeletedToast: {
    de: 'KI-Analyse gelöscht',
    en: 'AI analysis deleted',
    fr: 'Analyse IA supprimée',
    es: 'Análisis con IA eliminado',
  },
  viewAria: { de: 'Ansicht', en: 'View', fr: 'Vue', es: 'Vista' },
  labReportsAria: {
    de: 'Laborbefunde',
    en: 'Lab reports',
    fr: 'Bilans de laboratoire',
    es: 'Informes de laboratorio',
  },
  labelPlaceholderShort: { de: 'Bezeichnung', en: 'Label', fr: 'Libellé', es: 'Etiqueta' },
  editLabel: {
    de: 'Bezeichnung bearbeiten',
    en: 'Edit label',
    fr: 'Modifier le libellé',
    es: 'Editar etiqueta',
  },
  addLabel: { de: '+ Bezeichnung', en: '+ Label', fr: '+ Libellé', es: '+ Etiqueta' },
  copyBefundTitle: {
    de: 'Befund kopieren',
    en: 'Copy report',
    fr: 'Copier le bilan',
    es: 'Copiar informe',
  },
  printBefundTitle: {
    de: 'Befund drucken',
    en: 'Print report',
    fr: 'Imprimer le bilan',
    es: 'Imprimir informe',
  },
  analyzeBefundAiTitle: {
    de: 'Befund mit KI analysieren',
    en: 'Analyze report with AI',
    fr: 'Analyser le bilan avec l’IA',
    es: 'Analizar el informe con IA',
  },
  deleteBefundTitle: {
    de: 'Befund löschen',
    en: 'Delete report',
    fr: 'Supprimer le bilan',
    es: 'Eliminar informe',
  },
  noParamsDetected: {
    de: 'Keine Parameter erkannt.',
    en: 'No parameters detected.',
    fr: 'Aucun paramètre détecté.',
    es: 'No se detectaron parámetros.',
  },
  copyAnalyse: { de: 'Analyse kopieren', en: 'Copy analysis', fr: 'Copier l’analyse', es: 'Copiar análisis' },
  deleteAnalyse: {
    de: 'Analyse löschen',
    en: 'Delete analysis',
    fr: 'Supprimer l’analyse',
    es: 'Eliminar análisis',
  },
  pasteOrSelect: {
    de: 'Laborbefund einfügen oder auswählen',
    en: 'Paste or select a lab report',
    fr: 'Collez ou sélectionnez un bilan',
    es: 'Pegue o seleccione un informe de laboratorio',
  },
  graphSaved: { de: 'Grafik gespeichert', en: 'Graph saved', fr: 'Graphique enregistré', es: 'Gráfico guardado' },
  showViewTemplate: {
    de: '{label} anzeigen',
    en: 'Show {label}',
    fr: 'Afficher {label}',
    es: 'Mostrar {label}',
  },
} as const satisfies Record<string, Record<UiLanguage, string>>

export type LaborExtraUiKey = keyof typeof laborExtraUiTranslations

export function translateLaborExtraUi(language: UiLanguage, key: LaborExtraUiKey): string {
  return laborExtraUiTranslations[key][language] ?? laborExtraUiTranslations[key].de
}

export function formatLaborExtraUi(
  language: UiLanguage,
  key: LaborExtraUiKey,
  vars: Record<string, string | number>,
): string {
  let text = translateLaborExtraUi(language, key)
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value))
  }
  return text
}
