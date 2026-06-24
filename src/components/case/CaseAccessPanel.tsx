import { Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../context/TranslationContext'
import { usePermissionContext } from '../../contexts/PermissionContext'
import {
  CASE_ACCESS_GRANT_LEVELS,
  CASE_ACCESS_LABEL_KEYS,
  isGrantLevelAllowed,
  type CaseAccessLevel,
} from '../../data/org/caseAccessLevels'
import { teamRoleLabelKey } from '../../data/org/teamRoles'
import type { OrganisationRole } from '../../types/organisation'
import { useCaseAccessSnapshot } from '../../hooks/useCaseAccessSnapshot'
import {
  claimCaseOwner,
  fetchTeamSnapshot,
  setCaseAccessForCase,
  type TeamMemberProfile,
} from '../../services/orgApi'
import {
  OrgVaultKeySetupError,
  setupVaultKeyForMember,
} from '../../utils/orgCaseVault'
import { ClinicalLoading } from '../ui/ClinicalLoading'
import {
  formatSettingsExtraUi,
  translateSettingsExtraUi,
} from '../../data/settingsExtraUiTranslations'
import '../../styles/case-access-panel.css'

interface CaseAccessPanelProps {
  caseId: string
  caseTitle?: string
  onClose: () => void
}

function memberLabel(member: TeamMemberProfile): string {
  if (member.displayName?.trim()) return member.displayName.trim()
  if (member.email?.trim()) return member.email.trim()
  return member.userId.slice(0, 8)
}

export function CaseAccessPanel({ caseId, caseTitle, onClose }: CaseAccessPanelProps) {
  const { user } = useAuth()
  const { t, language } = useTranslation()
  const roleLabel = (role: OrganisationRole): string => {
    const key = teamRoleLabelKey(role)
    return key ? t(key) : role
  }
  const { organisation, role } = usePermissionContext()
  const { snapshot, isLoading, error, refresh } = useCaseAccessSnapshot(caseId)

  const [members, setMembers] = useState<TeamMemberProfile[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<CaseAccessLevel>('read_only')
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [vaultSetupMessage, setVaultSetupMessage] = useState<string | null>(null)
  const [claimingOwner, setClaimingOwner] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMembersLoading(true)
    void fetchTeamSnapshot()
      .then((team) => {
        if (!cancelled) {
          setMembers(team.members.filter((m) => m.status === 'active'))
        }
      })
      .catch(() => {
        if (!cancelled) setMembers([])
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!snapshot?.canManage || !user?.id || snapshot.caseOwnerUserId) return
    let cancelled = false
    setClaimingOwner(true)
    void claimCaseOwner(caseId)
      .then(() => {
        if (!cancelled) void refresh()
      })
      .catch(() => {
        // Non-fatal — user may not be allowed yet
      })
      .finally(() => {
        if (!cancelled) setClaimingOwner(false)
      })
    return () => {
      cancelled = true
    }
  }, [caseId, refresh, snapshot?.canManage, snapshot?.caseOwnerUserId, user?.id])

  const grantableMembers = useMemo(
    () => members.filter((m) => m.userId !== user?.id),
    [members, user?.id],
  )

  const levelOptionsForTarget = useCallback(
    (targetRole: typeof members[number]['role']) => {
      if (!role) return CASE_ACCESS_GRANT_LEVELS
      return CASE_ACCESS_GRANT_LEVELS.filter((level) =>
        isGrantLevelAllowed(level, targetRole, role),
      )
    },
    [role],
  )

  const setupVaultEncryption = async (targetUserId: string, level: CaseAccessLevel) => {
    if (organisation?.tier !== 'small_praxis' || level === 'no_access') return
    if (!organisation?.id) return
    try {
      await setupVaultKeyForMember(organisation.id, caseId, targetUserId)
      setVaultSetupMessage(translateSettingsExtraUi(language, 'caseVaultSetupDone'))
    } catch (err) {
      if (err instanceof OrgVaultKeySetupError) {
        setActionError(err.message)
      } else {
        setActionError(
          err instanceof Error
            ? err.message
            : translateSettingsExtraUi(language, 'caseVaultSetupFailed'),
        )
      }
    }
  }

  const handleSaveGrant = async () => {
    if (!selectedUserId) return
    setSaving(true)
    setActionError(null)
    setVaultSetupMessage(null)
    try {
      await setCaseAccessForCase(caseId, selectedUserId, selectedLevel)
      await setupVaultEncryption(selectedUserId, selectedLevel)
      await refresh()
      setSelectedUserId('')
      setSelectedLevel('read_only')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : translateSettingsExtraUi(language, 'commonSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveGrant = async (targetUserId: string) => {
    setSaving(true)
    setActionError(null)
    try {
      await setCaseAccessForCase(caseId, targetUserId, 'no_access')
      await refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : translateSettingsExtraUi(language, 'caseRemoveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleLevelChange = async (targetUserId: string, level: CaseAccessLevel) => {
    setSaving(true)
    setActionError(null)
    setVaultSetupMessage(null)
    try {
      await setCaseAccessForCase(caseId, targetUserId, level)
      await setupVaultEncryption(targetUserId, level)
      await refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : translateSettingsExtraUi(language, 'commonSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const canManage = snapshot?.canManage ?? false
  const loading = isLoading || membersLoading || claimingOwner

  return (
    <div className="case-access-panel-overlay" role="presentation" onClick={onClose}>
      <aside
        className="case-access-panel"
        role="dialog"
        aria-labelledby="case-access-panel-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="case-access-panel__header">
          <div>
            <h2 id="case-access-panel-title" className="case-access-panel__title">
              {translateSettingsExtraUi(language, 'caseAccessTitle')}
            </h2>
            {caseTitle ? (
              <p className="case-access-panel__subtitle">{caseTitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="case-access-panel__close"
            onClick={onClose}
            aria-label={translateSettingsExtraUi(language, 'commonClose')}
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </header>

        {loading ? (
          <ClinicalLoading label={translateSettingsExtraUi(language, 'caseAccessLoading')} />
        ) : error ? (
          <p className="clinical-empty-state">{error}</p>
        ) : !canManage ? (
          <p className="clinical-empty-state">
            {translateSettingsExtraUi(language, 'caseNoPermission')}
          </p>
        ) : (
          <div className="case-access-panel__body">
            <p className="case-access-panel__intro">
              {translateSettingsExtraUi(language, 'caseAccessIntro')}
            </p>

            {actionError ? (
              <p className="case-access-panel__error" role="alert">
                {actionError}
              </p>
            ) : null}

            {vaultSetupMessage ? (
              <p className="case-access-panel__success" role="status">
                {vaultSetupMessage}
              </p>
            ) : null}

            <section className="case-access-panel__section" aria-labelledby="case-access-grants">
              <h3 id="case-access-grants" className="case-access-panel__section-heading">
                {translateSettingsExtraUi(language, 'caseCurrentGrants')}
              </h3>
              {snapshot?.grants.filter((g) => !g.isOwner || snapshot.grants.length > 1).length ===
              0 ? (
                <p className="clinical-empty-state clinical-empty-state--compact">
                  {translateSettingsExtraUi(language, 'caseNoGrants')}
                </p>
              ) : (
                <ul className="case-access-panel__grant-list">
                  {snapshot?.grants.map((grant) => {
                    const member = members.find((m) => m.userId === grant.userId)
                    const targetRole = grant.role ?? member?.role ?? 'clinician'
                    const options = levelOptionsForTarget(targetRole)
                    return (
                      <li key={grant.userId} className="case-access-panel__grant-row">
                        <div className="case-access-panel__grant-user">
                          <span className="case-access-panel__grant-name">
                            {grant.displayName ?? grant.email ?? grant.userId.slice(0, 8)}
                            {grant.isOwner ? (
                              <span className="case-access-panel__owner-badge">{translateSettingsExtraUi(language, 'caseOwnerBadge')}</span>
                            ) : null}
                          </span>
                          {targetRole ? (
                            <span className="case-access-panel__grant-role">
                              {roleLabel(targetRole)}
                            </span>
                          ) : null}
                        </div>
                        {grant.userId === user?.id ? (
                          <span className="case-access-panel__grant-level-static">
                            {t(CASE_ACCESS_LABEL_KEYS[grant.level])}
                          </span>
                        ) : (
                          <div className="case-access-panel__grant-actions">
                            <select
                              className="case-access-panel__select"
                              value={grant.level}
                              disabled={saving || grant.isOwner}
                              onChange={(e) =>
                                void handleLevelChange(
                                  grant.userId,
                                  e.target.value as CaseAccessLevel,
                                )
                              }
                              aria-label={formatSettingsExtraUi(language, 'caseAccessLevelForAria', {
                                name: grant.displayName ?? grant.userId,
                              })}
                            >
                              {options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {t(CASE_ACCESS_LABEL_KEYS[opt])}
                                </option>
                              ))}
                            </select>
                            {!grant.isOwner ? (
                              <button
                                type="button"
                                className="case-access-panel__remove"
                                disabled={saving}
                                onClick={() => void handleRemoveGrant(grant.userId)}
                                aria-label={translateSettingsExtraUi(language, 'caseRemoveAccess')}
                                title={translateSettingsExtraUi(language, 'caseRemoveAccess')}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            ) : null}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {grantableMembers.length > 0 ? (
              <section className="case-access-panel__section" aria-labelledby="case-access-add">
                <h3 id="case-access-add" className="case-access-panel__section-heading">
                  {translateSettingsExtraUi(language, 'caseAddGrant')}
                </h3>
                <div className="case-access-panel__add-form">
                  <select
                    className="case-access-panel__select"
                    value={selectedUserId}
                    onChange={(e) => {
                      const uid = e.target.value
                      setSelectedUserId(uid)
                      const member = grantableMembers.find((m) => m.userId === uid)
                      if (member) {
                        const opts = levelOptionsForTarget(member.role)
                        if (!opts.includes(selectedLevel)) {
                          setSelectedLevel(opts[0] ?? 'read_only')
                        }
                      }
                    }}
                    aria-label={translateSettingsExtraUi(language, 'caseTeamMemberAria')}
                  >
                    <option value="">{translateSettingsExtraUi(language, 'caseSelectMember')}</option>
                    {grantableMembers
                      .filter(
                        (m) => !snapshot?.grants.some((g) => g.userId === m.userId && !g.isOwner),
                      )
                      .map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {memberLabel(member)} ({roleLabel(member.role)})
                        </option>
                      ))}
                  </select>
                  <select
                    className="case-access-panel__select"
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value as CaseAccessLevel)}
                    disabled={!selectedUserId}
                    aria-label={translateSettingsExtraUi(language, 'caseAccessLevelAria')}
                  >
                    {(selectedUserId
                      ? levelOptionsForTarget(
                          grantableMembers.find((m) => m.userId === selectedUserId)?.role ??
                            'clinician',
                        )
                      : CASE_ACCESS_GRANT_LEVELS
                    ).map((opt) => (
                      <option key={opt} value={opt}>
                        {t(CASE_ACCESS_LABEL_KEYS[opt])}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="case-access-panel__save"
                    disabled={!selectedUserId || saving}
                    onClick={() => void handleSaveGrant()}
                  >
                    {translateSettingsExtraUi(language, 'commonSave')}
                  </button>
                </div>
              </section>
            ) : null}

            {organisation?.tier === 'small_praxis' ? (
              <p className="case-access-panel__hint">
                {translateSettingsExtraUi(language, 'caseSmallPraxisHint')}
              </p>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  )
}
