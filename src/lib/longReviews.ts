import type { LongReviewDraft } from '../types/longReview'

const STORAGE_PREFIX = 'moon-dust-long-review'

function storageKey(userId: string, entryId: number) {
  return `${STORAGE_PREFIX}:${userId}:${entryId}`
}

export function getLongReview(userId: string, entryId: number): LongReviewDraft {
  const empty = { title: '', body: '', updatedAt: '' }
  try {
    const value = localStorage.getItem(storageKey(userId, entryId))
    if (!value) return empty
    const parsed = JSON.parse(value) as Partial<LongReviewDraft>
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      body: typeof parsed.body === 'string' ? parsed.body : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
  } catch {
    return empty
  }
}

export function saveLongReview(userId: string, entryId: number, draft: Pick<LongReviewDraft, 'title' | 'body'>) {
  const value: LongReviewDraft = { ...draft, updatedAt: new Date().toISOString() }
  localStorage.setItem(storageKey(userId, entryId), JSON.stringify(value))
  return value
}
