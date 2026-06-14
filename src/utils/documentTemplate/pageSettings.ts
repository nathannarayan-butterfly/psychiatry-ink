import type { DocumentTemplate, TemplatePageSettings } from '../../types/documentTemplate'

export const DEFAULT_PAGE_MARGINS = { top: 20, right: 20, bottom: 20, left: 25 }
export const DEFAULT_HEADER_HEIGHT_MM = 15
export const DEFAULT_FOOTER_HEIGHT_MM = 12

export const DEFAULT_PAGE_SETTINGS: TemplatePageSettings = {
  format: 'a4',
  margins: { ...DEFAULT_PAGE_MARGINS },
  header: { heightMm: DEFAULT_HEADER_HEIGHT_MM },
  footer: { heightMm: DEFAULT_FOOTER_HEIGHT_MM },
  headerFooterFirstPageOnly: false,
}

export function resolvePageSettings(template: DocumentTemplate): TemplatePageSettings {
  const ps = template.pageSettings
  return {
    format: 'a4',
    margins: { ...DEFAULT_PAGE_MARGINS, ...ps?.margins },
    header: {
      heightMm: ps?.header?.heightMm ?? DEFAULT_HEADER_HEIGHT_MM,
      content: ps?.header?.content,
    },
    footer: {
      heightMm: ps?.footer?.heightMm ?? DEFAULT_FOOTER_HEIGHT_MM,
      content: ps?.footer?.content,
    },
    headerFooterFirstPageOnly: ps?.headerFooterFirstPageOnly ?? false,
  }
}

export function migrateTemplate(template: DocumentTemplate): DocumentTemplate {
  if (template.pageSettings?.format === 'a4') return template
  return {
    ...template,
    pageSettings: {
      ...DEFAULT_PAGE_SETTINGS,
      ...template.pageSettings,
      format: 'a4',
      margins: { ...DEFAULT_PAGE_MARGINS, ...template.pageSettings?.margins },
    },
  }
}
