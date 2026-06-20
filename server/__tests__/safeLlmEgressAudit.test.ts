import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Egress audit — ensures every LLM-bound free-text path uses the central
 * PHI guard chain. The chain is:
 *
 *   route / service
 *     → server/ai/runAiFeature.ts  (credit accounting + PHI guard caller)
 *       → server/services/safeLlmEgress.ts (callLlmSafely — sanitize + assert)
 *         → server/services/llmProvider.ts (callLlm — actual provider call)
 *
 * Direct invocations of `callLlm(...)` or raw provider calls
 * (`fetch(api.openai.com)`, `fetch(api.deepseek.com)`,
 * `fetch(generativelanguage.googleapis.com)`, `openai.chat`, `openai.responses`,
 * `@google/generative-ai`) outside the allowlist below are forbidden so a new
 * route added in the future cannot accidentally bypass the PHI guard.
 *
 * Allowlist policy:
 *   - `server/services/llmProvider.ts` — DEFINES `callLlm` (wrapped by
 *     `callLlmSafely`).
 *   - `server/services/safeLlmEgress.ts` — the PHI sanitization + assertion
 *     wrapper. Called exclusively from `server/ai/runAiFeature.ts`.
 *   - `server/ai/runAiFeature.ts` — central entry point that does credit
 *     accounting and then calls `callLlmSafely`. In the `ai/` directory
 *     (not `routes/` or `services/`); exempt from the callLlm scan.
 *   - `server/services/kbSeedLlm.ts` — KB seed batch path. Never receives
 *     patient data; sanitizes + asserts at the egress boundary.
 *   - `server/services/transcriptionProvider.ts` — audio transcription
 *     endpoint, separate from text egress.
 *   - any `*.test.ts` file (test mocks).
 *
 * Every other route or service that needs an LLM call MUST go through
 * `runAiFeature` (which internally calls `callLlmSafely`).
 */

const SERVER_ROOT = join(__dirname, '..')
const SCAN_ROOTS = ['routes', 'services', 'ai'].map((dir) => join(SERVER_ROOT, dir))

const ALLOWLIST = new Set<string>([
  'services/llmProvider.ts',
  'services/safeLlmEgress.ts',
  'services/kbSeedLlm.ts',
  'services/transcriptionProvider.ts',
  // runAiFeature is the central credit-accounting entry point that calls
  // callLlmSafely. It is in server/ai/ and is the one legitimate non-test
  // caller of callLlmSafely.
  'ai/runAiFeature.ts',
])

function listTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const s = statSync(full)
    if (s.isDirectory()) listTsFiles(full, acc)
    else if (s.isFile() && full.endsWith('.ts') && !full.endsWith('.d.ts')) acc.push(full)
  }
  return acc
}

interface Violation {
  file: string
  pattern: string
  line: string
}

const FORBIDDEN_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'callLlm(', re: /\bcallLlm\(/ },
  { name: 'callDeepSeekJSON(', re: /\bcallDeepSeekJSON\(/ },
  { name: 'fetch(api.openai.com)', re: /['"`]https?:\/\/api\.openai\.com/ },
  { name: 'fetch(api.deepseek.com)', re: /['"`]https?:\/\/api\.deepseek\.com/ },
  {
    name: 'fetch(generativelanguage.googleapis.com)',
    re: /['"`]https?:\/\/generativelanguage\.googleapis\.com/,
  },
  { name: '@google/generative-ai', re: /@google\/generative-ai/ },
  { name: 'openai.chat', re: /\bopenai\.chat\b/ },
  { name: 'openai.responses', re: /\bopenai\.responses\b/ },
]

describe('LLM egress audit', () => {
  it('every server route/service uses callLlmSafely (no raw provider calls outside the allowlist)', () => {
    const violations: Violation[] = []

    for (const root of SCAN_ROOTS) {
      const files = listTsFiles(root)
      for (const file of files) {
        const rel = relative(SERVER_ROOT, file)
        if (rel.endsWith('.test.ts')) continue
        if (rel.endsWith('.test.tsx')) continue
        if (ALLOWLIST.has(rel)) continue

        const text = readFileSync(file, 'utf8')
        const lines = text.split('\n')
        for (let i = 0; i < lines.length; i += 1) {
          const line = lines[i]!
          // Ignore single-line comments and JSDoc lines that merely document
          // the function name.
          const trimmed = line.trim()
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue
          for (const { name, re } of FORBIDDEN_PATTERNS) {
            if (re.test(line)) {
              violations.push({ file: rel, pattern: name, line: line.trim() })
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  - ${v.file} :: ${v.pattern}\n      ${v.line.slice(0, 200)}`)
        .join('\n')
      throw new Error(
        `Forbidden direct LLM provider calls outside the allowlist:\n${report}\n\n` +
          'Use callLlmSafely from server/services/safeLlmEgress.ts instead. ' +
          'If a new file legitimately requires direct provider access, document the exception and add it to the ALLOWLIST in this test.',
      )
    }
    expect(violations).toEqual([])
  })

  it('safeLlmEgress.ts is the only place that imports raw callLlm', () => {
    const offenders: string[] = []
    for (const root of SCAN_ROOTS) {
      const files = listTsFiles(root)
      for (const file of files) {
        const rel = relative(SERVER_ROOT, file)
        if (rel.endsWith('.test.ts')) continue
        if (ALLOWLIST.has(rel)) continue

        const text = readFileSync(file, 'utf8')
        // Match `import { callLlm } from '...llmProvider...'` style imports.
        if (/import\s*\{[^}]*\bcallLlm\b[^}]*\}\s*from\s*['"][^'"]*llmProvider/.test(text)) {
          offenders.push(rel)
        }
      }
    }
    expect(offenders, `Files importing raw callLlm: ${offenders.join(', ')}`).toEqual([])
  })

  it('only runAiFeature.ts and safeLlmEgress.ts call callLlmSafely directly', () => {
    const offenders: string[] = []
    const CALLSAFELY_ALLOWLIST = new Set([
      'services/safeLlmEgress.ts',
      'ai/runAiFeature.ts',
    ])
    for (const root of SCAN_ROOTS) {
      const files = listTsFiles(root)
      for (const file of files) {
        const rel = relative(SERVER_ROOT, file)
        if (rel.endsWith('.test.ts')) continue
        if (CALLSAFELY_ALLOWLIST.has(rel)) continue

        const text = readFileSync(file, 'utf8')
        const lines = text.split('\n')
        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue
          if (/\bcallLlmSafely\(/.test(line)) {
            offenders.push(`${rel}: ${trimmed.slice(0, 100)}`)
          }
        }
      }
    }
    expect(
      offenders,
      `Files calling callLlmSafely directly (should use runAiFeature instead):\n${offenders.join('\n')}`,
    ).toEqual([])
  })
})
