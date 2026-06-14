/** Unified per-participant color tokens for chat, document highlights, and roster. */
export interface ParticipantColor {
  bg: string
  border: string
  text: string
  highlight: string
}

/** Muted clinical palette — stable, subtle, not garish. */
const PARTICIPANT_PALETTE: ParticipantColor[] = [
  { bg: '#e8f4ea', border: '#b8d4bc', text: '#2d6a4f', highlight: '#e8f4ea' }, // sage green
  { bg: '#fce8ef', border: '#e8b8c8', text: '#9b4d6a', highlight: '#fce8ef' }, // light pink
  { bg: '#e8eef8', border: '#b8c8e8', text: '#3d5a8a', highlight: '#e8eef8' }, // soft blue
  { bg: '#f8f0e8', border: '#e0c8a8', text: '#8a6a3d', highlight: '#f8f0e8' }, // amber sand
  { bg: '#f0e8f4', border: '#d0b8e0', text: '#6a4d8a', highlight: '#f0e8f4' }, // lavender
  { bg: '#e8f6f4', border: '#b8ddd8', text: '#2d6a62', highlight: '#e8f6f4' }, // teal
  { bg: '#eef4e8', border: '#c8d8b8', text: '#4a6a3d', highlight: '#eef4e8' }, // moss
  { bg: '#f4ece8', border: '#dcc8b8', text: '#7a5a4a', highlight: '#f4ece8' }, // blush
  { bg: '#ece8f4', border: '#c8b8dc', text: '#5a4a7a', highlight: '#ece8f4' }, // periwinkle
  { bg: '#e8f4f0', border: '#b8dcd0', text: '#3d6a5a', highlight: '#e8f4f0' }, // mint
  { bg: '#f4f0e8', border: '#dcd0b8', text: '#6a5a3d', highlight: '#f4f0e8' }, // cream
  { bg: '#e8f0f4', border: '#b8ccd8', text: '#4a5a6a', highlight: '#e8f0f4' }, // slate blue
]

function hashUserId(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/** Deterministic color set for a participant — stable across session and surfaces. */
export function getParticipantColor(userId: string, index?: number): ParticipantColor {
  const paletteIndex =
    index !== undefined ? index % PARTICIPANT_PALETTE.length : hashUserId(userId) % PARTICIPANT_PALETTE.length
  return PARTICIPANT_PALETTE[paletteIndex]
}
