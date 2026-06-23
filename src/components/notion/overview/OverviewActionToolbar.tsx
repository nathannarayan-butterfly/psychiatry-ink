import { useEffect, useRef, useState } from 'react'
import { Download, FileText, Printer } from 'lucide-react'
import { useTranslation } from '../../../context/TranslationContext'

interface OverviewActionToolbarProps {
  onExportPdf: () => void
  onExportWord: () => void
  onPrint: () => void
}

export function OverviewActionToolbar({
  onExportPdf,
  onExportWord,
  onPrint,
}: OverviewActionToolbarProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  const runExport = (fn: () => void) => {
    fn()
    setOpen(false)
  }

  return (
    <div className="ov-action-toolbar" role="toolbar" aria-label={t('overviewActionToolbarLabel')}>
      <div className="ov-export-menu" ref={wrapperRef}>
        <button
          type="button"
          className="icon-action-btn icon-action-btn--bordered"
          onClick={() => setOpen((prev) => !prev)}
          title={t('overviewExport')}
          aria-label={t('overviewExport')}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <Download strokeWidth={1.75} />
        </button>
        {open ? (
          <div className="ov-export-menu__dropdown" role="menu" aria-label={t('overviewExport')}>
            <button
              type="button"
              role="menuitem"
              className="ov-export-menu__item"
              onClick={() => runExport(onExportPdf)}
            >
              <FileText strokeWidth={1.75} aria-hidden />
              {t('overviewExportPdf')}
            </button>
            <button
              type="button"
              role="menuitem"
              className="ov-export-menu__item"
              onClick={() => runExport(onExportWord)}
            >
              <FileText strokeWidth={1.75} aria-hidden />
              {t('overviewExportWord')}
            </button>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        className="icon-action-btn icon-action-btn--bordered"
        onClick={onPrint}
        title={t('overviewPrint')}
        aria-label={t('overviewPrint')}
      >
        <Printer strokeWidth={1.75} />
      </button>
    </div>
  )
}
