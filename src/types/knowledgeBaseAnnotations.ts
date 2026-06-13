/** Special section id for the structured receptor-profile block (not a text section). */
export const KB_RECEPTOR_SECTION_ID = 'receptor'

/**
 * Visual style of a user-specific text annotation in reading mode.
 * All variants are personal marks stored per user — never edits to the
 * canonical drug content. Existing stored highlights without a `style`
 * default to `'highlight'` for backward compatibility.
 */
export type HighlightStyle = 'highlight' | 'underline' | 'bold'

/**
 * Tint applied to `style: 'highlight'` marks. Only meaningful for highlights;
 * underline/bold ignore it. Existing stored highlights without a `color`
 * default to `'yellow'` for backward compatibility.
 */
export type HighlightColor =
  | 'yellow'
  | 'green'
  | 'blue'
  | 'pink'
  | 'orange'
  | 'purple'
  | 'teal'
  | 'gray'
  | 'red'
  | 'beige'

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  'yellow',
  'green',
  'blue',
  'pink',
  'orange',
  'purple',
  'teal',
  'gray',
  'red',
  'beige',
]

export const DEFAULT_HIGHLIGHT_COLOR: HighlightColor = 'yellow'

export const HIGHLIGHT_COLOR_HEX: Record<HighlightColor, string> = {
  yellow: '#facc15',
  green: '#4ade80',
  blue: '#60a5fa',
  pink: '#f472b6',
  orange: '#fb923c',
  purple: '#c084fc',
  teal: '#2dd4bf',
  gray: '#94a3b8',
  red: '#f87171',
  beige: '#d6b47d',
}

export interface UserHighlight {
  id: string
  userId: string
  medicationId: string
  sectionId: string
  startOffset: number
  endOffset: number
  text: string
  /** Defaults to 'highlight' when absent (older stored annotations). */
  style?: HighlightStyle
  /** Highlight tint; defaults to 'yellow' when absent (older annotations). */
  color?: HighlightColor
  createdAt: string
}

export interface UserComment {
  id: string
  userId: string
  medicationId: string
  sectionId: string
  text: string
  createdAt: string
  highlightId?: string
}

export interface UserAiChatMessage {
  id: string
  userId: string
  medicationId: string
  sectionId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface KnowledgeBaseAnnotationStore {
  highlights: UserHighlight[]
  comments: UserComment[]
  chatMessages: UserAiChatMessage[]
}

/**
 * A free-form, per-user rich-text note for a single medication, scoped by
 * `userId` + `medicationId`. Stored as an HTML string produced by the
 * reading-mode notes editor. Purely personal — never written to canonical
 * drug content and never shown on the Therapie page.
 */
export interface UserNote {
  userId: string
  medicationId: string
  /** Sanitized HTML produced by the contentEditable notes editor. */
  html: string
  updatedAt: string
}

export interface KnowledgeBaseNotesStore {
  notes: UserNote[]
}
