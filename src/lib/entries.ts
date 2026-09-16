import type { MediaRecord, MediaRecordCreate, MediaRecordUpdate } from '../types/media'
import { requireSupabaseConfiguration, supabase } from './supabase'

async function requireCurrentUser() {
  requireSupabaseConfiguration()
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('请先登录。')
  return data.user
}

const entryColumns = 'id, user_id, type, title, poster, date, rating, review, pending, created_at, updated_at'

export async function getEntries(): Promise<MediaRecord[]> {
  const user = await requireCurrentUser()
  const { data, error } = await supabase
    .from('entries')
    .select(entryColumns)
    .eq('user_id', user.id)
    .order('date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as MediaRecord[]
}

export async function createEntry(input: MediaRecordCreate): Promise<MediaRecord> {
  const user = await requireCurrentUser()
  const { data, error } = await supabase
    .from('entries')
    .insert({
      ...input,
      user_id: user.id,
      poster: input.poster ?? null,
      date: input.date ?? null,
      rating: input.rating ?? null,
      review: input.review ?? '',
      pending: input.pending ?? false,
    })
    .select(entryColumns)
    .single()

  if (error) throw error
  return data as MediaRecord
}

export async function updateEntry(entryId: number, input: MediaRecordUpdate): Promise<MediaRecord> {
  const user = await requireCurrentUser()
  const { data, error } = await supabase
    .from('entries')
    .update(input)
    .eq('id', entryId)
    .eq('user_id', user.id)
    .select(entryColumns)
    .single()

  if (error) throw error
  return data as MediaRecord
}

export async function deleteEntry(entryId: number): Promise<void> {
  const user = await requireCurrentUser()
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', user.id)

  if (error) throw error
}
