import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { therapyPageSectionDomId } from '../../data/therapyPageSections'
import { useSozialtherapie } from '../../hooks/useSozialtherapie'
import {
  SOZIALTHERAPIE_ROLES,
  translateSozialtherapieArea,
  translateSozialtherapieRole,
  translateSozialtherapieStatus,
  translateSozialtherapieUi as ts,
} from '../../data/sozialtherapieUiTranslations'
import {
  DEFAULT_SOZIALTHERAPIE_AREAS,
  SOZIALTHERAPIE_STATUSES,
  createSozialtherapieTask,
  type SozialtherapieStatus,
  type SozialtherapieTarget,
} from '../../types/sozialtherapie'

interface SozialtherapieSectionProps {
  caseId: string
  workspacePlanning?: boolean
  onWorkspacePlanningClose?: () => void
}

/** Maps sozialtherapie status onto the shared therapy status-pill palette. */
const STATUS_TONE: Record<SozialtherapieStatus, string> = {
  open: 'amber',
  'in-progress': 'blue',
  arranged: 'violet',
  resolved: 'green',
  'not-relevant': 'gray',
}

export function SozialtherapieSection({
  caseId,
  workspacePlanning = false,
  onWorkspacePlanningClose,
}: SozialtherapieSectionProps) {
  const { language } = useTranslation()
  const { targets, addTarget, updateTarget, removeTarget } = useSozialtherapie(caseId)
  const [openId, setOpenId] = useState<string | null>(null)
  const [picker, setPicker] = useState(workspacePlanning)
  const [customName, setCustomName] = useState('')

  useEffect(() => {
    if (workspacePlanning) setPicker(true)
  }, [workspacePlanning])

  const closeWorkspacePlanning = useCallback(() => {
    onWorkspacePlanningClose?.()
  }, [onWorkspacePlanningClose])

  const closePicker = useCallback(() => {
    setPicker(false)
    if (workspacePlanning) closeWorkspacePlanning()
  }, [workspacePlanning, closeWorkspacePlanning])

  const closeDetail = useCallback(() => {
    setOpenId(null)
    if (workspacePlanning) closeWorkspacePlanning()
  }, [workspacePlanning, closeWorkspacePlanning])

  const usedAreas = useMemo(() => new Set(targets.map((t) => t.area)), [targets])
  const availablePredefined = DEFAULT_SOZIALTHERAPIE_AREAS.filter((area) => !usedAreas.has(area))
  const openTarget = useMemo(
    () => targets.find((target) => target.id === openId) ?? null,
    [targets, openId],
  )

  useEffect(() => {
    if (!openId) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [openId])

  const handleAdd = (area: string) => {
    const created = addTarget(area)
    setPicker(false)
    setCustomName('')
    if (created) setOpenId(created.id)
  }

  const handleAddCustom = () => {
    if (!customName.trim()) return
    handleAdd(customName.trim())
  }

  const detailModal = openTarget ? (
    <div
      className="therapy-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={closeDetail}
    >
      <div className="therapy-modal therapy-modal--wide" onClick={(e) => e.stopPropagation()}>
        <SozialtherapieDetail
          target={openTarget}
          language={language}
          onUpdate={(patch) => updateTarget(openTarget.id, patch)}
          onClose={closeDetail}
          onDelete={() => {
            if (window.confirm(ts(language, 'szConfirmDelete'))) {
              closeDetail()
              removeTarget(openTarget.id)
            }
          }}
        />
      </div>
    </div>
  ) : null

  const pickerModal = picker ? (
    <div
      className="therapy-modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={closePicker}
    >
      <div
        className="therapy-modal therapy-modal--narrow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="therapy-modal__head">
          <div className="therapy-modal__heading">
            <h4 className="therapy-modal__title">{ts(language, 'szPickerTitle')}</h4>
          </div>
          <button
            type="button"
            className="therapy-modal__close"
            onClick={closePicker}
            aria-label={ts(language, 'szClose')}
          >
            ×
          </button>
        </div>

        <div className="therapy-modal__body">
          <div className="therapy-picker">
            {availablePredefined.length > 0 && (
              <div className="therapy-picker__chips">
                {availablePredefined.map((area) => (
                  <button
                    key={area}
                    type="button"
                    className="therapy-chip"
                    onClick={() => handleAdd(area)}
                  >
                    {translateSozialtherapieArea(language, area)}
                  </button>
                ))}
              </div>
            )}
            <div className="therapy-picker__custom">
              <input
                type="text"
                className="therapy-input"
                value={customName}
                placeholder={ts(language, 'szCustomAreaPlaceholder')}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustom()
                }}
                autoFocus
              />
              <button
                type="button"
                className="therapy-btn therapy-btn--primary"
                onClick={handleAddCustom}
                disabled={!customName.trim()}
              >
                {ts(language, 'szAdd')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null

  if (workspacePlanning) {
    return (
      <>
        {detailModal}
        {pickerModal}
      </>
    )
  }

  return (
    <section className="therapy-section" id={therapyPageSectionDomId('sozial')}>
      <header className="therapy-section__header">
        <div className="therapy-section__heading">
          <h3 className="therapy-section__title">{ts(language, 'szSectionTitle')}</h3>
        </div>
        <div className="therapy-section__actions">
          <button
            type="button"
            className="therapy-add-btn"
            onClick={() => setPicker(true)}
          >
            {ts(language, 'szAddArea')}
          </button>
        </div>
      </header>

      <div className="therapy-section__body">
        {targets.length === 0 ? (
          <p className="therapy-empty">{ts(language, 'szEmpty')}</p>
        ) : (
          <div className="therapy-card-grid">
            {targets.map((target) => (
              <SozialtherapieCard
                key={target.id}
                target={target}
                language={language}
                selected={openId === target.id}
                onOpen={() => setOpenId(target.id)}
              />
            ))}
          </div>
        )}
      </div>

      {detailModal}
      {pickerModal}
    </section>
  )
}

interface SozialtherapieCardProps {
  target: SozialtherapieTarget
  language: ReturnType<typeof useTranslation>['language']
  selected: boolean
  onOpen: () => void
}

function SozialtherapieCard({ target, language, selected, onOpen }: SozialtherapieCardProps) {
  const areaLabel = translateSozialtherapieArea(language, target.area)
  const tasks = target.tasks ?? []
  const openTasks = tasks.filter((task) => !task.done).length

  return (
    <button
      type="button"
      className={`therapy-card${selected ? ' is-selected' : ''}`}
      onClick={onOpen}
    >
      <div className="therapy-card__head">
        <span className="therapy-card__title">{areaLabel}</span>
        <span className={`therapy-status therapy-status--${STATUS_TONE[target.status]}`}>
          {translateSozialtherapieStatus(language, target.status)}
        </span>
      </div>
      <div className="therapy-card__meta">
        <SummaryRow label={ts(language, 'szGoal')} value={target.goal} />
        <SummaryRow label={ts(language, 'szCurrentMeasure')} value={target.currentMeasure} />
        <SummaryRow
          label={ts(language, 'szResponsibleRole')}
          value={
            target.responsibleRole
              ? translateSozialtherapieRole(language, target.responsibleRole)
              : undefined
          }
        />
        {openTasks > 0 && <SummaryRow label={ts(language, 'szTasks')} value={`${openTasks}`} />}
      </div>
    </button>
  )
}

interface SozialtherapieDetailProps {
  target: SozialtherapieTarget
  language: ReturnType<typeof useTranslation>['language']
  onUpdate: (patch: Partial<Omit<SozialtherapieTarget, 'id' | 'createdAt'>>) => void
  onClose: () => void
  onDelete: () => void
}

function SozialtherapieDetail({
  target,
  language,
  onUpdate,
  onClose,
  onDelete,
}: SozialtherapieDetailProps) {
  const [taskDraft, setTaskDraft] = useState('')
  const areaLabel = translateSozialtherapieArea(language, target.area)
  const tasks = target.tasks ?? []

  const addTask = () => {
    if (!taskDraft.trim()) return
    onUpdate({ tasks: [...tasks, createSozialtherapieTask(taskDraft)] })
    setTaskDraft('')
  }

  const toggleTask = (id: string) => {
    onUpdate({
      tasks: tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    })
  }

  const removeTask = (id: string) => {
    onUpdate({ tasks: tasks.filter((task) => task.id !== id) })
  }

  return (
    <div className="therapy-detail-panel">
      <div className="therapy-detail-panel__head">
        <div className="therapy-detail-panel__heading">
          <h4 className="therapy-detail-panel__title">{areaLabel}</h4>
          <span className={`therapy-status therapy-status--${STATUS_TONE[target.status]}`}>
            {translateSozialtherapieStatus(language, target.status)}
          </span>
        </div>
        <button
          type="button"
          className="therapy-detail-panel__close"
          onClick={onClose}
          aria-label={ts(language, 'szClose')}
        >
          ×
        </button>
      </div>

      <div className="therapy-detail-panel__body">
          <div className="therapy-field-grid">
            <Field label={ts(language, 'szStatus')}>
              <select
                className="therapy-select"
                value={target.status}
                onChange={(e) => onUpdate({ status: e.target.value as SozialtherapieStatus })}
              >
                {SOZIALTHERAPIE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {translateSozialtherapieStatus(language, status)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={ts(language, 'szResponsibleRole')}>
              <select
                className="therapy-select"
                value={SOZIALTHERAPIE_ROLES.includes(target.responsibleRole as never)
                  ? target.responsibleRole
                  : target.responsibleRole
                    ? '__custom'
                    : ''}
                onChange={(e) => {
                  if (e.target.value === '__custom') return
                  onUpdate({ responsibleRole: e.target.value })
                }}
              >
                <option value="">{ts(language, 'szSelectRole')}</option>
                {SOZIALTHERAPIE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {translateSozialtherapieRole(language, role)}
                  </option>
                ))}
                {target.responsibleRole &&
                  !SOZIALTHERAPIE_ROLES.includes(target.responsibleRole as never) && (
                    <option value="__custom">{target.responsibleRole}</option>
                  )}
              </select>
            </Field>

            <Field label={ts(language, 'szGoal')} wide>
              <textarea
                className="therapy-textarea"
                value={target.goal ?? ''}
                placeholder={ts(language, 'szPlaceholderGoal')}
                rows={2}
                onChange={(e) => onUpdate({ goal: e.target.value })}
              />
            </Field>

            <Field label={ts(language, 'szCurrentMeasure')} wide>
              <textarea
                className="therapy-textarea"
                value={target.currentMeasure ?? ''}
                placeholder={ts(language, 'szPlaceholderMeasure')}
                rows={2}
                onChange={(e) => onUpdate({ currentMeasure: e.target.value })}
              />
            </Field>
          </div>

          <div className="therapy-log">
            <span className="therapy-field__label">{ts(language, 'szTasks')}</span>
            {tasks.length === 0 ? (
              <p className="therapy-log__empty">{ts(language, 'szNoTasks')}</p>
            ) : (
              <ul className="therapy-tasks">
                {tasks.map((task) => (
                  <li key={task.id} className="therapy-task">
                    <label className="therapy-task__label">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(task.id)}
                      />
                      <span className={task.done ? 'therapy-task__text therapy-task__text--done' : 'therapy-task__text'}>
                        {task.text}
                      </span>
                    </label>
                    <button
                      type="button"
                      className="therapy-task__remove"
                      onClick={() => removeTask(task.id)}
                      aria-label={ts(language, 'szDelete')}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="therapy-task__add">
              <input
                type="text"
                className="therapy-input"
                value={taskDraft}
                placeholder={ts(language, 'szTaskPlaceholder')}
                onChange={(e) => setTaskDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTask()
                }}
              />
              <button
                type="button"
                className="therapy-btn therapy-btn--ghost"
                onClick={addTask}
                disabled={!taskDraft.trim()}
              >
                {ts(language, 'szAddTask')}
              </button>
            </div>
          </div>

          <div className="therapy-field-grid">
            <Field label={ts(language, 'szNotes')} wide>
              <textarea
                className="therapy-textarea"
                value={target.notes ?? ''}
                placeholder={ts(language, 'szPlaceholderNotes')}
                rows={2}
                onChange={(e) => onUpdate({ notes: e.target.value })}
              />
            </Field>
            <Field label={ts(language, 'szNextSteps')} wide>
              <textarea
                className="therapy-textarea"
                value={target.nextSteps ?? ''}
                placeholder={ts(language, 'szPlaceholderNextSteps')}
                rows={2}
                onChange={(e) => onUpdate({ nextSteps: e.target.value })}
              />
            </Field>
            <Field label={ts(language, 'szDates')} wide>
              <input
                type="text"
                className="therapy-input"
                value={target.dates ?? ''}
                placeholder={ts(language, 'szPlaceholderDates')}
                onChange={(e) => onUpdate({ dates: e.target.value })}
              />
            </Field>
          </div>
        </div>

        <div className="therapy-detail-panel__footer">
          <button type="button" className="therapy-btn therapy-btn--danger" onClick={onDelete}>
            {ts(language, 'szDelete')}
          </button>
          <button type="button" className="therapy-btn therapy-btn--primary" onClick={onClose}>
            {ts(language, 'szClose')}
          </button>
        </div>
      </div>
  )
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  if (!value || !value.trim()) return null
  return (
    <div className="therapy-card__row">
      <span className="therapy-meta-label">{label}</span>
      <span className="therapy-meta-value">{value}</span>
    </div>
  )
}

function Field({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={`therapy-field${wide ? ' therapy-field--wide' : ''}`}>
      <span className="therapy-field__label">{label}</span>
      {children}
    </label>
  )
}
