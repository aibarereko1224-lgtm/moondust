import type { Profile } from '../types/profile'
import { requireSupabaseConfiguration, supabase } from './supabase'

export async function getProfile(userId: string): Promise<Profile | null> {
  requireSupabaseConfiguration()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, created_at')
    .eq('id', userId)
    .maybeSingle<Profile>()

  if (error) throw error
  return data
}

export async function createProfile(userId: string, username: string): Promise<Profile> {
  requireSupabaseConfiguration()
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, username })
    .select('id, username, created_at')
    .single<Profile>()

  if (error) throw error
  return data
}
