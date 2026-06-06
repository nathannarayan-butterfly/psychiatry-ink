import { useTranslation } from '../context/TranslationContext'
import type { UiTranslationKey } from '../data/uiTranslations'

const encryptionDisclaimerListKeys = [
  'patientDisclaimerDeviceDecrypt',
  'patientDisclaimerZeroKnowledge',
  'patientDisclaimerLocalNameAge',
  'patientDisclaimerStorageByTier',
  'patientDisclaimerMultiDevice',
  'patientDisclaimerUserResponsibility',
] as const satisfies readonly UiTranslationKey[]

interface EncryptionDisclaimerBodyProps {
  variant?: 'paragraph' | 'list'
  className?: string
}

export function EncryptionDisclaimerBody({
  variant = 'paragraph',
  className,
}: EncryptionDisclaimerBodyProps) {
  const { t } = useTranslation()

  if (variant === 'list') {
    return (
      <ul className={className ?? 'mt-2 list-inside list-disc space-y-1 text-xs text-muted'}>
        {encryptionDisclaimerListKeys.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
    )
  }

  return (
    <p className={className ?? 'encryption-disclaimer__paragraph'}>
      {t('patientDisclaimerParagraph')}
    </p>
  )
}
