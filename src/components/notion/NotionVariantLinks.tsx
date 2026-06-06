import { useTranslation } from '../../context/TranslationContext'

export interface NotionVariantOption {
  id: string
  label: string
}

interface NotionVariantLinksProps {
  variants: NotionVariantOption[]
  activeVariantId: string
  disabled?: boolean
  onSelect: (variantId: string) => void
}

export function NotionVariantLinks({
  variants,
  activeVariantId,
  disabled = false,
  onSelect,
}: NotionVariantLinksProps) {
  const { t } = useTranslation()

  if (variants.length < 2) return null

  return (
    <div
      className="notion-paper__variant-links"
      role="group"
      aria-label={t('componentVariant')}
    >
      {variants.map((variant, index) => (
        <span key={variant.id} className="notion-paper__variant-links-item">
          {index > 0 ? (
            <span className="notion-paper__variant-links-sep" aria-hidden>
              ·
            </span>
          ) : null}
          <button
            type="button"
            disabled={disabled}
            aria-pressed={variant.id === activeVariantId}
            className={`notion-paper__variant-link ${
              variant.id === activeVariantId ? 'notion-paper__variant-link--active' : ''
            }`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(variant.id)}
          >
            {variant.label}
          </button>
        </span>
      ))}
    </div>
  )
}
