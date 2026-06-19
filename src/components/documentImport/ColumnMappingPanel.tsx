import { useTranslation } from '../../context/TranslationContext'
import type { UiTranslationKey } from '../../data/uiTranslations'
import type { CandidateModule } from '../../schemas/documentImport/envelope'
import type { ColumnMapping, TabularField, TabularTable } from '../../utils/documentImport/tabular'
import { moduleLabelKey } from './labels'

/** Modules that tabular data can map into. */
const TABULAR_MODULES: CandidateModule[] = ['diagnosis', 'medication', 'lab', 'verlauf', 'document']

const FIELDS_BY_MODULE: Record<CandidateModule, { field: TabularField; labelKey: UiTranslationKey }[]> = {
  diagnosis: [
    { field: 'icd10Code', labelKey: 'documentImportFieldIcd10' },
    { field: 'label', labelKey: 'documentImportFieldLabel' },
  ],
  medication: [
    { field: 'substance', labelKey: 'documentImportFieldSubstance' },
    { field: 'strength', labelKey: 'documentImportFieldStrength' },
    { field: 'doseText', labelKey: 'documentImportFieldDose' },
  ],
  lab: [
    { field: 'name', labelKey: 'documentImportFieldLabel' },
    { field: 'value', labelKey: 'documentImportFieldText' },
    { field: 'unit', labelKey: 'documentImportFieldStrength' },
  ],
  document: [
    { field: 'title', labelKey: 'documentImportFieldTitle' },
    { field: 'text', labelKey: 'documentImportFieldText' },
  ],
  verlauf: [
    { field: 'date', labelKey: 'documentImportFieldDate' },
    { field: 'text', labelKey: 'documentImportFieldText' },
  ],
  anamnese: [],
  investigation: [],
  therapy: [],
  risk: [],
}

interface ColumnMappingPanelProps {
  table: TabularTable
  mapping: ColumnMapping
  onChange: (mapping: ColumnMapping) => void
}

export function ColumnMappingPanel({ table, mapping, onChange }: ColumnMappingPanelProps) {
  const { t } = useTranslation()
  const fields = FIELDS_BY_MODULE[mapping.module] ?? []

  const setModule = (module: CandidateModule) => {
    onChange({ module, columns: {} })
  }

  const setColumn = (field: TabularField, value: string) => {
    const columns = { ...mapping.columns }
    if (value === '') delete columns[field]
    else columns[field] = Number(value)
    onChange({ module: mapping.module, columns })
  }

  return (
    <section className="doc-import-mapping" aria-label={t('documentImportColumnMapping')}>
      <header className="doc-import-mapping__header">
        <h4 className="doc-import-mapping__title">{t('documentImportColumnMapping')}</h4>
        <p className="doc-import-mapping__hint">{t('documentImportColumnMappingHint')}</p>
      </header>

      <label className="doc-import-mapping__row">
        <span className="doc-import-mapping__field">{t('documentImportTargetModule')}</span>
        <select
          className="doc-import-select"
          value={mapping.module}
          onChange={(e) => setModule(e.target.value as CandidateModule)}
        >
          {TABULAR_MODULES.map((module) => (
            <option key={module} value={module}>
              {t(moduleLabelKey(module))}
            </option>
          ))}
        </select>
      </label>

      {fields.map(({ field, labelKey }) => (
        <label key={field} className="doc-import-mapping__row">
          <span className="doc-import-mapping__field">{t(labelKey)}</span>
          <select
            className="doc-import-select"
            value={mapping.columns[field] ?? ''}
            onChange={(e) => setColumn(field, e.target.value)}
          >
            <option value="">{t('documentImportColumnNone')}</option>
            {table.headers.map((header, index) => (
              <option key={`${header}-${index}`} value={index}>
                {header || `#${index + 1}`}
              </option>
            ))}
          </select>
        </label>
      ))}
    </section>
  )
}
