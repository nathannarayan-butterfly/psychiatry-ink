import { useEffect, useState } from 'react'
import type { DocumentType } from '../types'
import { ScrollButton } from './ScrollButton'
import { ToolBox } from './ToolBox'

const PAGE_SIZE = 4

interface DocumentToolCarouselProps {
  documentTypes: DocumentType[]
  selectedDocumentType: string
  onSelect: (typeId: string) => void
}

export function DocumentToolCarousel({
  documentTypes,
  selectedDocumentType,
  onSelect,
}: DocumentToolCarouselProps) {
  const [page, setPage] = useState(0)

  const maxPage = Math.max(0, Math.ceil(documentTypes.length / PAGE_SIZE) - 1)

  useEffect(() => {
    if (page > maxPage) setPage(maxPage)
  }, [page, maxPage])

  useEffect(() => {
    const selectedIndex = documentTypes.findIndex((type) => type.id === selectedDocumentType)
    if (selectedIndex < 0) return
    setPage(Math.floor(selectedIndex / PAGE_SIZE))
  }, [selectedDocumentType, documentTypes])

  const start = page * PAGE_SIZE
  const visibleTools = documentTypes.slice(start, start + PAGE_SIZE)
  const placeholders = Math.max(0, PAGE_SIZE - visibleTools.length)

  return (
    <div className="document-tool-carousel flex h-full min-h-0 min-w-0 flex-1 items-stretch gap-1 sm:gap-1.5">
      <ScrollButton
        direction="left"
        disabled={page === 0}
        onClick={() => setPage((current) => Math.max(0, current - 1))}
        className="document-tool-carousel__arrow h-7 w-7 shrink-0 self-center"
      />

      <div className="document-tool-carousel__track grid h-full min-h-0 w-full min-w-0 flex-1 grid-cols-2 grid-rows-2 gap-1 sm:gap-1.5">
        {visibleTools.map((type) => (
          <ToolBox
            key={type.id}
            id={type.id}
            label={type.label}
            labelLines={type.toolLabelLines}
            icon={type.icon}
            isActive={selectedDocumentType === type.id}
            onClick={() => onSelect(type.id)}
          />
        ))}
        {Array.from({ length: placeholders }, (_, index) => (
          <div
            key={`placeholder-${index}`}
            className="document-tool-carousel__placeholder"
            aria-hidden
          />
        ))}
      </div>

      <ScrollButton
        direction="right"
        disabled={page >= maxPage}
        onClick={() => setPage((current) => Math.min(maxPage, current + 1))}
        className="document-tool-carousel__arrow h-7 w-7 shrink-0 self-center"
      />
    </div>
  )
}
