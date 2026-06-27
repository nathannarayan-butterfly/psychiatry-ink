/**
 * Shared credit/access error classes.
 *
 * Extracted into a dependency-free module so both the credit data layer
 * (`creditGuard`) and the access gate (`subscriptionAccess`) can depend on the
 * same base classes WITHOUT importing each other — `subscriptionAccess` defines
 * {@link AccessLockedError} as a subclass of {@link InsufficientCreditsError},
 * while `creditGuard` needs the access gate at spend time. Keeping the errors
 * here avoids a circular import between those two modules.
 */

export class InsufficientCreditsError extends Error {
  readonly available: number
  readonly required: number

  constructor(available: number, required: number) {
    super(`Insufficient AI credits: ${required} required, ${available} available.`)
    this.name = 'InsufficientCreditsError'
    this.available = available
    this.required = required
  }
}

/**
 * Thrown when the AI credit infrastructure itself is unreachable (DB outage,
 * migration not applied, misconfigured Supabase env, etc.). Distinct from
 * {@link InsufficientCreditsError} so the caller can fail closed in production
 * without conflating "user has no credits" with "we can't tell".
 */
export class CreditInfrastructureError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CreditInfrastructureError'
  }
}
