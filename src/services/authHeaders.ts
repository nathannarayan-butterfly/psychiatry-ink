import { getSupabase } from '../lib/supabase'

export async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = getSupabase()
  if (!supabase) return {}

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return {}

  return { Authorization: `Bearer ${token}` }
}
