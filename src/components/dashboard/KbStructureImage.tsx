import { FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import type { StructureImageAttribution } from '../../utils/kb/wikimediaStructureImages'

type KbStructureImageProps = {
  attribution: StructureImageAttribution | null
  variant?: 'thumb' | 'detail'
  className?: string
}

export function KbStructureImage({ attribution, variant = 'thumb', className }: KbStructureImageProps) {
  const [failed, setFailed] = useState(false)
  const src =
    variant === 'detail'
      ? (attribution?.detailThumbUrl ?? attribution?.thumbUrl)
      : attribution?.thumbUrl

  if (!attribution || !src || failed) {
    return (
      <span
        className={`kb-structure-image kb-structure-image--placeholder kb-structure-image--${variant}${className ? ` ${className}` : ''}`}
        aria-hidden
      >
        <FlaskConical className="h-5 w-5" strokeWidth={1.5} />
      </span>
    )
  }

  return (
    <img
      src={src}
      alt=""
      loading={variant === 'detail' ? 'eager' : 'lazy'}
      className={`kb-structure-image kb-structure-image--${variant}${className ? ` ${className}` : ''}`}
      onError={() => setFailed(true)}
    />
  )
}

type KbStructureImageAttributionFooterProps = {
  attribution: StructureImageAttribution | null
  variant?: 'compact' | 'detail'
}

export function KbStructureImageAttributionFooter({
  attribution,
  variant = 'detail',
}: KbStructureImageAttributionFooterProps) {
  const { t } = useTranslation()

  if (!attribution) return null

  return (
    <section
      className={`kb-structure-attribution kb-structure-attribution--${variant}`}
      aria-label={t('kbPharmaStructureImageCreditLabel')}
    >
      <h3 className="kb-structure-attribution__title">{t('kbPharmaStructureImageCreditLabel')}</h3>
      <dl className="kb-structure-attribution__list">
        <div className="kb-structure-attribution__row">
          <dt>{t('kbPharmaStructureImageFileLabel')}</dt>
          <dd>
            <a href={attribution.commonsFileUrl} target="_blank" rel="noopener noreferrer">
              {attribution.fileName}
            </a>
          </dd>
        </div>
        {attribution.author ? (
          <div className="kb-structure-attribution__row">
            <dt>{t('kbPharmaStructureImageAuthorLabel')}</dt>
            <dd>{attribution.author}</dd>
          </div>
        ) : null}
        <div className="kb-structure-attribution__row">
          <dt>{t('kbPharmaStructureImageLicenseLabel')}</dt>
          <dd>{attribution.license}</dd>
        </div>
        <div className="kb-structure-attribution__row">
          <dt>{t('kbPharmaStructureImageSourceLabel')}</dt>
          <dd>
            <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">
              Wikimedia Commons
            </a>
          </dd>
        </div>
      </dl>
      <p className="kb-structure-attribution__disclaimer">{t('kbPharmaStructureImagesFooter')}</p>
    </section>
  )
}
