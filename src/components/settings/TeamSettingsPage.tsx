import { ArrowLeft, Copy, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePermissionContext } from '../../contexts/PermissionContext'
import {
  resolveInviteRolesForOrg,
  resolveUiRolesForOrg,
  teamRoleLabelKey,
} from '../../data/org/teamRoles'
import { THERAPY_DISCIPLINES, THERAPY_DISCIPLINE_LABEL_KEYS } from '../../data/org/therapyDiscipline'
import type { TherapyDiscipline } from '../../types/organisation'
import { useTranslation } from '../../context/TranslationContext'
import type { UiLanguage } from '../../types/settings'
import {
  formatSettingsWorkspaceUi,
  translateSettingsWorkspaceUi,
  type SettingsWorkspaceUiKey,
} from '../../data/settingsWorkspaceUiTranslations'
import { usePermissions } from '../../hooks/permissions'
import {
  createOrgInvite,
  deactivateOrgMember,
  fetchTeamSnapshot,
  revokeOrgInvite,
  updateOrgMember,
  updateOrganisationName,
  upgradeToSmallPraxis,
  type TeamMemberProfile,
  type TeamSnapshot,
} from '../../services/orgApi'
import { MemberEditPanel } from './MemberEditPanel'
import type { OrganisationRole } from '../../types/organisation'
import { ClinicalLoading } from '../ui/ClinicalLoading'

interface TeamSettingsPageProps {
  onBack: () => void
}

function memberDisplayName(
  displayName: string | null,
  email: string | null,
  userId: string,
): string {
  if (displayName?.trim()) return displayName.trim()
  if (email?.trim()) return email.trim()
  return userId.slice(0, 8)
}

function statusLabel(status: string, language: UiLanguage): string {
  const map: Record<string, SettingsWorkspaceUiKey> = {
    active: 'teamStatusActive',
    invited: 'teamStatusInvited',
    suspended: 'teamStatusSuspended',
    pending: 'teamStatusPending',
    revoked: 'teamStatusRevoked',
    expired: 'teamStatusExpired',
    accepted: 'teamStatusAccepted',
  }
  const key = map[status]
  return key ? translateSettingsWorkspaceUi(language, key) : status
}

