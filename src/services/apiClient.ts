export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export class InsufficientCreditsError extends Error {
  constructor(message = 'Insufficient credits') {
    super(message)
    this.name = 'InsufficientCreditsError'
  }
}
