import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiJobPhase } from '../../../../shared/aiJobs'

const runAiFeature = vi.fn()

vi.mock('../../../ai/runAiFeature', () => ({
  runAiFeature: (...args: unknown[]) => runAiFeature(...args),
  InsufficientCreditsError: class extends Error {},
  CreditInfrastructureError: class extends Error {},
}))

import {
  normalizeInputText,
  PipelineCancelledError,
  runSummarizePipeline,
  CHUNK_PIPELINE_THRESHOLD_TOKENS,
} from '../summarizePipeline'

function llmResult(text: string, overrides: Record<string, unknown> = {}) {
  return {
    text,
    provider: 'openai',
    model: 'gpt-5.4',
    usage: {
      inputTokens: 100,
      cachedInputTokens: 0,
      cacheMissInputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      audioMinutes: null,
      usageSource: 'provider',
      rawUsageJson: null,
    },
    requestId: null,
    latencyMs: 10,
    truncated: false,
    ...overrides,
  }
}

const usageContext = { userId: 'user-1', featureKey: 'document_generation' as const }

function callbacks() {
  const phases: AiJobPhase[] = []
  const progress: Array<[number | undefined, number | undefined]> = []
  return {
    phases,
    progress,
    cb: {
      onPhase: async (phase: AiJobPhase, cur?: number, total?: number) => {
        phases.push(phase)
        progress.push([cur, total])
      },
      isCancelled: async () => false,
    },
  }
}

beforeEach(() => {
  runAiFeature.mockReset()
})

describe('normalizeInputText', () => {
  it('normalizes line endings, soft hyphens, and PDF hard wraps', () => {
    expect(normalizeInputText('a\r\nb\rc')).toBe('a\nb\nc')
    expect(normalizeInputText('Medika­tion')).toBe('Medikation')
    expect(normalizeInputText('Medika-\ntion weiter')).toBe('Medikation weiter')
    expect(normalizeInputText('a\n\n\n\n\n\nb')).toBe('a\n\n\nb')
  })
})

