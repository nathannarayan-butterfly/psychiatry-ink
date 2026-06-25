import type { Request, Response, Router } from 'express'
import { Router as createRouter } from 'express'
import { findPublicKeyByDevice, upsertPublicKey } from '../data/publicKeys'
import { allowsPublicKeyRegistration, resolvePrivacyTier } from '../privacyRegions'
import { requireRouteAuth } from '../utils/requireRouteAuth'
import { pathParam } from '../utils/expressParams'

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
    if (!requireRouteAuth(req, res)) return
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

    await upsertPublicKey({
      deviceId: body.deviceId.trim(),
      publicKeyJwk,
      countryCode,
    })

    res.json({ ok: true, tier })
  } catch (error) {
    console.error('[crypto] public-key registration failed:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

cryptoRouter.get('/public-key/:deviceId', async (req: Request, res: Response) => {
  try {
    if (!requireRouteAuth(req, res)) return
    const record = await findPublicKeyByDevice(pathParam(req, 'deviceId'))

    if (!record) {
      res.status(404).json({ error: 'Not found' })
      return
    }

    res.json({
      publicKeyJwk: JSON.parse(record.publicKeyJwk) as JsonWebKey,
      countryCode: record.countryCode,
      createdAt: new Date(record.createdAt).toISOString(),
    })
  } catch (error) {
    console.error('[crypto] public-key read failed:', error)
    res.status(500).json({ error: 'Failed to read public key' })
  }
})
