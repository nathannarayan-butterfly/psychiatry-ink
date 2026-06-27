#!/usr/bin/env tsx
/**
 * Dev-only: regenerate demo fixture via DeepSeek (when API key present) or rebuild locally.
 *
 * Usage:
 *   npm run demo:fixture:write -- --locale en   # local builder only
 *   npm run demo:fixture:regen -- --write --locale en
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import '../server/loadEnv.ts'
import { buildDemoPatientFixture } from '../src/demo/buildDemoFixture.ts'
import { validateDemoFixture } from '../src/demo/validateDemoFixture.ts'
import type { DemoLocale } from '../src/demo/demoLocale.ts'
import type { DemoPatientFixture } from '../src/demo/types.ts'
import {
  DEMO_SEED_VERSION,
  demoCaseIdForLocale,
  demoPatientIdForLocale,
  demoPatientIdentityForLocale,
} from '../src/demo/constants.ts'

function parseLocale(): DemoLocale {
  const idx = process.argv.indexOf('--locale')
  const value = idx >= 0 ? process.argv[idx + 1] : 'en'
  return value === 'de' ? 'de' : 'en'
}

async function tryDeepSeekRegen(locale: DemoLocale): Promise<DemoPatientFixture | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (!apiKey) {
    console.warn('[demo-regen] DEEPSEEK_API_KEY not set — using local builder')
    return null
  }

  const language = locale === 'de' ? 'German' : 'English'
  const identity = demoPatientIdentityForLocale(locale)
  const caseId = demoCaseIdForLocale(locale)
  const patientId = demoPatientIdForLocale(locale)
  const prompt = `Return ONLY valid JSON matching DemoPatientFixture for a synthetic ${language} psychiatry demo patient.
Markers: isDemoPatient true, demoSeedVersion "${DEMO_SEED_VERSION}", demoPatientId "${patientId}", demoCaseId "${caseId}", demoLocale "${locale}".
Patient: ${identity.vorname} Demo, male, DOB ${identity.geburtsdatum}, admission 2026-06-02. Fictional only — no real PHI.
Diagnoses must include F20.0 (paranoid schizophrenia) and F10.2 (alcohol dependence) plus F17.2 (nicotine).
Include at least 18 verlaufFeed entries, verlaufAnnotations with comments and todos, workspace.isdmInput, isdmAnalysis, butterflyAttestations, clinicalQuestionNotes, anforderungen, full medicationPlanState, aiTherapyDemo, clinicalIntelligence.
All clinical text in ${language}. Use clinically realistic wording with diagnostic uncertainty. Do NOT translate from another locale — author natively in ${language}.`

  const model = process.env.DEEPSEEK_FAST_MODEL?.trim() || 'deepseek-chat'
  const baseUrl = process.env.DEEPSEEK_BASE_URL?.replace(/\/$/, '') ?? 'https://api.deepseek.com/v1'

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You output strict JSON only, no markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    })
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.warn(`[demo-regen] DeepSeek API failed: HTTP ${response.status}${body ? ` — ${body.slice(0, 120)}` : ''}`)
      return null
    }
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) {
      console.warn('[demo-regen] DeepSeek returned empty content — using local builder')
      return null
    }
    const parsed = JSON.parse(content) as DemoPatientFixture
    const probe = validateDemoFixture(parsed, { expectedSeedVersion: parsed.demoSeedVersion ?? DEMO_SEED_VERSION })
    if (!probe.ok) {
      console.warn(
        `[demo-regen] DeepSeek fixture failed validation (${probe.errors.length} errors) — using local builder`,
      )
      probe.errors.slice(0, 5).forEach((e) => console.warn(`  ${e.code}: ${e.message}`))
      return null
    }
    return parsed
  } catch (error) {
    console.warn('[demo-regen] DeepSeek error:', error)
    return null
  }
}

function previewDiff(before: string, after: string): void {
  if (before === after) {
    console.log('No changes vs existing fixture.')
    return
  }
  console.log('Fixture would change (preview only — approve by re-running with --write)')
  console.log(`  before: ${before.length} bytes`)
  console.log(`  after:  ${after.length} bytes`)
}

async function main(): Promise<void> {
  const writeFlag = process.argv.includes('--write')
  const locale = parseLocale()
  const outPath = resolve(process.cwd(), `src/demo/demoPatient.${locale}.fixture.json`)
  const aiFixture = await tryDeepSeekRegen(locale)
  const fixture = aiFixture ?? buildDemoPatientFixture(locale)
  const validation = validateDemoFixture(fixture)

  console.log(`Locale: ${locale}`)
  console.log(`Source: ${aiFixture ? 'DeepSeek' : 'local builder'}`)
  console.log(`Validation: ${validation.ok ? 'OK' : 'FAILED'} (${validation.errors.length} errors, ${validation.warnings.length} warnings)`)

  if (!validation.ok) {
    validation.errors.forEach((e) => console.error(`  ERROR ${e.code}: ${e.message}`))
    process.exit(1)
  }

  const nextJson = `${JSON.stringify(fixture, null, 2)}\n`
  const prevJson = existsSync(outPath) ? readFileSync(outPath, 'utf8') : ''

  if (!writeFlag) {
    previewDiff(prevJson, nextJson)
    console.log('Pass --write to apply.')
    return
  }

  writeFileSync(outPath, nextJson, 'utf8')
  console.log(`Wrote ${outPath}`)
}

void main()
