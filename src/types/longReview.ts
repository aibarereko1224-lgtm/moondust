export interface LongReviewDraft {
  title: string
  body: string
  updatedAt: string
}

export interface LongReviewRecord extends LongReviewDraft {
  entryId: number
  userId: string
}

export type LongReviewMap = Record<number, LongReviewDraft>

export interface LongReviewExportPage {
  blob: Blob
  pageNumber: number
  pageCount: number
}
