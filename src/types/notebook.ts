import type { MediaRecord, MediaType } from './media'

export interface NotebookStats {
  total: number
  movie: number
  tv: number
  book: number
}

export interface NotebookMonth {
  key: string
  year: number
  month: number
  monthName: string
  records: MediaRecord[]
  stats: NotebookStats
}

export type NotebookPage =
  | { kind: 'cover'; pageNumber: number; month: NotebookMonth }
  | { kind: 'records'; pageNumber: number; month: NotebookMonth; records: MediaRecord[] }

export type NotebookReadingPage =
  | { kind: 'intro'; pageNumber: number; month: NotebookMonth }
  | { kind: 'story'; pageNumber: number; month: NotebookMonth; record: MediaRecord; lines: string[]; continuation: boolean }

export type NotebookTheme = 'forest' | 'starry' | 'stream' | 'desert'
export type NotebookMode = 'day' | 'night'
export type NotebookFont = 'serif' | 'sans' | 'handwriting'

export const mediaTypeLabels: Record<MediaType, string> = {
  movie: 'MOVIE',
  tv: 'TV',
  book: 'BOOK',
}
