import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { prisma } from '../db'
import { allowsPublicKeyRegistration, resolvePrivacyTier } from '../privacyRegions'

export interface PublicKeyRegistrationBody {
  deviceId: string
  publicKeyJwk: JsonWebKey
  countryCode: string
}

export const cryptoRouter: Router = createRouter()

/**
 * Register a user's public key for optional future encrypted sync.
 * Name/age are never accepted — public key JWK only.
 */
cryptoRouter.post('/public-key', async (req: Request, res: Response) => {
  try {
    const body = req.body as PublicKeyRegistrationBody

    if (!body.deviceId?.trim() || !body.publicKeyJwk || !body.countryCode?.trim()) {
      res.status(400).json({ error: 'Missing deviceId, publicKeyJwk, or countryCode' })
      return
    }

    const countryCode = body.countryCode.trim().toUpperCase()
    const tier = resolvePrivacyTier(countryCode)

    if (!allowsPublicKeyRegistration(tier)) {
      res.status(403).json({
        error: 'Public key registration not allowed for this region',
        tier,
      })
      return
    }

    const publicKeyJwk = JSON.stringify(body.publicKeyJwk)

    await prisma.userPublicKey.upsert({
      where: { deviceId: body.deviceId.trim() },
      create: {
        deviceId: body.deviceId.trim(),
        publicKeyJwk,
        countryCode,
      },
      update: {
        publicKeyJwk,
        countryCode,
      },
    })

    res.json({ ok: true, tier })
  } catch (error) {
    console.error('[crypto] public-key registration failed:', error)
    const message = error instanceof Error ? error.message : 'Registration failed'
    res.status(500).json({ error: message })
  }
})

cryptoRouter.get('/public-key/:deviceId', async (req: Request, res: Response) => {
  try {
    const record = await prisma.userPublicKey.findUnique({
      where: { deviceId: req.params.deviceId },
      select: { publicKeyJwk: true, countryCode: true, createdAt: true },
    })

    if (!record) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    res.json({
      publicKeyJwk: JSON.parse(record.publicKeyJwk) as JsonWebKey,
      countryCode: record.countryCode,
      createdAt: record.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('[crypto] public-key read failed:', error)
    res.status(500).json({ error: 'Failed to read public key' })
  }
})
