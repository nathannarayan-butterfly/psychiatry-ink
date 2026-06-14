import type { ReactNode } from 'react'

interface A4PageViewProps {
  children: ReactNode
  className?: string
  onContextMenu?: (e: React.MouseEvent) => void
  onClick?: (e: React.MouseEvent) => void
}

export function A4PageView({ children, className = '', onContextMenu, onClick }: A4PageViewProps) {
  return (
    <div className="dt-a4-workspace">
      <div
        className={`dt-a4-page${className ? ` ${className}` : ''}`}
        onContextMenu={onContextMenu}
        onClick={onClick}
      >
        {children}
      </div>
    </div>
  )
}
