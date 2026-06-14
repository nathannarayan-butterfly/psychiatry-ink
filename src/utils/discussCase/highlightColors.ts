import { getParticipantColor } from './participantColors'

/** Deterministic highlight background for a participant user id. */
export function getParticipantHighlightColor(userId: string): string {
  return getParticipantColor(userId).highlight
}
