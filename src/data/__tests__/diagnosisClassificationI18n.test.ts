// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { translateUi, uiTranslations, type UiTranslationKey } from '../uiTranslations'
import type { UiLanguage } from '../../types/settings'
import {
  categoryTranslationKey,
  confirmationTranslationKey,
  DIAGNOSIS_CLINICAL_CATEGORIES,
  DIAGNOSIS_CONFIRMATION_STATUSES,
} from '../../utils/diagnosisClassification'

const LOCALES: UiLanguage[] = ['de', 'en', 'fr', 'es']

const DIAGNOSIS_I18N_KEYS: UiTranslationKey[] = [
  'diagnosisTableColCode',
  'diagnosisTableColName',
  'diagnosisTableColStatus',
  'diagnosisCategoryLabel',
  'diagnosisConfirmationLabel',
  'diagnosisSetAsDifferential',
  'diagnosisQuickDdLabel',
  'diagnosisClassificationAddHint',
  'diagnosenTitle',
  'diagnosenEmpty',
  'overviewWidgetDiagnoses',
  'overviewWidgetDescDiagnoses',
  'overviewGlanceDiagnosis',
]

describe('diagnosis classification i18n', () => {
  it('defines all table and editor shell keys in four locales', () => {
    for (const key of DIAGNOSIS_I18N_KEYS) {
      const entry = uiTranslations[key]
      expect(entry, key).toBeDefined()
      for (const locale of LOCALES) {
        expect(entry[locale]?.trim(), `${key}.${locale}`).toBeTruthy()
      }
    }
  })

  it('defines all eight category keys in four locales', () => {
    for (const category of DIAGNOSIS_CLINICAL_CATEGORIES) {
      const key = categoryTranslationKey(category) as UiTranslationKey
      const entry = uiTranslations[key]
      expect(entry, key).toBeDefined()
      for (const locale of LOCALES) {
        const value = entry[locale]?.trim() ?? ''
        expect(value, `${key}.${locale}`).toBeTruthy()
        expect(value).not.toBe(key)
      }
    }
  })

  it('defines all confirmation keys in four locales', () => {
    for (const status of DIAGNOSIS_CONFIRMATION_STATUSES) {
      const key = confirmationTranslationKey(status) as UiTranslationKey
      const entry = uiTranslations[key]
      expect(entry, key).toBeDefined()
      for (const locale of LOCALES) {
        const value = entry[locale]?.trim() ?? ''
        expect(value, `${key}.${locale}`).toBeTruthy()
        expect(value).not.toBe(key)
      }
    }
  })

  it('returns locale-specific strings (FR/ES not English fallbacks for categories)', () => {
    expect(translateUi('fr', 'diagnosisCategoryPrimary')).toBe('Diagnostic principal')
    expect(translateUi('es', 'diagnosisCategoryPrimary')).toBe('Diagnóstico principal')
    expect(translateUi('fr', 'diagnosisCategorySuspected')).toBe('Suspect')
    expect(translateUi('es', 'diagnosisCategorySuspected')).toBe('Sospecha')
    expect(translateUi('fr', 'diagnosisConfirmationAnamnesisOnly')).toBe('Anamnèse')
    expect(translateUi('es', 'diagnosisConfirmationAnamnesisOnly')).toBe('Anamnesis')
  })
})
