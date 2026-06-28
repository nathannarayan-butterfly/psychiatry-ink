import type { UiLanguage } from '../types/settings'

export const settingsExtraUiTranslations = {
  // ── Shared / common ──────────────────────────────────────────────────────
  commonSave: { de: 'Speichern', en: 'Save', fr: 'Enregistrer', es: 'Guardar' },
  commonBack: { de: 'Zurück', en: 'Back', fr: 'Retour', es: 'Volver' },
  commonClose: { de: 'Schließen', en: 'Close', fr: 'Fermer', es: 'Cerrar' },
  commonSaveFailed: {
    de: 'Speichern fehlgeschlagen',
    en: 'Save failed',
    fr: 'Échec de l’enregistrement',
    es: 'Error al guardar',
  },

  // ── AI Manager settings ──────────────────────────────────────────────────
  aiManagerTitle: { de: 'KI-Manager', en: 'AI Manager', fr: 'Gestionnaire IA', es: 'Gestor de IA' },
  aiManagerIntro: {
    de: 'Empfehlungen für den Arbeitsbereich — Nutzer können jederzeit manuell anderen Modus oder andere KI-Funktion wählen.',
    en: 'Recommendations for the workspace — users can manually choose a different mode or AI function at any time.',
    fr: 'Recommandations pour l’espace de travail — les utilisateurs peuvent à tout moment choisir manuellement un autre mode ou une autre fonction IA.',
    es: 'Recomendaciones para el espacio de trabajo — los usuarios pueden elegir manualmente otro modo u otra función de IA en cualquier momento.',
  },
  aiDefaultMode: {
    de: 'Standard-Modus',
    en: 'Default mode',
    fr: 'Mode par défaut',
    es: 'Modo predeterminado',
  },
  aiDefaultModeDesc: {
    de: 'Economical, Standard oder Gründlich beim Öffnen dieser Komponente.',
    en: 'Economical, Standard or Thorough when opening this component.',
    fr: 'Économique, Standard ou Approfondi à l’ouverture de ce composant.',
    es: 'Económico, Estándar o Exhaustivo al abrir este componente.',
  },
  aiAllowGenerate: {
    de: 'Generieren erlauben',
    en: 'Allow generation',
    fr: 'Autoriser la génération',
    es: 'Permitir generación',
  },
  aiAllowGenerateDesc: {
    de: 'Bei welchem Umfang der Generieren-Button aktiv werden kann.',
    en: 'At which scope the Generate button can become active.',
    fr: 'À quelle portée le bouton Générer peut devenir actif.',
    es: 'En qué alcance puede activarse el botón Generar.',
  },
  aiScopeThisSegment: {
    de: 'Dieses Segment',
    en: 'This segment',
    fr: 'Ce segment',
    es: 'Este segmento',
  },
  aiScopeAllSegments: {
    de: 'Alle Segmente',
    en: 'All segments',
    fr: 'Tous les segments',
    es: 'Todos los segmentos',
  },
  aiScopeSegment: { de: 'Segment', en: 'Segment', fr: 'Segment', es: 'Segmento' },
  aiRecommendedFunctions: {
    de: 'Empfohlene KI-Funktionen',
    en: 'Recommended AI functions',
    fr: 'Fonctions IA recommandées',
    es: 'Funciones de IA recomendadas',
  },
  aiRecommendedFunctionsDesc: {
    de: 'Hervorgehoben als Empfehlung — alle Funktionen bleiben im Arbeitsbereich wählbar.',
    en: 'Highlighted as a recommendation — all functions remain selectable in the workspace.',
    fr: 'Mises en avant comme recommandation — toutes les fonctions restent sélectionnables dans l’espace de travail.',
    es: 'Destacadas como recomendación — todas las funciones siguen disponibles en el espacio de trabajo.',
  },
  aiTierFast: { de: 'Economical', en: 'Economical', fr: 'Économique', es: 'Económico' },
  aiTierStandard: { de: 'Standard', en: 'Standard', fr: 'Standard', es: 'Estándar' },
  aiTierThorough: { de: 'Gründlich', en: 'Thorough', fr: 'Approfondi', es: 'Exhaustivo' },
  aiToolSummarize: { de: 'Zusammenfassen', en: 'Summarize', fr: 'Résumer', es: 'Resumir' },
  aiToolStructure: { de: 'Strukturieren', en: 'Structure', fr: 'Structurer', es: 'Estructurar' },
  aiToolShorten: { de: 'Kürzen', en: 'Shorten', fr: 'Raccourcir', es: 'Acortar' },
  aiToolFormalize: { de: 'Formalisieren', en: 'Formalize', fr: 'Formaliser', es: 'Formalizar' },
  aiToolBulletPoints: { de: 'Stichpunkte', en: 'Bullet points', fr: 'Puces', es: 'Viñetas' },
  aiToolProofread: { de: 'Korrektur', en: 'Proofread', fr: 'Relecture', es: 'Corrección' },
  aiToolExpand: { de: 'Erweitern', en: 'Expand', fr: 'Développer', es: 'Ampliar' },

  // ── Budget manager page ──────────────────────────────────────────────────
  budgetLoadFailed: {
    de: 'Laden fehlgeschlagen',
    en: 'Loading failed',
    fr: 'Échec du chargement',
    es: 'Error al cargar',
  },
  budgetSaved: { de: 'Gespeichert', en: 'Saved', fr: 'Enregistré', es: 'Guardado' },
  budgetLoadingData: {
    de: 'Budget-Daten laden…',
    en: 'Loading budget data…',
    fr: 'Chargement des données budget…',
    es: 'Cargando datos de presupuesto…',
  },
  budgetPageTitle: {
    de: 'KI-Budget & Token-Nutzung',
    en: 'AI budget & token usage',
    fr: 'Budget IA et utilisation des tokens',
    es: 'Presupuesto de IA y uso de tokens',
  },
  budgetPageSub: {
    de: 'Monatsübersicht — keine klinischen Inhalte in den Logs',
    en: 'Monthly overview — no clinical content in the logs',
    fr: 'Aperçu mensuel — aucun contenu clinique dans les journaux',
    es: 'Resumen mensual — sin contenido clínico en los registros',
  },
  budgetCurrentMonth: {
    de: 'Aktueller Monat',
    en: 'Current month',
    fr: 'Mois en cours',
    es: 'Mes actual',
  },
  budgetCostEur: { de: 'Kosten (EUR)', en: 'Cost (EUR)', fr: 'Coût (EUR)', es: 'Coste (EUR)' },
  budgetTotalTokens: {
    de: 'Tokens gesamt',
    en: 'Total tokens',
    fr: 'Total des tokens',
    es: 'Tokens totales',
  },
  budgetGenerations: {
    de: 'Generierungen',
    en: 'Generations',
    fr: 'Générations',
    es: 'Generaciones',
  },
  budgetProviderEstimate: {
    de: 'Provider / Schätzung',
    en: 'Provider / estimate',
    fr: 'Fournisseur / estimation',
    es: 'Proveedor / estimación',
  },
  budgetUtilization: {
    de: 'Budget-Auslastung',
    en: 'Budget utilisation',
    fr: 'Utilisation du budget',
    es: 'Uso del presupuesto',
  },
  budgetTopFeatures: {
    de: 'Top 5 Features',
    en: 'Top 5 features',
    fr: 'Top 5 des fonctions',
    es: 'Top 5 funciones',
  },
  budgetQuotaTitle: {
    de: 'KI-Kontingent (parallel)',
    en: 'AI quota (parallel)',
    fr: 'Quota IA (parallèle)',
    es: 'Cuota de IA (paralela)',
  },
  budgetQuotaLine: {
    de: 'Generierungen: {gen} · Tokens: {tokens} · Transkription: {min} min',
    en: 'Generations: {gen} · Tokens: {tokens} · Transcription: {min} min',
    fr: 'Générations : {gen} · Tokens : {tokens} · Transcription : {min} min',
    es: 'Generaciones: {gen} · Tokens: {tokens} · Transcripción: {min} min',
  },
  budgetTableProvider: {
    de: 'Provider',
    en: 'Provider',
    fr: 'Fournisseur',
    es: 'Proveedor',
  },
  budgetTableModels: { de: 'Modelle', en: 'Models', fr: 'Modèles', es: 'Modelos' },
  budgetTableFeatures: { de: 'Features', en: 'Features', fr: 'Fonctions', es: 'Funciones' },
  budgetTableUsers: { de: 'Benutzer', en: 'Users', fr: 'Utilisateurs', es: 'Usuarios' },
  budgetNoData: { de: 'Keine Daten', en: 'No data', fr: 'Aucune donnée', es: 'Sin datos' },
  budgetTableColKey: { de: 'Schlüssel', en: 'Key', fr: 'Clé', es: 'Clave' },
  budgetTableColCalls: { de: 'Aufrufe', en: 'Calls', fr: 'Appels', es: 'Llamadas' },
  budgetNoUsageData: {
    de: 'Keine Nutzungsdaten verfügbar (Supabase nicht konfiguriert).',
    en: 'No usage data available (Supabase not configured).',
    fr: 'Aucune donnée d’utilisation disponible (Supabase non configuré).',
    es: 'No hay datos de uso disponibles (Supabase no configurado).',
  },
  budgetSettings: {
    de: 'Budget-Einstellungen',
    en: 'Budget settings',
    fr: 'Paramètres du budget',
    es: 'Configuración del presupuesto',
  },
  budgetMonthlyEur: {
    de: 'Monatsbudget EUR',
    en: 'Monthly budget EUR',
    fr: 'Budget mensuel EUR',
    es: 'Presupuesto mensual EUR',
  },
  budgetMonthlyUsd: {
    de: 'Monatsbudget USD',
    en: 'Monthly budget USD',
    fr: 'Budget mensuel USD',
    es: 'Presupuesto mensual USD',
  },
  budgetWarnAtPercent: {
    de: 'Warnung bei {percent}%',
    en: 'Warn at {percent}%',
    fr: 'Alerte à {percent} %',
    es: 'Aviso al {percent} %',
  },
  budgetHardLimitEnabled: {
    de: 'Hartes Limit aktiv (optional, blockiert nur KI-Generierung)',
    en: 'Hard limit active (optional, only blocks AI generation)',
    fr: 'Limite stricte active (optionnel, bloque uniquement la génération IA)',
    es: 'Límite estricto activo (opcional, solo bloquea la generación de IA)',
  },
  budgetHardLimitEur: {
    de: 'Hartes Limit EUR',
    en: 'Hard limit EUR',
    fr: 'Limite stricte EUR',
    es: 'Límite estricto EUR',
  },
  budgetLastUpdated: {
    de: 'Zuletzt aktualisiert: {date}',
    en: 'Last updated: {date}',
    fr: 'Dernière mise à jour : {date}',
    es: 'Última actualización: {date}',
  },
  budgetWarnings: {
    de: 'Budget-Warnungen',
    en: 'Budget warnings',
    fr: 'Alertes de budget',
    es: 'Avisos de presupuesto',
  },
  budgetExport: { de: 'Export', en: 'Export', fr: 'Exporter', es: 'Exportar' },

  // ── Case access panel ────────────────────────────────────────────────────
  caseVaultSetupDone: {
    de: 'Verschlüsselung für Mitglied eingerichtet.',
    en: 'Encryption set up for member.',
    fr: 'Chiffrement configuré pour le membre.',
    es: 'Cifrado configurado para el miembro.',
  },
  caseVaultSetupFailed: {
    de: 'Verschlüsselung konnte nicht eingerichtet werden.',
    en: 'Encryption could not be set up.',
    fr: 'Le chiffrement n’a pas pu être configuré.',
    es: 'No se pudo configurar el cifrado.',
  },
  caseRemoveFailed: {
    de: 'Entfernen fehlgeschlagen',
    en: 'Removal failed',
    fr: 'Échec de la suppression',
    es: 'Error al eliminar',
  },
  caseAccessTitle: {
    de: 'Fallfreigabe',
    en: 'Case sharing',
    fr: 'Partage du dossier',
    es: 'Compartir caso',
  },
  caseAccessLoading: {
    de: 'Zugriffe werden geladen…',
    en: 'Loading access…',
    fr: 'Chargement des accès…',
    es: 'Cargando accesos…',
  },
  caseNoPermission: {
    de: 'Sie haben keine Berechtigung, die Fallfreigabe zu verwalten.',
    en: 'You do not have permission to manage case sharing.',
    fr: 'Vous n’avez pas l’autorisation de gérer le partage du dossier.',
    es: 'No tiene permiso para gestionar el uso compartido del caso.',
  },
  caseAccessIntro: {
    de: 'Legen Sie fest, welche Teammitglieder Zugriff auf diesen Fall erhalten.',
    en: 'Define which team members get access to this case.',
    fr: 'Définissez quels membres de l’équipe ont accès à ce dossier.',
    es: 'Defina qué miembros del equipo tienen acceso a este caso.',
  },
  caseCurrentGrants: {
    de: 'Aktuelle Freigaben',
    en: 'Current grants',
    fr: 'Partages actuels',
    es: 'Permisos actuales',
  },
  caseNoGrants: {
    de: 'Noch keine Freigaben für andere Mitglieder.',
    en: 'No grants for other members yet.',
    fr: 'Aucun partage pour d’autres membres pour le moment.',
    es: 'Aún no hay permisos para otros miembros.',
  },
  caseOwnerBadge: {
    de: 'Fallinhaber',
    en: 'Case owner',
    fr: 'Propriétaire du dossier',
    es: 'Propietario del caso',
  },
  caseAccessLevelForAria: {
    de: 'Zugriffsstufe für {name}',
    en: 'Access level for {name}',
    fr: 'Niveau d’accès pour {name}',
    es: 'Nivel de acceso para {name}',
  },
  caseRemoveAccess: {
    de: 'Zugriff entfernen',
    en: 'Remove access',
    fr: 'Retirer l’accès',
    es: 'Quitar acceso',
  },
  caseAddGrant: {
    de: 'Freigabe hinzufügen',
    en: 'Add grant',
    fr: 'Ajouter un partage',
    es: 'Añadir permiso',
  },
  caseTeamMemberAria: {
    de: 'Teammitglied',
    en: 'Team member',
    fr: 'Membre de l’équipe',
    es: 'Miembro del equipo',
  },
  caseSelectMember: {
    de: 'Mitglied wählen…',
    en: 'Select member…',
    fr: 'Choisir un membre…',
    es: 'Seleccionar miembro…',
  },
  caseAccessLevelAria: {
    de: 'Zugriffsstufe',
    en: 'Access level',
    fr: 'Niveau d’accès',
    es: 'Nivel de acceso',
  },
  caseSmallPraxisHint: {
    de: 'Mitglieder ohne explizite Freigabe sehen diesen Fall nicht, sobald Freigaben konfiguriert sind.',
    en: 'Members without an explicit grant will not see this case once grants are configured.',
    fr: 'Les membres sans partage explicite ne verront pas ce dossier une fois les partages configurés.',
    es: 'Los miembros sin permiso explícito no verán este caso una vez configurados los permisos.',
  },
} as const satisfies Record<string, Record<UiLanguage, string>>

export type SettingsExtraUiKey = keyof typeof settingsExtraUiTranslations

export function translateSettingsExtraUi(language: UiLanguage, key: SettingsExtraUiKey): string {
  return settingsExtraUiTranslations[key][language] ?? settingsExtraUiTranslations[key].de
}

export function formatSettingsExtraUi(
  language: UiLanguage,
  key: SettingsExtraUiKey,
  vars: Record<string, string | number>,
): string {
  let text = translateSettingsExtraUi(language, key)
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value))
  }
  return text
}
