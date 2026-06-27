#!/usr/bin/env tsx
/**
 * Dev-only: regenerate demo fixture via DeepSeek (when API key present) or rebuild locally.
 *
 * Usage:
 *   npm run demo:fixture:write          # local builder only
 *   npm run demo:fixture:regen          # DeepSeek if DEEPSEEK_API_KEY set, else local
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import '../server/loadEnv.ts'
import { buildDemoPatientFixture } from '../src/demo/buildDemoFixture.ts'
import { validateDemoFixture } from '../src/demo/validateDemoFixture.ts'
import type { DemoPatientFixture } from '../src/demo/types.ts'

const outPath = resolve(process.cwd(), 'src/demo/demoPatient.fixture.json')

async function tryDeepSeekRegen(): Promise<DemoPatientFixture | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (!apiKey) {
    console.warn('[demo-regen] DEEPSEEK_API_KEY not set — using local builder')
    return null
  }

  const prompt = `Return ONLY valid JSON matching DemoPatientFixture for a synthetic German psychiatry demo patient.
Markers: isDemoPatient true, demoSeedVersion "v3", demoPatientId "DEMO-0001", demoCaseId "DEMO-CASE-0001".
Patient: Nikolaos Demo, male, DOB 22.03.1985, admission 02.06.2026. Fictional only — no real PHI.
Include workspace.isdmInput, isdmAnalysis, butterflyAttestations, clinicalQuestionNotes, anforderungen.
Use clinically realistic German text with diagnostic uncertainty (F20.0, F10.2).`

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
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
    const probe = validateDemoFixture(parsed, { expectedSeedVersion: parsed.demoSeedVersion ?? 'v3' })
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
  const aiFixture = await tryDeepSeekRegen()
  const fixture = aiFixture ?? buildDemoPatientFixture('de')
  const validation = validateDemoFixture(fixture)

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
