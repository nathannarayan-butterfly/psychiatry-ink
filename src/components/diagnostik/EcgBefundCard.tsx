import { Clipboard, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { getBefundSchema } from '../../data/befundSchemas'
import type { BefundRecord } from '../../types/befund'
import {
  formatBefundDate,
  getBefundDisplaySections,
} from '../../utils/befundRender'

interface EcgBefundCardProps {
  record: BefundRecord
  readOnly?: boolean
  onEdit: () => void
  onCopy: () => void
  onDelete: () => void
}

const SUMMARY_SECTION_IDS = new Set(['rhythm', 'lagetype', 'intervals'])

export function EcgBefundCard({
  record,
  readOnly = false,
  onEdit,
  onCopy,
  onDelete,
}: EcgBefundCardProps) {
  const { t } = useTranslation()
  const schema = getBefundSchema('ecg')
  const sections = getBefundDisplaySections(record)
  const summarySections = sections.filter((section) => SUMMARY_SECTION_IDS.has(section.id))
  const detailSections = sections.filter((section) => !SUMMARY_SECTION_IDS.has(section.id))

  return (
    <article className="ecg-befund-card">
      <header className="ecg-befund-card__header">
        <div className="ecg-befund-card__heading">
          <h2 className="ecg-befund-card__title">
            {schema.title} — {formatBefundDate(record.examDate)}
          </h2>
          <span
            className={[
              'befund-status-pill',
              record.status === 'vidert' ? 'befund-status-pill--vidert' : 'befund-status-pill--draft',
            ].join(' ').trim()}
          >
            {record.status === 'vidert' ? t('befundStatusVidert') : t('befundStatusDraft')}
          </span>
        </div>
        <div className="ecg-befund-card__actions">
          <button
            type="button"
            className="icon-action-btn"
            title={t('befundCopy')}
            aria-label={t('befundCopy')}
            onClick={onCopy}
          >
            <Clipboard strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            className="icon-action-btn"
            title={t('befundEdit')}
            aria-label={t('befundEdit')}
            disabled={readOnly}
            onClick={onEdit}
          >
            <Pencil strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            className="icon-action-btn icon-action-btn--danger"
            title={t('befundDelete')}
            aria-label={t('befundDelete')}
            disabled={readOnly}
            onClick={onDelete}
          >
            <Trash2 strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </header>

      {summarySections.length > 0 ? (
        <div className="ecg-befund-card__summary">
          {summarySections.flatMap((section) =>
            section.fields.map((field) => (
              <div key={`${section.id}-${field.label}`} className="ecg-befund-card__metric">
                <span className="ecg-befund-card__metric-label">{field.label}</span>
                <span className="ecg-befund-card__metric-value">{field.value}</span>
              </div>
            )),
          )}
        </div>
      ) : null}

      {detailSections.map((section) => (
        <section key={section.id} className="ecg-befund-card__section">
          <h3 className="ecg-befund-card__section-title">{section.label}</h3>
          <dl className="ecg-befund-card__field-list">
            {section.fields.map((field) => (
              <div
                key={field.label}
                className={[
                  'ecg-befund-card__field',
                  field.isLongText ? 'ecg-befund-card__field--block' : '',
                ].join(' ').trim()}
              >
                <dt className="ecg-befund-card__field-label">{field.label}</dt>
                <dd className="ecg-befund-card__field-value">{field.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </article>
  )
}
