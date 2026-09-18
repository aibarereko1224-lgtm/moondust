import type { MediaRecord } from '../types/media'
import type { LongReviewMap } from '../types/longReview'
import type { NotebookMonth, NotebookReadingPage } from '../types/notebook'

export interface NotebookTextMetrics {
  width: number
  firstPageHeight: number
  continuationHeight: number
  font: string
  fontSize: number
  lineHeight: number
  letterSpacing: number
}

function normalizeReview(value: string) {
  return value.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function measureLine(context: CanvasRenderingContext2D, value: string, letterSpacing: number) {
  return context.measureText(value).width + Math.max(0, [...value].length - 1) * letterSpacing
}

function tokensFor(paragraph: string) {
  return paragraph.match(/[A-Za-z0-9]+(?:['’.-][A-Za-z0-9]+)*\s*|[^A-Za-z0-9]/g) ?? []
}

function wrapParagraph(context: CanvasRenderingContext2D, paragraph: string, width: number, letterSpacing: number) {
  if (!paragraph) return ['']
  const lines: string[] = []
  let line = ''
  const pushToken = (token: string) => {
    if (!line || measureLine(context, line + token, letterSpacing) <= width) line += token
    else { lines.push(line.trimEnd()); line = token.trimStart() }
  }
  tokensFor(paragraph).forEach((token) => {
    if (measureLine(context, token, letterSpacing) <= width) pushToken(token)
    else [...token].forEach(pushToken)
  })
  if (line || !lines.length) lines.push(line.trimEnd())
  return lines
}

export function layoutReviewLines(text: string, metrics: NotebookTextMetrics) {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return normalizeReview(text).split('\n')
  context.font = metrics.font
  return normalizeReview(text).split('\n').flatMap((paragraph) => wrapParagraph(context, paragraph, metrics.width, metrics.letterSpacing))
}

function takePage(lines: string[], start: number, height: number, lineHeight: number) {
  const capacity = Math.max(1, Math.floor(height / lineHeight))
  let end = Math.min(lines.length, start + capacity)
  while (end > start + 1 && lines[end - 1] === '') end -= 1
  return { lines: lines.slice(start, end), next: Math.max(end, start + 1) }
}

export function buildNotebookReadingPages(month: NotebookMonth, reviews: LongReviewMap, metrics: NotebookTextMetrics): NotebookReadingPage[] {
  const pages: NotebookReadingPage[] = [{ kind: 'intro', pageNumber: 1, month }]
  month.records.forEach((record: MediaRecord) => {
    const text = normalizeReview(reviews[record.id]?.body || record.review || '')
    const allLines = text ? layoutReviewLines(text, metrics) : ['（这一天没有留下文字。）']
    let cursor = 0
    let continuation = false
    while (cursor < allLines.length) {
      const result = takePage(allLines, cursor, continuation ? metrics.continuationHeight : metrics.firstPageHeight, metrics.lineHeight)
      pages.push({ kind: 'story', pageNumber: pages.length + 1, month, record, lines: result.lines, continuation })
      cursor = result.next
      continuation = true
    }
  })
  return pages
}
