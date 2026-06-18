/**
 * Anforderungen storage — per-case array with encrypted localStorage write-through
 * and workspace vault sync (mirrors complementaryTherapy storage).
 */

import type { Anforderung, AnforderungStatus } from '../../types/anforderung'
import type { OrganisationRole, OrganisationTier } from '../../types/organisation'
import { getActiveCaseId } from '../caseContext'
import { readOrMigrateEncryptedJson, writeEncryptedJson } from '../encryptedLocalStore'

const cache = new Map<string, Anforderung[]>()
const localShadow = new Map<string, Anforderung[]>()

const LS_PREFIX = 'psychiatry-ink:anforderungen:'

export const ANFORDERUNGEN_CHANGED_EVENT = 'psychiatry-ink:anforderungen:changed'

function lsKey(caseId: string): string {
  return `${LS_PREFIX}${caseId}`
}

function writeLocalStorage(caseId: string, orders: Anforderung[]): void {
  localShadow.set(caseId, orders)
  void writeEncryptedJson(lsKey(caseId), orders)
}

function readLocalStorage(caseId: string): Anforderung[] | null {
  return localShadow.has(caseId) ? localShadow.get(caseId)! : null
}

function notifyChanged(caseId: string): void {
  try {
    window.dispatchEvent(
      new CustomEvent(ANFORDERUNGEN_CHANGED_EVENT, { detail: { caseId } }),
    )
  } catch {
    // not in browser
  }
}

function latestUpdatedAt(orders: Anforderung[]): number {
  return orders.reduce((max, o) => {
    const time = o.updatedAt ? new Date(o.updatedAt).getTime() : 0
    return time > max ? time : max
  }, 0)
}

function isValidOrder(value: unknown): value is Anforderung {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.caseId === 'string' &&
    typeof o.catalogId === 'string' &&
    typeof o.label === 'string' &&
    typeof o.createdAt === 'string' &&
    typeof o.updatedAt === 'string' &&
    (o.status === 'pending' ||
      o.status === 'accepted' ||
      o.status === 'rejected' ||
      o.status === 'cancelled')
  )
}

function normalizeOrders(orders: Anforderung[]): Anforderung[] {
  return orders.filter(isValidOrder)
}

export type AnforderungenPersistHook = (caseId: string) => void
type AnforderungenListener = (caseId: string) => void

let persistHook: AnforderungenPersistHook | null = null
let persistTimer: number | null = null
const listeners = new Set<AnforderungenListener>()

function notifyListeners(caseId: string): void {
  listeners.forEach((listener) => listener(caseId))
}

export function subscribeAnforderungen(listener: AnforderungenListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function registerAnforderungenPersistHook(hook: AnforderungenPersistHook | null): void {
  persistHook = hook
}

function notifyPersist(caseId: string): void {
  persistHook?.(caseId)
}

function resolveCaseId(caseId?: string): string {
  return caseId ?? getActiveCaseId()
}

export async function hydrateAnforderungenFromEncryptedLocal(caseId?: string): Promise<void> {
  const resolved = resolveCaseId(caseId)
  try {
    const persisted = await readOrMigrateEncryptedJson<Anforderung[]>(lsKey(resolved))
    if (!persisted) return
    const normalized = normalizeOrders(persisted)
    localShadow.set(resolved, normalized)
    if (!cache.has(resolved)) cache.set(resolved, normalized)
    notifyListeners(resolved)
  } catch {
    // best-effort
  }
}

export function loadAnforderungen(caseId?: string): Anforderung[] {
  const resolved = resolveCaseId(caseId)
  const cached = cache.get(resolved)
  if (cached) return cached

  const persisted = readLocalStorage(resolved)
  if (persisted) {
    cache.set(resolved, persisted)
    return persisted
  }

  return []
}

export function saveAnforderungen(orders: Anforderung[], caseId?: string): void {
  const resolved = resolveCaseId(caseId)
  const normalized = normalizeOrders(orders)
  cache.set(resolved, normalized)
  writeLocalStorage(resolved, normalized)
  notifyListeners(resolved)
  notifyChanged(resolved)

  if (persistTimer !== null) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    notifyPersist(resolved)
  }, 800)
}

export function applyAnforderungen(
  orders: Anforderung[] | null | undefined,
  caseId?: string,
): void {
  const resolved = resolveCaseId(caseId)
  if (!orders) return
  const normalized = normalizeOrders(orders)

  const local = readLocalStorage(resolved)
  const vaultTime = latestUpdatedAt(normalized)
  const localTime = local ? latestUpdatedAt(local) : 0

  if (vaultTime >= localTime) {
    cache.set(resolved, normalized)
    writeLocalStorage(resolved, normalized)
  } else if (local) {
    cache.set(resolved, local)
  }

  notifyListeners(resolved)
}

export function resolveInitialAnforderungStatus(
  orgTier: OrganisationTier | null | undefined,
  requiresAcceptance: boolean,
): AnforderungStatus {
  if (!orgTier || orgTier === 'single_use') return 'accepted'
  if (!requiresAcceptance) return 'accepted'
  return 'pending'
}

/** Roles that may accept or reject pending orders in praxis / enterprise mode. */
export function canAcceptAnforderung(role: OrganisationRole | null | undefined): boolean {
  if (!role) return false
  return (
    role === 'org_owner' ||
    role === 'org_admin' ||
    role === 'clinical_lead' ||
    role === 'site_admin' ||
    role === 'department_admin' ||
    role === 'clinician'
  )
}

export function needsAnforderungAcceptance(orgTier: OrganisationTier | null | undefined): boolean {
  return Boolean(orgTier && orgTier !== 'single_use')
}

export function upsertAnforderung(order: Anforderung, caseId?: string): Anforderung {
  const resolved = resolveCaseId(caseId)
  const existing = loadAnforderungen(resolved)
  const idx = existing.findIndex((o) => o.id === order.id)
  const next =
    idx >= 0
      ? existing.map((o) => (o.id === order.id ? order : o))
      : [order, ...existing]
  saveAnforderungen(next, resolved)
  return order
}

export function updateAnforderungStatus(
  caseId: string,
  orderId: string,
  status: AnforderungStatus,
  review?: {
    reviewedByUserId?: string
    reviewedByDisplayName?: string
    reviewComment?: string
  },
): Anforderung | null {
  const existing = loadAnforderungen(caseId)
  const target = existing.find((o) => o.id === orderId)
  if (!target) return null
  const now = new Date().toISOString()
  const updated: Anforderung = {
    ...target,
    status,
    updatedAt: now,
    reviewedAt: review ? now : target.reviewedAt,
    reviewedByUserId: review?.reviewedByUserId ?? target.reviewedByUserId,
    reviewedByDisplayName: review?.reviewedByDisplayName ?? target.reviewedByDisplayName,
    reviewComment: review?.reviewComment ?? target.reviewComment,
  }
  upsertAnforderung(updated, caseId)
  return updated
}

export function cancelAnforderung(caseId: string, orderId: string): Anforderung | null {
  return updateAnforderungStatus(caseId, orderId, 'cancelled')
}
