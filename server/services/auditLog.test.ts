import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recordKbAdminAudit } from './auditLog'

/**
 * Coverage for the P0-2 acceptance criterion "mutations audit-logged". The
 * kbAdmin integration test stops at the 503 config gate (no service role key),
 * so it never reaches the audit call. Here we exercise recordKbAdminAudit
 * directly: with no org store configured it must still emit a structured,
 * non-PHI log so a mutation is NEVER silent. This also guards against the
 * missing isOrgStoreConfigured import regression (which would throw and drop
 * the audit entry).
 */
describe('recordKbAdminAudit (P0-2 audit logging)', () => {
  const ORIGINAL_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  beforeEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  afterEach(() => {
    if (ORIGINAL_SERVICE_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_SERVICE_KEY
    vi.restoreAllMocks()
  })

  it('emits a structured kb_admin_mutation log (never silent) when no org store is configured', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    await recordKbAdminAudit({
      actorUserId: 'admin-1',
      action: 'substance.approve',
      entityType: 'kb_substance',
      entityId: 'abc',
      source: 'admin',
    })

    expect(info).toHaveBeenCalledTimes(1)
    const [tag, payload] = info.mock.calls[0] ?? []
    expect(String(tag)).toContain('kb_admin_mutation')
    expect(String(payload)).toContain('substance.approve')
    expect(String(payload)).toContain('admin-1')
    // Must not have crashed into the catch (regression guard for the import).
    expect(error).not.toHaveBeenCalled()
  })
})
