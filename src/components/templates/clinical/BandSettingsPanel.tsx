import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import type {
  BandImageAlign,
  DocumentBand,
  DocumentPageSettings,
} from '../../../types/clinicalTemplate'
import {
  appendBandInline,
  appendBandToken,
  BAND_TOKENS,
  DEFAULT_BAND_IMAGE_HEIGHT,
  PAGE_NUMBER_TOKENS,
} from '../../../utils/clinicalTemplate/documentBand'
import { RichTextField } from '../RichTextField'

interface BandSettingsPanelProps {
  position: 'header' | 'footer'
  /** Primary band — shown on every page, or on pages 2+ when a distinct first page is set. */
  band: DocumentBand | undefined
  /** Distinct first-page band, used when `pageSettings.differentFirstPage`. */
  bandFirst: DocumentBand | undefined
  pageSettings: DocumentPageSettings
  onPatchBand: (patch: Partial<DocumentBand>) => void
  onPatchBandFirst: (patch: Partial<DocumentBand>) => void
  onPatchPageSettings: (patch: Partial<DocumentPageSettings>) => void
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const MAX_IMAGE_DIMENSION = 700

/** Read a picked image file, downscale large ones, and return a base64 data URL. */
async function fileToConstrainedDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('read_failed'))
    reader.readAsDataURL(file)
  })
  if (file.type === 'image/svg+xml') return dataUrl
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('decode_failed'))
    el.src = dataUrl
  })
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height))
  if (scale >= 1) return dataUrl
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
  return canvas.toDataURL(type, 0.92)
}

