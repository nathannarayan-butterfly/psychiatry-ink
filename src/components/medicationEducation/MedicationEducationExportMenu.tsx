import { ChevronDown, Copy, FileDown, FileText, FileType, Printer } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from '../../context/TranslationContext'
import { translateMedicationUi } from '../../data/medicationUiTranslations'

interface MedicationEducationExportMenuProps {
  disabled?: boolean
  onExportPdf: () => void
  onExportDocx: () => void
  onExportTxt: () => void
  onCopy: () => void | Promise<void>
  onPrint: () => void
}

type ExportAction = 'pdf' | 'docx' | 'txt' | 'copy' | 'print'

const EXPORT_ACTIONS: ExportAction[] = ['pdf', 'docx', 'txt', 'copy', 'print']

export function MedicationEducationExportMenu({
  disabled = false,
  onExportPdf,
  onExportDocx,
  onExportTxt,
  onCopy,
  onPrint,
}: MedicationEducationExportMenuProps) {
  const { language } = useTranslation()
  const menuId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)

  const labels: Record<ExportAction, string> = {
    pdf: translateMedicationUi(language, 'medEducationExportPdf'),
    docx: translateMedicationUi(language, 'medEducationExportDocx'),
    txt: translateMedicationUi(language, 'medEducationExportTxt'),
    copy: translateMedicationUi(language, 'medEducationCopy'),
    print: translateMedicationUi(language, 'medEducationPrint'),
  }

  const icons: Record<ExportAction, typeof FileDown> = {
    pdf: FileDown,
    docx: FileType,
    txt: FileText,
    copy: Copy,
    print: Printer,
  }

  const runAction = useCallback(
    (action: ExportAction) => {
      switch (action) {
        case 'pdf':
          onExportPdf()
          break
        case 'docx':
          onExportDocx()
          break
        case 'txt':
          onExportTxt()
          break
        case 'copy':
          void onCopy()
          break
        case 'print':
          onPrint()
          break
      }
      setOpen(false)
    },
    [onCopy, onExportDocx, onExportPdf, onExportTxt, onPrint],
  )

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    setFocusedIndex(0)
    requestAnimationFrame(() => itemRefs.current[0]?.focus())
  }, [open])

  useEffect(() => {
    if (!open) return
    itemRefs.current[focusedIndex]?.focus()
  }, [focusedIndex, open])

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        setOpen(false)
        break
      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex((index) => (index + 1) % EXPORT_ACTIONS.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex((index) => (index - 1 + EXPORT_ACTIONS.length) % EXPORT_ACTIONS.length)
        break
      case 'Home':
        event.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        event.preventDefault()
        setFocusedIndex(EXPORT_ACTIONS.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div className="medication-education-export" ref={wrapperRef}>
      <button
        type="button"
        className="arztbrief-btn medication-education-export__trigger"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
      >
        <FileDown size={14} aria-hidden />
        {translateMedicationUi(language, 'medEducationExport')}
        <ChevronDown size={14} className="medication-education-export__chevron" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          className="medication-education-export__menu"
          role="menu"
          aria-label={translateMedicationUi(language, 'medEducationExportMenuLabel')}
          onKeyDown={handleMenuKeyDown}
        >
          {EXPORT_ACTIONS.map((action, index) => {
            const Icon = icons[action]
            return (
              <button
                key={action}
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                type="button"
                role="menuitem"
                className="medication-education-export__item"
                onClick={() => runAction(action)}
              >
                <Icon size={14} strokeWidth={1.75} aria-hidden />
                {labels[action]}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