describe('runSummarizePipeline', () => {
  it('short input: single synthesis call on the requested tier, no map stage', async () => {
    runAiFeature.mockResolvedValueOnce(llmResult('Zusammenfassung.'))
    const { cb, phases } = callbacks()

    const output = await runSummarizePipeline(
      {
        inputText: 'Kurzer Verlauf. Patient stabil.',
        params: { tier: 'thorough', language: 'de' },
        featureKey: 'short_verlauf',
        usageContext,
        caseRef: null,
      },
      cb,
    )

    expect(runAiFeature).toHaveBeenCalledTimes(1)
    const call = runAiFeature.mock.calls[0][0]
    expect(call.tier).toBe('thorough')
    expect(call.featureKey).toBe('short_verlauf')
    expect(output.text).toBe('Zusammenfassung.')
    expect(output.meta.chunkCount).toBe(1)
    expect(output.meta.tierUsed).toBe('thorough')
    expect(phases).toEqual(['analyzing', 'synthesizing'])
  })

  it('long input: fast-tier map per chunk with real progress, then synthesis', async () => {
    // > CHUNK_PIPELINE_THRESHOLD_TOKENS estimated tokens (4 chars/token).
    const paragraph = `${'Befund und Verlauf dokumentiert. '.repeat(60)}\n\n`
    const longText = paragraph.repeat(
      Math.ceil((CHUNK_PIPELINE_THRESHOLD_TOKENS * 4 * 1.4) / paragraph.length),
    )
    runAiFeature.mockResolvedValue(llmResult('Notizen bzw. Ergebnis.'))
    const { cb, phases, progress } = callbacks()

    const output = await runSummarizePipeline(
      {
        inputText: longText,
        params: { tier: 'thorough', language: 'de' },
        featureKey: 'full_case_summary',
        usageContext,
        caseRef: 'case-1',
      },
      cb,
    )

    expect(output.meta.chunkCount).toBeGreaterThan(1)
    // Map calls run on the cheap tier; the final call on the requested tier.
    const calls = runAiFeature.mock.calls.map((c) => c[0])
    const mapCalls = calls.slice(0, -1)
    const synthesisCall = calls[calls.length - 1]
    expect(mapCalls.length).toBe(output.meta.chunkCount)
    for (const call of mapCalls) expect(call.tier).toBe('fast')
    expect(synthesisCall.tier).toBe('thorough')

    expect(phases[0]).toBe('analyzing')
    expect(phases).toContain('summarizing')
    expect(phases[phases.length - 1]).toBe('synthesizing')
    // Progress reaches chunkCount/chunkCount before synthesis.
    const lastSummarizing = progress.filter(([, total]) => total !== undefined).pop()
    expect(lastSummarizing?.[0]).toBe(output.meta.chunkCount)
  })

  it('runs one automatic compression pass when the hard limit is exceeded', async () => {
    const overlong = Array.from({ length: 120 }, (_, i) => `wort${i}`).join(' ')
    const compressed = Array.from({ length: 45 }, (_, i) => `wort${i}`).join(' ')
    runAiFeature
      .mockResolvedValueOnce(llmResult(overlong))
      .mockResolvedValueOnce(llmResult(compressed))
    const { cb, phases } = callbacks()

    const output = await runSummarizePipeline(
      {
        inputText: 'Text.',
        params: {
          tier: 'standard',
          language: 'de',
          length: { mode: 'custom', customTargetWords: 50 },
        },
        featureKey: 'document_generation',
        usageContext,
        caseRef: null,
      },
      cb,
    )

    expect(runAiFeature).toHaveBeenCalledTimes(2)
    expect(output.text).toBe(compressed)
    expect(output.meta.compressionRuns).toBe(1)
    expect(output.meta.compressionPassed).toBe(true)
    expect(output.meta.words).toBe(45)
    expect(phases).toContain('compressing')
  })

  it('keeps the original text when compression comes back longer', async () => {
    const overlong = Array.from({ length: 120 }, (_, i) => `wort${i}`).join(' ')
    const worse = Array.from({ length: 200 }, (_, i) => `wort${i}`).join(' ')
    runAiFeature
      .mockResolvedValueOnce(llmResult(overlong))
      .mockResolvedValueOnce(llmResult(worse))
    const { cb } = callbacks()

    const output = await runSummarizePipeline(
      {
        inputText: 'Text.',
        params: {
          tier: 'standard',
          language: 'de',
          length: { mode: 'custom', customTargetWords: 50 },
        },
        featureKey: 'document_generation',
        usageContext,
        caseRef: null,
      },
      cb,
    )

    expect(output.text).toBe(overlong)
    expect(output.meta.compressionPassed).toBe(false)
  })

  it('passes the word budget into the synthesis prompt', async () => {
    runAiFeature.mockResolvedValueOnce(llmResult('Ok.'))
    const { cb } = callbacks()

    await runSummarizePipeline(
      {
        inputText: 'Text.',
        params: {
          tier: 'thorough',
          language: 'de',
          length: { mode: 'custom', customTargetWords: 1500 },
          directions: 'nur klinisch relevante Punkte',
        },
        featureKey: 'document_generation',
        usageContext,
        caseRef: null,
      },
      cb,
    )

    const call = runAiFeature.mock.calls[0][0]
    expect(call.userPrompt).toContain('1500')
    expect(call.userPrompt).toContain('1695')
    expect(call.userPrompt).toContain('nur klinisch relevante Punkte')
  })

  it('uses the structured clinical skeleton when params.structured is set', async () => {
    runAiFeature.mockResolvedValueOnce(llmResult('Ok.'))
    const { cb } = callbacks()

    await runSummarizePipeline(
      {
        inputText: 'Verlaufstext.',
        params: { tier: 'thorough', language: 'de', structured: true },
        featureKey: 'short_verlauf',
        usageContext,
        caseRef: null,
      },
      cb,
    )

    const call = runAiFeature.mock.calls[0][0]
    for (const heading of [
      'Aufnahmeanlass / Ausgangsbefund',
      'Relevanter Verlauf',
      'Diagnostik / Konsile',
      'Medikation / Verträglichkeit',
      'Risiken / besondere Ereignisse',
      'Aktueller Zustand',
      'Empfehlungen / offene Punkte',
    ]) {
      expect(call.userPrompt).toContain(heading)
    }
    expect(call.userPrompt).toMatch(/never repeat a fact/i)
  })

  it('honours cancellation between stages without calling the LLM', async () => {
    runAiFeature.mockResolvedValue(llmResult('Ok.'))
    await expect(
      runSummarizePipeline(
        {
          inputText: 'Text.',
          params: { tier: 'standard', language: 'de' },
          featureKey: 'document_generation',
          usageContext,
          caseRef: null,
        },
        {
          onPhase: async () => undefined,
          isCancelled: async () => true,
        },
      ),
    ).rejects.toThrow(PipelineCancelledError)
    expect(runAiFeature).not.toHaveBeenCalled()
  })

  it('routes Maximum opt-in as a thorough-tier model override', async () => {
    runAiFeature.mockResolvedValueOnce(llmResult('Ok.', { model: 'gpt-5.5' }))
    const { cb } = callbacks()

    const output = await runSummarizePipeline(
      {
        inputText: 'Text.',
        params: { tier: 'thorough', maximum: true, language: 'de' },
        featureKey: 'document_generation',
        usageContext,
        caseRef: null,
      },
      cb,
    )

    const call = runAiFeature.mock.calls[0][0]
    expect(call.tier).toBe('thorough')
    expect(call.model?.provider).toBe('openai')
    expect(output.meta.model).toBe('gpt-5.5')
  })
})