export function BandSettingsPanel({
  position,
  band,
  bandFirst,
  pageSettings,
  onPatchBand,
  onPatchBandFirst,
  onPatchPageSettings,
}: BandSettingsPanelProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [variant, setVariant] = useState<'primary' | 'first'>('primary')

  const distinctFirst = pageSettings.display === 'all-pages' && pageSettings.differentFirstPage
  const activeVariant = distinctFirst ? variant : 'primary'
  const activeBand = activeVariant === 'first' ? bandFirst : band
  const onPatch = activeVariant === 'first' ? onPatchBandFirst : onPatchBand

  const html = activeBand?.html ?? ''
  const divider = activeBand?.divider ?? true
  const imageUrl = activeBand?.imageUrl
  const imageHeight = activeBand?.imageHeight ?? DEFAULT_BAND_IMAGE_HEIGHT
  const imageAlign = activeBand?.imageAlign ?? 'left'

  const title = position === 'header' ? t('vorlageHeaderTitle') : t('vorlageFooterTitle')

  const handleFile = async (file: File | null) => {
    setImageError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageError(t('vorlageBandImageInvalid'))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(t('vorlageBandImageTooLarge'))
      return
    }
    try {
      const url = await fileToConstrainedDataUrl(file)
      onPatch({ imageUrl: url })
    } catch {
      setImageError(t('vorlageBandImageInvalid'))
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <aside className="ct-settings" aria-label={title}>
      <div className="ct-settings__head">{title}</div>
      <div className="ct-settings__scroll">
        <p className="ct-settings__note">{t('vorlageBandHint')}</p>

        {distinctFirst ? (
          <div className="ct-band-variant" role="tablist" aria-label={t('vorlageBandVariantLabel')}>
            <button
              type="button"
              role="tab"
              aria-selected={variant === 'first'}
              className={`ct-band-variant__tab${variant === 'first' ? ' ct-band-variant__tab--active' : ''}`}
              onClick={() => setVariant('first')}
            >
              {t('vorlageBandVariantFirst')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={variant === 'primary'}
              className={`ct-band-variant__tab${variant === 'primary' ? ' ct-band-variant__tab--active' : ''}`}
              onClick={() => setVariant('primary')}
            >
              {t('vorlageBandVariantRest')}
            </button>
          </div>
        ) : null}

        <label className="ct-settings__field">
          <span className="ct-settings__field-label">{t('vorlageBandContent')}</span>
          <div className="ct-settings__rte">
            <RichTextField
              value={html}
              onChange={(next) => onPatch({ html: next })}
              minHeight="8rem"
              placeholder={position === 'header' ? t('vorlageHeaderPlaceholder') : t('vorlageFooterPlaceholder')}
              ariaLabel={t('vorlageBandContent')}
            />
          </div>
        </label>

        {/* Logo / image */}
        <div className="ct-settings__field-label">{t('vorlageBandImageLabel')}</div>
        {imageUrl ? (
          <div className="ct-band-image-edit">
            <img src={imageUrl} alt="" className="ct-band-image-edit__preview" style={{ height: `${imageHeight}px` }} />
            <div className="ct-band-image-edit__actions">
              <button type="button" className="ct-btn ct-btn--xs" onClick={() => fileInputRef.current?.click()}>
                {t('vorlageBandImageReplace')}
              </button>
              <button
                type="button"
                className="ct-btn ct-btn--xs"
                onClick={() => onPatch({ imageUrl: undefined })}
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.75} aria-hidden /> {t('vorlageBandImageRemove')}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="ct-band-image-add" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {t('vorlageBandImageAdd')}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
          className="ct-visually-hidden"
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        />
        {imageError ? <p className="ct-error">{imageError}</p> : null}
        {imageUrl ? (
          <>
            <label className="ct-settings__field">
              <span className="ct-settings__field-label">
                {t('vorlageBandImageHeight')} ({imageHeight}px)
              </span>
              <input
                type="range"
                min={20}
                max={200}
                step={2}
                value={imageHeight}
                onChange={(e) => onPatch({ imageHeight: Number(e.target.value) })}
              />
            </label>
            <label className="ct-settings__field">
              <span className="ct-settings__field-label">{t('vorlageBandImageAlign')}</span>
              <select
                className="ct-input"
                value={imageAlign}
                onChange={(e) => onPatch({ imageAlign: e.target.value as BandImageAlign })}
              >
                <option value="left">{t('vorlageAlignLeft')}</option>
                <option value="center">{t('vorlageAlignCenter')}</option>
                <option value="right">{t('vorlageAlignRight')}</option>
              </select>
            </label>
          </>
        ) : null}

        {/* Placeholder tokens */}
        <div className="ct-settings__field-label">{t('vorlageBandInsert')}</div>
        <div className="ct-band-tokens">
          {BAND_TOKENS.map((tk) => (
            <button
              key={tk.token}
              type="button"
              className="ct-band-token"
              title={`{{${tk.token}}}`}
              onClick={() => onPatch({ html: appendBandToken(html, tk.token) })}
            >
              {t(tk.labelKey)}
            </button>
          ))}
        </div>

        {/* Page number tokens */}
        <div className="ct-settings__field-label">{t('vorlageBandPageNumber')}</div>
        <div className="ct-band-tokens">
          {PAGE_NUMBER_TOKENS.map((tk) => (
            <button
              key={tk.token}
              type="button"
              className="ct-band-token"
              title={`{{${tk.token}}}`}
              onClick={() => onPatch({ html: appendBandToken(html, tk.token) })}
            >
              {t(tk.labelKey)}
            </button>
          ))}
          <button
            type="button"
            className="ct-band-token"
            title="{{page}} / {{pages}}"
            onClick={() => onPatch({ html: appendBandInline(html, '{{page}} / {{pages}}') })}
          >
            {t('vorlageBandPageOfTotal')}
          </button>
        </div>
        <p className="ct-settings__note">{t('vorlageBandPageNumberHint')}</p>

        {/* Band height */}
        <label className="ct-settings__field">
          <span className="ct-settings__field-label">{t('vorlageBandHeight')}</span>
          <div className="ct-band-height">
            <input
              type="number"
              className="ct-input"
              min={0}
              max={400}
              step={4}
              value={activeBand?.height ?? ''}
              placeholder={t('vorlageBandHeightAuto')}
              onChange={(e) => {
                const v = e.target.value.trim()
                onPatch({ height: v === '' ? undefined : Math.max(0, Number(v)) })
              }}
            />
            <span className="ct-band-height__unit">px</span>
            {activeBand?.height ? (
              <button type="button" className="ct-btn ct-btn--xs" onClick={() => onPatch({ height: undefined })}>
                {t('vorlageBandHeightAuto')}
              </button>
            ) : null}
          </div>
        </label>

        <label className="ct-settings__toggle">
          <input type="checkbox" checked={divider} onChange={(e) => onPatch({ divider: e.target.checked })} />
          <span>{t('vorlageBandDivider')}</span>
        </label>

        {/* Document-level page options */}
        <div className="ct-settings__section">
          <div className="ct-settings__field-label">{t('vorlagePageOptionsTitle')}</div>
          <label className="ct-settings__field">
            <span className="ct-settings__field-label">{t('vorlagePageDisplayLabel')}</span>
            <select
              className="ct-input"
              value={pageSettings.display}
              onChange={(e) =>
                onPatchPageSettings({ display: e.target.value as DocumentPageSettings['display'] })
              }
            >
              <option value="all-pages">{t('vorlagePageDisplayAll')}</option>
              <option value="first-page-only">{t('vorlagePageDisplayFirstOnly')}</option>
            </select>
          </label>
          <label
            className={`ct-settings__toggle${pageSettings.display === 'first-page-only' ? ' ct-settings__toggle--disabled' : ''}`}
          >
            <input
              type="checkbox"
              checked={distinctFirst}
              disabled={pageSettings.display === 'first-page-only'}
              onChange={(e) => onPatchPageSettings({ differentFirstPage: e.target.checked })}
            />
            <span>{t('vorlagePageDifferentFirst')}</span>
          </label>
          <p className="ct-settings__note">
            {pageSettings.display === 'first-page-only'
              ? t('vorlagePageFirstOnlyHint')
              : distinctFirst
                ? t('vorlagePageDifferentFirstHint')
                : t('vorlagePageAllHint')}
          </p>
        </div>
      </div>
    </aside>
  )
}
