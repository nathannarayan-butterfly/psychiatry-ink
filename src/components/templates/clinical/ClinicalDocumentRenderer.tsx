import { useTranslation } from '../../../context/TranslationContext'
import type {
  AiSectionBlock,
  DiagnosisBlock,
  InputBlock,
  LaboratoryBlock,
  MedicationBlock,
  SignatureBlock,
  TableBlock,
  TemplateBlock,
  TemplateFieldValues,
  TextBlock,
} from '../../../types/clinicalTemplate'
import type { ResolvedClinicalData } from '../../../utils/clinicalTemplate/clinicalData'
import {
  evaluateCondition,
  institutionValue,
  patientDataValue,
} from '../../../utils/clinicalTemplate/bindingEval'
import { sanitizeRichHtml } from '../../../utils/documentTemplate/htmlUtils'

export interface ClinicalDocumentRendererProps {
  blocks: TemplateBlock[]
  data: ResolvedClinicalData
  values?: TemplateFieldValues
  /** When true, fillable blocks render as editable controls. */
  interactive?: boolean
  onValueChange?: (blockId: string, value: string | boolean | string[]) => void
  /** When provided, AI sections show a Generate action in interactive mode. */
  onGenerateAiSection?: (block: AiSectionBlock) => void
  generatingBlockId?: string | null
  className?: string
  /**
   * Flow layout: half-width blocks float so a left + right pair sits
   * side-by-side on the A4 page. Used for the full-document preview/print.
   * The single-block canvas preview leaves this off (one block per row).
   */
  flow?: boolean
}

export function ClinicalDocumentRenderer(props: ClinicalDocumentRendererProps) {
  const { blocks, className, flow } = props
  return (
    <div className={['ct-doc', flow ? 'ct-doc--flow' : '', className].filter(Boolean).join(' ')}>
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} {...props} />
      ))}
    </div>
  )
}

/** Layout classes + inline min-height shared by every rendered block. */
function blockLayoutProps(block: TemplateBlock): { className: string; style?: React.CSSProperties } {
  const width = block.width ?? 'full'
  const align = block.align ?? 'left'
  const classes = ['ct-doc__block', `ct-doc__block--${width}`]
  if (width === 'half') classes.push(`ct-doc__block--align-${align}`)
  const style: React.CSSProperties | undefined = block.height ? { minHeight: `${block.height}px` } : undefined
  return { className: classes.join(' '), style }
}

