import { useCallback, useEffect, useState } from 'react'
import { NOTION_PAGES, type NotionPageId } from '../components/notion/notionPages'
import { DEFAULT_CASE_ID } from '../utils/caseContext'
import { isEnterpriseOrgHierarchyEnabled } from '../utils/featureFlags'

const ENTERPRISE_ROUTES_ENABLED = isEnterpriseOrgHierarchyEnabled()

const VALID_PAGE_IDS = new Set<NotionPageId>(NOTION_PAGES.map((page) => page.id))

function parsePageParam(search: string): NotionPageId | undefined {
  const raw = new URLSearchParams(search).get('page')
  if (!raw) return undefined
  return VALID_PAGE_IDS.has(raw as NotionPageId) ? (raw as NotionPageId) : undefined
}

function parseViewParam(search: string): 'overview' | undefined {
  const raw = new URLSearchParams(search).get('view')
  if (raw === 'overview' || raw === 'patient-dashboard') return 'overview'
  return undefined
}

export type AppRoute =
  | { view: 'landing' }
  | { view: 'login' }
  | { view: 'signup' }
  | { view: 'dashboard' }
  | { view: 'kb-admin' }
  | { view: 'audit-debug' }
  | { view: 'demo-patient' }
  | { view: 'templates' }
  | { view: 'team-settings' }
  | { view: 'integrations' }
  | { view: 'budget' }
  | { view: 'calendar' }
  | { view: 'todos' }
  | { view: 'team-invite'; token: string }
  | { view: 'case'; caseId: string; page?: NotionPageId; initialView?: 'overview'; appointmentId?: string; discussMode?: boolean; discussId?: string; konsilMode?: boolean; konsilId?: string }
  | { view: 'discuss-invite'; token: string }
  | { view: 'consultant'; requestId?: string }
  | { view: 'consultant-invite'; token: string }
  | { view: 'enterprise' }
  | { view: 'enterprise-sites'; tab?: 'sites' | 'departments' }
  | { view: 'enterprise-compliance' }
  | { view: 'enterprise-integrations' }
  | { view: 'enterprise-sso' }

export function isPublicRoute(route: AppRoute): boolean {
  return route.view === 'landing' || route.view === 'login' || route.view === 'signup'
}

export function isAppRoute(route: AppRoute): boolean {
  return (
    route.view === 'dashboard' ||
    route.view === 'case' ||
    route.view === 'kb-admin' ||
    route.view === 'audit-debug' ||
    route.view === 'demo-patient' ||
    route.view === 'templates' ||
    route.view === 'team-settings' ||
    route.view === 'integrations' ||
    route.view === 'budget' ||
    route.view === 'calendar' ||
    route.view === 'todos' ||
    route.view === 'team-invite' ||
    route.view === 'discuss-invite' ||
    route.view === 'consultant' ||
    route.view === 'consultant-invite' ||
    (ENTERPRISE_ROUTES_ENABLED &&
      (route.view === 'enterprise' ||
        route.view === 'enterprise-sites' ||
        route.view === 'enterprise-compliance' ||
        route.view === 'enterprise-integrations' ||
        route.view === 'enterprise-sso'))
  )
}

function parsePathname(pathname: string, search = ''): AppRoute {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { view: 'landing' }
  if (path === '/login') return { view: 'login' }
  if (path === '/signup') return { view: 'signup' }
  if (path === '/dashboard' || path === '/app') return { view: 'dashboard' }
  if (path === '/dashboard/kb-admin') return { view: 'kb-admin' }
  if (path === '/dev/audit-logs' || path === '/dashboard/audit-debug') return { view: 'audit-debug' }
  if (path === '/dev/demo-patient') return { view: 'demo-patient' }
  if (path === '/dashboard/templates') return { view: 'templates' }
  if (path === '/dashboard/team' || path === '/settings/team') return { view: 'team-settings' }
  if (path === '/dashboard/integrations') return { view: 'integrations' }
  if (path === '/dashboard/budget' || path === '/settings/budget') return { view: 'budget' }
  if (path === '/dashboard/calendar') return { view: 'calendar' }
  if (path === '/dashboard/todos') return { view: 'todos' }
  if (ENTERPRISE_ROUTES_ENABLED) {
    if (path === '/dashboard/enterprise') return { view: 'enterprise' }
    if (path === '/dashboard/enterprise/sites') {
      const tab = new URLSearchParams(search).get('type') === 'department' ? 'departments' : 'sites'
      return { view: 'enterprise-sites', tab }
    }
    if (path === '/dashboard/enterprise/integrations') return { view: 'enterprise-integrations' }
    if (path === '/dashboard/compliance') return { view: 'enterprise-compliance' }
    if (path === '/dashboard/enterprise/sso') return { view: 'enterprise-sso' }
  }
  const teamInviteMatch = path.match(/^\/team\/invite\/([^/]+)$/)
  if (teamInviteMatch) {
    return { view: 'team-invite', token: decodeURIComponent(teamInviteMatch[1]) }
  }
  const discussInviteMatch = path.match(/^\/discuss\/invite\/([^/]+)$/)
  if (discussInviteMatch) {
    return { view: 'discuss-invite', token: decodeURIComponent(discussInviteMatch[1]) }
  }
  const consultantInviteMatch = path.match(/^\/consultant\/invite\/([^/]+)$/)
  if (consultantInviteMatch) {
    return { view: 'consultant-invite', token: decodeURIComponent(consultantInviteMatch[1]) }
  }
  if (path === '/consultant' || path === '/consultant/requests') {
    return { view: 'consultant' }
  }
  const consultantRequestMatch = path.match(/^\/consultant\/requests\/([^/]+)$/)
  if (consultantRequestMatch) {
    return { view: 'consultant', requestId: decodeURIComponent(consultantRequestMatch[1]) }
  }
  if (path === '/workspace') {
    return { view: 'case', caseId: DEFAULT_CASE_ID }
  }
  const caseMatch = path.match(/^\/case\/([^/]+)(?:\/(discuss|konsil)(?:\/([^/]+))?)?$/)
  if (caseMatch) {
    const segment = caseMatch[2]
    return {
      view: 'case',
      caseId: decodeURIComponent(caseMatch[1]),
      discussMode: segment === 'discuss',
      discussId: segment === 'discuss' && caseMatch[3] ? decodeURIComponent(caseMatch[3]) : undefined,
      konsilMode: segment === 'konsil',
      konsilId: segment === 'konsil' && caseMatch[3] ? decodeURIComponent(caseMatch[3]) : undefined,
      page: parsePageParam(search),
      initialView: parseViewParam(search),
      appointmentId: new URLSearchParams(search).get('appointment')?.trim() || undefined,
    }
  }
  return { view: 'landing' }
}

