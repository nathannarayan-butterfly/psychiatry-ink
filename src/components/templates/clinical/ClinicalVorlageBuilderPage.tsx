import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import {
  Archive,
  ArrowLeft,
  Copy,
  Eye,
  FileDown,
  FileUp,
  History,
  Pencil,
  Plus,
  Printer,
  Save,
  Search,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../../context/TranslationContext'
import type { UiTranslationKey } from '../../../data/uiTranslations'
import { useClinicalTemplates } from '../../../hooks/useClinicalTemplates'
import type {
  AiSectionBlock,
  ClinicalTemplate,
  ClinicalTemplateCategory,
  DocumentBand,
  DocumentPageSettings,
  TemplateBlock,
  TemplateFieldValues,
} from '../../../types/clinicalTemplate'
import {
  CLINICAL_TEMPLATE_CATEGORIES,
} from '../../../utils/clinicalTemplate/blockCatalog'
import { createBlock } from '../../../utils/clinicalTemplate/blockFactory'
import { resolveTemplateName } from '../../../utils/clinicalTemplate/templateName'
import {
  addChildToConditional,
  findBlock,
  insertBlockAt,
  moveBlock,
  moveChildInConditional,
  removeBlock,
  updateBlock,
} from '../../../utils/clinicalTemplate/blockOps'
import { searchClinicalTemplates } from '../../../utils/clinicalTemplate/store'
import { serializeTemplate } from '../../../utils/clinicalTemplate/schema'
import {
  createDemoClinicalData,
  type ResolvedClinicalData,
} from '../../../utils/clinicalTemplate/clinicalData'
import { resolveClinicalData } from '../../../utils/clinicalTemplate/resolveClinicalData'
import { bindingToText } from '../../../utils/clinicalTemplate/bindingEval'
import { getActiveCaseId } from '../../../utils/caseContext'
import { fillTemplateSectionApi } from '../../../services/clinicalTemplate/api'
import {
  DOCUMENT_ACCEPT,
  extractTextFromFile,
  templateNameFromFilename,
  UnsupportedDocumentError,
} from '../../../utils/clinicalTemplate/documentText'
import { resolveAnalyzedTemplate } from '../../../utils/clinicalTemplate/documentTemplateBuild'
import {
  resolvePageSettings,
  usesDistinctFirstPage,
} from '../../../utils/clinicalTemplate/documentBand'
import { exportTemplatePdf, exportTemplateWord } from '../../../utils/clinicalTemplate/printTemplate'
import { BlockPalette } from './BlockPalette'
import { BuilderCanvas, CANVAS_END_DROPPABLE, type BandSelection } from './BuilderCanvas'
import { BlockSettingsPanel } from './BlockSettingsPanel'
import { BandSettingsPanel } from './BandSettingsPanel'
import { ClinicalDocumentRenderer } from './ClinicalDocumentRenderer'
import { DocumentBand as DocumentBandView } from './DocumentBand'

interface ClinicalVorlageBuilderPageProps {
  onBack: () => void
}

export function ClinicalVorlageBuilderPage({ onBack }: ClinicalVorlageBuilderPageProps) {
  const { t, language } = useTranslation()
  const lang = language === 'de' ? 'de' : 'en'
  const { templates, create, update, duplicate, archive, activate, remove } = useClinicalTemplates()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [selectedBand, setSelectedBand] = useState<BandSelection>(null)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | ClinicalTemplateCategory>('all')
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [devMode, setDevMode] = useState(false)
  const [dataSource, setDataSource] = useState<'demo' | 'current'>('demo')
  const [data, setData] = useState<ResolvedClinicalData>(() => createDemoClinicalData(lang))
  const [values, setValues] = useState<TemplateFieldValues>({})
  const [generatingBlockId, setGeneratingBlockId] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const selected = useMemo(() => templates.find((tpl) => tpl.id === selectedId) ?? null, [templates, selectedId])
  const selectedBlock = useMemo(
    () => (selected && selectedBlockId ? findBlock(selected.blocks, selectedBlockId) : null),
    [selected, selectedBlockId],
  )

  // Page-1 appearance for the (non-paginated) canvas + preview: a distinct
  // first-page band shows its first-page variant on page 1.
  const pageOneBands = useMemo(() => {
    if (!selected) return { header: undefined as DocumentBand | undefined, footer: undefined as DocumentBand | undefined }
    const distinctFirst = usesDistinctFirstPage(resolvePageSettings(selected))
    return {
      header: distinctFirst ? selected.headerFirst ?? selected.header : selected.header,
      footer: distinctFirst ? selected.footerFirst ?? selected.footer : selected.footer,
    }
  }, [selected])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const filtered = useMemo(
    () => searchClinicalTemplates(templates, query, categoryFilter),
    [templates, query, categoryFilter],
  )

  useEffect(() => {
    let cancelled = false
    if (dataSource === 'demo') {
      setData(createDemoClinicalData(lang))
      return
    }
    void resolveClinicalData(getActiveCaseId())
      .then((resolved) => {
        if (!cancelled) setData(resolved)
      })
      .catch(() => {
        if (!cancelled) setData(createDemoClinicalData(lang))
      })
    return () => {
      cancelled = true
    }
  }, [dataSource, lang])

  const patchTemplate = useCallback(
    (patch: Partial<ClinicalTemplate>) => {
      if (selected) update(selected.id, patch)
    },
    [selected, update],
  )

  const setBlocks = useCallback(
    (blocks: TemplateBlock[]) => {
      if (selected) update(selected.id, { blocks })
    },
    [selected, update],
  )

  const handleCreate = useCallback(
    (title: string, category: ClinicalTemplateCategory, blocks?: TemplateBlock[]) => {
      const created = create({ title, category, language: lang, blocks })
      setSelectedId(created.id)
      setSelectedBlockId(null)
      setSelectedBand(null)
      setViewMode('edit')
      return created
    },
    [create, lang],
  )

  type BandKey = 'header' | 'footer' | 'headerFirst' | 'footerFirst'

  const patchBandKey = useCallback(
    (key: BandKey, patch: Partial<DocumentBand>) => {
      if (!selected) return
      const current: DocumentBand = selected[key] ?? { html: '' }
      update(selected.id, { [key]: { ...current, ...patch } })
    },
    [selected, update],
  )

  const patchPageSettings = useCallback(
    (patch: Partial<DocumentPageSettings>) => {
      if (!selected) return
      const current = resolvePageSettings(selected)
      update(selected.id, { pageSettings: { ...current, ...patch } })
    },
    [selected, update],
  )

  const addBlock = useCallback(
    (paletteId: string) => {
      if (!selected) return
      const block = createBlock(paletteId, lang)
      setBlocks([...selected.blocks, block])
      setSelectedBlockId(block.id)
    },
    [selected, lang, setBlocks],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!selected) return
      const activeId = String(event.active.id)
      const overId = event.over ? String(event.over.id) : null

      if (activeId.startsWith('palette:')) {
        const paletteId = String(event.active.data.current?.paletteId ?? activeId.slice('palette:'.length))
        const block = createBlock(paletteId, lang)
        let index = selected.blocks.length
        if (overId && overId !== CANVAS_END_DROPPABLE) {
          const overIndex = selected.blocks.findIndex((b) => b.id === overId)
          if (overIndex >= 0) index = overIndex
        }
        setBlocks(insertBlockAt(selected.blocks, block, index))
        setSelectedBlockId(block.id)
        return
      }

      if (!overId || activeId === overId) return
      const from = selected.blocks.findIndex((b) => b.id === activeId)
      const to = overId === CANVAS_END_DROPPABLE
        ? selected.blocks.length - 1
        : selected.blocks.findIndex((b) => b.id === overId)
      if (from < 0 || to < 0) return
      setBlocks(arrayMove(selected.blocks, from, to) ?? moveBlock(selected.blocks, from, to))
    },
    [selected, lang, setBlocks],
  )

  const patchBlock = useCallback(
    (patch: Partial<TemplateBlock>) => {
      if (!selected || !selectedBlockId) return
      setBlocks(updateBlock(selected.blocks, selectedBlockId, patch))
    },
    [selected, selectedBlockId, setBlocks],
  )

  const patchBlockById = useCallback(
    (id: string, patch: Partial<TemplateBlock>) => {
      if (!selected) return
      setBlocks(updateBlock(selected.blocks, id, patch))
    },
    [selected, setBlocks],
  )

  const deleteBlock = useCallback(
    (id: string) => {
      if (!selected) return
      setBlocks(removeBlock(selected.blocks, id))
      if (selectedBlockId === id) setSelectedBlockId(null)
    },
    [selected, selectedBlockId, setBlocks],
  )

  const addChild = useCallback(
    (conditionalId: string, paletteId: string) => {
      if (!selected) return
      setBlocks(addChildToConditional(selected.blocks, conditionalId, createBlock(paletteId, lang)))
    },
    [selected, lang, setBlocks],
  )

  const moveChild = useCallback(
    (conditionalId: string, childId: string, dir: -1 | 1) => {
      if (!selected) return
      setBlocks(moveChildInConditional(selected.blocks, conditionalId, childId, dir))
    },
    [selected, setBlocks],
  )

  const handleGenerateAiSection = useCallback(
    async (block: AiSectionBlock) => {
      setGeneratingBlockId(block.id)
      try {
        const contextText = bindingToText(block.sourceBinding, data)
        const result = await fillTemplateSectionApi({
          caseId: dataSource === 'current' ? getActiveCaseId() : undefined,
          prompt: block.prompt,
          contextText,
          language: lang,
          patientHints: dataSource === 'current' && data.demographics.name ? { patientName: data.demographics.name } : undefined,
        })
        setValues((prev) => ({ ...prev, [block.id]: result.content }))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setValues((prev) => ({ ...prev, [block.id]: `⚠ ${message}` }))
      } finally {
        setGeneratingBlockId(null)
      }
    },
    [data, dataSource, lang],
  )

  const exportFilename = useCallback(() => {
    const base = (selected?.title || 'Vorlage').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_')
    return base || 'Vorlage'
  }, [selected])

  const handlePrint = useCallback(() => {
    if (!selected) return
    exportTemplatePdf({ template: selected, data, values, lang, filename: exportFilename() })
  }, [selected, data, values, lang, exportFilename])

  const handleExportWord = useCallback(() => {
    if (!selected) return
    exportTemplateWord({ template: selected, data, values, lang, filename: exportFilename() })
  }, [selected, data, values, lang, exportFilename])

  if (!selected) {
    return (
      <ClinicalTemplateGallery
        templates={filtered}
        query={query}
        categoryFilter={categoryFilter}
        onQuery={setQuery}
        onCategory={setCategoryFilter}
        onSelect={(id) => {
          setSelectedId(id)
          setSelectedBlockId(null)
          setSelectedBand(null)
          setViewMode('edit')
        }}
        onCreate={(title, category) => handleCreate(title, category)}
        onAiCreate={(title, category) => {
          handleCreate(title, category)
          setAiOpen(true)
        }}
        onDocumentCreate={(title, category, blocks) => handleCreate(title, category, blocks)}
        onBack={onBack}
        lang={lang}
      />
    )
  }

  return (
    <div className="ct-builder">
      <header className="ct-builder__topbar">
        <button type="button" className="ct-btn ct-btn--ghost" onClick={() => setSelectedId(null)}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {t('vorlageBackToList')}
        </button>
        <label className="ct-builder__title-field" title={t('vorlageRenameHint')}>
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          <input
            className="ct-input ct-input--title"
            value={selected.title}
            onChange={(e) => patchTemplate({ title: e.target.value })}
            onBlur={(e) => {
              const next = resolveTemplateName(e.target.value, categoryName(selected.category, t))
              if (next !== selected.title) patchTemplate({ title: next })
            }}
            aria-label={t('vorlageTemplateTitle')}
            placeholder={categoryName(selected.category, t)}
          />
        </label>
        <div className="ct-builder__topbar-actions">
          <button
            type="button"
            className={`ct-btn ct-btn--ghost${viewMode === 'preview' ? ' ct-btn--active' : ''}`}
            onClick={() => setViewMode((m) => (m === 'preview' ? 'edit' : 'preview'))}
          >
            {viewMode === 'preview' ? <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> : <Eye className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
            {viewMode === 'preview' ? t('vorlageEditMode') : t('vorlagePreviewMode')}
          </button>
          <button type="button" className="ct-btn ct-btn--ghost" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {t('vorlageAiCreate')}
          </button>
          <button type="button" className="ct-btn ct-btn--ghost" onClick={() => setHistoryOpen(true)}>
            <History className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> v{selected.version}
          </button>
          <button type="button" className="ct-btn ct-btn--ghost" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {t('vorlagePrint')}
          </button>
          <button type="button" className="ct-btn ct-btn--ghost" onClick={handleExportWord}>
            <FileDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {t('vorlageExportWord')}
          </button>
          <button
            type="button"
            className={`ct-btn ct-btn--ghost${devMode ? ' ct-btn--active' : ''}`}
            onClick={() => setDevMode((v) => !v)}
            title={t('vorlageDevMode')}
          >
            <Wrench className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {devMode ? t('vorlageDevModeOn') : t('vorlageDevModeOff')}
          </button>
        </div>
      </header>

      <div className="ct-builder__meta">
        <label className="ct-meta-field">
          <span>{t('vorlageCategoryLabel')}</span>
          <select
            className="ct-input"
            value={selected.category}
            onChange={(e) => patchTemplate({ category: e.target.value as ClinicalTemplateCategory })}
          >
            {CLINICAL_TEMPLATE_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>{t(cat.labelKey)}</option>
            ))}
          </select>
        </label>
        <label className="ct-meta-field">
          <span>{t('vorlageScopeLabel')}</span>
          <select
            className="ct-input"
            value={selected.scope}
            onChange={(e) => patchTemplate({ scope: e.target.value as 'personal' | 'organization' })}
          >
            <option value="personal">{t('vorlageScopePersonal')}</option>
            <option value="organization">{t('vorlageScopeOrg')}</option>
          </select>
        </label>
        <label className="ct-meta-field">
          <span>{t('vorlageDataSource')}</span>
          <select className="ct-input" value={dataSource} onChange={(e) => setDataSource(e.target.value as 'demo' | 'current')}>
            <option value="demo">{t('vorlageDataDemo')}</option>
            <option value="current">{t('vorlageDataCurrent')}</option>
          </select>
        </label>
        {dataSource === 'current' && data.source !== 'real' ? (
          <span className="ct-meta-hint">{t('vorlageNoCaseHint')}</span>
        ) : null}
      </div>

      {viewMode === 'preview' ? (
        <div className="ct-preview-wrap">
          <div className="ct-preview-pane ct-print-area">
            <DocumentBandView position="header" band={pageOneBands.header} data={data} mode="render" />
            <div className="ct-preview-body">
              <ClinicalDocumentRenderer
                blocks={selected.blocks}
                data={data}
                values={values}
                interactive
                flow
                onValueChange={(id, v) => setValues((prev) => ({ ...prev, [id]: v }))}
                onGenerateAiSection={handleGenerateAiSection}
                generatingBlockId={generatingBlockId}
              />
            </div>
            <DocumentBandView position="footer" band={pageOneBands.footer} data={data} mode="render" />
          </div>
          {devMode ? <DeveloperPanel template={selected} /> : null}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="ct-builder__layout">
            <BlockPalette onAdd={addBlock} />
            <BuilderCanvas
              blocks={selected.blocks}
              data={data}
              selectedBlockId={selectedBlockId}
              onSelect={(id) => {
                setSelectedBlockId(id)
                if (id) setSelectedBand(null)
              }}
              onDelete={deleteBlock}
              onPatchBlock={patchBlockById}
              header={pageOneBands.header}
              footer={pageOneBands.footer}
              selectedBand={selectedBand}
              onSelectBand={(band) => {
                setSelectedBand(band)
                if (band) setSelectedBlockId(null)
              }}
            />
            <div className="ct-builder__right">
              {selectedBand ? (
                <BandSettingsPanel
                  position={selectedBand}
                  band={selected[selectedBand]}
                  bandFirst={selected[selectedBand === 'header' ? 'headerFirst' : 'footerFirst']}
                  pageSettings={resolvePageSettings(selected)}
                  onPatchBand={(patch) => patchBandKey(selectedBand, patch)}
                  onPatchBandFirst={(patch) =>
                    patchBandKey(selectedBand === 'header' ? 'headerFirst' : 'footerFirst', patch)
                  }
                  onPatchPageSettings={patchPageSettings}
                />
              ) : selectedBlock ? (
                <BlockSettingsPanel
                  block={selectedBlock}
                  onPatch={patchBlock}
                  onAddChild={addChild}
                  onMoveChild={moveChild}
                  onDeleteBlock={deleteBlock}
                />
              ) : (
                <aside className="ct-settings ct-settings--empty">
                  <p>{t('vorlageSelectBlockHint')}</p>
                  <p className="ct-settings__note">{t('vorlageBandEditHint')}</p>
                </aside>
              )}
              {devMode ? <DeveloperPanel template={selected} /> : null}
            </div>
          </div>
        </DndContext>
      )}

      <footer className="ct-builder__footer">
        <div className="ct-builder__footer-left">
          <button type="button" className="ct-btn ct-btn--ghost" onClick={() => { const c = duplicate(selected.id); if (c) setSelectedId(c.id) }}>
            <Copy className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {t('vorlageDuplicate')}
          </button>
          {selected.status !== 'archived' ? (
            <button type="button" className="ct-btn ct-btn--ghost" onClick={() => archive(selected.id)}>
              <Archive className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {t('vorlageArchive')}
            </button>
          ) : null}
          <button type="button" className="ct-btn ct-btn--ghost" onClick={() => { remove(selected.id); setSelectedId(null) }}>
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {t('vorlageDelete')}
          </button>
          <span className="ct-builder__status">{statusLabel(selected.status, t)}</span>
        </div>
        <div className="ct-builder__footer-right">
          <button type="button" className="ct-btn ct-btn--secondary" onClick={() => patchTemplate({ status: 'draft' })}>
            {t('vorlageSaveDraft')}
          </button>
          <button type="button" className="ct-btn ct-btn--primary" onClick={() => activate(selected.id)}>
            <Save className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {t('vorlageActivate')}
          </button>
        </div>
      </footer>

      {aiOpen ? (
        <AiCreateDialog
          template={selected}
          lang={lang}
          onClose={() => setAiOpen(false)}
          onApply={(blocks, mode) => {
            setBlocks(mode === 'replace' ? blocks : [...selected.blocks, ...blocks])
            setAiOpen(false)
          }}
        />
      ) : null}

      {historyOpen ? (
        <VersionHistoryDialog
          template={selected}
          onClose={() => setHistoryOpen(false)}
          onRestore={(blocks) => {
            setBlocks(blocks)
            setHistoryOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

type TFn = (k: UiTranslationKey) => string

function statusLabel(status: ClinicalTemplate['status'], t: TFn): string {
  if (status === 'active') return t('vorlageStatusActive')
  if (status === 'archived') return t('vorlageStatusArchived')
  return t('vorlageStatusDraft')
}

function DeveloperPanel({ template }: { template: ClinicalTemplate }) {
  const { t } = useTranslation()
  return (
    <section className="ct-dev">
      <div className="ct-dev__head">{t('vorlageDevTitle')}</div>
      <dl className="ct-dev__stats">
        <div><dt>schemaVersion</dt><dd>{template.schemaVersion}</dd></div>
        <div><dt>version</dt><dd>{template.version}</dd></div>
        <div><dt>blocks</dt><dd>{template.blocks.length}</dd></div>
        <div><dt>status</dt><dd>{template.status}</dd></div>
        <div><dt>scope</dt><dd>{template.scope}</dd></div>
      </dl>
      <pre className="ct-dev__json">{serializeTemplate(template)}</pre>
    </section>
  )
}

function ClinicalTemplateGallery({
  templates,
  query,
  categoryFilter,
  onQuery,
  onCategory,
  onSelect,
  onCreate,
  onAiCreate,
  onDocumentCreate,
  onBack,
  lang,
}: {
  templates: ClinicalTemplate[]
  query: string
  categoryFilter: 'all' | ClinicalTemplateCategory
  onQuery: (q: string) => void
  onCategory: (c: 'all' | ClinicalTemplateCategory) => void
  onSelect: (id: string) => void
  onCreate: (title: string, category: ClinicalTemplateCategory) => void
  onAiCreate: (title: string, category: ClinicalTemplateCategory) => void
  onDocumentCreate: (title: string, category: ClinicalTemplateCategory, blocks: TemplateBlock[]) => void
  onBack: () => void
  lang: 'de' | 'en'
}) {
  const { t } = useTranslation()
  const [createOpen, setCreateOpen] = useState(false)
  const [createForAi, setCreateForAi] = useState(false)
  const [docOpen, setDocOpen] = useState(false)

  const openCreate = (forAi: boolean) => {
    setCreateForAi(forAi)
    setCreateOpen(true)
  }

  return (
    <div className="ct-gallery">
      <header className="ct-gallery__topbar">
        <button type="button" className="ct-btn ct-btn--ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {t('vorlageBackDashboard')}
        </button>
        <h1 className="ct-gallery__title">{t('vorlageBuilderTitle')}</h1>
        <div className="ct-gallery__actions">
          <button type="button" className="ct-btn ct-btn--ghost" onClick={() => setDocOpen(true)}>
            <FileUp className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {t('vorlageDocCreate')}
          </button>
          <button type="button" className="ct-btn ct-btn--ghost" onClick={() => openCreate(true)}>
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> {t('vorlageAiCreate')}
          </button>
          <button type="button" className="ct-btn ct-btn--primary" onClick={() => openCreate(false)}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> {t('vorlageCreate')}
          </button>
        </div>
      </header>

      {createOpen ? (
        <CreateTemplateDialog
          forAi={createForAi}
          onClose={() => setCreateOpen(false)}
          onConfirm={(title, category) => {
            setCreateOpen(false)
            if (createForAi) onAiCreate(title, category)
            else onCreate(title, category)
          }}
        />
      ) : null}

      {docOpen ? (
        <CreateFromDocumentDialog
          lang={lang}
          onClose={() => setDocOpen(false)}
          onCreate={(title, category, blocks) => {
            setDocOpen(false)
            onDocumentCreate(title, category, blocks)
          }}
        />
      ) : null}
      <div className="ct-gallery__filters">
        <label className="ct-search">
          <Search className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          <input type="search" value={query} placeholder={t('vorlageSearchPlaceholder')} onChange={(e) => onQuery(e.target.value)} />
        </label>
        <select className="ct-input" value={categoryFilter} onChange={(e) => onCategory(e.target.value as 'all' | ClinicalTemplateCategory)}>
          <option value="all">{t('vorlageCategoryAll')}</option>
          {CLINICAL_TEMPLATE_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>{t(cat.labelKey)}</option>
          ))}
        </select>
      </div>
      {templates.length === 0 ? (
        <p className="ct-gallery__empty">{t('vorlageGalleryEmpty')}</p>
      ) : (
        <ul className="ct-gallery__grid">
          {templates.map((tpl) => (
            <li key={tpl.id}>
              <button type="button" className="ct-gallery__card" onClick={() => onSelect(tpl.id)}>
                <span className="ct-gallery__card-title">{tpl.title}</span>
                <span className="ct-gallery__card-meta">
                  {categoryName(tpl.category, t)} · {tpl.blocks.length} {t('vorlageBlocksCount')}
                </span>
                <span className={`ct-gallery__badge ct-gallery__badge--${tpl.status}`}>
                  {statusLabel(tpl.status, t)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function categoryName(category: ClinicalTemplateCategory, t: TFn): string {
  const match = CLINICAL_TEMPLATE_CATEGORIES.find((c) => c.id === category)
  return match ? t(match.labelKey) : category
}

function CreateTemplateDialog({
  forAi,
  onClose,
  onConfirm,
}: {
  forAi: boolean
  onClose: () => void
  onConfirm: (title: string, category: ClinicalTemplateCategory) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ClinicalTemplateCategory>('custom')
  const fallback = categoryName(category, t)

  const submit = () => onConfirm(resolveTemplateName(name, fallback), category)

  return (
    <div className="ct-modal-overlay" onClick={onClose}>
      <div className="ct-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="ct-modal__title">
          {forAi ? <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden /> : <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />}
          {t('vorlageCreateDialogTitle')}
        </h2>
        <p className="ct-modal__desc">{t('vorlageCreateDialogDesc')}</p>
        <label className="ct-settings__field">
          <span className="ct-settings__field-label">{t('vorlageCreateNameLabel')}</span>
          <input
            className="ct-input"
            value={name}
            autoFocus
            placeholder={fallback}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
          />
        </label>
        <label className="ct-settings__field">
          <span className="ct-settings__field-label">{t('vorlageCategoryLabel')}</span>
          <select className="ct-input" value={category} onChange={(e) => setCategory(e.target.value as ClinicalTemplateCategory)}>
            {CLINICAL_TEMPLATE_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>{t(cat.labelKey)}</option>
            ))}
          </select>
        </label>
        <p className="ct-settings__note">{t('vorlageCreateNameHint')}</p>
        <div className="ct-modal__actions">
          <button type="button" className="ct-btn ct-btn--ghost" onClick={onClose}>{t('vorlageCancel')}</button>
          <button type="button" className="ct-btn ct-btn--primary" onClick={submit}>
            {forAi ? t('vorlageCreateContinueAi') : t('vorlageCreateConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateFromDocumentDialog({
  lang,
  onClose,
  onCreate,
}: {
  lang: 'de' | 'en'
  onClose: () => void
  onCreate: (title: string, category: ClinicalTemplateCategory, blocks: TemplateBlock[]) => void
}) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [filename, setFilename] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState<{ category: ClinicalTemplateCategory; blocks: TemplateBlock[] } | null>(null)

  const handleFile = async (file: File | null) => {
    if (!file) return
    setError(null)
    setNotice(null)
    setExtracting(true)
    try {
      const extracted = await extractTextFromFile(file)
      setText(extracted.text)
      setFilename(file.name)
      if (!name.trim()) setName(templateNameFromFilename(file.name))
      if (extracted.truncated) setNotice(t('vorlageDocTruncated'))
    } catch (e) {
      if (e instanceof UnsupportedDocumentError) {
        setError(
          e.message === 'legacy_doc'
            ? t('vorlageDocLegacyDoc')
            : e.message === 'pdf_no_text'
              ? t('vorlageDocPdfNoText')
              : t('vorlageDocUnsupported'),
        )
      } else {
        setError(e instanceof Error ? e.message : String(e))
      }
    } finally {
      setExtracting(false)
    }
  }

  const create = (category: ClinicalTemplateCategory, blocks: TemplateBlock[]) => {
    onCreate(resolveTemplateName(name, categoryName(category, t)), category, blocks)
  }

  const run = async () => {
    const source = text.trim()
    if (!source) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const { analyzeDocumentApi } = await import('../../../services/clinicalTemplate/api')
      const result = await analyzeDocumentApi({
        text: source,
        filename: filename || undefined,
        language: lang,
      })
      const resolved = resolveAnalyzedTemplate({
        category: result.category,
        blocks: result.blocks,
        rawText: source,
      })
      if (resolved.usedFallback) {
        // AI could not produce a usable structure — keep the raw text as a
        // single block and let the clinician confirm before entering the builder.
        setPending({ category: resolved.category, blocks: resolved.blocks })
        setNotice(t('vorlageDocFallbackNote'))
        return
      }
      create(resolved.category, resolved.blocks)
    } catch (e) {
      const err = e as Error & { code?: string }
      if (err.code === 'insufficient_credits') setError(t('vorlageAiInsufficientCredits'))
      else if (err.code === 'phi_blocked') setError(t('vorlageDocPhiBlocked'))
      else setError(err instanceof Error ? err.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ct-modal-overlay" onClick={onClose}>
      <div className="ct-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="ct-modal__title">
          <FileUp className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {t('vorlageDocCreate')}
        </h2>
        <p className="ct-modal__desc">{t('vorlageDocDesc')}</p>

        <label className="ct-doc-upload">
          <input
            type="file"
            accept={DOCUMENT_ACCEPT}
            className="ct-doc-upload__input"
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />
          <FileUp className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          <span>{extracting ? t('vorlageDocExtracting') : filename || t('vorlageDocChooseFile')}</span>
        </label>
        <p className="ct-settings__note">{t('vorlageDocFormats')}</p>

        <label className="ct-settings__field">
          <span className="ct-settings__field-label">{t('vorlageDocPasteLabel')}</span>
          <textarea
            className="ct-input ct-input--area"
            rows={6}
            value={text}
            placeholder={t('vorlageDocPastePlaceholder')}
            onChange={(e) => {
              setText(e.target.value)
              setNotice(null)
              setPending(null)
            }}
          />
        </label>

        <label className="ct-settings__field">
          <span className="ct-settings__field-label">{t('vorlageCreateNameLabel')}</span>
          <input
            className="ct-input"
            value={name}
            placeholder={t('vorlageDocNamePlaceholder')}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <p className="ct-settings__note">{t('vorlageAiBillingNote')}</p>
        {notice ? <p className="ct-settings__note ct-doc-notice">{notice}</p> : null}
        {error ? <p className="ct-error">{error}</p> : null}

        <div className="ct-modal__actions">
          <button type="button" className="ct-btn ct-btn--ghost" onClick={onClose}>{t('vorlageCancel')}</button>
          {pending ? (
            <button
              type="button"
              className="ct-btn ct-btn--primary"
              onClick={() => create(pending.category, pending.blocks)}
            >
              {t('vorlageDocOpenAnyway')}
            </button>
          ) : (
            <button
              type="button"
              className="ct-btn ct-btn--primary"
              disabled={busy || extracting || !text.trim()}
              onClick={() => void run()}
            >
              {busy ? t('vorlageDocAnalyzing') : t('vorlageDocAnalyzeCreate')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function AiCreateDialog({
  template,
  lang,
  onClose,
  onApply,
}: {
  template: ClinicalTemplate
  lang: 'de' | 'en'
  onClose: () => void
  onApply: (blocks: TemplateBlock[], mode: 'replace' | 'append') => void
}) {
  const { t } = useTranslation()
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (mode: 'replace' | 'append') => {
    setBusy(true)
    setError(null)
    try {
      const { generateTemplateDraftApi } = await import('../../../services/clinicalTemplate/api')
      const result = await generateTemplateDraftApi({ description, category: template.category, language: lang })
      if (!result.blocks.length) {
        setError(t('vorlageAiNoBlocks'))
        return
      }
      onApply(result.blocks, mode)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ct-modal-overlay" onClick={onClose}>
      <div className="ct-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="ct-modal__title">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {t('vorlageAiCreate')}
        </h2>
        <p className="ct-modal__desc">{t('vorlageAiCreateDesc')}</p>
        <textarea
          className="ct-input ct-input--area"
          rows={5}
          value={description}
          placeholder={t('vorlageAiCreatePlaceholder')}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="ct-settings__note">{t('vorlageAiBillingNote')}</p>
        {error ? <p className="ct-error">{error}</p> : null}
        <div className="ct-modal__actions">
          <button type="button" className="ct-btn ct-btn--ghost" onClick={onClose}>{t('vorlageCancel')}</button>
          <button type="button" className="ct-btn ct-btn--secondary" disabled={busy || !description.trim()} onClick={() => void run('append')}>
            {t('vorlageAiAppend')}
          </button>
          <button type="button" className="ct-btn ct-btn--primary" disabled={busy || !description.trim()} onClick={() => void run('replace')}>
            {busy ? t('vorlageAiGenerating') : t('vorlageAiReplace')}
          </button>
        </div>
      </div>
    </div>
  )
}

function VersionHistoryDialog({
  template,
  onClose,
  onRestore,
}: {
  template: ClinicalTemplate
  onClose: () => void
  onRestore: (blocks: TemplateBlock[]) => void
}) {
  const { t } = useTranslation()
  const history = template.history ?? []
  return (
    <div className="ct-modal-overlay" onClick={onClose}>
      <div className="ct-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="ct-modal__title">
          <History className="h-4 w-4" strokeWidth={1.75} aria-hidden /> {t('vorlageVersionHistory')}
        </h2>
        <p className="ct-modal__desc">{t('vorlageVersionCurrent')}: v{template.version}</p>
        {history.length === 0 ? (
          <p className="ct-settings__note">{t('vorlageNoHistory')}</p>
        ) : (
          <ul className="ct-history">
            {history.map((snap) => (
              <li key={`${snap.version}-${snap.savedAt}`} className="ct-history__row">
                <span>v{snap.version} · {new Date(snap.savedAt).toLocaleString()} · {snap.blocks.length} {t('vorlageBlocksCount')}</span>
                <button type="button" className="ct-btn ct-btn--xs" onClick={() => onRestore(snap.blocks)}>
                  {t('vorlageRestore')}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="ct-modal__actions">
          <button type="button" className="ct-btn ct-btn--ghost" onClick={onClose}>{t('vorlageClose')}</button>
        </div>
      </div>
    </div>
  )
}
