import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import type {
  ComplianceDayCell,
  ComplianceDayStatus,
  ComplianceItemTimeline,
  ComplianceSummaryData,
} from '../../../utils/overview/complianceSummary'
import {
  applyComplianceOverrides,
  loadComplianceOverrides,
  removeComplianceOverride,
  setComplianceOverride,
  type ComplianceOverride,
} from '../../../utils/overview/complianceOverrides'
import { OverviewCard, OverviewEmpty } from './OverviewCard'

interface ComplianceOverviewCardProps {
  data: ComplianceSummaryData
  caseId: string
}

type ComplianceGroupKind = 'medication' | 'therapy'

const THERAPY_STATUS_LABEL: Record<ComplianceDayStatus, string> = {
  participated: 'Teilgenommen',
  refused: 'Verweigert',
  excused: 'Entschuldigt / krank',
  unknown: 'Keine Angabe',
}

const MEDICATION_EDITABLE_STATUSES: ComplianceDayStatus[] = ['participated', 'refused']

const THERAPY_EDITABLE_STATUSES: ComplianceDayStatus[] = [
  'participated',
  'refused',
  'excused',
  'unknown',
]

function editableStatusesFor(group: ComplianceGroupKind): ComplianceDayStatus[] {
  return group === 'medication' ? MEDICATION_EDITABLE_STATUSES : THERAPY_EDITABLE_STATUSES
}

function statusLabelFor(status: ComplianceDayStatus, group: ComplianceGroupKind): string {
  if (group === 'medication') {
    if (status === 'participated') return 'Eingenommen'
    if (status === 'refused') return 'Verweigert'
  }
  return THERAPY_STATUS_LABEL[status]
}

interface DayAxisEntry {
  dateIso: string
  dayLabel: string
  weekdayLabel: string
}

interface AllItem extends ComplianceItemTimeline {
  group: 'medication' | 'therapy'
}

interface OpenCell {
  itemKey: string
  dateIso: string
}

function overallTone(percent: number | null): 'ok' | 'moderate' | 'high' | 'neutral' {
  if (percent == null) return 'neutral'
  if (percent >= 80) return 'ok'
  if (percent >= 50) return 'moderate'
  return 'high'
}

function formatPercent(percent: number | null): string {
  if (percent == null) return 'k. A.'
  return `${percent}%`
}

/** `2026-06-09` → `09.06.2026`. */
function formatGermanDate(dateIso: string): string {
  const [year, month, day] = dateIso.split('-')
  if (!year || !month || !day) return dateIso
  return `${day}.${month}.${year}`
}

/** `2026-06-09` → `09.06.` (compact axis range). */
function formatDayMonth(dateIso: string): string {
  const [, month, day] = dateIso.split('-')
  if (!month || !day) return dateIso
  return `${day}.${month}.`
}

function averagePercent(values: Array<number | null>): number | null {
  const scored = values.filter((value): value is number => value != null)
  if (scored.length === 0) return null
  return Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length)
}

function ComplianceDayAxis({ axis }: { axis: DayAxisEntry[] }) {
  return (
    <div className="ov-compliance__axis" aria-hidden="true">
      {axis.map((day) => (
        <span key={day.dateIso} className="ov-compliance__axis-cell">
          <span className="ov-compliance__day-weekday">{day.weekdayLabel}</span>
          <span className="ov-compliance__day-label">{day.dayLabel}</span>
        </span>
      ))}
    </div>
  )
}

function CellEditorPopover({
  itemLabel,
  day,
  group,
  onSelect,
  onClear,
  onClose,
}: {
  itemLabel: string
  day: ComplianceDayCell
  group: ComplianceGroupKind
  onSelect: (status: ComplianceDayStatus) => void
  onClear: () => void
  onClose: () => void
}) {
  const editableStatuses = editableStatusesFor(group)
  return (
    <div className="ov-compliance__popover" role="dialog" aria-label="Compliance-Eintrag bearbeiten">
      <div className="ov-compliance__popover-head">
        <div className="ov-compliance__popover-title">
          <span className="ov-compliance__popover-item">{itemLabel}</span>
          <span className="ov-compliance__popover-date">
            {day.weekdayLabel}, {formatGermanDate(day.dateIso)}
          </span>
        </div>
        <button
          type="button"
          className="ov-compliance__popover-close"
          aria-label="Schließen"
          onClick={onClose}
        >
          <X size={13} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <div className="ov-compliance__popover-options" role="listbox">
        {editableStatuses.map((status) => (
          <button
            key={status}
            type="button"
            role="option"
            aria-selected={day.status === status}
            className={`ov-compliance__popover-option${
              day.status === status ? ' ov-compliance__popover-option--active' : ''
            }`}
            onClick={() => onSelect(status)}
          >
            <span className={`ov-compliance__legend-swatch ov-compliance__day-box--${status}`} aria-hidden />
            <span>{statusLabelFor(status, group)}</span>
          </button>
        ))}
      </div>
      {day.overridden ? (
        <button type="button" className="ov-compliance__popover-clear" onClick={onClear}>
          Manuellen Eintrag entfernen
        </button>
      ) : null}
    </div>
  )
}