function BlockView({
  block,
  data,
  values = {},
  interactive = false,
  onValueChange,
  onGenerateAiSection,
  generatingBlockId,
  blocks: _blocks,
  flow: _flow,
  className: _className,
  ...rest
}: { block: TemplateBlock } & ClinicalDocumentRendererProps) {
  const { t } = useTranslation()
  const empty = <span className="ct-doc__empty">{t('vorlageNoData')}</span>
  const content = renderContent()
  if (content === null) return null
  const { className, style } = blockLayoutProps(block)
  return (
    <div className={className} style={style}>
      {content}
    </div>
  )

  function renderContent(): React.ReactNode {
  switch (block.type) {
    case 'heading': {
      const Tag = (`h${block.level}` as 'h1' | 'h2' | 'h3')
      return <Tag className={`ct-doc__heading ct-doc__heading--${block.level}`}>{block.text || empty}</Tag>
    }
    case 'text':
      return <TextView block={block} />
    case 'input':
      return (
        <InputView
          block={block}
          value={values[block.id]}
          interactive={interactive}
          onChange={(v) => onValueChange?.(block.id, v)}
        />
      )
    case 'table':
      return <TableView block={block} />
    case 'diagnosis':
      return <DiagnosisView block={block} data={data} empty={empty} />
    case 'medication':
      return <MedicationView block={block} data={data} empty={empty} />
    case 'laboratory':
      return <LaboratoryView block={block} data={data} empty={empty} />
    case 'psychopathology':
      return (
        <ClinicalTextSection
          label={block.label}
          text={data.psychopathology?.text}
          meta={data.psychopathology?.date}
          empty={empty}
        />
      )
    case 'risk':
      return <ClinicalTextSection label={block.label} text={data.risk?.text} empty={empty} />
    case 'verlauf_summary': {
      const verlauf = data.verlaufByPreset?.[block.windowPreset] ?? data.verlauf
      return (
        <section className="ct-doc__section">
          {block.label ? (
            <h4 className="ct-doc__section-title">
              {block.label}
              {verlauf.windowLabel ? <span className="ct-doc__meta"> · {verlauf.windowLabel}</span> : null}
            </h4>
          ) : null}
          {verlauf.entries.length === 0 ? (
            empty
          ) : (
            <ul className="ct-doc__verlauf">
              {verlauf.entries.map((entry, i) => (
                <li key={i}>
                  {entry.date ? <span className="ct-doc__verlauf-date">{entry.date}</span> : null}
                  <span>{entry.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )
    }
    case 'therapy':
      return (
        <section className="ct-doc__section">
          {block.label ? <h4 className="ct-doc__section-title">{block.label}</h4> : null}
          {data.therapy.length === 0 ? (
            empty
          ) : (
            <ul className="ct-doc__list">
              {data.therapy.map((item, i) => (
                <li key={i}>
                  <strong>{item.label}</strong>
                  {item.detail ? <span> — {item.detail}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      )
    case 'social_therapy':
      return (
        <section className="ct-doc__section">
          {block.label ? <h4 className="ct-doc__section-title">{block.label}</h4> : null}
          {data.socialTherapy.length === 0 ? (
            empty
          ) : (
            <ul className="ct-doc__list">
              {data.socialTherapy.map((item, i) => (
                <li key={i}>
                  <strong>{item.area}</strong> <span className="ct-doc__meta">({item.status})</span>
                  {item.goal ? <span> — {item.goal}</span> : null}
                  {item.measure ? <span className="ct-doc__meta"> · {item.measure}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      )
    case 'patient_data':
      return <PlaceholderView label={block.label} inline={block.inline} value={patientDataValue(block.field, data)} empty={empty} />
    case 'institution':
      return <PlaceholderView label={block.label} inline={block.inline} value={institutionValue(block.field, data)} empty={empty} />
    case 'signature':
      return <SignatureView block={block} data={data} />
    case 'ai_section':
      return (
        <AiSectionView
          block={block}
          value={typeof values[block.id] === 'string' ? (values[block.id] as string) : ''}
          interactive={interactive}
          generating={generatingBlockId === block.id}
          onGenerate={onGenerateAiSection ? () => onGenerateAiSection(block) : undefined}
        />
      )
    case 'conditional': {
      const show = evaluateCondition(block, data, values)
      if (!show) {
        return interactive ? (
          <div className="ct-doc__conditional-hidden">{t('vorlageConditionalHidden')}: {block.label}</div>
        ) : null
      }
      return (
        <div className="ct-doc__conditional">
          {block.children.map((child) => (
            <BlockView
              key={child.id}
              block={child}
              data={data}
              values={values}
              interactive={interactive}
              onValueChange={onValueChange}
              onGenerateAiSection={onGenerateAiSection}
              generatingBlockId={generatingBlockId}
              blocks={_blocks}
              {...rest}
            />
          ))}
        </div>
      )
    }
    default:
      return null
  }
  }
}

function TextView({ block }: { block: TextBlock }) {
  const html = block.html?.trim() ? sanitizeRichHtml(block.html) : ''
  if (html) {
    return <div className="ct-doc__text ct-doc__richtext" dangerouslySetInnerHTML={{ __html: html }} />
  }
  if (!block.text.trim()) return <div className="ct-doc__text ct-doc__text--empty">&nbsp;</div>
  return (
    <div className="ct-doc__text">
      {block.text
        .split(/\n{2,}/)
        .map((para, i) => (
          <p key={i}>
            {para.split('\n').map((line, j) => (
              <span key={j}>
                {line}
                <br />
              </span>
            ))}
          </p>
        ))}
    </div>
  )
}

function InputView({
  block,
  value,
  interactive,
  onChange,
}: {
  block: InputBlock
  value: string | boolean | string[] | undefined
  interactive: boolean
  onChange: (v: string | boolean | string[]) => void
}) {
  const labelEl = (
    <span className="ct-doc__label">
      {block.label}
      {block.required ? <span className="ct-doc__required" aria-hidden> *</span> : null}
    </span>
  )

  if (block.inputKind === 'checkbox') {
    const checked = value === true
    return (
      <label className="ct-doc__field ct-doc__field--inline ct-doc__checkitem">
        <input type="checkbox" checked={checked} disabled={!interactive} onChange={(e) => onChange(e.target.checked)} />
        {labelEl}
      </label>
    )
  }

  if (block.inputKind === 'multi_select') {
    const selected = Array.isArray(value) ? value : []
    const options = block.options ?? []
    const toggle = (optionId: string) => {
      const next = selected.includes(optionId)
        ? selected.filter((x) => x !== optionId)
        : [...selected, optionId]
      onChange(next)
    }
    return (
      <fieldset className="ct-doc__field ct-doc__checkgroup">
        <legend className="ct-doc__label">
          {block.label}
          {block.required ? <span className="ct-doc__required" aria-hidden> *</span> : null}
        </legend>
        {options.length === 0 ? (
          <span className="ct-doc__empty">{block.placeholder || '—'}</span>
        ) : (
          options.map((o) => (
            <label key={o.id} className="ct-doc__field ct-doc__field--inline ct-doc__checkitem">
              <input
                type="checkbox"
                checked={selected.includes(o.id)}
                disabled={!interactive}
                onChange={() => toggle(o.id)}
              />
              <span>{o.label}</span>
            </label>
          ))
        )}
      </fieldset>
    )
  }

  if (block.inputKind === 'yes_no') {
    const v = typeof value === 'string' ? value : ''
    return (
      <div className="ct-doc__field">
        {labelEl}
        <span className="ct-doc__yesno">
          <label><input type="radio" name={block.id} checked={v === 'yes'} disabled={!interactive} onChange={() => onChange('yes')} /> Ja</label>
          <label><input type="radio" name={block.id} checked={v === 'no'} disabled={!interactive} onChange={() => onChange('no')} /> Nein</label>
        </span>
      </div>
    )
  }

  if (block.inputKind === 'select') {
    const v = typeof value === 'string' ? value : ''
    if (!interactive) {
      const selected = block.options?.find((o) => o.id === v)
      return <FieldLine label={labelEl}>{selected?.label || '________________'}</FieldLine>
    }
    return (
      <div className="ct-doc__field">
        {labelEl}
        <select value={v} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {block.options?.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>
    )
  }

  const text = typeof value === 'string' ? value : ''
  if (block.inputKind === 'long_text') {
    if (!interactive) {
      return (
        <div className="ct-doc__field">
          {labelEl}
          <div className="ct-doc__longtext">{text || <span className="ct-doc__blankline" />}</div>
        </div>
      )
    }
    return (
      <div className="ct-doc__field">
        {labelEl}
        <textarea value={text} placeholder={block.placeholder} rows={3} onChange={(e) => onChange(e.target.value)} />
      </div>
    )
  }

  const inputType = block.inputKind === 'date' ? 'date' : block.inputKind === 'number' ? 'number' : 'text'
  if (!interactive) {
    return <FieldLine label={labelEl}>{text || '________________'}</FieldLine>
  }
  return (
    <div className="ct-doc__field ct-doc__field--inline">
      {labelEl}
      <input type={inputType} value={text} placeholder={block.placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function FieldLine({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="ct-doc__field ct-doc__field--inline">
      {label}
      <span className="ct-doc__value">{children}</span>
    </div>
  )
}

function TableView({ block }: { block: TableBlock }) {
  return (
    <figure className="ct-doc__table-wrap">
      <table className="ct-doc__table">
        <thead>
          <tr>{block.columns.map((c) => <th key={c.id}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.id}>
              {block.columns.map((c) => <td key={c.id}>{row.cells[c.id] ?? ''}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {block.caption ? <figcaption className="ct-doc__meta">{block.caption}</figcaption> : null}
    </figure>
  )
}

function DiagnosisView({ block, data, empty }: { block: DiagnosisBlock; data: ResolvedClinicalData; empty: React.ReactNode }) {
  const list = block.primaryOnly ? data.diagnoses.slice(0, 1) : data.diagnoses
  return (
    <section className="ct-doc__section">
      {block.label ? <h4 className="ct-doc__section-title">{block.label}</h4> : null}
      {list.length === 0 ? (
        empty
      ) : (
        <ol className="ct-doc__diagnoses">
          {list.map((dx, i) => (
            <li key={i}>
              {block.showCodes && dx.code ? <span className="ct-doc__code">{dx.code}</span> : null}
              <span>{dx.label}</span>
              {dx.role ? <span className="ct-doc__meta"> ({dx.role})</span> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function MedicationView({ block, data, empty }: { block: MedicationBlock; data: ResolvedClinicalData; empty: React.ReactNode }) {
  const meds = block.includePrn ? data.medications : data.medications.filter((m) => !m.prn)
  return (
    <section className="ct-doc__section">
      {block.label ? <h4 className="ct-doc__section-title">{block.label}</h4> : null}
      {meds.length === 0 ? (
        empty
      ) : block.format === 'table' ? (
        <table className="ct-doc__table">
          <thead>
            <tr><th>Substanz</th><th>Dosierung</th><th>Indikation</th></tr>
          </thead>
          <tbody>
            {meds.map((m, i) => (
              <tr key={i}>
                <td>{m.substance}{m.prn ? ' (b.B.)' : ''}</td>
                <td>{m.dose ?? '—'}</td>
                <td>{m.indication ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className="ct-doc__list">
          {meds.map((m, i) => (
            <li key={i}>
              <strong>{m.substance}</strong>
              {m.dose ? <span> {m.dose}</span> : null}
              {m.prn ? <span className="ct-doc__meta"> (b.B.)</span> : null}
              {m.indication ? <span className="ct-doc__meta"> — {m.indication}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function LaboratoryView({ block, data, empty }: { block: LaboratoryBlock; data: ResolvedClinicalData; empty: React.ReactNode }) {
  const panels = data.labs.panels
    .map((p) => ({ ...p, values: block.onlyAbnormal ? p.values.filter((v) => v.abnormal) : p.values }))
    .filter((p) => p.values.length > 0)
  return (
    <section className="ct-doc__section">
      {block.label ? (
        <h4 className="ct-doc__section-title">
          {block.label}
          {data.labs.date ? <span className="ct-doc__meta"> · {data.labs.date}</span> : null}
        </h4>
      ) : null}
      {panels.length === 0 ? (
        empty
      ) : (
        panels.map((panel, pi) => (
          <div key={pi} className="ct-doc__lab-panel">
            <div className="ct-doc__lab-category">{panel.category}</div>
            <table className="ct-doc__table ct-doc__table--lab">
              <tbody>
                {panel.values.map((v, vi) => (
                  <tr key={vi} className={v.abnormal ? 'ct-doc__lab-row--abnormal' : ''}>
                    <td>{v.name}</td>
                    <td>{v.value}{v.unit ? ` ${v.unit}` : ''}{v.abnormal ? ' !' : ''}</td>
                    <td className="ct-doc__meta">{v.reference ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </section>
  )
}

function ClinicalTextSection({
  label,
  text,
  meta,
  empty,
}: {
  label?: string
  text?: string
  meta?: string
  empty: React.ReactNode
}) {
  return (
    <section className="ct-doc__section">
      {label ? (
        <h4 className="ct-doc__section-title">
          {label}
          {meta ? <span className="ct-doc__meta"> · {meta}</span> : null}
        </h4>
      ) : null}
      {text && text.trim() ? (
        <div className="ct-doc__text">
          {text.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
        </div>
      ) : (
        empty
      )}
    </section>
  )
}

function PlaceholderView({
  label,
  inline,
  value,
  empty,
}: {
  label?: string
  inline: boolean
  value: string
  empty: React.ReactNode
}) {
  const content = value || empty
  if (inline) {
    return (
      <div className="ct-doc__field ct-doc__field--inline">
        {label ? <span className="ct-doc__label">{label}:</span> : null}
        <span className="ct-doc__value">{content}</span>
      </div>
    )
  }
  return (
    <div className="ct-doc__field">
      {label ? <span className="ct-doc__label">{label}</span> : null}
      <div className="ct-doc__value">{content}</div>
    </div>
  )
}

function SignatureView({ block, data }: { block: SignatureBlock; data: ResolvedClinicalData }) {
  return (
    <div className="ct-doc__signature">
      {block.includeLocation || block.includeDate ? (
        <div className="ct-doc__signature-place">
          {[block.includeLocation ? data.organization.address || '________________' : null, block.includeDate ? data.system.date : null]
            .filter(Boolean)
            .join(', ')}
        </div>
      ) : null}
      <div className="ct-doc__signature-line">________________________</div>
      <div className="ct-doc__signature-role">{block.roleLabel}{data.clinician.name ? ` — ${data.clinician.name}` : ''}</div>
    </div>
  )
}

function AiSectionView({
  block,
  value,
  interactive,
  generating,
  onGenerate,
}: {
  block: AiSectionBlock
  value: string
  interactive: boolean
  generating: boolean
  onGenerate?: () => void
}) {
  const { t } = useTranslation()
  return (
    <section className="ct-doc__section ct-doc__ai">
      <h4 className="ct-doc__section-title">
        {block.label}
        <span className="ct-doc__ai-badge">{t('vorlageAiBadge')}</span>
      </h4>
      {value ? (
        <div className="ct-doc__text">
          {value.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
        </div>
      ) : (
        <div className="ct-doc__ai-prompt">{block.prompt}</div>
      )}
      {interactive && onGenerate ? (
        <button type="button" className="ct-btn ct-btn--ai" disabled={generating} onClick={onGenerate}>
          {generating ? t('vorlageAiGenerating') : value ? t('vorlageAiRegenerate') : t('vorlageAiGenerate')}
        </button>
      ) : null}
    </section>
  )
}
