/** Map DiscussCase API errors to German user-facing messages. */

interface PostgresLikeError {
  code?: string
  message?: string
  details?: string
}

export function mapDiscussCaseCreateError(error: unknown): string {
  if (error && typeof error === 'object') {
    const pg = error as PostgresLikeError
    if (pg.code === '23505') {
      return 'Besprechung konnte nicht erstellt werden: Datenbank-Konflikt bei Paketversionen. Bitte Seite neu laden und erneut versuchen.'
    }
    if (pg.code === '42P01') {
      return 'DiscussCase-Datenbanktabellen fehlen. Bitte Supabase-Migrationen ausführen.'
    }
    if (pg.code === '23503') {
      return 'Besprechung konnte nicht erstellt werden: ungültige Fall-Referenz.'
    }
    if (typeof pg.message === 'string' && pg.message.trim()) {
      if (pg.message.includes('dc_discussion_packages')) {
        return 'Besprechung konnte nicht erstellt werden: Fehler beim Speichern des Pakets.'
      }
      if (pg.message.includes('dc_participants')) {
        return 'Besprechung konnte nicht erstellt werden: Fehler beim Anlegen der Teilnahme.'
      }
    }
  }

  if (error instanceof Error && error.message.includes('KB admin requires')) {
    return 'DiscussCase ist nicht konfiguriert (Supabase fehlt). Bitte Administrator kontaktieren.'
  }

  return 'Besprechung konnte nicht erstellt werden. Bitte erneut versuchen.'
}

export function mapDiscussCaseHttpError(error: string): string {
  const translations: Record<string, string> = {
    'Failed to create discussion': 'Besprechung konnte nicht erstellt werden',
    'Failed to list discussions': 'Besprechungen konnten nicht geladen werden',
    'Authentication required': 'Anmeldung erforderlich',
    'DiscussCase requires Supabase configuration (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)':
      'DiscussCase ist nicht konfiguriert (Supabase fehlt)',
    'caseId, title, packageContent, and deidentifiedPackageContent required':
      'Fall, Titel und Paketinhalt sind erforderlich',
  }
  return translations[error] ?? error
}
