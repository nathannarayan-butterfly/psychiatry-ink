import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useAuth } from '../../context/AuthContext'
import { useCurrentOrganisation } from '../../hooks/permissions/useCurrentOrganisation'
import { useCurrentMember } from '../../hooks/permissions/useCurrentMember'
import { useAccountDisplayName } from '../../hooks/useAccountDisplayName'
import type { UiTranslationKey } from '../../data/uiTranslations'
import {
  ANFORDERUNG_CATEGORIES,
  ANFORDERUNGEN_CATALOG,
  listCatalogByCategory,
  listCatalogGroups,
} from '../../data/anforderungenCatalog'
import type {
  Anforderung,
  AnforderungCategory,
  AnforderungModalPreset,
  AnforderungUrgency,
} from '../../types/anforderung'
import { catalogItemLabel } from '../../types/anforderung'
import {
  loadAnforderungen,
  resolveInitialAnforderungStatus,
  saveAnforderungen,
} from '../../utils/anforderungen/storage'
import { showNotionToast } from '../notion/NotionToast'

interface AnforderungCreateModalProps {
  caseId: string
  open: boolean
  onClose: () => void
  onCreated?: () => void
  preset?: AnforderungModalPreset | null
}

export function AnforderungCreateModal({
  caseId,
  open,
  onClose,
  onCreated,
  preset = null,
}: AnforderungCreateModalProps) {
  const { t, language } = useTranslation()
  const { user } = useAuth()
  const displayName = useAccountDisplayName()
  const { organisation } = useCurrentOrganisation()
  const { role: _role } = useCurrentMember()

  const [category, setCategory] = useState<AnforderungCategory>('labor')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [urgency, setUrgency] = useState<AnforderungUrgency>('routine')
  const [requestedDate, setRequestedDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const groups = useMemo(() => {
    const all = listCatalogGroups(category)
    if (preset?.groupKey && category === preset.category) {
      return all.filter((group) => group === preset.groupKey)
    }
    return all
  }, [category, preset])
  const itemsByGroup = useMemo(() => {
    const items = listCatalogByCategory(category)
    const map = new Map<string, typeof items>()
    for (const group of groups) {
      map.set(group, items.filter((item) => item.groupKey === group))
    }
    return map
  }, [category, groups])

  const toggleItem = useCallback((id: string, defaultUrgency: AnforderungUrgency) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (next.size === 1) setUrgency(defaultUrgency)
      }
      return next
    })
  }, [])

  const resetForm = useCallback(() => {
    setCategory('labor')
    setSelectedIds(new Set())
    setNote('')
    setUrgency('routine')
    setRequestedDate('')
  }, [])

  const applyPreset = useCallback((nextPreset: AnforderungModalPreset | null) => {
    if (!nextPreset) {
      resetForm()
      return
    }
    setCategory(nextPreset.category)
    const ids = nextPreset.selectedCatalogIds ?? []
    setSelectedIds(new Set(ids))
    if (ids.length > 0) {
      const first = ANFORDERUNGEN_CATALOG.find((item) => item.id === ids[0])
      setUrgency(first?.defaultUrgency ?? 'routine')
    } else {
      setUrgency('routine')
    }
    setNote('')
    setRequestedDate('')
  }, [resetForm])

  useEffect(() => {
    if (!open) return
    applyPreset(preset)
  }, [open, preset, applyPreset])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [onClose, resetForm])

  const handleSubmit = useCallback(() => {
    if (selectedIds.size === 0) {
      showNotionToast(t('anforderungSelectAtLeastOne'))
      return
    }

    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const existing = loadAnforderungen(caseId)
      const created: Anforderung[] = []

      for (const catalogId of selectedIds) {
        const item = ANFORDERUNGEN_CATALOG.find((c) => c.id === catalogId)
        if (!item) continue
        const status = resolveInitialAnforderungStatus(
          organisation?.tier ?? null,
          item.requiresAcceptance,
        )
        created.push({
          id: crypto.randomUUID(),
          caseId,
          catalogId: item.id,
          category: item.category,
          label: catalogItemLabel(item, language),
          note: note.trim() || undefined,
          urgency,
          requestedDate: requestedDate.trim() || undefined,
          status,
          createdAt: now,
          updatedAt: now,
          createdByUserId: user?.id,
          createdByDisplayName: displayName || undefined,
        })
      }

      saveAnforderungen([...created, ...existing], caseId)
      const pending = created.filter((o) => o.status === 'pending').length
      const count = String(created.length)
      showNotionToast(
        pending > 0
          ? t('anforderungCreatedPending').replace('{count}', count)
          : t('anforderungCreated').replace('{count}', count),
      )
      onCreated?.()
      handleClose()
    } finally {
      setSubmitting(false)
    }
  }, [
    caseId,
    displayName,
    handleClose,
    language,
    note,
    onCreated,
    organisation?.tier,
    requestedDate,
    selectedIds,
    t,
    urgency,
    user?.id,
  ])

  if (!open) return null

  return (
    <div className="anforderung-modal-backdrop" role="presentation" onClick={handleClose}>
      <div
        className="anforderung-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="anforderung-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="anforderung-modal__header">
          <h2 id="anforderung-modal-title" className="anforderung-modal__title">
            {t('anforderungAddTitle')}
          </h2>
          <button
            type="button"
            className="anforderung-modal__close"
            onClick={handleClose}
            aria-label={t('anforderungClose')}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="anforderung-modal__tabs" role="tablist">
          {ANFORDERUNG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={category === cat}
              className={`anforderung-modal__tab${category === cat ? ' anforderung-modal__tab--active' : ''}`}
              onClick={() => {
                setCategory(cat)
                setSelectedIds(new Set())
              }}
            >
              {t(`anforderungCategory_${cat}`)}
            </button>
          ))}
        </div>

        <div className="anforderung-modal__body">
          {groups.map((groupKey) => {
            const items = itemsByGroup.get(groupKey) ?? []
            if (items.length === 0) return null
            const groupLabelKey = `anforderungGroup_${groupKey}` as UiTranslationKey
            return (
              <section key={groupKey} className="anforderung-modal__group">
                <h3 className="anforderung-modal__group-title">{t(groupLabelKey)}</h3>
                <ul className="anforderung-modal__items">
                  {items.map((item) => {
                    const checked = selectedIds.has(item.id)
                    return (
                      <li key={item.id}>
                        <label className="anforderung-modal__item">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItem(item.id, item.defaultUrgency)}
                          />
                          <span>{catalogItemLabel(item, language)}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}

          <div className="anforderung-modal__meta">
            <label className="anforderung-modal__field">
              <span>{t('anforderungUrgency')}</span>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as AnforderungUrgency)}
              >
                <option value="routine">{t('anforderungUrgencyRoutine')}</option>
                <option value="soon">{t('anforderungUrgencySoon')}</option>
                <option value="urgent">{t('anforderungUrgencyUrgent')}</option>
              </select>
            </label>
            <label className="anforderung-modal__field">
              <span>{t('anforderungRequestedDate')}</span>
              <input
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
              />
            </label>
          </div>

          <label className="anforderung-modal__field anforderung-modal__field--full">
            <span>{t('anforderungNote')}</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('anforderungNotePlaceholder')}
            />
          </label>
        </div>

        <footer className="anforderung-modal__footer">
          <button type="button" className="anforderung-modal__btn" onClick={handleClose}>
            {t('anforderungCancelBtn')}
          </button>
          <button
            type="button"
            className="anforderung-modal__btn anforderung-modal__btn--primary"
            disabled={submitting || selectedIds.size === 0}
            onClick={handleSubmit}
          >
            <Check className="h-4 w-4" aria-hidden />
            {t('anforderungSubmit').replace('{count}', String(selectedIds.size))}
          </button>
        </footer>
      </div>
    </div>
  )
}