export function routeToPath(route: AppRoute): string {
  if (route.view === 'landing') return '/'
  if (route.view === 'login') return '/login'
  if (route.view === 'signup') return '/signup'
  if (route.view === 'dashboard') return '/dashboard'
  if (route.view === 'kb-admin') return '/dashboard/kb-admin'
  if (route.view === 'audit-debug') return '/dev/audit-logs'
  if (route.view === 'demo-patient') return '/dev/demo-patient'
  if (route.view === 'templates') return '/dashboard/templates'
  if (route.view === 'team-settings') return '/dashboard/team'
  if (route.view === 'integrations') return '/dashboard/integrations'
  if (route.view === 'budget') return '/dashboard/budget'
  if (route.view === 'calendar') return '/dashboard/calendar'
  if (route.view === 'todos') return '/dashboard/todos'
  if (ENTERPRISE_ROUTES_ENABLED) {
    if (route.view === 'enterprise') return '/dashboard/enterprise'
    if (route.view === 'enterprise-sites') {
      const base = '/dashboard/enterprise/sites'
      return route.tab === 'departments' ? `${base}?type=department` : base
    }
    if (route.view === 'enterprise-compliance') return '/dashboard/compliance'
    if (route.view === 'enterprise-integrations') return '/dashboard/enterprise/integrations'
    if (route.view === 'enterprise-sso') return '/dashboard/enterprise/sso'
  }
  if (route.view === 'team-invite') {
    return `/team/invite/${encodeURIComponent(route.token)}`
  }
  if (route.view === 'discuss-invite') {
    return `/discuss/invite/${encodeURIComponent(route.token)}`
  }
  if (route.view === 'consultant') {
    if (route.requestId) {
      return `/consultant/requests/${encodeURIComponent(route.requestId)}`
    }
    return '/consultant/requests'
  }
  if (route.view === 'consultant-invite') {
    return `/consultant/invite/${encodeURIComponent(route.token)}`
  }
  if (route.view === 'case') {
    if (route.discussMode) {
      const discussBase = `/case/${encodeURIComponent(route.caseId)}/discuss`
      if (route.discussId) return `${discussBase}/${encodeURIComponent(route.discussId)}`
      return discussBase
    }
    if (route.konsilMode) {
      const konsilBase = `/case/${encodeURIComponent(route.caseId)}/konsil`
      if (route.konsilId) return `${konsilBase}/${encodeURIComponent(route.konsilId)}`
      return konsilBase
    }
    const base = `/case/${encodeURIComponent(route.caseId)}`
    const params = new URLSearchParams()
    if (route.page) params.set('page', route.page)
    if (route.initialView === 'overview') params.set('view', 'overview')
    if (route.appointmentId) params.set('appointment', route.appointmentId)
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
  }
  return '/'
}

export function useAppRouter() {
  const [route, setRoute] = useState<AppRoute>(() =>
    parsePathname(window.location.pathname, window.location.search),
  )

  useEffect(() => {
    const onPopState = () =>
      setRoute(parsePathname(window.location.pathname, window.location.search))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((path: string, replace = false) => {
    const url = new URL(path, window.location.origin)
    const next = parsePathname(url.pathname, url.search)
    if (replace) {
      window.history.replaceState({}, '', `${url.pathname}${url.search}`)
    } else {
      window.history.pushState({}, '', `${url.pathname}${url.search}`)
    }
    setRoute(next)
  }, [])

  return { route, navigate, routeToPath }
}
