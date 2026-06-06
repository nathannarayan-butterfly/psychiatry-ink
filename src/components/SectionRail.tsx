import { Copy, Download, Printer } from 'lucide-react'
import { useTranslation } from '../context/TranslationContext'
import type { DocumentSection } from '../types'
import { IconButton } from './IconButton'
import { PanelScrollArea } from './PanelScrollArea'

interface SectionRailProps {
  sections: DocumentSection[]
  activeSectionId: string | null
  onSelect: (sectionId: string) => void
  onCopyAll: () => void
  onPrint: () => void
  onExport: () => void
}

function isSectionComplete(status: DocumentSection['status']): boolean {
  return status === 'saved'
}

function getCompletionPercent(sections: DocumentSection[]): number {
  if (sections.length === 0) return 0
  const completeCount = sections.filter((section) => isSectionComplete(section.status)).length
  return Math.round((completeCount / sections.length) * 100)
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 9
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
      <svg className="progress-ring h-7 w-7" viewBox="0 0 24 24" aria-hidden>
        <circle className="progress-ring__track" cx="12" cy="12" r={radius} />
        <circle
          className="progress-ring__fill"
          cx="12"
          cy="12"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-[8px] font-semibold tabular-nums text-ink">{percent}</span>
    </div>
  )
}

export function SectionRail({
  sections,
  activeSectionId,
  onSelect,
  onCopyAll,
  onPrint,
  onExport,
}: SectionRailProps) {
  const { t } = useTranslation()
  const completionPercent = getCompletionPercent(sections)

  return (
    <aside className="workspace-column workspace-column--rail workspace-float-panel relative" aria-label={t('documentSections')}>
      <PanelScrollArea scrollClassName="flex flex-col gap-1.5 px-1.5 pb-1 pt-1.5 sm:px-2 sm:pt-2">
        {sections.map((section) => {
          const isActive = section.id === activeSectionId
          const complete = isSectionComplete(section.status)

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              title={section.description ?? section.label}
              aria-label={`${section.label}${complete ? ` — ${t('sectionComplete')}` : ` — ${t('sectionIncomplete')}`}`}
              aria-current={isActive ? 'step' : undefined}
              className={`section-rail-btn workspace-float-block flex w-full items-start py-2 pl-2.5 pr-3 text-left text-xs ${
                complete ? 'section-rail-btn--complete' : 'section-rail-btn--incomplete'
              } ${isActive ? 'section-rail-btn--active workspace-float-block--active' : ''}`}
            >
              <span className="section-rail-label min-w-0 flex-1 leading-snug">{section.label}</span>
            </button>
          )
        })}
      </PanelScrollArea>

      <div className="section-rail-footer workspace-float-block mx-1.5 mb-1.5 flex shrink-0 items-center gap-1 px-1.5 py-2 sm:mx-2 sm:gap-2 sm:px-2">
        <div
          className="section-rail-progress flex min-w-0 flex-1 items-center gap-1.5 pl-0.5"
          aria-label={t('sectionsCompletePercent').replace('{percent}', String(completionPercent))}
        >
          <ProgressRing percent={completionPercent} />
          <span className="hidden truncate text-[11px] font-medium tabular-nums text-muted sm:inline sm:text-xs">
            {completionPercent}%
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            bordered
            icon={<Copy strokeWidth={1.5} />}
            label={t('copyAllSections')}
            onClick={onCopyAll}
          />
          <IconButton
            bordered
            icon={<Printer strokeWidth={1.5} />}
            label={t('print')}
            onClick={onPrint}
          />
          <IconButton
            bordered
            icon={<Download strokeWidth={1.5} />}
            label={t('export')}
            onClick={onExport}
          />
        </div>
      </div>
    </aside>
  )
}
