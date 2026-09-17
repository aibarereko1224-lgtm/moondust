export interface LongReviewDraft {
  title: string
  body: string
  updatedAt: string
}

export interface LongReviewExportPage {
  blob: Blob
  pageNumber: number
  pageCount: number
}
