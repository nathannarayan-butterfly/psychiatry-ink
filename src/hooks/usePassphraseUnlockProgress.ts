import { useEffect, useState } from 'react'
import {
  getPassphraseUnlockProgress,
  subscribeToPassphraseUnlockProgress,
  type UnlockProgress,
} from '../utils/passphraseUnlockProgress'

/**
 * React subscription to the global passphrase unlock state machine. The state
 * lives in module-scope (see `utils/passphraseUnlockProgress.ts`) so that any
 * surface that triggers an unlock — `AccountRegistryRestoreBanner`,
 * `WorkspaceVaultSection`, the cloud-restore Settings panel — drives the same
 * progress view without prop-drilling.
 */
export function usePassphraseUnlockProgress(): UnlockProgress {
  const [progress, setProgress] = useState<UnlockProgress>(() =>
    getPassphraseUnlockProgress(),
  )

  useEffect(() => subscribeToPassphraseUnlockProgress(setProgress), [])

  return progress
}
