import { createPortal } from 'react-dom'
import { lottieCharacters } from '../data/lottieCharacters'
import type { LottieCharacterConfig } from '../types/lottie'
import { LottieCharacter } from './LottieCharacter'

interface LottieCharacterStageProps {
  characters?: LottieCharacterConfig[]
}

export function LottieCharacterStage({
  characters = lottieCharacters,
}: LottieCharacterStageProps) {
  if (characters.length === 0) return null

  return createPortal(
    <div className="lottie-character-stage" aria-hidden>
      {characters.map((character) => (
        <LottieCharacter key={character.id} character={character} />
      ))}
    </div>,
    document.body,
  )
}
