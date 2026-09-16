import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { requireSupabaseConfiguration, supabase } from './supabase'

export async function getCurrentSession() {
  requireSupabaseConfiguration()
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export function onSessionChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  requireSupabaseConfiguration()
  return supabase.auth.onAuthStateChange(callback).data.subscription
}

export async function signUpWithEmail(email: string, password: string, username: string) {
  requireSupabaseConfiguration()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })
  if (error) throw error
  return data
}

export async function signInWithEmail(email: string, password: string) {
  requireSupabaseConfiguration()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  requireSupabaseConfiguration()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
