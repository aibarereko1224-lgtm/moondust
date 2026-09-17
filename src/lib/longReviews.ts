import type { LongReviewDraft, LongReviewMap, LongReviewRecord } from '../types/longReview'
import { requireSupabaseConfiguration, supabase } from './supabase'

const STORAGE_PREFIX = 'moon-dust-long-review'
const emptyDraft: LongReviewDraft = { title: '', body: '', updatedAt: '' }

interface LongReviewRow {
  entry_id: number
  user_id: string
  title: string
  body: string
  updated_at: string
}

function storageKey(userId: string, entryId: number) {
  return `${STORAGE_PREFIX}:${userId}:${entryId}`
}

function pendingStorageKey(userId: string, entryId: number) {
  return `${storageKey(userId, entryId)}:pending`
}

function fromRow(row: LongReviewRow): LongReviewRecord {
  return {
    entryId: row.entry_id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    updatedAt: row.updated_at,
  }
}

export function getCachedLongReview(userId: string, entryId: number): LongReviewDraft {
  try {
    const value = localStorage.getItem(storageKey(userId, entryId))
    if (!value) return emptyDraft
    const parsed = JSON.parse(value) as Partial<LongReviewDraft>
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      body: typeof parsed.body === 'string' ? parsed.body : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
  } catch {
    return emptyDraft
  }
}

export function getCachedLongReviews(userId: string, entryIds: number[]): LongReviewMap {
  return entryIds.reduce<LongReviewMap>((reviews, entryId) => {
    const review = getCachedLongReview(userId, entryId)
    if (review.title.trim() || review.body.trim()) reviews[entryId] = review
    return reviews
  }, {})
}

function cacheLongReview(userId: string, entryId: number, draft: LongReviewDraft, pending = false) {
  localStorage.setItem(storageKey(userId, entryId), JSON.stringify(draft))
  if (pending) localStorage.setItem(pendingStorageKey(userId, entryId), 'true')
  else localStorage.removeItem(pendingStorageKey(userId, entryId))
}

export async function getLongReview(userId: string, entryId: number): Promise<LongReviewDraft> {
  requireSupabaseConfiguration()
  const { data, error } = await supabase
    .from('long_reviews')
    .select('entry_id, user_id, title, body, updated_at')
    .eq('user_id', userId)
    .eq('entry_id', entryId)
    .maybeSingle<LongReviewRow>()

  if (error) throw error
  if (localStorage.getItem(pendingStorageKey(userId, entryId))) {
    return getCachedLongReview(userId, entryId)
  }
  if (!data) {
    const cached = getCachedLongReview(userId, entryId)
    if (!cached.title.trim() && !cached.body.trim()) return emptyDraft
    return saveLongReview(userId, entryId, cached)
  }
  const review = fromRow(data)
  cacheLongReview(userId, entryId, review)
  return review
}

export async function getLongReviews(userId: string, entryIds: number[]): Promise<LongReviewMap> {
  if (!entryIds.length) return {}
  requireSupabaseConfiguration()
  const { data, error } = await supabase
    .from('long_reviews')
    .select('entry_id, user_id, title, body, updated_at')
    .eq('user_id', userId)
    .in('entry_id', entryIds)

  if (error) throw error
  return ((data ?? []) as LongReviewRow[]).reduce<LongReviewMap>((reviews, row) => {
    const review = fromRow(row)
    const hasPendingDraft = Boolean(localStorage.getItem(pendingStorageKey(userId, review.entryId)))
    reviews[review.entryId] = hasPendingDraft ? getCachedLongReview(userId, review.entryId) : review
    if (!hasPendingDraft) cacheLongReview(userId, review.entryId, review)
    return reviews
  }, {})
}

export async function saveLongReview(userId: string, entryId: number, draft: Pick<LongReviewDraft, 'title' | 'body'>) {
  const pending: LongReviewDraft = { ...draft, updatedAt: new Date().toISOString() }
  cacheLongReview(userId, entryId, pending, true)
  requireSupabaseConfiguration()

  const { data, error } = await supabase
    .from('long_reviews')
    .upsert({ user_id: userId, entry_id: entryId, title: draft.title, body: draft.body }, { onConflict: 'user_id,entry_id' })
    .select('entry_id, user_id, title, body, updated_at')
    .single<LongReviewRow>()

  if (error) throw error
  const saved = fromRow(data)
  cacheLongReview(userId, entryId, saved)
  return saved
}

export async function migrateCachedLongReviews(userId: string, entryIds: number[]) {
  const remote = await getLongReviews(userId, entryIds)
  const draftsToSync = entryIds.flatMap((entryId) => {
    const hasPendingDraft = Boolean(localStorage.getItem(pendingStorageKey(userId, entryId)))
    if (remote[entryId] && !hasPendingDraft) return []
    const cached = getCachedLongReview(userId, entryId)
    if (!cached.title.trim() && !cached.body.trim()) return []
    return [{ user_id: userId, entry_id: entryId, title: cached.title, body: cached.body }]
  })

  if (!draftsToSync.length) return remote
  const { data, error } = await supabase
    .from('long_reviews')
    .upsert(draftsToSync, { onConflict: 'user_id,entry_id' })
    .select('entry_id, user_id, title, body, updated_at')

  if (error) throw error
  for (const row of (data ?? []) as LongReviewRow[]) {
    const review = fromRow(row)
    remote[review.entryId] = review
    cacheLongReview(userId, review.entryId, review)
  }
  return remote
}

export function hasLongReview(review?: LongReviewDraft | null) {
  return Boolean(review?.body.trim())
}
