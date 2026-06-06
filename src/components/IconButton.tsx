import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  label?: string
  showLabel?: boolean
  responsiveLabel?: boolean
  bordered?: boolean
}

export function IconButton({
  icon,
  label,
  showLabel = false,
  responsiveLabel = false,
  bordered = false,
  className = '',
  ...props
}: IconButtonProps) {
  const showText = showLabel && !responsiveLabel
  const showResponsiveText = responsiveLabel && label

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center gap-1.5 text-ink disabled:opacity-40 ${
        bordered
          ? `icon-btn-bordered glass-surface glass-interactive h-8 w-8 justify-center rounded-md border border-border/60 p-0`
          : 'rounded-md border-0 bg-transparent p-1.5 transition-colors hover:bg-surface-hover/60 active:bg-surface-active/60'
      } ${showText ? 'rounded-md px-2 py-1.5 text-sm' : ''} ${className}`}
      {...props}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      {showText && label ? <span className="text-sm text-ink">{label}</span> : null}
      {showResponsiveText ? (
        <span className="responsive-label text-sm text-ink">{label}</span>
      ) : null}
    </button>
  )
}
