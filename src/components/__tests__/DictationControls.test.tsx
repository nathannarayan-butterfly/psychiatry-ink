import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TranslationProvider } from '../../context/TranslationContext'
import { DictationControls } from '../DictationControls'

/**
 * P1-2 — the dictation controls must surface a patient-consent reminder
 * whenever they are mounted. Server-side rendering snapshot is sufficient:
 * the banner must appear in the markup regardless of phase.
 */

function renderControls(
  props: Partial<ComponentProps<typeof DictationControls>> = {},
): string {
  return renderToStaticMarkup(
    <TranslationProvider language="de" englishVariant="uk">
      <DictationControls
        phase={props.phase ?? 'idle'}
        durationMs={props.durationMs ?? 0}
        isPlayingBack={props.isPlayingBack ?? false}
        onPause={() => {}}
        onResume={() => {}}
        onStop={() => {}}
        onTogglePlayback={() => {}}
        onDiscard={() => {}}
        onTranscribe={() => {}}
      />
    </TranslationProvider>,
  )
}

describe('DictationControls — patient consent banner (P1-2)', () => {
  it('renders the German consent reminder regardless of phase', () => {
    for (const phase of ['idle', 'recording', 'paused', 'review', 'transcribing'] as const) {
      const html = renderControls({ phase })
      expect(html).toContain('Aufzeichnung und Transkription nur mit Einwilligung')
    }
  })

  it('renders the English reminder when language is en', () => {
    const html = renderToStaticMarkup(
      <TranslationProvider language="en" englishVariant="uk">
        <DictationControls
          phase="recording"
          durationMs={0}
          isPlayingBack={false}
          onPause={() => {}}
          onResume={() => {}}
          onStop={() => {}}
          onTogglePlayback={() => {}}
          onDiscard={() => {}}
          onTranscribe={() => {}}
        />
      </TranslationProvider>,
    )
    expect(html).toContain('Recording and transcription only with patient consent.')
  })
})
