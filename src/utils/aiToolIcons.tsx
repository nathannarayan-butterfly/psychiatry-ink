import type { ReactNode } from 'react'
import {
  AlignJustify,
  BookOpen,
  Brain,
  ListChecks,
  ListTree,
  Maximize2,
  Minimize2,
  Sparkles,
  SpellCheck,
  Zap,
} from 'lucide-react'
import type { AiToolKey } from '../data/aiTools'
import type { AiModelTier } from '../types'

const iconProps = { strokeWidth: 1.5, 'aria-hidden': true as const }

export const documentationToolIcons: Record<AiToolKey, ReactNode> = {
  summarize: <AlignJustify {...iconProps} />,
  structure: <ListTree {...iconProps} />,
  shorten: <Minimize2 {...iconProps} />,
  formalize: <BookOpen {...iconProps} />,
  bulletPoints: <ListChecks {...iconProps} />,
  proofread: <SpellCheck {...iconProps} />,
  expand: <Maximize2 {...iconProps} />,
}

export function tierIcon(tier: AiModelTier, className?: string) {
  if (tier === 'fast') {
    return <Zap className={className} {...iconProps} />
  }
  if (tier === 'standard') {
    return <Sparkles className={className} {...iconProps} />
  }
  return <Brain className={className} {...iconProps} />
}
