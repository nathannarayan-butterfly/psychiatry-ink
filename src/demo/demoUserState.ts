import { demoUserStateKey } from './constants'
import type { DemoUserState, DemoUserStatus } from './types'

const DEFAULT_STATE: DemoUserState = {
  status: 'none',
  seedVersion: '',
}

export function loadDemoUserState(userId: string): DemoUserState {
  try {
    const raw = localStorage.getItem(demoUserStateKey(userId))
    if (!raw) return { ...DEFAULT_STATE }
    const parsed = JSON.parse(raw) as DemoUserState
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_STATE }
    return {
      status: parsed.status ?? 'none',
      seedVersion: parsed.seedVersion ?? '',
      installedAt: parsed.installedAt,
      archivedAt: parsed.archivedAt,
      removedAt: parsed.removedAt,
    }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

export function saveDemoUserState(userId: string, state: DemoUserState): void {
  try {
    localStorage.setItem(demoUserStateKey(userId), JSON.stringify(state))
  } catch {
    // ignore quota
  }
}

export function patchDemoUserState(
  userId: string,
  patch: Partial<DemoUserState> & { status: DemoUserStatus },
): DemoUserState {
  const next: DemoUserState = { ...loadDemoUserState(userId), ...patch }
  saveDemoUserState(userId, next)
  return next
}

export function isDemoArchivedForUser(userId: string): boolean {
  return loadDemoUserState(userId).status === 'archived'
}

export function isDemoRemovedForUser(userId: string): boolean {
  return loadDemoUserState(userId).status === 'removed'
}

export function shouldAutoInstallDemo(userId: string): boolean {
  const state = loadDemoUserState(userId)
  return state.status === 'none'
}
