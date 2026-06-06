interface SettingsOptionGroupProps<T extends string> {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}

export function SettingsOptionGroup<T extends string>({
  value,
  options,
  onChange,
}: SettingsOptionGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-sm border-2 px-3 py-1.5 text-xs transition-colors ${
              active
                ? 'border-ink bg-surface-active text-ink'
                : 'border-border bg-surface text-ink hover:bg-surface-hover'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
