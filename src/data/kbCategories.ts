import type { KbCategory, KnowledgeEntry } from './knowledgeBaseSeedData'

/**
 * Built-in clinical knowledge categories. Users may additionally create their
 * own free-text categories from the entry create dialog; those are persisted on
 * the entry itself (`category`) and surfaced for reuse via {@link kbCustomCategories}.
 */
export const KB_PRESET_CATEGORIES: KbCategory[] = [
  'Pharmakologie',
  'Diagnostik',
  'Klinik',
  'Leitlinien',
  'Psychopathologie',
  'Sonstiges',
]

/** Badge color class per built-in category. Custom categories fall back to the neutral badge. */
export const KB_CATEGORY_COLORS: Record<KbCategory, string> = {
  Pharmakologie: 'kb-badge--pharma',
  Diagnostik: 'kb-badge--diagnostik',
  Klinik: 'kb-badge--klinik',
  Leitlinien: 'kb-badge--leitlinien',
  Psychopathologie: 'kb-badge--psychopath',
  Sonstiges: 'kb-badge--sonstiges',
}

/** English display labels for built-in categories (filter chips/grouping still key off German). */
export const KB_CATEGORY_EN: Record<KbCategory, string> = {
  Pharmakologie: 'Pharmacology',
  Diagnostik: 'Assessment',
  Klinik: 'Clinical',
  Leitlinien: 'Guidelines',
  Psychopathologie: 'Psychopathology',
  Sonstiges: 'Other',
}

const PRESET_SET = new Set<string>(KB_PRESET_CATEGORIES)

/** True for the six built-in categories. */
export function isPresetKbCategory(category: string): category is KbCategory {
  return PRESET_SET.has(category)
}

/** Badge CSS class for any category; custom categories reuse the neutral "Sonstiges" badge. */
export function kbBadgeClass(category: string): string {
  return KB_CATEGORY_COLORS[category as KbCategory] ?? KB_CATEGORY_COLORS.Sonstiges
}

/** English (or fallback) display label for any category. */
export function kbCategoryLabelEn(category: string): string | undefined {
  return KB_CATEGORY_EN[category as KbCategory]
}

/** Distinct custom (non-preset) categories already used by entries, alphabetically sorted. */
export function kbCustomCategories(entries: KnowledgeEntry[]): string[] {
  const custom = new Set<string>()
  for (const entry of entries) {
    const category = entry.category?.trim()
    if (category && !PRESET_SET.has(category)) custom.add(category)
  }
  return [...custom].sort((a, b) => a.localeCompare(b))
}

/**
 * Ordered category list for chips/grouping: built-in categories in canonical
 * order, followed by any custom categories used by the given entries.
 */
export function kbCategoryOrder(entries: KnowledgeEntry[]): KbCategory[] {
  return [...KB_PRESET_CATEGORIES, ...(kbCustomCategories(entries) as KbCategory[])]
}