function formatExpiryDe(expiresAt: string | null): string {
  if (!expiresAt) return '—'
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function InviteLinkPanel({
  url,
  copyKey,
  copiedKey,
  language,
  onCopy,
}: {
  url: string
  copyKey: string
  copiedKey: string | null
  language: UiLanguage
  onCopy: (url: string, key: string) => void
}) {
  if (!url) return null

  const copied = copiedKey === copyKey

  return (
    <div className="team-settings-invite-success">
      <span className="team-settings-label">{translateSettingsWorkspaceUi(language, 'teamInviteLink')}</span>
      <code className="team-settings-invite-link">{url}</code>
      <button
        type="button"
        className="team-settings-btn"
        onClick={() => onCopy(url, copyKey)}
      >
        <Copy className="h-3.5 w-3.5" aria-hidden />
        {copied
          ? translateSettingsWorkspaceUi(language, 'teamCopied')
          : translateSettingsWorkspaceUi(language, 'teamCopyLink')}
      </button>
    </div>
  )
}

export function TeamSettingsPage({ onBack }: TeamSettingsPageProps) {
  const { user } = useAuth()
  const { t, language } = useTranslation()
  const roleLabel = (role: OrganisationRole): string => {
    const key = teamRoleLabelKey(role)
    return key ? t(key) : role
  }
  const { refresh: refreshPermissionContext } = usePermissionContext()
  const { hasPermission, canInviteUsers } = usePermissions()

  const [snapshot, setSnapshot] = useState<TeamSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const [orgName, setOrgName] = useState('')
  const [savingName, setSavingName] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<OrganisationRole>('clinician')
  const [inviteTherapyDiscipline, setInviteTherapyDiscipline] =
    useState<TherapyDiscipline>('ergotherapy')
  const [inviteTherapyDisciplineCustom, setInviteTherapyDisciplineCustom] = useState('')
  const [inviting, setInviting] = useState(false)
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)
  const [copiedLinkKey, setCopiedLinkKey] = useState<string | null>(null)

  const [upgrading, setUpgrading] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMemberProfile | null>(null)

  const isSmallPraxis = snapshot?.organisation.tier === 'small_praxis'
  const canManageOrg = hasPermission('org.manage')
  const canManageRoles = hasPermission('roles.manage')
  const canRemoveUsers = hasPermission('users.remove')
  const slotsFull = (snapshot?.occupiedSlots ?? 0) >= (snapshot?.maxMembers ?? 4)

  const inviteRoles = useMemo(
    () =>
      snapshot
        ? resolveInviteRolesForOrg(snapshot.organisation.tier, snapshot.members.length)
        : [],
    [snapshot],
  )

  const uiRoles = useMemo(
    () =>
      snapshot
        ? resolveUiRolesForOrg(snapshot.organisation.tier, snapshot.members.length)
        : [],
    [snapshot],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const team = await fetchTeamSnapshot()
      setSnapshot(team)
      setOrgName(team.organisation.name)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : translateSettingsWorkspaceUi(language, 'teamLoadError'),
      )
      setSnapshot(null)
    } finally {
      setLoading(false)
    }
  }, [language])

  useEffect(() => {
    void load()
  }, [load])

  const clearActionFeedback = () => {
    setActionError(null)
    setActionSuccess(null)
  }

  const handleSaveName = async () => {
    if (!canManageOrg) return
    clearActionFeedback()
    setSavingName(true)
    try {
      const organisation = await updateOrganisationName(orgName)
      setSnapshot((prev) => (prev ? { ...prev, organisation } : prev))
      setActionSuccess(translateSettingsWorkspaceUi(language, 'teamOrgNameSaved'))
      await refreshPermissionContext()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : translateSettingsWorkspaceUi(language, 'teamSaveFailed'),
      )
    } finally {
      setSavingName(false)
    }
  }

  const handleUpgrade = async () => {
    clearActionFeedback()
    setUpgrading(true)
    try {
      await upgradeToSmallPraxis(orgName.trim() || undefined)
      await refreshPermissionContext()
      await load()
      setActionSuccess(translateSettingsWorkspaceUi(language, 'teamPraxisActivated'))
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : translateSettingsWorkspaceUi(language, 'teamUpgradeFailed'),
      )
    } finally {
      setUpgrading(false)
    }
  }

  const handleInvite = async () => {
    if (!canInviteUsers() || slotsFull) return
    clearActionFeedback()
    setLastInviteUrl(null)
    setInviting(true)
    try {
      const result = await createOrgInvite(
        inviteEmail,
        inviteRole,
        {
          invitedName: inviteName.trim() || null,
          ...(inviteRole === 'therapist'
            ? {
                therapyDiscipline: inviteTherapyDiscipline,
                therapyDisciplineCustom:
                  inviteTherapyDiscipline === 'custom' ? inviteTherapyDisciplineCustom : null,
              }
            : {}),
        },
      )
      setLastInviteUrl(result.inviteUrl || null)
      setInviteEmail('')
      setInviteName('')
      setActionSuccess(
        formatSettingsWorkspaceUi(language, 'teamInviteCreated', { email: result.invitation.email }),
      )
      await load()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : translateSettingsWorkspaceUi(language, 'teamInviteFailed'),
      )
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvite = async (invitationId: string) => {
    clearActionFeedback()
    try {
      await revokeOrgInvite(invitationId)
      setActionSuccess(translateSettingsWorkspaceUi(language, 'teamInviteRevoked'))
      await load()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : translateSettingsWorkspaceUi(language, 'teamRevokeFailed'),
      )
    }
  }

  const handleMemberSave = async (
    memberId: string,
    payload: Parameters<typeof updateOrgMember>[1],
  ) => {
    clearActionFeedback()
    try {
      await updateOrgMember(memberId, payload)
      setActionSuccess(translateSettingsWorkspaceUi(language, 'teamPermissionsSaved'))
      setEditingMember(null)
      await load()
      await refreshPermissionContext()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : translateSettingsWorkspaceUi(language, 'teamSaveFailed'),
      )
      throw err
    }
  }

  const handleDeactivate = async (memberId: string) => {
    if (!canRemoveUsers) return
    clearActionFeedback()
    try {
      await deactivateOrgMember(memberId)
      setActionSuccess(translateSettingsWorkspaceUi(language, 'teamMemberDeactivated'))
      await load()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : translateSettingsWorkspaceUi(language, 'teamDeactivateFailed'),
      )
    }
  }

  const copyInviteUrl = async (url: string, key: string) => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopiedLinkKey(key)
      window.setTimeout(() => {
        setCopiedLinkKey((current) => (current === key ? null : current))
      }, 2000)
    } catch {
      setActionError(translateSettingsWorkspaceUi(language, 'teamCopyFailed'))
    }
  }

  if (loading) {
    return (
      <div className="team-settings-page">
        <div className="team-settings-page__inner">
          <ClinicalLoading label={translateSettingsWorkspaceUi(language, 'teamLoading')} />
        </div>
      </div>
    )
  }

  if (error || !snapshot) {
    return (
      <div className="team-settings-page">
        <div className="team-settings-page__inner">
          <button type="button" className="clinical-back-link" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {translateSettingsWorkspaceUi(language, 'teamBack')}
          </button>
          <p className="team-settings-error">
            {error ?? translateSettingsWorkspaceUi(language, 'teamNoOrg')}
          </p>
        </div>
      </div>
    )
  }

  const showTeamFeatures =
    isSmallPraxis || snapshot.members.length > 1 || canInviteUsers()

  return (
    <div className="team-settings-page text-ink">
      <div className="team-settings-page__inner">
        <header className="team-settings-page__header">
          <button type="button" className="clinical-back-link" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {translateSettingsWorkspaceUi(language, 'teamBack')}
          </button>
          <h1 className="team-settings-page__title">
            {translateSettingsWorkspaceUi(language, 'teamTitle')}
          </h1>
        </header>

        {actionError ? <p className="team-settings-error">{actionError}</p> : null}
        {actionSuccess ? <p className="team-settings-success">{actionSuccess}</p> : null}

        {!isSmallPraxis ? (
          <section className="team-settings-section" aria-labelledby="team-upgrade">
            <div className="team-settings-upgrade">
              <h2 id="team-upgrade" className="team-settings-upgrade__title">
                {translateSettingsWorkspaceUi(language, 'teamActivatePraxis')}
              </h2>
              <p className="team-settings-upgrade__text">
                {translateSettingsWorkspaceUi(language, 'teamUpgradeText')}
              </p>
              <div className="team-settings-inline-form">
                <div className="team-settings-field team-settings-field--grow">
                  <label className="team-settings-label" htmlFor="upgrade-org-name">
                    {translateSettingsWorkspaceUi(language, 'teamPraxisNameOptional')}
                  </label>
                  <input
                    id="upgrade-org-name"
                    className="team-settings-input"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={translateSettingsWorkspaceUi(language, 'teamPraxisNamePlaceholder')}
                  />
                </div>
                <button
                  type="button"
                  className="team-settings-btn team-settings-btn--primary"
                  onClick={() => void handleUpgrade()}
                  disabled={upgrading}
                >
                  {upgrading
                    ? translateSettingsWorkspaceUi(language, 'teamActivating')
                    : translateSettingsWorkspaceUi(language, 'teamActivatePraxis')}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {showTeamFeatures ? (
          <>
            <section className="team-settings-section" aria-labelledby="team-org">
              <h2 id="team-org" className="team-settings-section__heading">
                {translateSettingsWorkspaceUi(language, 'teamOrganisation')}
              </h2>
              <div className="team-settings-inline-form">
                <div className="team-settings-field team-settings-field--grow">
                  <label className="team-settings-label" htmlFor="org-name">
                    {translateSettingsWorkspaceUi(language, 'teamName')}
                  </label>
                  <input
                    id="org-name"
                    className="team-settings-input"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    disabled={!canManageOrg}
                  />
                </div>
                {canManageOrg ? (
                  <button
                    type="button"
                    className="team-settings-btn team-settings-btn--primary"
                    onClick={() => void handleSaveName()}
                    disabled={savingName || !orgName.trim()}
                  >
                    {savingName
                      ? translateSettingsWorkspaceUi(language, 'teamSaving')
                      : translateSettingsWorkspaceUi(language, 'teamSave')}
                  </button>
                ) : null}
              </div>
            </section>

            <section className="team-settings-section" aria-labelledby="team-members">
              <div className="team-settings-section__heading-row">
                <h2 id="team-members" className="team-settings-section__heading">
                  {translateSettingsWorkspaceUi(language, 'teamMembers')}
                </h2>
                <span
                  className={`team-settings-cap${slotsFull ? ' team-settings-cap--full' : ''}`}
                >
                  {formatSettingsWorkspaceUi(language, 'teamMembersCount', {
                    occupied: snapshot.occupiedSlots,
                    max: snapshot.maxMembers,
                  })}
                </span>
              </div>

              <div className="team-settings-table-wrap">
                <table className="team-settings-table">
                  <thead>
                    <tr>
                      <th>{translateSettingsWorkspaceUi(language, 'teamColUser')}</th>
                      <th>{translateSettingsWorkspaceUi(language, 'teamColRole')}</th>
                      <th>{translateSettingsWorkspaceUi(language, 'teamColStatus')}</th>
                      {(canManageRoles || canRemoveUsers) && isSmallPraxis ? <th /> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.members.map((member) => {
                      const isSelf = member.userId === user?.id
                      const canEditMember =
                        isSmallPraxis &&
                        canManageRoles &&
                        member.status === 'active' &&
                        !isSelf
                      const canDeactivateRow =
                        isSmallPraxis &&
                        member.status === 'active' &&
                        !isSelf &&
                        canRemoveUsers
                      return (
                        <tr key={member.id}>
                          <td>
                            <span className="team-settings-member-name">
                              {memberDisplayName(member.displayName, member.email, member.userId)}
                            </span>
                            {member.email ? (
                              <span className="team-settings-member-email">{member.email}</span>
                            ) : null}
                          </td>
                          <td>
                            <span className="team-settings-badge">
                              {roleLabel(member.role)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`team-settings-badge${
                                member.status !== 'active' ? ' team-settings-badge--warn' : ''
                              }`}
                            >
                              {statusLabel(member.status, language)}
                            </span>
                          </td>
                          {(canEditMember || canDeactivateRow) && isSmallPraxis ? (
                            <td>
                              <div className="team-settings-actions">
                                {canEditMember ? (
                                  <button
                                    type="button"
                                    className="team-settings-btn"
                                    onClick={() => setEditingMember(member)}
                                    title={translateSettingsWorkspaceUi(language, 'teamEditPermissions')}
                                  >
                                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                                  </button>
                                ) : null}
                                {canDeactivateRow ? (
                                  <button
                                    type="button"
                                    className="team-settings-btn team-settings-btn--danger"
                                    onClick={() => void handleDeactivate(member.id)}
                                    title={translateSettingsWorkspaceUi(language, 'teamDeactivate')}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          ) : (canManageRoles || canRemoveUsers) && isSmallPraxis ? (
                            <td />
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {snapshot.invitations.length > 0 ? (
                <div className="team-settings-table-wrap">
                  <table
                    className="team-settings-table"
                    aria-label={translateSettingsWorkspaceUi(language, 'teamPendingInvites')}
                  >
                    <thead>
                      <tr>
                        <th>{translateSettingsWorkspaceUi(language, 'teamColEmail')}</th>
                        <th>{translateSettingsWorkspaceUi(language, 'teamColRole')}</th>
                        <th>{translateSettingsWorkspaceUi(language, 'teamColValidUntil')}</th>
                        <th>{translateSettingsWorkspaceUi(language, 'teamColStatus')}</th>
                        {canInviteUsers() ? <th /> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.invitations.map((invite) => (
                        <tr key={invite.id}>
                          <td>
                            <span className="team-settings-member-name">{invite.email}</span>
                            {invite.invitedName ? (
                              <span className="team-settings-member-email">{invite.invitedName}</span>
                            ) : null}
                          </td>
                          <td>
                            <span className="team-settings-badge">
                              {roleLabel(invite.role)}
                            </span>
                          </td>
                          <td>{formatExpiryDe(invite.expiresAt)}</td>
                          <td>
                            <span className="team-settings-badge team-settings-badge--muted">
                              {statusLabel(invite.status, language)}
                            </span>
                          </td>
                          {canInviteUsers() ? (
                            <td>
                              <div className="team-settings-actions">
                                <button
                                  type="button"
                                  className="team-settings-btn"
                                  disabled
                                  title={translateSettingsWorkspaceUi(language, 'teamEmailSoonTitle')}
                                >
                                  {translateSettingsWorkspaceUi(language, 'teamSoon')}
                                </button>
                                <button
                                  type="button"
                                  className="team-settings-btn team-settings-btn--danger"
                                  onClick={() => void handleRevokeInvite(invite.id)}
                                >
                                  {translateSettingsWorkspaceUi(language, 'teamRevoke')}
                                </button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="team-settings-section__sub">
                    {translateSettingsWorkspaceUi(language, 'teamInviteLinkHint')}
                  </p>
                </div>
              ) : null}
            </section>

            {isSmallPraxis && canInviteUsers() ? (
              <section className="team-settings-section" aria-labelledby="team-invite">
                <h2 id="team-invite" className="team-settings-section__heading">
                  {translateSettingsWorkspaceUi(language, 'teamInvite')}
                </h2>
                <p className="team-settings-section__sub">
                  {translateSettingsWorkspaceUi(language, 'teamInviteSub')}
                </p>
                <div className="team-settings-inline-form">
                  <div className="team-settings-field team-settings-field--grow">
                    <label className="team-settings-label" htmlFor="invite-name">
                      {translateSettingsWorkspaceUi(language, 'teamNameOptional')}
                    </label>
                    <input
                      id="invite-name"
                      type="text"
                      className="team-settings-input"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      disabled={slotsFull}
                      placeholder={translateSettingsWorkspaceUi(language, 'teamFullNamePlaceholder')}
                    />
                  </div>
                  <div className="team-settings-field team-settings-field--grow">
                    <label className="team-settings-label" htmlFor="invite-email">
                      {translateSettingsWorkspaceUi(language, 'teamColEmail')}
                    </label>
                    <input
                      id="invite-email"
                      type="email"
                      className="team-settings-input"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={slotsFull}
                      placeholder={translateSettingsWorkspaceUi(language, 'teamEmailPlaceholder')}
                    />
                  </div>
                  <div className="team-settings-field">
                    <label className="team-settings-label" htmlFor="invite-role">
                      {translateSettingsWorkspaceUi(language, 'teamColRole')}
                    </label>
                    <select
                      id="invite-role"
                      className="team-settings-select"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as OrganisationRole)}
                      disabled={slotsFull}
                    >
                      {inviteRoles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {inviteRole === 'therapist' ? (
                    <>
                      <div className="team-settings-field">
                        <label className="team-settings-label" htmlFor="invite-discipline">
                          {t('teamInviteTherapyDiscipline')}
                        </label>
                        <select
                          id="invite-discipline"
                          className="team-settings-select"
                          value={inviteTherapyDiscipline}
                          onChange={(e) =>
                            setInviteTherapyDiscipline(e.target.value as TherapyDiscipline)
                          }
                          disabled={slotsFull}
                        >
                          {THERAPY_DISCIPLINES.map((discipline) => (
                            <option key={discipline} value={discipline}>
                              {t(THERAPY_DISCIPLINE_LABEL_KEYS[discipline])}
                            </option>
                          ))}
                        </select>
                      </div>
                      {inviteTherapyDiscipline === 'custom' ? (
                        <div className="team-settings-field team-settings-field--grow">
                          <label className="team-settings-label" htmlFor="invite-discipline-custom">
                            {t('teamInviteTherapyDisciplineCustom')}
                          </label>
                          <input
                            id="invite-discipline-custom"
                            type="text"
                            className="team-settings-input"
                            value={inviteTherapyDisciplineCustom}
                            onChange={(e) => setInviteTherapyDisciplineCustom(e.target.value)}
                            disabled={slotsFull}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="team-settings-btn team-settings-btn--primary"
                    onClick={() => void handleInvite()}
                    disabled={inviting || slotsFull || !inviteEmail.trim()}
                  >
                    <UserPlus className="h-3.5 w-3.5" aria-hidden />
                    {inviting
                      ? translateSettingsWorkspaceUi(language, 'teamSending')
                      : translateSettingsWorkspaceUi(language, 'teamInvite')}
                  </button>
                </div>
                {slotsFull ? (
                  <p className="team-settings-error">
                    {formatSettingsWorkspaceUi(language, 'teamMaxReached', {
                      max: snapshot.maxMembers,
                    })}
                  </p>
                ) : null}
                {lastInviteUrl ? (
                  <InviteLinkPanel
                    url={lastInviteUrl}
                    copyKey="last-invite"
                    copiedKey={copiedLinkKey}
                    language={language}
                    onCopy={(url, key) => void copyInviteUrl(url, key)}
                  />
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}

        {editingMember && snapshot ? (
          <MemberEditPanel
            member={editingMember}
            organisation={snapshot.organisation}
            uiRoles={uiRoles}
            onClose={() => setEditingMember(null)}
            onSave={async (payload) => {
              try {
                await handleMemberSave(editingMember.id, payload)
              } catch (err) {
                throw err instanceof Error
                  ? err
                  : new Error(translateSettingsWorkspaceUi(language, 'teamSaveFailed'))
              }
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
