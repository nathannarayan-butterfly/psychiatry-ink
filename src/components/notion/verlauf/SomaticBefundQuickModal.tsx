import { useCallback } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import { getGuidedEntrySchema } from '../../../data/guidedEntry/schemas'
import { saveSomaticBefundEntry } from '../../../utils/verlauf/saveSomaticBefundEntry'
import { OverviewQuickGuidedModal } from '../overview/quickActions/OverviewQuickGuidedModal'

export interface SomaticBefundQuickModalProps {
  open: boolean
  caseId: string
  userId?: string
  onClose: () => void
  onSaved: () => void
  onOpenFullBefund?: () => void
}

export function SomaticBefundQuickModal({
  open,
  caseId,
  userId,
  onClose,
  onSaved,
  onOpenFullBefund,
}: SomaticBefundQuickModalProps) {
  const { t, language } = useTranslation()
  const schema = getGuidedEntrySchema('somatic-befund-quick')

  const handleSave = useCallback(
    (payload: {
      text: string
      answers: import('../../../types/guidedEntry').GuidedEntryAnswer[]
      instanceId: string
    }) => {
      saveSomaticBefundEntry({
        caseId,
        text: payload.text,
        answers: payload.answers,
        instanceId: payload.instanceId,
        userId,
        language,
      })
      onSaved()
      onClose()
    },
    [caseId, language, onClose, onSaved, userId],
  )

  const hint =
    onOpenFullBefund ? (
      <>
        {t('verlaufSomaticBefundFullHint')}{' '}
        <button
          type="button"
          className="ov-quick-link"
          onClick={() => {
            onClose()
            onOpenFullBefund()
          }}
        >
          {t('verlaufSomaticBefundFullLink')}
        </button>
      </>
    ) : undefined

  return (
    <OverviewQuickGuidedModal
      open={open}
      caseId={caseId}
      schema={schema}
      userId={userId}
      hint={hint}
      onClose={onClose}
      onSave={handleSave}
    />
  )
}
