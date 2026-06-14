import { ArrowLeft, Copy, Pencil, Trash2, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePermissionContext } from '../../contexts/PermissionContext'
import {
  CASE_ACCESS_LABELS_DE,
  CASE_ACCESS_LEVELS,
  parseCaseAccessLevel,
  type CaseAccessLevel,
} from '../../data/org/caseAccessLevels'
import {
  resolveInviteRolesForOrg,
  resolveUiRolesForOrg,
  teamRoleLabelDe,
} from '../../data/org/teamRoles'
import { THERAPY_DISCIPLINES, THERAPY_DISCIPLINE_LABEL_KEYS } from '../../data/org/therapyDiscipline'
import type { TherapyDiscipline } from '../../types/organisation'
import { useTranslation } from '../../context/TranslationContext'
import { isListedPatientCase, useCaseRegistry } from '../../hooks/useCaseRegistry'
import { usePermissions } from '../../hooks/permissions'
import {
  createOrgInvite,
  deactivateOrgMember,
  fetchCaseAccessGrants,
  fetchTeamSnapshot,
  revokeOrgInvite,
  setCaseAccessGrant,
  updateOrgMember,
  updateOrganisationName,
  upgradeToSmallPraxis,
  type TeamMemberProfile,
  type TeamSnapshot,
} from '../../services/orgApi'
import { MemberEditPanel } from './MemberEditPanel'
import type { CaseAccess, OrganisationRole } from '../../types/organisation'
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

function statusLabelDe(status: string): string {
  if (status === 'active') return 'Aktiv'
  if (status === 'invited') return 'Eingeladen'
  if (status === 'suspended') return 'Deaktiviert'
  if (status === 'pending') return 'Ausstehend'
  if (status === 'revoked') return 'Widerrufen'
  if (status === 'expired') return 'Abgelaufen'
  if (status === 'accepted') return 'Angenommen'
  return status
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
  onCopy,
}: {
  url: string
  copyKey: string
  copiedKey: string | null
  onCopy: (url: string, key: string) => void
}) {
  if (!url) return null

  const copied = copiedKey === copyKey

  return (
    <div className="team-settings-invite-success">
      <span className="team-settings-label">Einladungslink</span>
      <code className="team-settings-invite-link">{url}</code>
      <button
        type="button"
        className="team-settings-btn"
        onClick={() => onCopy(url, copyKey)}
      >
        <Copy className="h-3.5 w-3.5" aria-hidden />
        {copied ? 'Kopiert' : 'Link kopieren'}
      </button>
    </div>
  )
}

