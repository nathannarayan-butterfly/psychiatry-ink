/**
 * Complementary-therapy display-name resolution for document import persistence.
 */
import type { UiTranslationKey } from '../../data/uiTranslations'
import { uiTranslations } from '../../data/uiTranslations'
import type { UiLanguage } from '../../types/settings'
import {
  DEFAULT_COMPLEMENTARY_THERAPY_TYPES,
  type DefaultComplementaryTherapyType,
} from '../../types/complementaryTherapy'

const THERAPY_TYPE_LABEL_KEYS: Record<DefaultComplementaryTherapyType, UiTranslationKey> = {
  ergotherapie: 'ctTypeErgotherapie',
  sporttherapie: 'ctTypeSporttherapie',
  musiktherapie: 'ctTypeMusiktherapie',
  kunsttherapie: 'ctTypeKunsttherapie',
  skillgruppe: 'ctTypeSkillgruppe',
  fokusgruppe: 'ctTypeFokusgruppe',
  psychoedukation: 'ctTypePsychoedukation',
  suchtgruppe: 'ctTypeSuchtgruppe',
  entspannungstraining: 'ctTypeEntspannungstraining',
  arbeitstherapie: 'ctTypeArbeitstherapie',
  gruppentherapien: 'ctTypeGruppentherapien',
}

/** Resolve a default/custom therapy type id to the localized display name used in charts. */
export function complementaryTherapyDisplayName(typeId: string, language: UiLanguage): string {
  if ((DEFAULT_COMPLEMENTARY_THERAPY_TYPES as readonly string[]).includes(typeId)) {
    const key = THERAPY_TYPE_LABEL_KEYS[typeId as DefaultComplementaryTherapyType]
    const entry = uiTranslations[key]
    return entry[language] ?? entry.de ?? typeId
  }
  if (typeId === 'physiotherapie') {
    return language === 'de' ? 'Physiotherapie' : 'Physiotherapy'
  }
  return typeId.charAt(0).toUpperCase() + typeId.slice(1)
}
