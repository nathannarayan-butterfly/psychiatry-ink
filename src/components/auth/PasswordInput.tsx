import { useState, type ChangeEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'

interface PasswordInputProps {
  id?: string
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  autoComplete?: string
  minLength?: number
  maxLength?: number
  placeholder?: string
  required?: boolean
}

export function PasswordInput({
  id,
  value,
  onChange,
  disabled = false,
  autoComplete,
  minLength,
  maxLength,
  placeholder,
  required,
}: PasswordInputProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    <div className="auth-form__password-wrap">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
      <button
        type="button"
        className="auth-form__password-toggle"
        aria-label={visible ? t('authPasswordHide') : t('authPasswordShow')}
        aria-pressed={visible}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        ) : (
          <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        )}
      </button>
    </div>
  )
}
