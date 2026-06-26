/**
 * Voucher recurring-grant schedule math (pure, deterministic, unit-tested).
 *
 * A redemption grants one period's credits at each boundary:
 *   period k is due at redeemed_at + k * period_months  (k = 0, 1, …)
 * Period 0 is due immediately at redemption. The schedule runs for
 * `totalPeriods` periods total (anchored at redemption — the voucher validity
 * window only gates *when a code may be redeemed*, not the post-redemption
 * grant schedule).
 *
 * The authoritative, exactly-once grant happens in the `voucher_grant_period`
 * RPC (guarded by the unique `voucher_period_grants(redemption_id, period_index)`
 * row). This module decides *which* period indices are now due so the server can
 * drive that RPC; re-running it after a grant returns no indices, so it is
 * idempotent at the orchestration layer too.
 */

export interface VoucherScheduleInput {
  /** ISO timestamp the voucher was redeemed (the schedule anchor). */
  redeemedAt: string
  /** Periods already granted (the cursor). */
  periodsGranted: number
  /** Total periods the voucher grants. */
  totalPeriods: number
  /** Months between periods (1 = monthly). */
  periodMonths: number
}

/** Add `months` calendar months to an epoch-ms instant (UTC-safe). */
export function addMonths(epochMs: number, months: number): number {
  const d = new Date(epochMs)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.getTime()
}

/**
 * Period indices that are due to be granted at `now`, given the current cursor.
 * Returns an ascending list in [periodsGranted, totalPeriods). Empty when the
 * cursor is exhausted or the next boundary is still in the future.
 */
export function computeDuePeriodIndices(
  input: VoucherScheduleInput,
  now: Date = new Date(),
): number[] {
  const { periodsGranted, totalPeriods, periodMonths } = input
  const anchor = Date.parse(input.redeemedAt)
  if (!Number.isFinite(anchor)) return []
  if (periodMonths <= 0 || totalPeriods <= 0) return []

  const nowMs = now.getTime()
  const indices: number[] = []
  for (let k = Math.max(0, periodsGranted); k < totalPeriods; k += 1) {
    const dueAt = addMonths(anchor, k * periodMonths)
    if (dueAt > nowMs) break
    indices.push(k)
  }
  return indices
}