export function TeamSettingsPage({ onBack }: TeamSettingsPageProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { refresh: refreshPermissionContext } = usePermissionContext()
  const { hasPermission, canInviteUsers } = usePermissions()

  const [snapshot, setSnapshot] = useState<TeamSnapshot | null>(null)
  const [caseGrants, setCaseGrants] = useState<CaseAccess[]>([])
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

  const registry = useCaseRegistry({
    tier: 'local_only',
    countryCode: 'DE',
    documentTypeLabel: () => '',
    fallbackTitle: (id) => id,
  })

  const recentCases = useMemo(
    () =>
      registry.cases
        .filter(isListedPatientCase)
        .sort((a, b) => new Date(b.lastEditedAt).getTime() - new Date(a.lastEditedAt).getTime())
        .slice(0, 8),
    [registry.cases],
  )

  const isSmallPraxis = snapshot?.organisation.tier === 'small_praxis'
  const canManageOrg = hasPermission('org.manage')
  const canManageRoles = hasPermission('roles.manage')
  const canRemoveUsers = hasPermission('users.remove')
  const canManageCaseAccess = canManageOrg || canManageRoles
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

  const grantLevelByKey = useMemo(() => {
    const map = new Map<string, CaseAccessLevel>()
    for (const grant of caseGrants) {
      if (!grant.userId) continue
      map.set(`${grant.caseId}:${grant.userId}`, parseCaseAccessLevel(grant.grantedPermissions))
    }
    return map
  }, [caseGrants])

  const activeMembers = useMemo(
    () => snapshot?.members.filter((m) => m.status === 'active') ?? [],
    [snapshot?.members],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const team = await fetchTeamSnapshot()
      setSnapshot(team)
      setOrgName(team.organisation.name)
      if (team.organisation.tier === 'small_praxis') {
        const grants = await fetchCaseAccessGrants()
        setCaseGrants(grants)
      } else {
        setCaseGrants([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Team-Einstellungen konnten nicht geladen werden')
      setSnapshot(null)
    } finally {
      setLoading(false)
    }
  }, [])

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
      setActionSuccess('Organisationsname gespeichert.')
      await refreshPermissionContext()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
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
      setActionSuccess('Praxis-Modus aktiviert.')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Upgrade fehlgeschlagen')
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
      setActionSuccess(`Einladung an ${result.invitation.email} erstellt.`)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Einladung fehlgeschlagen')
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvite = async (invitationId: string) => {
    clearActionFeedback()
    try {
      await revokeOrgInvite(invitationId)
      setActionSuccess('Einladung widerrufen.')
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Widerruf fehlgeschlagen')
    }
  }

  const handleMemberSave = async (
    memberId: string,
    payload: Parameters<typeof updateOrgMember>[1],
  ) => {
    clearActionFeedback()
    try {
      await updateOrgMember(memberId, payload)
      setActionSuccess('Berechtigungen gespeichert.')
      setEditingMember(null)
      await load()
      await refreshPermissionContext()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
      throw err
    }
  }

  const handleDeactivate = async (memberId: string) => {
    if (!canRemoveUsers) return
    clearActionFeedback()
    try {
      await deactivateOrgMember(memberId)
      setActionSuccess('Mitglied deaktiviert.')
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Deaktivierung fehlgeschlagen')
    }
  }

  const handleCaseAccessChange = async (
    caseId: string,
    memberUserId: string,
    level: CaseAccessLevel,
  ) => {
    clearActionFeedback()
    try {
      const grant = await setCaseAccessGrant(caseId, memberUserId, level)
      setCaseGrants((prev) => {
        const key = `${caseId}:${memberUserId}`
        const filtered = prev.filter((g) => `${g.caseId}:${g.userId}` !== key)
        if (grant) return [grant, ...filtered]
        return filtered
      })
      setActionSuccess('Fallfreigabe gespeichert.')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Fallfreigabe fehlgeschlagen')
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
      setActionError('Kopieren fehlgeschlagen')
    }
  }

  if (loading) {
    return (
      <div className="team-settings-page">
        <div className="team-settings-page__inner">
          <ClinicalLoading label="Team-Einstellungen werden geladen…" />
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
            Zurück
          </button>
          <p className="team-settings-error">{error ?? 'Keine Organisation gefunden'}</p>
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
            Zurück
          </button>
          <h1 className="team-settings-page__title">Team-Einstellungen</h1>
        </header>

        {actionError ? <p className="team-settings-error">{actionError}</p> : null}
        {actionSuccess ? <p className="team-settings-success">{actionSuccess}</p> : null}

        {!isSmallPraxis ? (
          <section className="team-settings-section" aria-labelledby="team-upgrade">
            <div className="team-settings-upgrade">
              <h2 id="team-upgrade" className="team-settings-upgrade__title">
                Praxis-Modus aktivieren
              </h2>
              <p className="team-settings-upgrade__text">
                Aktivieren Sie den Praxis-Modus, um bis zu vier Teammitglieder einzuladen und
                Fallfreigaben zu verwalten. Ihr persönlicher Arbeitsbereich bleibt erhalten.
              </p>
              <div className="team-settings-inline-form">
                <div className="team-settings-field team-settings-field--grow">
                  <label className="team-settings-label" htmlFor="upgrade-org-name">
                    Praxisname (optional)
                  </label>
                  <input
                    id="upgrade-org-name"
                    className="team-settings-input"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Name der Praxis"
                  />
                </div>
                <button
                  type="button"
                  className="team-settings-btn team-settings-btn--primary"
                  onClick={() => void handleUpgrade()}
                  disabled={upgrading}
                >
                  {upgrading ? 'Aktiviere…' : 'Praxis-Modus aktivieren'}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {showTeamFeatures ? (
          <>
            <section className="team-settings-section" aria-labelledby="team-org">
              <h2 id="team-org" className="team-settings-section__heading">
                Organisation
              </h2>
              <div className="team-settings-inline-form">
                <div className="team-settings-field team-settings-field--grow">
                  <label className="team-settings-label" htmlFor="org-name">
                    Name
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
                    {savingName ? 'Speichern…' : 'Speichern'}
                  </button>
                ) : null}
              </div>
            </section>

            <section className="team-settings-section" aria-labelledby="team-members">
              <div className="team-settings-section__heading-row">
                <h2 id="team-members" className="team-settings-section__heading">
                  Mitglieder
                </h2>
                <span
                  className={`team-settings-cap${slotsFull ? ' team-settings-cap--full' : ''}`}
                >
                  {snapshot.occupiedSlots} von {snapshot.maxMembers} Benutzern
                </span>
              </div>

              <div className="team-settings-table-wrap">
                <table className="team-settings-table">
                  <thead>
                    <tr>
                      <th>Benutzer</th>
                      <th>Rolle</th>
                      <th>Status</th>
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
                              {teamRoleLabelDe(member.role)}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`team-settings-badge${
                                member.status !== 'active' ? ' team-settings-badge--warn' : ''
                              }`}
                            >
                              {statusLabelDe(member.status)}
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
                                    title="Berechtigungen bearbeiten"
                                  >
                                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                                  </button>
                                ) : null}
                                {canDeactivateRow ? (
                                  <button
                                    type="button"
                                    className="team-settings-btn team-settings-btn--danger"
                                    onClick={() => void handleDeactivate(member.id)}
                                    title="Deaktivieren"
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
                  <table className="team-settings-table" aria-label="Ausstehende Einladungen">
                    <thead>
                      <tr>
                        <th>E-Mail</th>
                        <th>Rolle</th>
                        <th>Gültig bis</th>
                        <th>Status</th>
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
                              {teamRoleLabelDe(invite.role)}
                            </span>
                          </td>
                          <td>{formatExpiryDe(invite.expiresAt)}</td>
                          <td>
                            <span className="team-settings-badge team-settings-badge--muted">
                              {statusLabelDe(invite.status)}
                            </span>
                          </td>
                          {canInviteUsers() ? (
                            <td>
                              <div className="team-settings-actions">
                                <button
                                  type="button"
                                  className="team-settings-btn"
                                  disabled
                                  title="E-Mail-Versand demnächst verfügbar"
                                >
                                  Demnächst
                                </button>
                                <button
                                  type="button"
                                  className="team-settings-btn team-settings-btn--danger"
                                  onClick={() => void handleRevokeInvite(invite.id)}
                                >
                                  Widerrufen
                                </button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="team-settings-section__sub">
                    Der Einladungslink kann nur direkt nach dem Erstellen kopiert werden.
                  </p>
                </div>
              ) : null}
            </section>

            {isSmallPraxis && canInviteUsers() ? (
              <section className="team-settings-section" aria-labelledby="team-invite">
                <h2 id="team-invite" className="team-settings-section__heading">
                  Einladen
                </h2>
                <p className="team-settings-section__sub">
                  Laden Sie Kolleginnen und Kollegen per E-Mail ein. Der Einladungslink kann kopiert
                  werden, falls kein E-Mail-Versand konfiguriert ist.
                </p>
                <div className="team-settings-inline-form">
                  <div className="team-settings-field team-settings-field--grow">
                    <label className="team-settings-label" htmlFor="invite-name">
                      Name (optional)
                    </label>
                    <input
                      id="invite-name"
                      type="text"
                      className="team-settings-input"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      disabled={slotsFull}
                      placeholder="Vor- und Nachname"
                    />
                  </div>
                  <div className="team-settings-field team-settings-field--grow">
                    <label className="team-settings-label" htmlFor="invite-email">
                      E-Mail
                    </label>
                    <input
                      id="invite-email"
                      type="email"
                      className="team-settings-input"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={slotsFull}
                      placeholder="name@praxis.de"
                    />
                  </div>
                  <div className="team-settings-field">
                    <label className="team-settings-label" htmlFor="invite-role">
                      Rolle
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
                          {teamRoleLabelDe(role)}
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
                    {inviting ? 'Sende…' : 'Einladen'}
                  </button>
                </div>
                {slotsFull ? (
                  <p className="team-settings-error">
                    Maximum von {snapshot.maxMembers} Benutzern erreicht.
                  </p>
                ) : null}
                {lastInviteUrl ? (
                  <InviteLinkPanel
                    url={lastInviteUrl}
                    copyKey="last-invite"
                    copiedKey={copiedLinkKey}
                    onCopy={(url, key) => void copyInviteUrl(url, key)}
                  />
                ) : null}
              </section>
            ) : null}

            {isSmallPraxis && canManageCaseAccess && activeMembers.length > 1 ? (
              <section className="team-settings-section" aria-labelledby="team-case-access">
                <h2 id="team-case-access" className="team-settings-section__heading">
                  Fallfreigabe
                </h2>
                <p className="team-settings-section__sub">
                  Legen Sie pro Fall fest, welches Teammitglied welchen Zugriff erhält.
                </p>
                {recentCases.length === 0 ? (
                  <p className="clinical-empty-state clinical-empty-state--compact">
                    Noch keine Fälle im lokalen Register.
                  </p>
                ) : (
                  <div className="team-settings-table-wrap team-settings-case-grid">
                    <table className="team-settings-table">
                      <thead>
                        <tr>
                          <th>Fall</th>
                          {activeMembers
                            .filter((m) => m.userId !== user?.id)
                            .map((member) => (
                              <th key={member.userId}>
                                {memberDisplayName(
                                  member.displayName,
                                  member.email,
                                  member.userId,
                                )}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {recentCases.map((caseItem) => (
                          <tr key={caseItem.caseId}>
                            <td>{caseItem.displayTitle}</td>
                            {activeMembers
                              .filter((m) => m.userId !== user?.id)
                              .map((member) => {
                                const level =
                                  grantLevelByKey.get(`${caseItem.caseId}:${member.userId}`) ??
                                  'no_access'
                                return (
                                  <td key={member.userId}>
                                    <select
                                      className="team-settings-select"
                                      value={level}
                                      onChange={(e) =>
                                        void handleCaseAccessChange(
                                          caseItem.caseId,
                                          member.userId,
                                          e.target.value as CaseAccessLevel,
                                        )
                                      }
                                      aria-label={`Zugriff ${caseItem.displayTitle}`}
                                    >
                                      {CASE_ACCESS_LEVELS.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {CASE_ACCESS_LABELS_DE[opt]}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                )
                              })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                throw err instanceof Error ? err : new Error('Speichern fehlgeschlagen')
              }
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
