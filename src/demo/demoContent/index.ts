import type { DemoLocale } from '../demoLocale'
import { createDemoContentModule } from './createModule'
import { demoStringsDe } from './strings/de'
import { demoStringsEn } from './strings/en'
import type { DemoContentModule } from './types'

const modules: Record<DemoLocale, DemoContentModule> = {
  de: createDemoContentModule('de', demoStringsDe),
  en: createDemoContentModule('en', demoStringsEn),
}

export function getDemoContent(locale: DemoLocale): DemoContentModule {
  return modules[locale]
}

export { createDemoContentModule } from './createModule'
export type { DemoContentModule, DemoStrings } from './types'
