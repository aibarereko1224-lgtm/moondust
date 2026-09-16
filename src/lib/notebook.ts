import type { MediaRecord } from '../types/media'
import type { NotebookMonth, NotebookPage, NotebookStats } from '../types/notebook'

export const NOTEBOOK_RECORDS_PER_PAGE = 2

const monthNames = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]

export function recordDate(record: MediaRecord) {
  return record.date ?? record.created_at.slice(0, 10)
}

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function monthFromKey(key: string) {
  const [year, month] = key.split('-').map(Number)
  return { year, month }
}

export function shiftMonth(key: string, amount: number) {
  const { year, month } = monthFromKey(key)
  const date = new Date(year, month - 1 + amount, 1)
  return monthKey(date.getFullYear(), date.getMonth() + 1)
}

function countRecords(records: MediaRecord[]): NotebookStats {
  return records.reduce<NotebookStats>((stats, record) => {
    stats.total += 1
    stats[record.type] += 1
    return stats
  }, { total: 0, movie: 0, tv: 0, book: 0 })
}

export function buildNotebookMonth(entries: MediaRecord[], key: string): NotebookMonth {
  const { year, month } = monthFromKey(key)
  const records = entries
    .filter((record) => recordDate(record).slice(0, 7) === key)
    .sort((first, second) => {
      const dateOrder = recordDate(first).localeCompare(recordDate(second))
      return dateOrder || first.created_at.localeCompare(second.created_at)
    })

  return {
    key,
    year,
    month,
    monthName: monthNames[month - 1] ?? '',
    records,
    stats: countRecords(records),
  }
}

export function buildNotebookPages(month: NotebookMonth): NotebookPage[] {
  const pages: NotebookPage[] = [{ kind: 'cover', pageNumber: 1, month }]
  for (let index = 0; index < month.records.length; index += NOTEBOOK_RECORDS_PER_PAGE) {
    pages.push({
      kind: 'records',
      pageNumber: pages.length + 1,
      month,
      records: month.records.slice(index, index + NOTEBOOK_RECORDS_PER_PAGE),
    })
  }
  return pages
}

export function availableNotebookMonths(entries: MediaRecord[]) {
  return [...new Set(entries.map((record) => recordDate(record).slice(0, 7)))]
    .filter((key) => /^\d{4}-\d{2}$/.test(key))
    .sort((first, second) => second.localeCompare(first))
}

export function currentMonthKey() {
  const today = new Date()
  return monthKey(today.getFullYear(), today.getMonth() + 1)
}
