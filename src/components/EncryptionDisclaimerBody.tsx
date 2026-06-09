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

export function EncryptionDisclaimerBody({
  variant = 'paragraph',
  className,
  identifierStorage,
}: EncryptionDisclaimerBodyProps) {
  const { t } = useTranslation()

  if (variant === 'list') {
    return (
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
    )
  }

  return (
    <p className={className ?? 'encryption-disclaimer__paragraph'}>
      {t('patientDisclaimerParagraph')}
    </p>
  )
}
