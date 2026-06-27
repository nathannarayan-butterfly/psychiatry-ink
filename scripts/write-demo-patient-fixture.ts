#!/usr/bin/env tsx
/**
 * Write locale-specific demo fixture JSON from the programmatic builder.
 * DeepSeek regen: npm run demo:fixture:regen -- --write --locale en
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildDemoPatientFixture } from '../src/demo/buildDemoFixture.ts'
import type { DemoLocale } from '../src/demo/demoLocale.ts'

function parseLocale(): DemoLocale {
  const idx = process.argv.indexOf('--locale')
  const value = idx >= 0 ? process.argv[idx + 1] : 'en'
  return value === 'de' ? 'de' : 'en'
}

const locale = parseLocale()
const fixture = buildDemoPatientFixture(locale)
const outPath = resolve(process.cwd(), `src/demo/demoPatient.${locale}.fixture.json`)
writeFileSync(outPath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8')
console.log(
  `Wrote ${outPath} [locale=${locale}] (${Object.keys(fixture.workspace.documents).length} documents, ${fixture.verlaufFeed.length} verlauf entries, ${fixture.verlaufAnnotations?.length ?? 0} annotations)`,
)
