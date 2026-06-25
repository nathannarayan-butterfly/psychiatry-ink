import { useCallback } from 'react'
import { useTranslation } from '../../../../context/TranslationContext'
import type { UiTranslationKey } from '../../../../data/uiTranslations'
import type { OverviewQuickActionId } from '../../../../utils/overview/overviewQuickActions'
import { getGuidedEntrySchema } from '../../../../data/guidedEntry/schemas'
import { applyOverviewQuickActionSave } from '../../../../utils/overview/applyOverviewQuickActionSave'
import { showNotionToast } from '../../NotionToast'
import type { NotionPageId } from '../../notionPages'
import { OverviewQuickGuidedModal } from './OverviewQuickGuidedModal'
import { DictateVerlaufQuickModal } from './DictateVerlaufQuickModal'
import { MedicationChangeQuickModal } from './MedicationChangeQuickModal'
import { SideEffectQuickModal } from './SideEffectQuickModal'

const GUIDED_QUICK_ACTIONS = new Set<OverviewQuickActionId>([
  'newVerlaufNote',
  'psychopathFinding',
  'riskUpdate',
])

const GUIDED_ITEM_TYPE: Partial<Record<OverviewQuickActionId, Parameters<typeof getGuidedEntrySchema>[0]>> = {
  newVerlaufNote: 'verlauf-note-quick',
  psychopathFinding: 'psychopath-quick',
  riskUpdate: 'risk-update-quick',
}

const SAVE_TOAST: Partial<Record<OverviewQuickActionId, UiTranslationKey>> = {
  newVerlaufNote: 'overviewQuickVerlaufSaved',
  psychopathFinding: 'overviewQuickPsychopathSaved',
  riskUpdate: 'overviewQuickRiskSaved',
  dictateVisitNote: 'overviewQuickVerlaufSaved',
}

export interface OverviewQuickActionModalHostProps {
  activeAction: OverviewQuickActionId | null
  caseId: string
  userId?: string
  onClose: () => void
  onOpenWorkspacePage?: (pageId: NotionPageId, variantId?: string) => void
}

export function OverviewQuickActionModalHost({
  activeAction,
  caseId,
  userId,
  onClose,
  onOpenWorkspacePage,
}: OverviewQuickActionModalHostProps) {
  const { t, language } = useTranslation()

  const handleGuidedSave = useCallback(
    (itemType: Parameters<typeof getGuidedEntrySchema>[0]) =>
      (payload: { text: string; answers: Parameters<typeof applyOverviewQuickActionSave>[0]['answers']; instanceId: string }) => {
        const schema = getGuidedEntrySchema(itemType)
        applyOverviewQuickActionSave({
          caseId,
          schema,
          text: payload.text,
          answers: payload.answers,
          instanceId: payload.instanceId,
          userId,
          language,
        })
        const toastKey = Object.entries(GUIDED_ITEM_TYPE).find(([, type]) => type === itemType)?.[0] as
          | OverviewQuickActionId
          | undefined
        if (toastKey && SAVE_TOAST[toastKey]) {
          showNotionToast(t(SAVE_TOAST[toastKey]!))
        }
        onClose()
      },
    [caseId, language, onClose, t, userId],
  )

  if (!activeAction) return null

  if (activeAction === 'dictateVisitNote') {
    return (
      <DictateVerlaufQuickModal
        open
        caseId={caseId}
        onClose={onClose}
        onSaved={() => showNotionToast(t('overviewQuickVerlaufSaved'))}
      />
    )
  }

  if (activeAction === 'medicationChange') {
    return <MedicationChangeQuickModal open caseId={caseId} onClose={onClose} />
  }

  if (activeAction === 'sideEffectEntry') {
    return <SideEffectQuickModal open caseId={caseId} onClose={onClose} />
  }

  if (GUIDED_QUICK_ACTIONS.has(activeAction)) {
    const itemType = GUIDED_ITEM_TYPE[activeAction]
    if (!itemType) return null
    const schema = getGuidedEntrySchema(itemType)

    const hint =
      activeAction === 'psychopathFinding' && onOpenWorkspacePage ? (
        <>
          {t('overviewQuickPsychopathFullHint')}{' '}
          <button
            type="button"
            className="ov-quick-link"
            onClick={() => {
              onClose()
              onOpenWorkspacePage('psychopath', 'checklist')
            }}
          >
            {t('overviewQuickPsychopathFullLink')}
          </button>
        </>
      ) : undefined

    return (
      <OverviewQuickGuidedModal
        open
        caseId={caseId}
        schema={schema}
        userId={userId}
        hint={hint}
        onClose={onClose}
        onSave={handleGuidedSave(itemType)}
      />
    )
  }

  return null
}
