import { useTranslation } from '../../../context/TranslationContext'
import {
  ChevronDown,
  ChevronUp,
  PanelLeft,
  PanelRight,
  Plus,
  RectangleHorizontal,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import type {
  ClinicalBinding,
  InputOption,
  TemplateBlock,
} from '../../../types/clinicalTemplate'
import { PALETTE_ITEMS } from '../../../utils/clinicalTemplate/blockCatalog'
import { htmlToPlainLines } from '../../../utils/documentTemplate/htmlUtils'
import { plainTextToHtml } from '../../../utils/documentTemplate/richText'
import { RichTextField } from '../RichTextField'

const MIN_BLOCK_HEIGHT = 48

const BINDINGS: ClinicalBinding[] = [
  'patient.demographics',
  'case.admissionReason',
  'diagnoses.current',
  'medication.current',
  'labs.latest',
  'verlauf.selectedRange',
  'psychopathology.latest',
  'risk.current',
  'therapy.current',
  'socialTherapy.current',
]

interface BlockSettingsPanelProps {
  block: TemplateBlock
  onPatch: (patch: Partial<TemplateBlock>) => void
  onAddChild: (conditionalId: string, paletteId: string) => void
  onMoveChild: (conditionalId: string, childId: string, dir: -1 | 1) => void
  onDeleteBlock: (id: string) => void
}

export function BlockSettingsPanel({
  block,
  onPatch,
  onAddChild,
  onMoveChild,
  onDeleteBlock,
}: BlockSettingsPanelProps) {
  const { t } = useTranslation()

  return (
    <aside className="ct-settings" aria-label={t('vorlageSettingsTitle')}>
      <div className="ct-settings__head">{t('vorlageSettingsTitle')}</div>
      <div className="ct-settings__scroll">
        {renderFields()}
        <LayoutControls block={block} patch={patch} t={t} />
      </div>
    </aside>
  )

  function patch(p: Partial<TemplateBlock>) {
    onPatch(p)
  }

  function labelField(value: string | undefined, key: 'label' | 'text' | 'roleLabel' = 'label') {
    return (
      <Field label={t('vorlageFieldLabel')}>
        <input
          className="ct-input"
          value={value ?? ''}
          onChange={(e) => patch({ [key]: e.target.value } as Partial<TemplateBlock>)}
        />
      </Field>
    )
  }

  function renderFields() {
    switch (block.type) {
      case 'heading':
        return (
          <>
            <Field label={t('vorlageFieldText')}>
              <input className="ct-input" value={block.text} onChange={(e) => patch({ text: e.target.value })} />
            </Field>
            <Field label={t('vorlageFieldLevel')}>
              <select
                className="ct-input"
                value={block.level}
                onChange={(e) => patch({ level: Number(e.target.value) as 1 | 2 | 3 })}
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
              </select>
            </Field>
          </>
        )
      case 'text': {
        const textBlock = block
        const richValue = textBlock.html && textBlock.html.trim() ? textBlock.html : plainTextToHtml(textBlock.text)
        return (
          <Field label={t('vorlageFieldText')}>
            <div className="ct-settings__rte">
              <RichTextField
                value={richValue}
                onChange={(html) => patch({ html, text: htmlToPlainLines(html) })}
                minHeight="18rem"
                placeholder={t('vorlageTextPlaceholder')}
                ariaLabel={t('vorlageFieldText')}
              />
            </div>
          </Field>
        )
      }
      case 'input':
        return (
          <>
            {labelField(block.label)}
            <Field label={t('vorlageFieldInputKind')}>
              <select
                className="ct-input"
                value={block.inputKind}
                onChange={(e) => patch({ inputKind: e.target.value as typeof block.inputKind })}
              >
                <option value="short_text">{t('vorlageInputShortText')}</option>
                <option value="long_text">{t('vorlageInputLongText')}</option>
                <option value="checkbox">{t('vorlageInputCheckbox')}</option>
                <option value="multi_select">{t('vorlageInputMultiSelect')}</option>
                <option value="select">{t('vorlageInputSelect')}</option>
                <option value="yes_no">{t('vorlageInputYesNo')}</option>
                <option value="date">{t('vorlageInputDate')}</option>
                <option value="number">{t('vorlageInputNumber')}</option>
              </select>
            </Field>
            <Field label={t('vorlageFieldPlaceholder')}>
              <input
                className="ct-input"
                value={block.placeholder ?? ''}
                onChange={(e) => patch({ placeholder: e.target.value })}
              />
            </Field>
            <Toggle
              label={t('vorlageFieldRequired')}
              checked={block.required}
              onChange={(v) => patch({ required: v })}
            />
            {block.inputKind === 'select' || block.inputKind === 'multi_select' ? (
              <OptionsEditor
                options={block.options ?? []}
                onChange={(options) => patch({ options })}
                addLabel={t('vorlageAddOption')}
              />
            ) : null}
          </>
        )
      case 'table':
        return <TableSettings block={block} patch={patch} />
      case 'diagnosis':
        return (
          <>
            {labelField(block.label)}
            <Toggle label={t('vorlageDiagnosisShowCodes')} checked={block.showCodes} onChange={(v) => patch({ showCodes: v })} />
            <Toggle label={t('vorlageDiagnosisPrimaryOnly')} checked={block.primaryOnly} onChange={(v) => patch({ primaryOnly: v })} />
            <BindingNote binding="diagnoses.current" />
          </>
        )
      case 'medication':
        return (
          <>
            {labelField(block.label)}
            <Toggle label={t('vorlageMedicationIncludePrn')} checked={block.includePrn} onChange={(v) => patch({ includePrn: v })} />
            <Field label={t('vorlageMedicationFormat')}>
              <select className="ct-input" value={block.format} onChange={(e) => patch({ format: e.target.value as 'list' | 'table' })}>
                <option value="list">{t('vorlageFormatList')}</option>
                <option value="table">{t('vorlageFormatTable')}</option>
              </select>
            </Field>
            <BindingNote binding="medication.current" />
          </>
        )
      case 'laboratory':
        return (
          <>
            {labelField(block.label)}
            <Toggle label={t('vorlageLabOnlyAbnormal')} checked={block.onlyAbnormal} onChange={(v) => patch({ onlyAbnormal: v })} />
            <BindingNote binding="labs.latest" />
          </>
        )
      case 'psychopathology':
        return (<>{labelField(block.label)}<BindingNote binding="psychopathology.latest" /></>)
      case 'risk':
        return (<>{labelField(block.label)}<BindingNote binding="risk.current" /></>)
      case 'verlauf_summary':
        return (
          <>
            {labelField(block.label)}
            <Field label={t('vorlageVerlaufWindow')}>
              <select
                className="ct-input"
                value={block.windowPreset}
                onChange={(e) => patch({ windowPreset: e.target.value as typeof block.windowPreset })}
              >
                <option value="7d">{t('vorlageVerlauf7d')}</option>
                <option value="14d">{t('vorlageVerlauf14d')}</option>
                <option value="admission">{t('vorlageVerlaufAdmission')}</option>
                <option value="all">{t('vorlageVerlaufAll')}</option>
              </select>
            </Field>
            <BindingNote binding="verlauf.selectedRange" />
          </>
        )
      case 'therapy':
        return (<>{labelField(block.label)}<BindingNote binding="therapy.current" /></>)
      case 'social_therapy':
        return (<>{labelField(block.label)}<BindingNote binding="socialTherapy.current" /></>)
      case 'patient_data':
        return (
          <>
            {labelField(block.label)}
            <Field label={t('vorlageFieldDataPoint')}>
              <select className="ct-input" value={block.field} onChange={(e) => patch({ field: e.target.value as typeof block.field })}>
                <option value="name">{t('vorlagePdName')}</option>
                <option value="vorname">{t('vorlagePdVorname')}</option>
                <option value="nachname">{t('vorlagePdNachname')}</option>
                <option value="geburtsdatum">{t('vorlagePdDob')}</option>
                <option value="age">{t('vorlagePdAge')}</option>
                <option value="geschlecht">{t('vorlagePdGender')}</option>
                <option value="address">{t('vorlagePdAddress')}</option>
                <option value="kostentraeger">{t('vorlagePdKostentraeger')}</option>
                <option value="caseId">{t('vorlagePdCaseId')}</option>
                <option value="admissionReason">{t('vorlagePdAdmissionReason')}</option>
              </select>
            </Field>
            <Toggle label={t('vorlageInlineLabel')} checked={block.inline} onChange={(v) => patch({ inline: v })} />
          </>
        )
      case 'institution':
        return (
          <>
            {labelField(block.label)}
            <Field label={t('vorlageFieldDataPoint')}>
              <select className="ct-input" value={block.field} onChange={(e) => patch({ field: e.target.value as typeof block.field })}>
                <option value="clinician.name">{t('vorlageInstClinicianName')}</option>
                <option value="clinician.title">{t('vorlageInstClinicianTitle')}</option>
                <option value="organization.name">{t('vorlageInstOrgName')}</option>
                <option value="organization.address">{t('vorlageInstOrgAddress')}</option>
                <option value="system.date">{t('vorlageInstSystemDate')}</option>
                <option value="system.documentDate">{t('vorlageInstSystemDocDate')}</option>
              </select>
            </Field>
            <Toggle label={t('vorlageInlineLabel')} checked={block.inline} onChange={(v) => patch({ inline: v })} />
          </>
        )
      case 'signature':
        return (
          <>
            {labelField(block.roleLabel, 'roleLabel')}
            <Toggle label={t('vorlageSignatureDate')} checked={block.includeDate} onChange={(v) => patch({ includeDate: v })} />
            <Toggle label={t('vorlageSignatureLocation')} checked={block.includeLocation} onChange={(v) => patch({ includeLocation: v })} />
          </>
        )
      case 'ai_section':
        return (
          <>
            {labelField(block.label)}
            <Field label={t('vorlageAiPrompt')}>
              <textarea
                className="ct-input ct-input--area"
                rows={4}
                value={block.prompt}
                onChange={(e) => patch({ prompt: e.target.value })}
              />
            </Field>
            <Field label={t('vorlageAiContext')}>
              <select
                className="ct-input"
                value={block.sourceBinding}
                onChange={(e) => patch({ sourceBinding: e.target.value as typeof block.sourceBinding })}
              >
                <option value="all">{t('vorlageAiContextAll')}</option>
                {BINDINGS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>
            <p className="ct-settings__note">{t('vorlageAiBillingNote')}</p>
          </>
        )
      case 'conditional':
        return (
          <ConditionalSettings
            block={block}
            patch={patch}
            onAddChild={onAddChild}
            onMoveChild={onMoveChild}
            onDeleteBlock={onDeleteBlock}
          />
        )
      default:
        return null
    }
  }
}

function LayoutControls({
  block,
  patch,
  t,
}: {
  block: TemplateBlock
  patch: (p: Partial<TemplateBlock>) => void
  t: (k: UiTranslationKey) => string
}) {
  const width = block.width ?? 'full'
  const align = block.align ?? 'left'

  const seg = (active: boolean) =>
    `ct-settings__seg-btn${active ? ' ct-settings__seg-btn--active' : ''}`

  return (
    <div className="ct-settings__layout">
      <div className="ct-settings__field-label">{t('vorlageLayoutSection')}</div>
      <div className="ct-settings__seg" role="group" aria-label={t('vorlageLayoutWidth')}>
        <button type="button" className={seg(width === 'full')} aria-pressed={width === 'full'} onClick={() => patch({ width: 'full' })}>
          <RectangleHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {t('vorlageWidthFull')}
        </button>
        <button type="button" className={seg(width === 'half' && align === 'left')} aria-pressed={width === 'half' && align === 'left'} onClick={() => patch({ width: 'half', align: 'left' })}>
          <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {t('vorlageWidthLeft')}
        </button>
        <button type="button" className={seg(width === 'half' && align === 'right')} aria-pressed={width === 'half' && align === 'right'} onClick={() => patch({ width: 'half', align: 'right' })}>
          <PanelRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {t('vorlageWidthRight')}
        </button>
      </div>
      <Field label={t('vorlageLayoutHeight')}>
        <div className="ct-settings__height">
          <input
            className="ct-input"
            type="number"
            min={MIN_BLOCK_HEIGHT}
            max={2000}
            step={8}
            value={block.height ?? ''}
            placeholder={t('vorlageHeightAuto')}
            onChange={(e) => {
              const v = Math.round(Number(e.target.value))
              patch({ height: Number.isFinite(v) && v >= MIN_BLOCK_HEIGHT ? v : undefined })
            }}
          />
          <button type="button" className="ct-btn ct-btn--xs" onClick={() => patch({ height: undefined })}>
            <RotateCcw className="h-3 w-3" strokeWidth={2} aria-hidden /> {t('vorlageHeightReset')}
          </button>
        </div>
      </Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="ct-settings__field">
      <span className="ct-settings__field-label">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="ct-settings__toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function BindingNote({ binding }: { binding: ClinicalBinding }) {
  const { t } = useTranslation()
  return (
    <p className="ct-settings__note">
      {t('vorlageBoundTo')}: <code>{binding}</code>
    </p>
  )
}

function OptionsEditor({
  options,
  onChange,
  addLabel,
}: {
  options: InputOption[]
  onChange: (options: InputOption[]) => void
  addLabel: string
}) {
  return (
    <div className="ct-settings__options">
      {options.map((opt, i) => (
        <div key={opt.id} className="ct-settings__option-row">
          <input
            className="ct-input"
            value={opt.label}
            onChange={(e) => onChange(options.map((o) => (o.id === opt.id ? { ...o, label: e.target.value } : o)))}
          />
          <button
            type="button"
            className="ct-icon-btn"
            aria-label={`remove option ${i + 1}`}
            onClick={() => onChange(options.filter((o) => o.id !== opt.id))}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="ct-btn ct-btn--xs"
        onClick={() => onChange([...options, { id: crypto.randomUUID(), label: '' }])}
      >
        <Plus className="h-3 w-3" strokeWidth={2} aria-hidden /> {addLabel}
      </button>
    </div>
  )
}

function TableSettings({
  block,
  patch,
}: {
  block: Extract<TemplateBlock, { type: 'table' }>
  patch: (p: Partial<TemplateBlock>) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <Field label={t('vorlageTableCaption')}>
        <input className="ct-input" value={block.caption ?? ''} onChange={(e) => patch({ caption: e.target.value })} />
      </Field>
      <div className="ct-settings__field-label">{t('vorlageTableColumns')}</div>
      <div className="ct-settings__options">
        {block.columns.map((col) => (
          <div key={col.id} className="ct-settings__option-row">
            <input
              className="ct-input"
              value={col.label}
              onChange={(e) =>
                patch({ columns: block.columns.map((c) => (c.id === col.id ? { ...c, label: e.target.value } : c)) })
              }
            />
            <button
              type="button"
              className="ct-icon-btn"
              aria-label="remove column"
              onClick={() => patch({ columns: block.columns.filter((c) => c.id !== col.id) })}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="ct-btn ct-btn--xs"
          onClick={() => patch({ columns: [...block.columns, { id: crypto.randomUUID(), label: '' }] })}
        >
          <Plus className="h-3 w-3" strokeWidth={2} aria-hidden /> {t('vorlageAddColumn')}
        </button>
      </div>
      <Field label={t('vorlageTableRows')}>
        <input
          className="ct-input"
          type="number"
          min={1}
          max={30}
          value={block.rows.length}
          onChange={(e) => {
            const target = Math.max(1, Math.min(30, Number(e.target.value) || 1))
            const rows = [...block.rows]
            while (rows.length < target) rows.push({ id: crypto.randomUUID(), cells: {} })
            rows.length = target
            patch({ rows })
          }}
        />
      </Field>
    </>
  )
}

function ConditionalSettings({
  block,
  patch,
  onAddChild,
  onMoveChild,
  onDeleteBlock,
}: {
  block: Extract<TemplateBlock, { type: 'conditional' }>
  patch: (p: Partial<TemplateBlock>) => void
  onAddChild: (conditionalId: string, paletteId: string) => void
  onMoveChild: (conditionalId: string, childId: string, dir: -1 | 1) => void
  onDeleteBlock: (id: string) => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <Field label={t('vorlageFieldLabel')}>
        <input className="ct-input" value={block.label ?? ''} onChange={(e) => patch({ label: e.target.value })} />
      </Field>
      <Field label={t('vorlageConditionSource')}>
        <select
          className="ct-input"
          value={block.condition.source}
          onChange={(e) => patch({ condition: { ...block.condition, source: e.target.value as ClinicalBinding | 'manual' } })}
        >
          <option value="manual">{t('vorlageConditionManual')}</option>
          {BINDINGS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </Field>
      <Field label={t('vorlageConditionOperator')}>
        <select
          className="ct-input"
          value={block.condition.operator}
          onChange={(e) => patch({ condition: { ...block.condition, operator: e.target.value as typeof block.condition.operator } })}
        >
          <option value="exists">{t('vorlageOpExists')}</option>
          <option value="not_exists">{t('vorlageOpNotExists')}</option>
          <option value="equals">{t('vorlageOpEquals')}</option>
          <option value="contains">{t('vorlageOpContains')}</option>
        </select>
      </Field>
      {(block.condition.operator === 'equals' || block.condition.operator === 'contains') ? (
        <Field label={t('vorlageConditionValue')}>
          <input
            className="ct-input"
            value={block.condition.value ?? ''}
            onChange={(e) => patch({ condition: { ...block.condition, value: e.target.value } })}
          />
        </Field>
      ) : null}

      <div className="ct-settings__field-label">{t('vorlageConditionalChildren')}</div>
      <div className="ct-settings__children">
        {block.children.length === 0 ? (
          <p className="ct-settings__note">{t('vorlageConditionalEmpty')}</p>
        ) : (
          block.children.map((child, i) => (
            <div key={child.id} className="ct-settings__child-row">
              <span>{child.type}</span>
              <div className="ct-settings__child-actions">
                <button type="button" className="ct-icon-btn" disabled={i === 0} aria-label="up" onClick={() => onMoveChild(block.id, child.id, -1)}>
                  <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                </button>
                <button type="button" className="ct-icon-btn" disabled={i === block.children.length - 1} aria-label="down" onClick={() => onMoveChild(block.id, child.id, 1)}>
                  <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                </button>
                <button type="button" className="ct-icon-btn" aria-label="remove" onClick={() => onDeleteBlock(child.id)}>
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <Field label={t('vorlageAddChildBlock')}>
        <select
          className="ct-input"
          value=""
          onChange={(e) => {
            if (e.target.value) onAddChild(block.id, e.target.value)
          }}
        >
          <option value="">— {t('vorlageAddBlock')} —</option>
          {PALETTE_ITEMS.filter((item) => item.id !== 'conditional').map((item) => (
            <option key={item.id} value={item.id}>{t(item.labelKey)}</option>
          ))}
        </select>
      </Field>
    </>
  )
}
