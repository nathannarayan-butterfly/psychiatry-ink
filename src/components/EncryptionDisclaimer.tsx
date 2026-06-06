import { AlertTriangle, X } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { useTranslation } from '../context/TranslationContext'
import { EncryptionDisclaimerBody } from './EncryptionDisclaimerBody'

const GLOBAL_DISCLAIMER_SEEN_KEY = 'psychiatry-ink-disclaimer-seen'

export type EncryptionDisclaimerSection = 'patient' | 'settings' | 'dashboard'

function sectionCollapsedKey(section: EncryptionDisclaimerSection): string {
  return `psychiatry-ink-disclaimer-collapsed-${section}`
}

function readSectionCollapsed(section: EncryptionDisclaimerSection): boolean {
  try {
    return localStorage.getItem(sectionCollapsedKey(section)) === 'true'
  } catch {
    return false
  }
}

function readGlobalDisclaimerSeen(): boolean {
  try {
    return localStorage.getItem(GLOBAL_DISCLAIMER_SEEN_KEY) === 'true'
  } catch {
    return false
  }
}

function persistDisclaimerCollapsed(section: EncryptionDisclaimerSection): void {
  try {
    localStorage.setItem(sectionCollapsedKey(section), 'true')
    localStorage.setItem(GLOBAL_DISCLAIMER_SEEN_KEY, 'true')
  } catch {
    // ignore storage errors
  }
}

function getInitialExpanded(section: EncryptionDisclaimerSection): boolean {
  if (readSectionCollapsed(section)) return false
  if (section !== 'patient' && readGlobalDisclaimerSeen()) return false
  return true
}

interface EncryptionDisclaimerProps {
  section: EncryptionDisclaimerSection
  bodyVariant?: 'paragraph' | 'list'
  className?: string
  footer?: ReactNode
}

export function EncryptionDisclaimer({
  section,
  bodyVariant = 'paragraph',
  className,
  footer,
}: EncryptionDisclaimerProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(() => getInitialExpanded(section))

  const collapse = useCallback(() => {
    persistDisclaimerCollapsed(section)
    setExpanded(false)
  }, [section])

  const toggle = useCallback(() => {
    setExpanded((open) => {
      if (open) {
        persistDisclaimerCollapsed(section)
        return false
      }
      return true
    })
  }, [section])

  const isPatient = section === 'patient'
  const isDashboard = section === 'dashboard'

  const containerClass =
    className ??
    (isPatient
      ? 'notion-patient-fields__disclaimer'
      : isDashboard
        ? 'encryption-disclaimer encryption-disclaimer--dashboard'
        : 'encryption-disclaimer encryption-disclaimer--settings')

  const toggleClass = isPatient
    ? `notion-patient-fields__disclaimer-toggle${expanded ? '' : ' notion-patient-fields__disclaimer-toggle--collapsed'}`
    : `encryption-disclaimer__toggle${expanded ? '' : ' encryption-disclaimer__toggle--collapsed'}`

  const bodyClass = isPatient
    ? 'notion-patient-fields__disclaimer-body'
    : 'encryption-disclaimer__body'

  const headerClass = isPatient
    ? 'notion-patient-fields__disclaimer-header'
    : 'encryption-disclaimer__header'

  const closeClass = isPatient
    ? 'notion-patient-fields__disclaimer-close'
    : 'encryption-disclaimer__close'

  return (
    <div className={containerClass}>
      <div className={expanded ? headerClass : undefined}>
        <button
          type="button"
          className={toggleClass}
          onClick={toggle}
          aria-expanded={expanded}
          aria-label={expanded ? t('patientDisclaimerCollapse') : t('patientDisclaimerExpand')}
        >
          {expanded && (isPatient || isDashboard) ? (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          ) : null}
          <span>
            {t('patientDisclaimerTitle')}
            {expanded ? '' : ' \u25BE'}
          </span>
        </button>
        {expanded ? (
          <button
            type="button"
            className={closeClass}
            onClick={collapse}
            aria-label={t('patientDisclaimerCollapse')}
          >
            <X className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div className={bodyClass}>
          <EncryptionDisclaimerBody variant={bodyVariant} />
          {footer}
        </div>
      ) : null}
    </div>
  )
}
