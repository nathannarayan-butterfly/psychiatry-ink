import { ChevronLeft, ChevronRight } from 'lucide-react'

interface NotionSidebarCollapseHandleProps {
  collapsed: boolean
  onToggle: () => void
  ariaLabel: string
}

export function NotionSidebarCollapseHandle({
  collapsed,
  onToggle,
  ariaLabel,
}: NotionSidebarCollapseHandleProps) {
  const Icon = collapsed ? ChevronRight : ChevronLeft

  return (
    <div className="notion-sidebar-collapse-handle">
      <button
        type="button"
        className="notion-sidebar-collapse-handle__btn"
        onClick={onToggle}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <Icon className="notion-sidebar-collapse-handle__icon" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  )
}
