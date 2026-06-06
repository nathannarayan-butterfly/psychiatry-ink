import Lottie from 'lottie-react'
import { ChevronLeft, ChevronRight, Shuffle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from '../context/TranslationContext'
import { useWorkspaceSession } from '../context/WorkspaceSessionContext'
import {
  getIdleLottieByIndex,
  getPanelLottieByIndex,
  getRandomIdleLottieIndex,
  getRandomPanelLottieIndex,
  idleLottieCount,
  panelLottieCount,
  wrapIdleLottieIndex,
  wrapPanelLottieIndex,
} from '../data/panelLottieFiles'
import {
  getRandomTakeBreakLottieIndex,
  getTakeBreakLottieByIndex,
  takeBreakLottieCount,
} from '../data/takeBreakLottieFiles'
import { IconButton } from './IconButton'

interface PanelGraphicProps {
  onClose: () => void
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
  const [index, setIndex] = useState(() => getRandomPanelLottieIndex())
  const [idleIndex, setIdleIndex] = useState(() => getRandomIdleLottieIndex())
  const [takeBreakIndex, setTakeBreakIndex] = useState(-1)
  const [showTakeBreak, setShowTakeBreak] = useState(false)
  const decorativeData = getPanelLottieByIndex(index)
  const idleData = getIdleLottieByIndex(idleIndex)
  const takeBreakData = getTakeBreakLottieByIndex(takeBreakIndex)
  const animationData =
    showTakeBreak && takeBreakData
      ? takeBreakData
      : isSessionIdle && idleData
        ? idleData
        : decorativeData
  const canCycleDecorative = panelLottieCount > 1
  const canCycleIdle = idleLottieCount > 1
  const canCycleTakeBreak = takeBreakLottieCount > 1
  const canCycle = showTakeBreak
    ? canCycleTakeBreak
    : isSessionIdle
      ? canCycleIdle
      : canCycleDecorative
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (breakGeneration === 0) return
    setTakeBreakIndex((current) => getRandomTakeBreakLottieIndex(current))
    setShowTakeBreak(true)
  }, [breakGeneration])

  useEffect(() => {
    if (!isSessionIdle) return
    setShowTakeBreak(false)
    if (idleLottieCount === 0) return
    setIdleIndex((current) => getRandomIdleLottieIndex(current))
  }, [isSessionIdle])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setReduceMotion(mediaQuery.matches)

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const handleShuffle = () => {
    if (showTakeBreak) {
      setTakeBreakIndex((current) => getRandomTakeBreakLottieIndex(current))
      return
    }
    if (isSessionIdle) {
      setIdleIndex((current) => getRandomIdleLottieIndex(current))
      return
    }
    setIndex((current) => getRandomPanelLottieIndex(current))
  }

  const handlePrevious = () => {
    if (showTakeBreak) {
      setTakeBreakIndex((current) =>
        takeBreakLottieCount === 0 ? -1 : (current - 1 + takeBreakLottieCount) % takeBreakLottieCount,
      )
      return
    }
    if (isSessionIdle) {
      setIdleIndex((current) => wrapIdleLottieIndex(current - 1))
      return
    }
    setIndex((current) => wrapPanelLottieIndex(current - 1))
    setShowTakeBreak(false)
  }

  const handleNext = () => {
    if (showTakeBreak) {
      setTakeBreakIndex((current) =>
        takeBreakLottieCount === 0 ? -1 : (current + 1) % takeBreakLottieCount,
      )
      return
    }
    if (isSessionIdle) {
      setIdleIndex((current) => wrapIdleLottieIndex(current + 1))
      return
    }
    setIndex((current) => wrapPanelLottieIndex(current + 1))
    setShowTakeBreak(false)
  }

  const panelClassName =
    'panel-graphic flex h-full min-h-0 overflow-hidden rounded-[calc(var(--radius-sm)-0.25rem)]'

  if (!animationData) {
    return (
      <div className={`${panelClassName} panel-graphic--empty border-dashed`}>
        <div className="panel-graphic__stage flex min-w-0 flex-1 items-center justify-center">
          <span className="h-10 w-10 rounded-full border border-border/50 bg-surface" aria-hidden />
        </div>
        <PanelGraphicToolbar
          canCycle={false}
          onPrevious={() => {}}
          onNext={() => {}}
          onShuffle={() => {}}
          onClose={onClose}
        />
      </div>
    )
  }

  return (
    <div className={panelClassName}>
      <div className="panel-graphic__stage flex min-w-0 flex-1 items-center justify-center">
        <Lottie
          key={
            showTakeBreak
              ? `break-${takeBreakIndex}`
              : isSessionIdle
                ? `idle-${idleIndex}`
                : `panel-${index}`
          }
          animationData={animationData}
          loop={!reduceMotion}
          autoplay={!reduceMotion}
          className={`panel-graphic__player ${showTakeBreak ? 'panel-graphic__player--break' : ''}`}
          style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%' }}
          rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
        />
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
