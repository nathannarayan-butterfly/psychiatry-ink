import { useState } from 'react'
import { useTranslation } from '../context/TranslationContext'
import type { UiTranslationKey } from '../data/uiTranslations'
import type { IdentifierStorageMode } from '../utils/identifierStorage'

const encryptionDisclaimerListKeys = [
  'patientDisclaimerDeviceDecrypt',
  'patientDisclaimerZeroKnowledge',
  'patientDisclaimerNameDobChoice',
  'patientDisclaimerCaseFileSync',
  'patientDisclaimerMultiDevice',
  'patientDisclaimerUserResponsibility',
] as const satisfies readonly UiTranslationKey[]

interface EncryptionDisclaimerBodyProps {
  variant?: 'paragraph' | 'list'
  className?: string
  identifierStorage?: IdentifierStorageMode
}

/**
 * Privacy/encryption notice. Shows a short, plain-language summary up front and
 * keeps the full legal detail behind a "mehr anzeigen" toggle so the disclaimer
 * is approachable without dropping any of the required information.
 */
export function EncryptionDisclaimerBody({
  variant = 'paragraph',
  className,
  identifierStorage,
}: EncryptionDisclaimerBodyProps) {
  const { t } = useTranslation()
  const [showDetail, setShowDetail] = useState(false)

  const detail =
    variant === 'list' ? (
      <ul className={className ?? 'mt-2 list-inside list-disc space-y-1 text-xs text-muted'}>
        {encryptionDisclaimerListKeys.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
        {identifierStorage ? (
          <li>
            {t(
              identifierStorage === 'account'
                ? 'patientDisclaimerCurrentModeAccount'
                : 'patientDisclaimerCurrentModeDevice',
            )}
          </li>
        ) : null}
      </ul>
    ) : (
      <p className={className ?? 'encryption-disclaimer__paragraph'}>
        {t('patientDisclaimerParagraph')}
      </p>
    )

  return (
    <div className="encryption-disclaimer-body">
      <p className="encryption-disclaimer-body__summary">{t('patientDisclaimerSummary')}</p>
      <button
        type="button"
        className="encryption-disclaimer-body__more"
        onClick={() => setShowDetail((open) => !open)}
        aria-expanded={showDetail}
      >
        {showDetail ? t('patientDisclaimerShowLess') : t('patientDisclaimerShowMore')}
      </button>
      {showDetail ? detail : null}
    </div>
  )
}
