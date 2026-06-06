import { useRef } from 'react'
import type { ReactNode } from 'react'

interface PdfImportButtonProps {
  label: string
  disabled?: boolean
  onImport: (file: File) => void
  children: ReactNode
  className?: string
}

export function PdfImportButton({
  label,
  disabled = false,
  onImport,
  children,
  className = '',
}: PdfImportButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onImport(file)
        }}
      />
      <button
        type="button"
        className={className}
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {children}
      </button>
    </>
  )
}
