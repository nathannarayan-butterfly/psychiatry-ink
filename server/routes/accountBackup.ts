import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { prisma } from '../db'

export const accountBackupRouter: Router = createRouter()

interface EncryptedBlobBody {
  salt?: string
  iv?: string
  ciphertext?: string
  iterations?: number
  version?: number
}

function requireAuthUserId(req: Request, res: Response): string | null {
  const userId = req.authUserId?.trim()
  if (!userId) {
    res.status(401).json({ error: 'Authentication required' })
    return null
  }
  return userId
}

function validateEncryptedBlob(body: EncryptedBlobBody, res: Response): EncryptedBlobBody | null {
  const salt = body.salt?.trim()
  const iv = body.iv?.trim()
  const ciphertext = body.ciphertext?.trim()
  if (!salt || !iv || !ciphertext) {
    res.status(400).json({ error: 'Missing salt, iv, or ciphertext' })
    return null
  }
  return {
    salt,
    iv,
    ciphertext,
    iterations: typeof body.iterations === 'number' ? body.iterations : 310_000,
    version: typeof body.version === 'number' ? body.version : 1,
  }
}

/** GET /api/account-backup/status — whether encrypted backups exist for this account. */
accountBackupRouter.get('/status', async (req: Request, res: Response) => {
  const userId = requireAuthUserId(req, res)
  if (!userId) return

  try {
    const [keyBackup, registryBackup] = await Promise.all([
      prisma.accountKeyBackup.findUnique({ where: { userId }, select: { updatedAt: true } }),
      prisma.accountRegistryBackup.findUnique({ where: { userId }, select: { updatedAt: true } }),
    ])

    res.json({
      hasKeyBackup: Boolean(keyBackup),
      hasRegistryBackup: Boolean(registryBackup),
      keyUpdatedAt: keyBackup?.updatedAt.toISOString() ?? null,
      registryUpdatedAt: registryBackup?.updatedAt.toISOString() ?? null,
    })
  } catch (error) {
    console.error('[account-backup] status failed', error)
    res.status(500).json({ error: 'Failed to read backup status' })
  }
})

/** GET /api/account-backup/key — passphrase-wrapped private key (ciphertext only). */
accountBackupRouter.get('/key', async (req: Request, res: Response) => {
  const userId = requireAuthUserId(req, res)
  if (!userId) return

  try {
    const record = await prisma.accountKeyBackup.findUnique({ where: { userId } })
    if (!record) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    res.json({
      salt: record.salt,
      iv: record.iv,
      ciphertext: record.ciphertext,
      iterations: record.iterations,
      version: record.version,
      updatedAt: record.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('[account-backup] key read failed', error)
    res.status(500).json({ error: 'Failed to read key backup' })
  }
})

/** PUT /api/account-backup/key */
accountBackupRouter.put('/key', async (req: Request, res: Response) => {
  const userId = requireAuthUserId(req, res)
  if (!userId) return

  const body = validateEncryptedBlob(req.body as EncryptedBlobBody, res)
  if (!body) return

  try {
    const record = await prisma.accountKeyBackup.upsert({
      where: { userId },
      create: {
        userId,
        salt: body.salt!,
        iv: body.iv!,
        ciphertext: body.ciphertext!,
        iterations: body.iterations ?? 310_000,
        version: body.version ?? 1,
      },
      update: {
        salt: body.salt!,
        iv: body.iv!,
        ciphertext: body.ciphertext!,
        iterations: body.iterations ?? 310_000,
        version: body.version ?? 1,
      },
    })

    res.json({ ok: true, updatedAt: record.updatedAt.toISOString() })
  } catch (error) {
    console.error('[account-backup] key write failed', error)
    res.status(500).json({ error: 'Failed to save key backup' })
  }
})

/** GET /api/account-backup/registry — encrypted local registry bundle. */
accountBackupRouter.get('/registry', async (req: Request, res: Response) => {
  const userId = requireAuthUserId(req, res)
  if (!userId) return

  try {
    const record = await prisma.accountRegistryBackup.findUnique({ where: { userId } })
    if (!record) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    res.json({
      salt: record.salt,
      iv: record.iv,
      ciphertext: record.ciphertext,
      version: record.version,
      updatedAt: record.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('[account-backup] registry read failed', error)
    res.status(500).json({ error: 'Failed to read registry backup' })
  }
})

/** DELETE /api/account-backup/registry — remove encrypted identifier backup (device-only mode). */
accountBackupRouter.delete('/registry', async (req: Request, res: Response) => {
  const userId = requireAuthUserId(req, res)
  if (!userId) return

  try {
    await prisma.accountRegistryBackup.deleteMany({ where: { userId } })
    res.json({ ok: true })
  } catch (error) {
    console.error('[account-backup] registry delete failed', error)
    res.status(500).json({ error: 'Failed to delete registry backup' })
  }
})

/** PUT /api/account-backup/registry */
accountBackupRouter.put('/registry', async (req: Request, res: Response) => {
  const userId = requireAuthUserId(req, res)
  if (!userId) return

  const body = validateEncryptedBlob(req.body as EncryptedBlobBody, res)
  if (!body) return

  try {
    const record = await prisma.accountRegistryBackup.upsert({
      where: { userId },
      create: {
        userId,
        salt: body.salt!,
        iv: body.iv!,
        ciphertext: body.ciphertext!,
        version: body.version ?? 1,
      },
      update: {
        salt: body.salt!,
        iv: body.iv!,
        ciphertext: body.ciphertext!,
        version: body.version ?? 1,
      },
    })

    res.json({ ok: true, updatedAt: record.updatedAt.toISOString() })
  } catch (error) {
    console.error('[account-backup] registry write failed', error)
    res.status(500).json({ error: 'Failed to save registry backup' })
  }
})
