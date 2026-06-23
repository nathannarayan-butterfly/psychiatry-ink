import { useTranslation } from '../../../context/TranslationContext'
import type { DocumentBand as DocumentBandModel } from '../../../types/clinicalTemplate'
import type { ResolvedClinicalData } from '../../../utils/clinicalTemplate/clinicalData'
import {
  DEFAULT_BAND_IMAGE_HEIGHT,
  isBandEmpty,
  resolveBandHtml,
  type PageContext,
} from '../../../utils/clinicalTemplate/documentBand'

type BandPosition = 'header' | 'footer'

interface DocumentBandProps {
  position: BandPosition
  band: DocumentBandModel | undefined
  data: ResolvedClinicalData
  /** 'edit' = clickable band on the canvas; 'render' = preview/print output. */
  mode: 'edit' | 'render'
  selected?: boolean
  onSelect?: () => void
  /** Page numbers used to resolve `{{page}}` / `{{pages}}`. Defaults to 1 / 1. */
  pageCtx?: PageContext
}

export function DocumentBand({ position, band, data, mode, selected, onSelect, pageCtx }: DocumentBandProps) {
  const { t } = useTranslation()
  const empty = isBandEmpty(band)
  const divider = band?.divider ?? true

  if (mode === 'render' && empty) return null

  const classes = [
    'ct-doc__band',
    `ct-doc__band--${position}`,
    divider ? 'ct-doc__band--divider' : '',
    mode === 'edit' ? 'ct-doc__band--editable' : '',
    selected ? 'ct-doc__band--selected' : '',
    empty ? 'ct-doc__band--empty' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const style = band?.height ? { minHeight: `${band.height}px` } : undefined

  const image = band?.imageUrl ? (
    <div className={`ct-doc__band-image ct-doc__band-image--${band.imageAlign ?? 'left'}`}>
      <img
        src={band.imageUrl}
        alt=""
        style={{ height: `${band.imageHeight ?? DEFAULT_BAND_IMAGE_HEIGHT}px` }}
      />
    </div>
  ) : null

  const text = band?.html?.trim() ? resolveBandHtml(band.html, data, pageCtx) : ''

  const content =
    !empty && band ? (
      <>
        {image}
        {text ? <div className="ct-doc__band-content" dangerouslySetInnerHTML={{ __html: text }} /> : null}
      </>
    ) : (
      <span className="ct-doc__band-placeholder">
        {position === 'header' ? t('vorlageHeaderPlaceholder') : t('vorlageFooterPlaceholder')}
      </span>
    )

  if (mode === 'edit') {
    return (
      <button
        type="button"
        className={classes}
        style={style}
        aria-label={position === 'header' ? t('vorlageHeaderTitle') : t('vorlageFooterTitle')}
        aria-pressed={selected}
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.()
        }}
      >
        {content}
      </button>
    )
  }

  return <div className={classes} style={style}>{content}</div>
}
