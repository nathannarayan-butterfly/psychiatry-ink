import { Check, RefreshCw, Wand2, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { IconButton } from '../IconButton'

interface NotionGenerationReviewProps {
  isGenerating: boolean
  onRewrite: () => void
  onRegenerate: () => void
  onAccept: () => void
  onReject: () => void
}

export function NotionGenerationReview({
  isGenerating,
  onRewrite,
  onRegenerate,
  onAccept,
  onReject,
}: NotionGenerationReviewProps) {
  const { t } = useTranslation()

  return (
    <div className="notion-generation-review" role="status">
      <p className="notion-generation-review__hint">{t('generationReviewHint')}</p>
      <div className="notion-generation-review__actions">
        <IconButton
          bordered
          icon={<Wand2 strokeWidth={1.5} />}
          label={t('rewrite')}
          onClick={onRewrite}
          disabled={isGenerating}
        />
        <IconButton
          bordered
          icon={<RefreshCw strokeWidth={1.5} />}
          label={t('regenerate')}
          onClick={onRegenerate}
          disabled={isGenerating}
        />
        <IconButton
          bordered
          icon={<Check strokeWidth={1.5} />}
          label={t('acceptGeneration')}
          onClick={onAccept}
          disabled={isGenerating}
          className="!border-accent"
        />
        <IconButton
          bordered
          icon={<X strokeWidth={1.5} />}
          label={t('rejectGeneration')}
          onClick={onReject}
          disabled={isGenerating}
        />
      </div>
    </div>
  )
}
