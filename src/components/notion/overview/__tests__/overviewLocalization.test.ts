import { describe, it, expect } from 'vitest'
import { translateUi, type UiTranslationKey } from '../../../../data/uiTranslations'

/**
 * Regression guard: the Overview dashboard (the default case tab) must not leak
 * German into an English UI. Every card title / action / empty-state string used
 * by the overview widgets is keyed here and asserted to resolve to non-German
 * English. The English demo patient (DEMO-CASE-EN-0001) lands on this tab, so any
 * German here is directly visible to an English-UI clinician.
 */

// Keys rendered by the localized overview cards (see OverviewWidgetContent + cards).
const OVERVIEW_EN_KEYS: UiTranslationKey[] = [
  // Card titles (reused widget registry keys)
  'overviewWidgetRecentVerlauf',
  'overviewWidgetLabResults',
  'overviewWidgetAppointments',
  'overviewWidgetDokumentation',
  'overviewWidgetPsychotherapy',
  'overviewWidgetZwangsmassnahme',
  'overviewWidgetAngemeldeteTherapien',
  'overviewWidgetEkgSummary',
  'overviewWidgetCtSummary',
  // Actions
  'overviewRecentVerlaufAction',
  'overviewLaborToLabor',
  'overviewToTherapie',
  'overviewToDokumente',
  'befundSidebarLink',
  'overviewDiagnosticOpenAction',
  // Empty states / body copy
  'overviewRecentVerlaufEmpty',
  'overviewLaborEmptyNoData',
  'overviewLaborEmptyNoRelevant',
  'overviewRegisteredTherapiesEmpty',
  'overviewZwangPlaceholderMessage',
  'overviewZwangPlaceholderDetail',
  'overviewZwangEmpty',
  'overviewDokumenteEmpty',
  'overviewAppointmentsLoading',
  'overviewAppointmentsEmpty',
  // Badges / tags
  'overviewLaborAbnormalBadge',
  'overviewDraftSingular',
  'overviewDraftPlural',
  // LabsDue subheads / title
  'overviewLaborMonitoringTitle',
  'overviewLaborAbnormalSubhead',
  'overviewLaborWatchedSubhead',
  'overviewLaborPendingMonitoring',
]

// German umlauts/eszett or unambiguous German function/clinical words.
const GERMAN_LEAK =
  /[äöüÄÖÜß]|\b(?:Keine|Befunde|Verlauf|Termine|Dokumentation|Dokumente|Therapie|Therapien|Medikation|Diagnostik|Entwurf|Entwürfe|auffällig|Auffällig|Überwacht|Ausstehend(?:es)?|Zwangsmaßnahme|verfügbar|genehmigt|beantragt|Version|Freigabeprozess|Letztes)\b/

describe('Overview dashboard English localization', () => {
  it('every overview card string resolves to non-German English', () => {
    const offenders: Array<{ key: string; value: string }> = []
    for (const key of OVERVIEW_EN_KEYS) {
      const value = translateUi('en', key)
      if (GERMAN_LEAK.test(value)) {
        offenders.push({ key, value })
      }
    }
    expect(offenders, `German leak in EN overview strings: ${JSON.stringify(offenders)}`).toEqual([])
  })

  it('control: German locale still renders German for the same keys', () => {
    // Sanity check the keys are real and the DE side is intact.
    expect(translateUi('de', 'overviewWidgetLabResults')).toBe('Befunde')
    expect(translateUi('de', 'overviewRecentVerlaufEmpty')).toBe('Keine Verlaufseinträge vorhanden.')
    expect(translateUi('de', 'overviewZwangEmpty')).toBe('Keine Zwangsmaßnahme beantragt oder genehmigt.')
  })

  it('English values are present (non-empty) for all overview keys', () => {
    for (const key of OVERVIEW_EN_KEYS) {
      expect(translateUi('en', key).trim().length, `empty EN value for ${key}`).toBeGreaterThan(0)
    }
  })
})
