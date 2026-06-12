import {
  ChevronLeft,
  ChevronRight,
  Coffee,
  Flower2,
  Leaf,
  Moon,
  Shuffle,
  Sparkles,
  Sun,
  Waves,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from '../context/TranslationContext'
import { useWorkspaceSession } from '../context/WorkspaceSessionContext'
import { IconButton } from './IconButton'

interface PanelGraphicProps {
  onClose: () => void
}

interface Motif {
  id: string
  Icon: LucideIcon
}

// Calm, clinical-friendly static motifs drawn from the existing lucide icon set.
const decorativeMotifs: Motif[] = [
  { id: 'flower', Icon: Flower2 },
  { id: 'leaf', Icon: Leaf },
  { id: 'sun', Icon: Sun },
  { id: 'waves', Icon: Waves },
  { id: 'sparkles', Icon: Sparkles },
]
const idleMotif: Motif = { id: 'moon', Icon: Moon }
const breakMotif: Motif = { id: 'break', Icon: Coffee }

const decorativeMotifCount = decorativeMotifs.length

function wrapMotifIndex(index: number): number {
  if (decorativeMotifCount === 0) return 0
  return ((index % decorativeMotifCount) + decorativeMotifCount) % decorativeMotifCount
}

function randomMotifIndex(excludeIndex = -1): number {
  if (decorativeMotifCount <= 1) return 0
  let index = Math.floor(Math.random() * decorativeMotifCount)
  while (index === excludeIndex) {
    index = Math.floor(Math.random() * decorativeMotifCount)
  }
  return index
}

function PanelGraphicToolbar({
  canCycle,
  onPrevious,
  onNext,
  onShuffle,
  onClose,
}: {
  canCycle: boolean
  onPrevious: () => void
  onNext: () => void
  onShuffle: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <div
      className="panel-graphic__toolbar flex flex-col items-center"
      role="toolbar"
      aria-label={t('panelGraphicControls')}
    >
      <div className="panel-graphic__actions flex flex-col items-center">
        <IconButton
          bordered
          icon={<Shuffle />}
          label={t('panelGraphicChange')}
          onClick={onShuffle}
          disabled={!canCycle}
          className="panel-graphic__btn"
        />
        <IconButton
          bordered
          icon={<ChevronLeft />}
          label={t('panelGraphicPrevious')}
          onClick={onPrevious}
          disabled={!canCycle}
          className="panel-graphic__btn"
        />
        <IconButton
          bordered
          icon={<ChevronRight />}
          label={t('panelGraphicNext')}
          onClick={onNext}
          disabled={!canCycle}
          className="panel-graphic__btn"
        />
        <IconButton
          bordered
          icon={<X />}
          label={t('panelGraphicClose')}
          onClick={onClose}
          className="panel-graphic__btn"
        />
      </div>
    </div>
  )
}

export function PanelGraphic({ onClose }: PanelGraphicProps) {
  const { breakGeneration, status } = useWorkspaceSession()
  const isSessionIdle = status === 'idle'
  const [index, setIndex] = useState(() => randomMotifIndex())
  const [showTakeBreak, setShowTakeBreak] = useState(false)
  const { t } = useTranslation()

  const activeMotif = showTakeBreak
    ? breakMotif
    : isSessionIdle
      ? idleMotif
      : decorativeMotifs[index] ?? decorativeMotifs[0]
  const canCycle = !showTakeBreak && !isSessionIdle && decorativeMotifCount > 1

  useEffect(() => {
    if (breakGeneration === 0) return
    setShowTakeBreak(true)
  }, [breakGeneration])

  useEffect(() => {
    if (!isSessionIdle) return
    setShowTakeBreak(false)
  }, [isSessionIdle])

  const handleShuffle = () => {
    if (!canCycle) return
    setIndex((current) => randomMotifIndex(current))
  }

  const handlePrevious = () => {
    if (!canCycle) return
    setIndex((current) => wrapMotifIndex(current - 1))
  }

  const handleNext = () => {
    if (!canCycle) return
    setIndex((current) => wrapMotifIndex(current + 1))
  }

  const panelClassName =
    'panel-graphic flex h-full min-h-0 overflow-hidden rounded-[calc(var(--radius-sm)-0.25rem)]'

  const MotifIcon = activeMotif.Icon

  return (
    <div className={panelClassName}>
      <div className="panel-graphic__stage flex min-w-0 flex-1 flex-col items-center justify-center">
        <div
          key={activeMotif.id}
          className={`panel-graphic__player ${
            showTakeBreak ? 'panel-graphic__player--break' : ''
          }`}
        >
          <MotifIcon aria-hidden strokeWidth={1.5} />
        </div>
        {showTakeBreak ? (
          <span className="panel-graphic__caption">{t('panelGraphicBreak')}</span>
        ) : null}
      </div>
      <PanelGraphicToolbar
        canCycle={canCycle}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onShuffle={handleShuffle}
        onClose={onClose}
      />
    </div>
  )
}
