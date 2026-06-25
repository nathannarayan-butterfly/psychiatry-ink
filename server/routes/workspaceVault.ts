import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { findSnapshot, listCaseSummariesByUser, upsertSnapshot } from '../data/snapshots'
import { allowsWorkspaceDbSnapshot, resolvePrivacyTier } from '../privacyRegions'
import { requireRouteAuth } from '../utils/requireRouteAuth'

export interface WorkspaceSnapshotBody {
  deviceId: string
  countryCode: string
  caseId: string
  ciphertext: string
  iv: string
  wrappedKey: string
  version?: number
  titleHint?: string
}

export const workspaceVaultRouter: Router = createRouter()

/**
 * Owner key for a snapshot. When the request is authenticated we bind to the
 * verified Supabase user id so a client cannot read another user's snapshot by
 * supplying an arbitrary deviceId. Falls back to deviceId for the local /
 * unauthenticated flow (backwards compatible).
 */
function resolveUserId(req: Request, deviceId: string): string {
  return req.authUserId ?? deviceId
}

/** Authenticated accounts may sync ciphertext regardless of regional tier (passphrase unlock). */
function allowsSnapshotSync(req: Request, countryCode: string): boolean {
  if (req.authUserId) return true
  return allowsWorkspaceDbSnapshot(resolvePrivacyTier(countryCode || null))
}

/**
 * Store encrypted workspace snapshot — clinical ciphertext only, zero knowledge.
 * Rejected for local_only / disabled tiers unless the user is authenticated.
 */
workspaceVaultRouter.put('/snapshot', async (req: Request, res: Response) => {
  try {
    if (!requireRouteAuth(req, res)) return
    const body = req.body as WorkspaceSnapshotBody

    if (
      !body.deviceId?.trim() ||
      !body.caseId?.trim() ||
      !body.ciphertext?.trim() ||
      !body.iv?.trim() ||
      !body.wrappedKey?.trim()
    ) {
      res.status(400).json({ error: 'Missing deviceId, caseId, ciphertext, iv, or wrappedKey' })
      return
    }

    const countryCode = (body.countryCode ?? req.header('x-country-code') ?? '')
      .trim()
      .toUpperCase()
    if (!allowsSnapshotSync(req, countryCode)) {
      const tier = resolvePrivacyTier(countryCode || null)
      res.status(403).json({
        error: 'Workspace snapshot storage not allowed for this region',
        tier,
      })
      return
    }

    const deviceId = body.deviceId.trim()
    const caseId = body.caseId.trim()
    const userId = resolveUserId(req, deviceId)

    const record = await upsertSnapshot({
      userId,
      caseId,
      deviceId,
      ciphertext: body.ciphertext,
      iv: body.iv,
      wrappedKey: body.wrappedKey,
      version: body.version ?? 1,
      titleHint: body.titleHint?.trim() || null,
    })

    res.json({ ok: true, updatedAt: new Date(record.updatedAt).toISOString() })
  } catch (error) {
    console.error('[workspace] snapshot save failed:', error)
    res.status(500).json({ error: 'Failed to save snapshot' })
  }
})

workspaceVaultRouter.get('/snapshot', async (req: Request, res: Response) => {
  try {
    if (!requireRouteAuth(req, res)) return
    const deviceId = (req.query.deviceId as string | undefined)?.trim()
    const caseId = (req.query.caseId as string | undefined)?.trim()
    const countryCode = (
      (req.query.countryCode as string | undefined) ??
      req.header('x-country-code') ??
      ''
    )
      .trim()
      .toUpperCase()

    if (!deviceId || !caseId) {
      res.status(400).json({ error: 'Missing deviceId or caseId' })
      return
    }

    if (!allowsSnapshotSync(req, countryCode)) {
      const tier = resolvePrivacyTier(countryCode || null)
      res.status(403).json({
        error: 'Workspace snapshot read not allowed for this region',
        tier,
      })
      return
    }

    const userId = resolveUserId(req, deviceId)
    const record = await findSnapshot(userId, caseId)

    if (!record) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    res.json({
      caseId: record.caseId,
      ciphertext: record.ciphertext,
      iv: record.iv,
      wrappedKey: record.wrappedKey,
      version: record.version,
      titleHint: record.titleHint,
      updatedAt: new Date(record.updatedAt).toISOString(),
    })
  } catch (error) {
    console.error('[workspace] snapshot read failed:', error)
    res.status(500).json({ error: 'Failed to read snapshot' })
  }
})

/** List encrypted cases for dashboard — metadata only, no ciphertext. */
workspaceVaultRouter.get('/cases', async (req: Request, res: Response) => {
  try {
    if (!requireRouteAuth(req, res)) return
    const deviceId = (req.query.deviceId as string | undefined)?.trim()
    const countryCode = (
      (req.query.countryCode as string | undefined) ??
      req.header('x-country-code') ??
      ''
    )
      .trim()
      .toUpperCase()

    if (!deviceId) {
      res.status(400).json({ error: 'Missing deviceId' })
      return
    }

    if (!allowsSnapshotSync(req, countryCode)) {
      const tier = resolvePrivacyTier(countryCode || null)
      res.status(403).json({
        error: 'Workspace case listing not allowed for this region',
        tier,
      })
      return
    }

    const userId = resolveUserId(req, deviceId)
    const records = await listCaseSummariesByUser(userId)

    res.json({
      cases: records.map((record) => ({
        caseId: record.caseId,
        titleHint: record.titleHint,
        updatedAt: new Date(record.updatedAt).toISOString(),
        createdAt: new Date(record.createdAt).toISOString(),
      })),
    })
  } catch (error) {
    console.error('[workspace] case list failed:', error)
    res.status(500).json({ error: 'Failed to list cases' })
  }
})
