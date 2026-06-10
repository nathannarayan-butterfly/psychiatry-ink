import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Brain,
  ClipboardList,
  FileText,
  FlaskConical,
  GitBranch,
  Mail,
  MessageSquare,
  Pill,
} from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  clipboard: ClipboardList,
  'file-text': FileText,
  mail: Mail,
  brain: Brain,
  activity: Activity,
  pill: Pill,
  flask: FlaskConical,
  'message-square': MessageSquare,
  'git-branch': GitBranch,
}

interface ToolBoxProps {
  id: string
  label: string
  labelLines?: string[]
  icon: string
  isActive?: boolean
  onClick?: () => void
}

export function ToolBox({
  id,
  label,
  labelLines,
  icon,
  isActive = false,
  onClick,
}: ToolBoxProps) {
  const Icon = iconMap[icon] ?? FileText
  const toolLabel =
    labelLines && labelLines.length > 0 ? labelLines.join('').replace(/-$/, '') : label

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      title={toolLabel}
      aria-label={toolLabel}
      data-tool-box
      className="tool-box tool-box--compact flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1 text-center sm:gap-1 sm:px-1.5 sm:py-1.5"
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors sm:h-6 sm:w-6 ${
          isActive ? 'border-accent bg-surface text-accent' : 'border-transparent bg-surface text-ink'
        }`}
      >
        <Icon className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" strokeWidth={1.5} aria-hidden />
      </span>
      {labelLines && labelLines.length > 0 ? (
        <span className="tool-box-label flex max-w-full flex-col text-[10px] leading-tight text-ink sm:text-[11px]">
          {labelLines.map((line) => (
            <span key={line} className="truncate">
              {line}
            </span>
          ))}
        </span>
      ) : (
        <span className="tool-box-label line-clamp-2 max-w-full text-[10px] leading-tight text-ink sm:text-[11px]">
          {label}
        </span>
      )}
      <span className="sr-only">{id}</span>
    </button>
  )
}
