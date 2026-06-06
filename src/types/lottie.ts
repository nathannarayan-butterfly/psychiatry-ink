import type { LottieComponentProps } from 'lottie-react'

export type LottieAnimationData = LottieComponentProps['animationData']

export interface LottieCharacterConfig {
  id: string
  animationData: LottieAnimationData
  loop?: boolean
  sizeClassName?: string
  speed?: number
}
