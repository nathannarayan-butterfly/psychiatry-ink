import { NotionPageDateField } from './NotionPageDateField'
import { NotionPageTimeField } from './NotionPageTimeField'

interface NotionPageDateTimeRowProps {
  pageId: string
  caseId: string
  disabled?: boolean
  onDateChange?: (date: string) => void
  onTimeChange?: (time: string) => void
  onChange?: () => void
}

export function NotionPageDateTimeRow({
  pageId,
  caseId,
  disabled = false,
  onDateChange,
  onTimeChange,
  onChange,
}: NotionPageDateTimeRowProps) {
  const handleDateChange = (date: string) => {
    onDateChange?.(date)
    onChange?.()
  }

  const handleTimeChange = (time: string) => {
    onTimeChange?.(time)
    onChange?.()
  }

  return (
    <div className="notion-page-datetime">
      <NotionPageDateField
        pageId={pageId}
        caseId={caseId}
        disabled={disabled}
        onDateChange={handleDateChange}
      />
      <NotionPageTimeField
        pageId={pageId}
        caseId={caseId}
        disabled={disabled}
        onTimeChange={handleTimeChange}
      />
    </div>
  )
}
