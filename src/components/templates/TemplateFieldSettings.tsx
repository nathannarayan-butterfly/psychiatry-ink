import { useTranslation } from '../../context/TranslationContext'
import type { DocumentTemplate, TemplateField } from '../../types/documentTemplate'
import {
  colSpanToWidth,
  resolveFieldColSpan,
  widthToColSpan,
} from '../../utils/documentTemplate/fieldLayout'
import {
  DYNAMIC_FIELD_CATALOG,
  getDynamicFieldDefinition,
  isPatientDynamicKey,
} from '../../data/documentTemplate/dynamicFields'
import { PLACEHOLDER_BINDINGS } from '../../utils/documentTemplate/constants'
import { RichTextField } from './RichTextField'

interface TemplateFieldSettingsProps {
  field: TemplateField
  lang: 'de' | 'en'
  onPatch: (patch: Partial<TemplateField>) => void
}

export function TemplateFieldSettings({ field, lang, onPatch }: TemplateFieldSettingsProps) {
  const { t } = useTranslation()

  if (field.type === 'divider' || field.type === 'spacer') {
    return (
      <div className="dt-settings-panel">
        <h3 className="dt-dashboard__settings-title">{t('templateFieldSettings')}</h3>
        {field.type === 'spacer' ? (
          <label className="dt-field-label">
            {t('templateSpacerHeight')}
            <input
              className="dt-input"
              type="number"
              min={2}
              max={40}
              value={Number(field.defaultValue) || 4}
              onChange={(e) => onPatch({ defaultValue: e.target.value })}
            />
          </label>
        ) : (
          <p className="dt-field-help">{t('templateDividerHelp')}</p>
        )}
      </div>
    )
  }

  return (
    <div className="dt-settings-panel">
      <h3 className="dt-dashboard__settings-title">{t('templateFieldSettings')}</h3>

      {field.type !== 'heading' && field.type !== 'static_text' ? (
        <label className="dt-field-label">
          {t('templateFieldLabel')}
          <input
            className="dt-input"
            value={field.label ?? ''}
            onChange={(e) => onPatch({ label: e.target.value })}
          />
        </label>
      ) : null}

      {field.type === 'heading' ? (
        <label className="dt-field-label">
          {t('templateHeadingText')}
          <input
            className="dt-input"
            value={field.label ?? ''}
            onChange={(e) => onPatch({ label: e.target.value, defaultValue: e.target.value })}
          />
        </label>
      ) : null}

      {field.type === 'static_text' ? (
        <label className="dt-field-label">
          {t('templateStaticText')}
          <RichTextField
            value={(field.defaultValue as string | undefined) ?? ''}
            onChange={(html) => onPatch({ defaultValue: html })}
            minHeight="6rem"
            ariaLabel={t('templateStaticText')}
          />
        </label>
      ) : null}

      {field.type.includes('placeholder') ? (
        <label className="dt-field-label">
          {t('templateBindingLabel')}
          <select
            className="dt-select"
            value={field.binding ?? ''}
            onChange={(e) => onPatch({ binding: e.target.value })}
          >
            {PLACEHOLDER_BINDINGS.map((b) => (
              <option key={b.value} value={b.value}>
                {lang === 'de' ? b.labelDe : b.labelEn}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {field.type === 'dynamic' ? (
        <>
          <label className="dt-field-label">
            {t('templateDynamicFieldLabel')}
            <select
              className="dt-select"
              value={field.dynamicKey ?? ''}
              onChange={(e) => {
                const nextKey = e.target.value
                if (!isPatientDynamicKey(nextKey)) return
                const def = getDynamicFieldDefinition(nextKey)
                onPatch({
                  dynamicKey: nextKey,
                  label: def ? t(def.labelKey) : field.label,
                })
              }}
            >
              {DYNAMIC_FIELD_CATALOG.map((def) => (
                <option key={def.key} value={def.key}>
                  {t(def.labelKey)}
                </option>
              ))}
            </select>
          </label>
          {field.dynamicKey ? (
            <p className="dt-field-help">
              {getDynamicFieldDefinition(field.dynamicKey)
                ? t(getDynamicFieldDefinition(field.dynamicKey)!.descriptionKey)
                : null}
            </p>
          ) : null}
        </>
      ) : null}

      {(field.type === 'select' || field.type === 'multi_select' || field.type === 'radio_group') ? (
        <div className="dt-field-label">
          {t('templateOptionsLabel')}
          {field.options?.map((opt, idx) => (
            <input
              key={opt.id}
              className="dt-input"
              value={opt.label}
              onChange={(e) => {
                const options = [...(field.options ?? [])]
                options[idx] = { ...opt, label: e.target.value }
                onPatch({ options })
              }}
            />
          ))}
          <button
            type="button"
            className="dt-btn dt-btn--xs"
            onClick={() =>
              onPatch({
                options: [
                  ...(field.options ?? []),
                  { id: crypto.randomUUID(), label: `Option ${(field.options?.length ?? 0) + 1}` },
                ],
              })
            }
          >
            + Option
          </button>
        </div>
      ) : null}

      {field.type === 'number_with_unit' ? (
        <label className="dt-field-label">
          {t('templateUnitLabel')}
          <input
            className="dt-input"
            value={field.unit ?? ''}
            onChange={(e) => onPatch({ unit: e.target.value })}
            placeholder="EUR, mg, %"
          />
        </label>
      ) : null}

      {field.type !== 'heading' && field.type !== 'static_text' ? (
        <label className="dt-field-check">
          <input
            type="checkbox"
            checked={field.required ?? false}
            onChange={(e) => onPatch({ required: e.target.checked })}
          />
          {t('templateFieldRequired')}
        </label>
      ) : null}

      {field.type === 'legal_checkbox' ? (
        <label className="dt-field-label">
          {t('templateFieldLegalText')}
          <textarea
            className="dt-input"
            rows={4}
            value={field.legalText ?? ''}
            onChange={(e) => onPatch({ legalText: e.target.value })}
          />
        </label>
      ) : null}

      {field.type !== 'heading' ? (
        <label className="dt-field-label">
          {t('templateFieldWidth')}
          <select
            className="dt-select"
            value={colSpanToWidth(resolveFieldColSpan(field))}
            onChange={(e) =>
              onPatch({
                layout: {
                  ...field.layout,
                  colSpan: widthToColSpan(e.target.value as 'full' | 'half' | 'third' | 'two-thirds'),
                },
              })
            }
          >
            <option value="full">{t('templateFieldWidthFull')}</option>
            <option value="half">{t('templateFieldWidthHalf')}</option>
            <option value="two-thirds">{t('templateFieldWidthTwoThirds')}</option>
            <option value="third">{t('templateFieldWidthThird')}</option>
          </select>
        </label>
      ) : null}
    </div>
  )
}

interface TemplatePageSettingsPanelProps {
  template: DocumentTemplate
  onPatch: (patch: Partial<DocumentTemplate>) => void
}

export function TemplatePageSettingsPanel({ template, onPatch }: TemplatePageSettingsPanelProps) {
  const { t } = useTranslation()
  const ps = template.pageSettings ?? { format: 'a4' as const }
  const header = ps.header ?? {}
  const footer = ps.footer ?? {}
  const margins = ps.margins ?? { top: 20, right: 20, bottom: 20, left: 25 }

  const patchPage = (patch: Partial<typeof ps>) => {
    onPatch({ pageSettings: { ...ps, ...patch, format: 'a4' } })
  }

  return (
    <div className="dt-settings-panel">
      <h3 className="dt-dashboard__settings-title">{t('templatePageSettings')}</h3>
      <p className="dt-field-help">{t('templatePageFormatA4')}</p>

      <label className="dt-field-label">
        {t('templateHeaderLabel')}
        <RichTextField
          value={header.content ?? ''}
          onChange={(html) => patchPage({ header: { ...header, content: html } })}
          minHeight="3rem"
          placeholder={t('templateHeaderPlaceholder')}
          ariaLabel={t('templateHeaderLabel')}
        />
      </label>
      {!header.content?.trim() ? (
        <label className="dt-field-label">
          {t('templateHeaderHeight')}
          <input
            className="dt-input"
            type="number"
            min={0}
            max={60}
            value={header.heightMm ?? 15}
            onChange={(e) =>
              patchPage({ header: { ...header, heightMm: Number(e.target.value) } })
            }
          />
        </label>
      ) : null}

      <label className="dt-field-label">
        {t('templateFooterLabel')}
        <RichTextField
          value={footer.content ?? ''}
          onChange={(html) => patchPage({ footer: { ...footer, content: html } })}
          minHeight="3rem"
          placeholder={t('templateFooterPlaceholder')}
          ariaLabel={t('templateFooterLabel')}
        />
      </label>
      {!footer.content?.trim() ? (
        <label className="dt-field-label">
          {t('templateFooterHeight')}
          <input
            className="dt-input"
            type="number"
            min={0}
            max={60}
            value={footer.heightMm ?? 12}
            onChange={(e) =>
              patchPage({ footer: { ...footer, heightMm: Number(e.target.value) } })
            }
          />
        </label>
      ) : null}

      <label className="dt-field-check">
        <input
          type="checkbox"
          checked={ps.headerFooterFirstPageOnly ?? false}
          onChange={(e) => patchPage({ headerFooterFirstPageOnly: e.target.checked })}
        />
        {t('templateHeaderFooterFirstPage')}
      </label>

      <details className="dt-settings-details">
        <summary>{t('templateMarginsLabel')}</summary>
        <div className="dt-margins-grid">
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => {
            const labels = {
              top: t('templateMarginTop'),
              right: t('templateMarginRight'),
              bottom: t('templateMarginBottom'),
              left: t('templateMarginLeft'),
            }
            return (
            <label key={side} className="dt-field-label">
              {labels[side]}
              <input
                className="dt-input"
                type="number"
                min={5}
                max={40}
                value={margins[side]}
                onChange={(e) =>
                  patchPage({
                    margins: { ...margins, [side]: Number(e.target.value) },
                  })
                }
              />
            </label>
            )
          })}
        </div>
      </details>
    </div>
  )
}
