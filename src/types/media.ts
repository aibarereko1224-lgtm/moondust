export type MediaType = 'movie' | 'book'

export interface MediaRecord {
  id: string
  user_id: string
  type: MediaType
  title: string
  poster: string | null
  date: string | null
  rating: number | null
  review: string
  pending: boolean
  created_at: string
  updated_at: string
}

export type MediaRecordInput = Omit<
  MediaRecord,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>
