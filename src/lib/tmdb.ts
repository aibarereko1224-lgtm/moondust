import type { TmdbSearchResponse, TmdbSearchResult, TmdbSearchType } from '../types/tmdb'

export async function searchTmdb(query: string, type: TmdbSearchType): Promise<TmdbSearchResult[]> {
  const parameters = new URLSearchParams({ query, type })
  const response = await fetch(`/.netlify/functions/tmdb-search?${parameters.toString()}`, {
    headers: { Accept: 'application/json' },
  })

  const payload = await response.json().catch(() => null) as (TmdbSearchResponse & { error?: string }) | null
  if (!response.ok) {
    throw new Error(payload?.error || '搜索暂时不可用，请稍后再试。')
  }

  return payload?.results ?? []
}