function ComplianceDayGrid({
  item,
  group,
  openCell,
  onOpenCell,
  onSelect,
  onClear,
  onClose,
}: {
  item: ComplianceItemTimeline
  group: ComplianceGroupKind
  openCell: OpenCell | null
  onOpenCell: (cell: OpenCell) => void
  onSelect: (status: ComplianceDayStatus) => void
  onClear: () => void
  onClose: () => void
}) {
  return (
    <div
      className="ov-compliance__grid ov-compliance__grid--compact"
      role="list"
      aria-label={`Compliance ${item.label}, letzte 14 Tage`}
    >
      {item.timeline.days.map((day) => {
        const isOpen = openCell?.itemKey === item.key && openCell?.dateIso === day.dateIso
        const label = statusLabelFor(day.status, group)
        const tooltip = `${formatGermanDate(day.dateIso)}: ${label}${
          day.overridden ? ' (manuell)' : ''
        }`
        return (
          <span key={day.dateIso} className="ov-compliance__cell-wrap" role="listitem">
            <button
              type="button"
              className={`ov-compliance__cell ov-compliance__day-box--${day.status}${
                day.overridden ? ' ov-compliance__cell--overridden' : ''
              }${isOpen ? ' ov-compliance__cell--open' : ''}`}
              title={tooltip}
              aria-label={`${formatGermanDate(day.dateIso)}, ${label}${
                day.overridden ? ', manuell gesetzt' : ''
              }. Zum Bearbeiten öffnen.`}
              aria-haspopup="dialog"
              aria-expanded={isOpen}
              onClick={() => onOpenCell({ itemKey: item.key, dateIso: day.dateIso })}
            />
            {isOpen ? (
              <CellEditorPopover
                itemLabel={item.label}
                day={day}
                group={group}
                onSelect={onSelect}
                onClear={onClear}
                onClose={onClose}
              />
            ) : null}
          </span>
        )
      })}
    </div>
  )
}

function ComplianceItemRow({
  item,
  group,
  openCell,
  onOpenCell,
  onSelect,
  onClear,
  onClose,
}: {
  item: ComplianceItemTimeline
  group: ComplianceGroupKind
  openCell: OpenCell | null
  onOpenCell: (cell: OpenCell) => void
  onSelect: (status: ComplianceDayStatus) => void
  onClear: () => void
  onClose: () => void
}) {
  return (
    <div className="ov-compliance__item">
      <div className="ov-compliance__item-head">
        <div className="ov-compliance__item-name">
          <span className="ov-compliance__item-label">{item.label}</span>
          {item.sublabel ? (
            <span className="ov-compliance__item-sub">{item.sublabel}</span>
          ) : null}
        </div>
        <span className="ov-compliance__percent">{formatPercent(item.timeline.percent)}</span>
      </div>
      <ComplianceDayGrid
        item={item}
        group={group}
        openCell={openCell}
        onOpenCell={onOpenCell}
        onSelect={onSelect}
        onClear={onClear}
        onClose={onClose}
      />
    </div>
  )
}

function ComplianceLegend({ group }: { group: ComplianceGroupKind }) {
  const statuses = editableStatusesFor(group)
  return (
    <ul className="ov-compliance__legend" aria-label="Legende">
      {statuses.map((status) => (
        <li key={status} className="ov-compliance__legend-item">
          <span className={`ov-compliance__legend-swatch ov-compliance__day-box--${status}`} aria-hidden />
          <span>{statusLabelFor(status, group)}</span>
        </li>
      ))}
    </ul>
  )
}

