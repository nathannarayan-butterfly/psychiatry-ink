import type { UiLanguage } from '../../types/settings'
import { psychopathChecklistItemTranslations } from '../psychopathChecklistTranslations'

/** Translation key for an AMDP checklist item label in guided entry. */
export function gePpbItemLabelKey(itemId: string): string {
  return `gePpbItem_${itemId.replace(/-/g, '_')}`
}

/** Translation key for an AMDP section step title in guided entry. */
export function gePpbStepTitleKey(sectionId: string): string {
  return `gePpbStep_${sectionId.replace(/-/g, '_')}`
}

/** Translation key for an AMDP section step description in guided entry. */
export function gePpbStepDescKey(sectionId: string): string {
  return `gePpbStepDesc_${sectionId.replace(/-/g, '_')}`
}

const PPB_STEP_TITLES: Record<string, Record<UiLanguage, string>> = {
  gePpbStep_bewusstsein: {
    de: 'Bewusstsein',
    en: 'Consciousness',
    fr: 'Conscience',
    es: 'Conciencia',
  },
  gePpbStep_aufmerksamkeit_gedaechtnis: {
    de: 'Aufmerksamkeit & Gedächtnis',
    en: 'Attention & Memory',
    fr: 'Attention & Mémoire',
    es: 'Atención y memoria',
  },
  gePpbStep_formales_denken: {
    de: 'Formales Denken',
    en: 'Formal thought',
    fr: 'Pensée formelle',
    es: 'Pensamiento formal',
  },
  gePpbStep_inhaltliches_denken: {
    de: 'Inhaltliches Denken',
    en: 'Thought content',
    fr: 'Contenu de pensée',
    es: 'Contenido del pensamiento',
  },
  gePpbStep_wahrnehmung: {
    de: 'Wahrnehmung',
    en: 'Perception',
    fr: 'Perception',
    es: 'Percepción',
  },
  gePpbStep_ich_stoerungen: {
    de: 'Ich-Störungen',
    en: 'Ego disturbances',
    fr: 'Troubles du moi',
    es: 'Alteraciones del yo',
  },
  gePpbStep_affektivitaet: {
    de: 'Affektivität',
    en: 'Affectivity',
    fr: 'Affectivité',
    es: 'Afectividad',
  },
  gePpbStep_antrieb_psychomotorik: {
    de: 'Antrieb & Psychomotorik',
    en: 'Drive & Psychomotor activity',
    fr: 'Énergie & Psychomotricité',
    es: 'Impulso y psicomotricidad',
  },
  gePpbStep_suizidalitaet: {
    de: 'Suizidalität & Selbstgefährdung',
    en: 'Suicidality & Self-harm risk',
    fr: 'Suicidalité & Autodestruction',
    es: 'Suicidalidad y autolesión',
  },
  gePpbStep_vegetative_funktionen: {
    de: 'Vegetative Funktionen',
    en: 'Vegetative functions',
    fr: 'Fonctions végétatives',
    es: 'Funciones vegetativas',
  },
  gePpbStep_sozialverhalten: {
    de: 'Sozialverhalten & Kontakt',
    en: 'Social behaviour & contact',
    fr: 'Comportement social & contact',
    es: 'Conducta social y contacto',
  },
}

const PPB_STEP_DESCRIPTIONS: Record<string, Record<UiLanguage, string>> = {
  gePpbStepDesc_bewusstsein: {
    de: 'Vigilanz und Orientierung',
    en: 'Vigilance and orientation',
    fr: 'Vigilance et orientation',
    es: 'Vigilancia y orientación',
  },
}

const PPB_ITEM_LABELS = Object.fromEntries(
  Object.entries(psychopathChecklistItemTranslations).map(([itemId, { label }]) => [
    gePpbItemLabelKey(itemId),
    label,
  ]),
) as Record<string, Record<UiLanguage, string>>

/** Checklist item + section step labels merged for uiTranslations. */
export const psychopathGuidedUiLabels: Record<string, Record<UiLanguage, string>> = {
  ...PPB_STEP_TITLES,
  ...PPB_STEP_DESCRIPTIONS,
  ...PPB_ITEM_LABELS,
}
