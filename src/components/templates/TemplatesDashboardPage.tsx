import {
  Archive,
  ArrowLeft,
  Copy,
  Eye,
  FileUp,
  Plus,
  Save,
  Search,
  Settings2,
  Share2,
  Trash2,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { usePermissions } from '../../hooks/permissions'
import { useDocumentTemplates } from '../../hooks/useDocumentTemplates'
import { loadRegistryMapFromStorage } from '../../utils/caseRegistryStorage'
import type {
  DocumentTemplate,
  TemplateCategory,
  TemplateField,
} from '../../types/documentTemplate'
import {
  categoryLabel,
  TEMPLATE_CATEGORIES,
} from '../../utils/documentTemplate/constants'
import { buildInitialFieldValues, renderTemplateDocumentHtml } from '../../utils/documentTemplate/renderTemplate'
import { resolvePageSettings } from '../../utils/documentTemplate/pageSettings'
import { sanitizeRichHtml } from '../../utils/documentTemplate/htmlUtils'
import { searchTemplates } from '../../utils/documentTemplateStore'
import { countDocsUsingTemplateInCases } from '../../utils/generatedDocumentsVault'
import { A4PageView } from './A4PageView'
import { TemplateContextMenu, type ContextMenuState, type TemplateFieldInsertSelection } from './TemplateContextMenu'
import { TemplateImportDialog } from './TemplateImportDialog'
import { TemplateShareDialog } from './TemplateShareDialog'
import { TemplateFieldSettings, TemplatePageSettingsPanel } from './TemplateFieldSettings'
import { createDynamicField, createFieldFromType } from './templateFieldUtils'
import { TemplateCanvas } from './TemplateCanvas'

interface TemplatesDashboardPageProps {
  onBack: () => void
}

export function TemplatesDashboardPage({ onBack }: TemplatesDashboardPageProps) {
  const { t, language } = useTranslation()
  const { canManageTemplates } = usePermissions()
  const { templates, create, update, duplicate, archive, remove } = useDocumentTemplates()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | TemplateCategory>('all')
  const [previewMode, setPreviewMode] = useState(false)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [showPageSettings, setShowPageSettings] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const lang = language === 'de' ? 'de' : 'en'

  const filtered = useMemo(
    () => searchTemplates(templates, query, categoryFilter),
    [templates, query, categoryFilter],
  )

  const selected = useMemo(
    () => templates.find((tpl) => tpl.id === selectedId) ?? null,
    [templates, selectedId],
  )

  const selectedField = useMemo(
    () => selected?.fields.find((f) => f.id === selectedFieldId) ?? null,
    [selected, selectedFieldId],
  )

  const sortedFields = useMemo(
    () => (selected ? [...selected.fields].sort((a, b) => a.order - b.order) : []),
    [selected],
  )

  const previewHtml = useMemo(() => {
    if (!selected) return ''
    const ctx = {
      system: {
        date: new Date().toLocaleDateString('de-DE'),
        time: '',
        year: String(new Date().getFullYear()),
      },
    }
    const values = buildInitialFieldValues(selected, ctx)
    return renderTemplateDocumentHtml(selected, values, ctx, { markUnresolved: true })
  }, [selected])

  const pageSettings = useMemo(
    () => (selected ? resolvePageSettings(selected) : null),
    [selected],
  )

  const handleCreate = useCallback(() => {
    const created = create({
      title: t('templateNewTitle'),
      category: 'freie-vorlagen',
    })
    setSelectedId(created.id)
    setPreviewMode(false)
    setShowPageSettings(false)
  }, [create, t])

  const patchSelected = useCallback(
    (patch: Partial<DocumentTemplate>) => {
      if (!selected) return
      update(selected.id, patch)
    },
    [selected, update],
  )

  const patchField = useCallback(
    (fieldId: string, patch: Partial<TemplateField>) => {
      if (!selected) return
      patchSelected({
        fields: selected.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
      })
    },
    [selected, patchSelected],
  )

  const insertField = useCallback(
    (selection: TemplateFieldInsertSelection, insertAt: number) => {
      if (!selected) return
      if (selection.kind === 'page_settings') {
        setShowPageSettings(true)
        setSelectedFieldId(null)
        return
      }
      const sorted = [...selected.fields].sort((a, b) => a.order - b.order)
      let field: TemplateField
      if (selection.kind === 'dynamic') {
        field = createDynamicField(selection.dynamicKey, insertAt, lang)
      } else {
        field = createFieldFromType(selection.type, insertAt, t('templateFieldDefaultLabel'))
      }
      const next = [...sorted]
      next.splice(insertAt, 0, field)
      patchSelected({ fields: next.map((f, i) => ({ ...f, order: i })) })
      setSelectedFieldId(field.id)
      setShowPageSettings(false)
    },
    [selected, patchSelected, t, lang],
  )

  const removeField = useCallback(
    (fieldId: string) => {
      if (!selected) return
      patchSelected({
        fields: selected.fields
          .filter((f) => f.id !== fieldId)
          .map((f, idx) => ({ ...f, order: idx })),
      })
      if (selectedFieldId === fieldId) setSelectedFieldId(null)
    },
    [selected, patchSelected, selectedFieldId],
  )

  const moveField = useCallback(
    (fieldId: string, direction: -1 | 1) => {
      if (!selected) return
      const sorted = [...selected.fields].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex((f) => f.id === fieldId)
      const target = idx + direction
      if (idx < 0 || target < 0 || target >= sorted.length) return
      const next = [...sorted]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      patchSelected({ fields: next.map((f, i) => ({ ...f, order: i })) })
    },
    [selected, patchSelected],
  )

  const reorderField = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!selected) return
      const sorted = [...selected.fields].sort((a, b) => a.order - b.order)
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= sorted.length ||
        toIndex >= sorted.length ||
        fromIndex === toIndex
      ) {
        return
      }
      const next = [...sorted]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved!)
      patchSelected({ fields: next.map((f, i) => ({ ...f, order: i })) })
    },
    [selected, patchSelected],
  )

  const openContextMenu = useCallback((e: React.MouseEvent, insertAt: number) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, insertAt })
  }, [])

  const handleDelete = useCallback(async () => {
    if (!selected) return
    setDeleteError(null)
    const caseIds = Object.keys(loadRegistryMapFromStorage())
    const usage = await countDocsUsingTemplateInCases(selected.id, caseIds)
    if (usage > 0) {
      setDeleteError(t('templateDeleteInUse'))
      return
    }
    remove(selected.id)
    setSelectedId(null)
  }, [selected, remove, t])

  const headerPreview = pageSettings?.header?.content?.trim()
    ? sanitizeRichHtml(pageSettings.header.content)
    : null
  const footerPreview = pageSettings?.footer?.content?.trim()
    ? sanitizeRichHtml(pageSettings.footer.content)
    : null

  return (
    <div className="dt-dashboard">
      <header className="dt-dashboard__topbar">
        <button type="button" className="dt-btn dt-btn--ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {t('templateBackDashboard')}
        </button>
        <h1 className="dt-dashboard__title">{t('templateDashboardTitle')}</h1>
        <div className="dt-dashboard__topbar-actions">
          <button
            type="button"
            className="dt-btn dt-btn--ghost"
            onClick={() => setImportOpen(true)}
            disabled={!canManageTemplates()}
          >
            <FileUp className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            {t('templateImport')}
          </button>
          <button
            type="button"
            className="dt-btn dt-btn--primary"
            onClick={handleCreate}
            disabled={!canManageTemplates()}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {t('templateCreate')}
          </button>
        </div>
      </header>

      <div className="dt-dashboard__layout">
        <aside className="dt-dashboard__sidebar">
          <div className="dt-dashboard__sidebar-head">
            <label className="dt-search">
              <Search className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('templateSearchPlaceholder')}
              />
            </label>
            <select
              className="dt-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
            >
              <option value="all">{t('templateCategoryAll')}</option>
              {TEMPLATE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {lang === 'de' ? cat.labelDe : cat.labelEn}
                </option>
              ))}
            </select>
          </div>
          <ul className="dt-dashboard__list">
            {filtered.map((tpl) => (
              <li key={tpl.id}>
                <button
                  type="button"
                  className={[
                    'dt-dashboard__list-item',
                    selectedId === tpl.id ? 'dt-dashboard__list-item--active' : '',
                  ].join(' ').trim()}
                  onClick={() => {
                    setSelectedId(tpl.id)
                    setPreviewMode(false)
                    setSelectedFieldId(null)
                    setShowPageSettings(false)
                    setContextMenu(null)
                  }}
                >
                  <span className="dt-dashboard__list-title">{tpl.title}</span>
                  <span className="dt-dashboard__list-meta">
                    {categoryLabel(tpl.category, lang)}
                    {' · '}
                    {tpl.status === 'active' ? t('templateStatusActive') : tpl.status === 'draft' ? t('templateStatusDraft') : t('templateStatusArchived')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="dt-dashboard__main dt-dashboard__main--canvas">
          {!selected ? (
            <p className="clinical-empty-state dt-dashboard__empty">{t('templateSelectOrCreate')}</p>
          ) : (
            <>
              <div className="dt-builder-toolbar">
                <input
                  className="dt-input dt-input--title"
                  value={selected.title}
                  onChange={(e) => patchSelected({ title: e.target.value })}
                  aria-label={t('templateTitleLabel')}
                />
                <div className="dt-builder-toolbar__actions">
                  <button
                    type="button"
                    className={`dt-btn dt-btn--ghost${previewMode ? ' dt-btn--active' : ''}`}
                    onClick={() => setPreviewMode((v) => !v)}
                  >
                    <Eye className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    {previewMode ? t('templateEditMode') : t('templatePreviewMode')}
                  </button>
                  <button
                    type="button"
                    className={`dt-btn dt-btn--ghost${showPageSettings ? ' dt-btn--active' : ''}`}
                    onClick={() => {
                      setShowPageSettings((v) => !v)
                      setSelectedFieldId(null)
                    }}
                  >
                    <Settings2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    {t('templatePageSettingsShort')}
                  </button>
                </div>
              </div>

              {!previewMode ? (
                <details className="dt-builder-meta">
                  <summary>{t('templateMetaSettings')}</summary>
                  <textarea
                    className="dt-input dt-input--area"
                    value={selected.description ?? ''}
                    placeholder={t('templateDescriptionPlaceholder')}
                    rows={2}
                    onChange={(e) => patchSelected({ description: e.target.value })}
                  />
                  <div className="dt-dashboard__meta-row">
                    <label className="dt-field-label">
                      {t('templateCategoryLabel')}
                      <select
                        className="dt-select"
                        value={selected.category}
                        onChange={(e) => patchSelected({ category: e.target.value as TemplateCategory })}
                      >
                        {TEMPLATE_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {lang === 'de' ? cat.labelDe : cat.labelEn}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="dt-field-check">
                      <input
                        type="checkbox"
                        checked={selected.availability.emptyWorkspace}
                        onChange={(e) =>
                          patchSelected({
                            availability: { ...selected.availability, emptyWorkspace: e.target.checked },
                          })
                        }
                      />
                      {t('templateAvailEmpty')}
                    </label>
                    <label className="dt-field-check">
                      <input
                        type="checkbox"
                        checked={selected.availability.patientWorkspace}
                        onChange={(e) =>
                          patchSelected({
                            availability: { ...selected.availability, patientWorkspace: e.target.checked },
                          })
                        }
                      />
                      {t('templateAvailPatientWs')}
                    </label>
                    <label className="dt-field-check">
                      <input
                        type="checkbox"
                        checked={selected.availability.patientDocuments}
                        onChange={(e) =>
                          patchSelected({
                            availability: { ...selected.availability, patientDocuments: e.target.checked },
                          })
                        }
                      />
                      {t('templateAvailPatientDocs')}
                    </label>
                  </div>
                </details>
              ) : null}

              {previewMode ? (
                <A4PageView className="dt-a4-page--preview">
                  <div
                    className="dt-a4-page__inner"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </A4PageView>
              ) : (
                <A4PageView
                  onContextMenu={(e) => openContextMenu(e, sortedFields.length)}
                  onClick={() => {
                    setSelectedFieldId(null)
                    setContextMenu(null)
                  }}
                >
                  <div
                    className="dt-a4-page__inner"
                    style={{
                      paddingTop: `${pageSettings?.margins?.top ?? 20}mm`,
                      paddingRight: `${pageSettings?.margins?.right ?? 20}mm`,
                      paddingBottom: `${pageSettings?.margins?.bottom ?? 20}mm`,
                      paddingLeft: `${pageSettings?.margins?.left ?? 25}mm`,
                    }}
                  >
                    {headerPreview || pageSettings?.header?.heightMm ? (
                      <header
                        className="dt-a4-header"
                        style={{
                          minHeight: headerPreview ? undefined : `${pageSettings?.header?.heightMm ?? 15}mm`,
                        }}
                      >
                        {headerPreview ? (
                          <div dangerouslySetInnerHTML={{ __html: headerPreview }} />
                        ) : (
                          <span className="dt-a4-header__placeholder">{t('templateHeaderReserved')}</span>
                        )}
                      </header>
                    ) : null}

                    <div className="dt-a4-body">
                      <TemplateCanvas
                        fields={sortedFields}
                        lang={lang}
                        selectedFieldId={selectedFieldId}
                        onSelectField={(fieldId) => {
                          setSelectedFieldId(fieldId)
                          if (fieldId) setShowPageSettings(false)
                        }}
                        onMoveField={reorderField}
                        onPatchField={patchField}
                        onOpenInsertMenu={openContextMenu}
                      />
                    </div>

                    {footerPreview || pageSettings?.footer?.heightMm ? (
                      <footer
                        className="dt-a4-footer"
                        style={{
                          minHeight: footerPreview ? undefined : `${pageSettings?.footer?.heightMm ?? 12}mm`,
                        }}
                      >
                        {footerPreview ? (
                          <div dangerouslySetInnerHTML={{ __html: footerPreview }} />
                        ) : (
                          <span className="dt-a4-footer__placeholder">{t('templateFooterReserved')}</span>
                        )}
                      </footer>
                    ) : null}
                  </div>
                </A4PageView>
              )}

              <p className="dt-canvas-hint">{t('templateContextMenuHint')}</p>
            </>
          )}
        </main>

        {selected && !previewMode && (showPageSettings || selectedField) ? (
          <aside className="dt-dashboard__settings">
            {showPageSettings ? (
              <TemplatePageSettingsPanel template={selected} onPatch={patchSelected} />
            ) : selectedField ? (
              <>
                <TemplateFieldSettings
                  field={selectedField}
                  lang={lang}
                  onPatch={(patch) => patchField(selectedField.id, patch)}
                />
                <div className="dt-field-actions">
                  <button type="button" className="dt-btn dt-btn--xs" onClick={() => moveField(selectedField.id, -1)}>
                    ↑ {t('templateMoveUp')}
                  </button>
                  <button type="button" className="dt-btn dt-btn--xs" onClick={() => moveField(selectedField.id, 1)}>
                    ↓ {t('templateMoveDown')}
                  </button>
                  <button type="button" className="dt-btn dt-btn--xs" onClick={() => removeField(selectedField.id)}>
                    <Trash2 className="h-3 w-3" strokeWidth={1.75} />
                    {t('templateRemoveField')}
                  </button>
                </div>
              </>
            ) : null}
          </aside>
        ) : null}
      </div>

      {contextMenu ? (
        <TemplateContextMenu
          state={contextMenu}
          lang={lang}
          onSelect={insertField}
          onClose={() => setContextMenu(null)}
        />
      ) : null}

      {selected ? (
        <footer className="dt-dashboard__footer">
          <div className="dt-dashboard__footer-left">
            <button type="button" className="dt-btn dt-btn--ghost" onClick={() => duplicate(selected.id)}>
              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('templateDuplicate')}
            </button>
            <button type="button" className="dt-btn dt-btn--ghost" onClick={() => setShareOpen(true)}>
              <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('templateShare')}
            </button>
            {selected.status !== 'archived' ? (
              <button type="button" className="dt-btn dt-btn--ghost" onClick={() => archive(selected.id)}>
                <Archive className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                {t('templateArchive')}
              </button>
            ) : null}
            <button type="button" className="dt-btn dt-btn--ghost" onClick={() => void handleDelete()}>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('templateDelete')}
            </button>
            {deleteError ? <span className="dt-error">{deleteError}</span> : null}
          </div>
          <div className="dt-dashboard__footer-right">
            <button
              type="button"
              className="dt-btn dt-btn--secondary"
              onClick={() => update(selected.id, { status: 'draft' })}
            >
              {t('templateSaveDraft')}
            </button>
            <button
              type="button"
              className="dt-btn dt-btn--primary"
              onClick={() =>
                update(selected.id, {
                  status: 'active',
                  version: selected.status === 'active' ? selected.version + 1 : selected.version,
                })
              }
            >
              <Save className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              {t('templateActivate')}
            </button>
          </div>
        </footer>
      ) : null}

      {shareOpen && selected ? (
        <TemplateShareDialog template={selected} onClose={() => setShareOpen(false)} />
      ) : null}

      {importOpen ? (
        <TemplateImportDialog
          onClose={() => setImportOpen(false)}
          onImported={(templateId) => {
            setSelectedId(templateId)
            setPreviewMode(false)
            setSelectedFieldId(null)
            setShowPageSettings(false)
          }}
        />
      ) : null}
    </div>
  )
}