function ComplianceGroup({
  title,
  group,
  items,
  axis,
  openCell,
  onOpenCell,
  onSelect,
  onClear,
  onClose,
  emptyMessage,
}: {
  title: string
  group: ComplianceGroupKind
  items: ComplianceItemTimeline[]
  axis: DayAxisEntry[]
  openCell: OpenCell | null
  onOpenCell: (cell: OpenCell) => void
  onSelect: (status: ComplianceDayStatus) => void
  onClear: () => void
  onClose: () => void
  emptyMessage: string
}) {
  return (
    <div className="ov-compliance__group">
      <p className="ov-subhead">{title}</p>
      {items.length > 0 ? (
        <>
          <div className="ov-compliance__rows">
            {axis.length > 0 ? <ComplianceDayAxis axis={axis} /> : null}
            {items.map((item) => (
              <ComplianceItemRow
                key={item.key}
                item={item}
                group={group}
                openCell={openCell}
                onOpenCell={onOpenCell}
                onSelect={onSelect}
                onClear={onClear}
                onClose={onClose}
              />
            ))}
          </div>
          <ComplianceLegend group={group} />
        </>
      ) : (
        <OverviewEmpty>{emptyMessage}</OverviewEmpty>
      )}
    </div>
  )
}

function ComplianceAddForm({
  items,
  axis,
  onSubmit,
  onCancel,
}: {
  items: AllItem[]
  axis: DayAxisEntry[]
  onSubmit: (itemKey: string, dateIso: string, status: ComplianceDayStatus) => void
  onCancel: () => void
}) {
  const [itemKey, setItemKey] = useState(items[0]?.key ?? '')
  const [dateIso, setDateIso] = useState(axis[axis.length - 1]?.dateIso ?? '')
  const [status, setStatus] = useState<ComplianceDayStatus>('participated')

  const selectedItem = items.find((item) => item.key === itemKey)
  const selectedGroup = selectedItem?.group ?? 'therapy'
  const statusOptions = editableStatusesFor(selectedGroup)

  const medicationOptions = items.filter((item) => item.group === 'medication')
  const therapyOptions = items.filter((item) => item.group === 'therapy')

  const handleItemChange = (nextKey: string) => {
    setItemKey(nextKey)
    const nextItem = items.find((item) => item.key === nextKey)
    const nextGroup = nextItem?.group ?? 'therapy'
    const allowed = editableStatusesFor(nextGroup)
    if (!allowed.includes(status)) {
      setStatus('participated')
    }
  }

  return (
    <form
      className="ov-compliance__add-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (!itemKey || !dateIso) return
        onSubmit(itemKey, dateIso, status)
      }}
    >
      <div className="ov-compliance__add-row">
        <label className="ov-compliance__add-field">
          <span className="ov-compliance__add-label">Eintrag</span>
          <select
            className="ov-compliance__add-select"
            value={itemKey}
            onChange={(event) => handleItemChange(event.target.value)}
          >
            {medicationOptions.length > 0 ? (
              <optgroup label="Medikation">
                {medicationOptions.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {therapyOptions.length > 0 ? (
              <optgroup label="Therapien">
                {therapyOptions.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>
        <label className="ov-compliance__add-field">
          <span className="ov-compliance__add-label">Datum</span>
          <select
            className="ov-compliance__add-select"
            value={dateIso}
            onChange={(event) => setDateIso(event.target.value)}
          >
            {axis.map((day) => (
              <option key={day.dateIso} value={day.dateIso}>
                {day.weekdayLabel}, {formatGermanDate(day.dateIso)}
              </option>
            ))}
          </select>
        </label>
        <label className="ov-compliance__add-field">
          <span className="ov-compliance__add-label">Status</span>
          <select
            className="ov-compliance__add-select"
            value={status}
            onChange={(event) => setStatus(event.target.value as ComplianceDayStatus)}
          >
            {statusOptions.map((value) => (
              <option key={value} value={value}>
                {statusLabelFor(value, selectedGroup)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="ov-compliance__add-actions">
        <button type="button" className="ov-compliance__add-btn" onClick={onCancel}>
          Abbrechen
        </button>
        <button
          type="submit"
          className="ov-compliance__add-btn ov-compliance__add-btn--primary"
          disabled={!itemKey || !dateIso}
        >
          Speichern
        </button>
      </div>
    </form>
  )
}

export function ComplianceOverviewCard({ data, caseId }: ComplianceOverviewCardProps) {
  const [overrides, setOverrides] = useState<ComplianceOverride[]>(() =>
    loadComplianceOverrides(caseId),
  )
  const [openCell, setOpenCell] = useState<OpenCell | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOverrides(loadComplianceOverrides(caseId))
    setOpenCell(null)
    setAddOpen(false)
  }, [caseId])

  const closeAll = useCallback(() => {
    setOpenCell(null)
    setAddOpen(false)
  }, [])

  useEffect(() => {
    if (!openCell && !addOpen) return
    const onDocMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        closeAll()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAll()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openCell, addOpen, closeAll])

  const medicationItems = useMemo(
    () => applyComplianceOverrides(data.medicationItems, overrides),
    [data.medicationItems, overrides],
  )
  const therapyItems = useMemo(
    () => applyComplianceOverrides(data.therapyItems, overrides),
    [data.therapyItems, overrides],
  )

  const overallPercent = useMemo(
    () =>
      averagePercent([
        ...medicationItems.map((item) => item.timeline.percent),
        ...therapyItems.map((item) => item.timeline.percent),
      ]),
    [medicationItems, therapyItems],
  )

  const allItems = useMemo<AllItem[]>(
    () => [
      ...medicationItems.map((item) => ({ ...item, group: 'medication' as const })),
      ...therapyItems.map((item) => ({ ...item, group: 'therapy' as const })),
    ],
    [medicationItems, therapyItems],
  )

  const axis = useMemo<DayAxisEntry[]>(() => {
    const source = medicationItems[0] ?? therapyItems[0]
    if (!source) return []
    return source.timeline.days.map((day) => ({
      dateIso: day.dateIso,
      dayLabel: day.dayLabel,
      weekdayLabel: day.weekdayLabel,
    }))
  }, [medicationItems, therapyItems])

  const dateRange =
    axis.length > 0
      ? `${formatDayMonth(axis[0].dateIso)}–${formatDayMonth(axis[axis.length - 1].dateIso)}`
      : null

  const handleSelect = useCallback(
    (status: ComplianceDayStatus) => {
      if (!openCell) return
      setOverrides(setComplianceOverride(openCell.itemKey, openCell.dateIso, status, caseId))
      setOpenCell(null)
    },
    [openCell, caseId],
  )

  const handleClear = useCallback(() => {
    if (!openCell) return
    setOverrides(removeComplianceOverride(openCell.itemKey, openCell.dateIso, caseId))
    setOpenCell(null)
  }, [openCell, caseId])

  const handleAddSubmit = useCallback(
    (itemKey: string, dateIso: string, status: ComplianceDayStatus) => {
      setOverrides(setComplianceOverride(itemKey, dateIso, status, caseId))
      setAddOpen(false)
    },
    [caseId],
  )

  const badgeLabel =
    overallPercent != null
      ? `${overallPercent}% (${data.windowDays} Tage)`
      : `${data.windowDays} Tage`

  const canAdd = allItems.length > 0

  return (
    <OverviewCard
      title="Compliance"
      className="ov-col-6"
      badge={{ label: badgeLabel, tone: overallTone(overallPercent) }}
    >
      <div className="ov-compliance" ref={rootRef}>
        <div className="ov-compliance__toolbar">
          {dateRange ? (
            <span className="ov-compliance__range">{dateRange}</span>
          ) : (
            <span className="ov-compliance__range" />
          )}
          <button
            type="button"
            className="ov-compliance__add-trigger"
            onClick={() => {
              setOpenCell(null)
              setAddOpen((open) => !open)
            }}
            disabled={!canAdd}
            aria-expanded={addOpen}
          >
            <Plus size={13} strokeWidth={2} aria-hidden />
            <span>Eintrag</span>
          </button>
        </div>

        {addOpen && canAdd ? (
          <ComplianceAddForm
            items={allItems}
            axis={axis}
            onSubmit={handleAddSubmit}
            onCancel={() => setAddOpen(false)}
          />
        ) : null}

        <ComplianceGroup
          title="Medikation"
          group="medication"
          items={medicationItems}
          axis={axis}
          openCell={openCell}
          onOpenCell={setOpenCell}
          onSelect={handleSelect}
          onClear={handleClear}
          onClose={() => setOpenCell(null)}
          emptyMessage="Keine aktive Medikation."
        />

        <ComplianceGroup
          title="Therapien"
          group="therapy"
          items={therapyItems}
          axis={axis}
          openCell={openCell}
          onOpenCell={setOpenCell}
          onSelect={handleSelect}
          onClear={handleClear}
          onClose={() => setOpenCell(null)}
          emptyMessage="Keine aktiven Therapien."
        />
      </div>
    </OverviewCard>
  )
}
