export type TmdbSearchType = 'movie' | 'tv'

export interface TmdbSearchResult {
  id: number
  type: TmdbSearchType
  title: string
  poster: string | null
  date: string | null
}

export interface TmdbSearchResponse {
  results: TmdbSearchResult[]
}
