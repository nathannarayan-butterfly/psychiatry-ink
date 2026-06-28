import { useMemo, useState } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import { GuidedEntryWizard } from '../../guidedEntry/GuidedEntryWizard'
import { getGuidedEntrySchema } from '../../../data/guidedEntry/schemas'
import type { GuidedEntryItemType } from '../../../types/guidedEntry'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import type { DokumentCategory } from '../../../utils/dokumenteArchive'
import { StandaloneResultPanel } from './StandaloneResultPanel'

interface BefundMeta {
  titleKey: UiTranslationKey
  kind: string
  category: DokumentCategory
}

/**
 * Title / note-kind / archive-category for each guided itemType the standalone
 * Befund widget supports. All are findings, so they file under
 * `untersuchungsbefunde`.
 */
const BEFUND_META: Partial<Record<GuidedEntryItemType, BefundMeta>> = {
  'anamnese-somatic-befund': {
    titleKey: 'standaloneBefundSomaticTitle',
    kind: 'somatic-befund',
    category: 'untersuchungsbefunde',
  },
  'anamnese-neuro-befund': {
    titleKey: 'standaloneBefundNeuroTitle',
    kind: 'neuro-befund',
    category: 'untersuchungsbefunde',
  },
  'psychopath-finding': {
    titleKey: 'standaloneBefundPsychopathTitle',
    kind: 'psychopath-befund',
    category: 'untersuchungsbefunde',
  },
  'vitalwerte-quick': {
    titleKey: 'standaloneBefundVitalsTitle',
    kind: 'vitals',
    category: 'untersuchungsbefunde',
  },
  'befund-ecg': {
    titleKey: 'standaloneBefundEcgTitle',
    kind: 'ecg-befund',
    category: 'untersuchungsbefunde',
  },
}

interface StandaloneBefundWidgetProps {
  itemType: GuidedEntryItemType
  /** Storage id of the (default) case the resulting note is saved under. */
  caseId: string
  onClose: () => void
}

/**
 * Patient-less guided Befund widget. Runs the existing `GuidedEntryWizard` for
 * the requested schema; when the clinician generates the narrative the text is
 * captured locally and handed to {@link StandaloneResultPanel} to edit / copy /
 * save as a standalone note. Unlike the patient-bound guided flow it never
 * calls `applyGuidedOutput`, so nothing is written into a caseId section.
 */
export function StandaloneBefundWidget({ itemType, caseId, onClose }: StandaloneBefundWidgetProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => getGuidedEntrySchema(itemType), [itemType])
  const meta = BEFUND_META[itemType]
  const [phase, setPhase] = useState<'wizard' | 'result'>('wizard')
  const [text, setText] = useState('')

  const title = meta ? t(meta.titleKey) : t(schema.titleKey as UiTranslationKey)
  const noteKind = meta?.kind ?? `befund-${itemType}`
  const category = meta?.category ?? 'untersuchungsbefunde'

  if (phase === 'result') {
    return (
      <StandaloneResultPanel
        caseId={caseId}
        title={title}
        noteKind={noteKind}
        noteCategory={category}
        text={text}
        onTextChange={setText}
        onClose={onClose}
      />
    )
  }

  return (
    <GuidedEntryWizard
      open
      schema={schema}
      caseId={caseId}
      onSaveDraft={() => undefined}
      onGenerate={(payload) => {
        setText(payload.text)
        setPhase('result')
      }}
      onCancel={onClose}
    />
  )
}
