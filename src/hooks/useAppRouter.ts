import { useCallback, useEffect, useState } from 'react'
import { NOTION_PAGES, type NotionPageId } from '../components/notion/notionPages'
import { DEFAULT_CASE_ID } from '../utils/caseContext'

const VALID_PAGE_IDS = new Set<NotionPageId>(NOTION_PAGES.map((page) => page.id))

function parsePageParam(search: string): NotionPageId | undefined {
  const raw = new URLSearchParams(search).get('page')
  if (!raw) return undefined
  return VALID_PAGE_IDS.has(raw as NotionPageId) ? (raw as NotionPageId) : undefined
}

export type AppRoute =
  | { view: 'landing' }
  | { view: 'login' }
  | { view: 'signup' }
  | { view: 'dashboard' }
  | { view: 'case'; caseId: string; page?: NotionPageId }

export function isPublicRoute(route: AppRoute): boolean {
  return route.view === 'landing' || route.view === 'login' || route.view === 'signup'
}

export function isAppRoute(route: AppRoute): boolean {
  return route.view === 'dashboard' || route.view === 'case'
}

function parsePathname(pathname: string, search = ''): AppRoute {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { view: 'landing' }
  if (path === '/login') return { view: 'login' }
  if (path === '/signup') return { view: 'signup' }
  if (path === '/dashboard' || path === '/app') return { view: 'dashboard' }
  if (path === '/workspace') {
    return { view: 'case', caseId: DEFAULT_CASE_ID }
  }
  const caseMatch = path.match(/^\/case\/([^/]+)$/)
  if (caseMatch) {
    return {
      view: 'case',
      caseId: decodeURIComponent(caseMatch[1]),
      page: parsePageParam(search),
    }
  }
  return { view: 'landing' }
}

export function routeToPath(route: AppRoute): string {
  if (route.view === 'landing') return '/'
  if (route.view === 'login') return '/login'
  if (route.view === 'signup') return '/signup'
  if (route.view === 'dashboard') return '/dashboard'
  const base = `/case/${encodeURIComponent(route.caseId)}`
  if (route.page) return `${base}?page=${encodeURIComponent(route.page)}`
  return base
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
