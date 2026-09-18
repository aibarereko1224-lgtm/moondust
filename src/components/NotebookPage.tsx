import type { RefObject } from 'react'
import { type NotebookMode, type NotebookReadingPage, type NotebookTheme } from '../types/notebook'
import type { MediaRecord } from '../types/media'
import { formatDisplayDate } from '../lib/date'

interface NotebookPageProps { page: NotebookReadingPage; theme: NotebookTheme; mode: NotebookMode; onOpenRecord: (record: MediaRecord) => void; paperRef: RefObject<HTMLElement | null> }

function Rating({ value }: { value: number | null }) {
  return <span className="notebook-rating" aria-label={value ? `${value} 星` : '未评分'}>{Array.from({ length: 5 }, (_, index) => <span className={value && index < value ? 'is-filled' : ''} key={index}>☆</span>)}</span>
}

function MonthIntro({ page }: { page: Extract<NotebookReadingPage, { kind: 'intro' }> }) {
  const { month } = page
  const days = new Date(month.year, month.month, 0).getDate()
  const leading = (new Date(month.year, month.month - 1, 1).getDay() + 6) % 7
  const recordedDays = new Set(month.records.map((record) => Number((record.date ?? record.created_at.slice(0, 10)).slice(8, 10))))
  const prettyMonth = month.monthName.slice(0, 1) + month.monthName.slice(1).toLowerCase()
  return <div className="notebook-intro-page">
    <div className="notebook-intro-title"><span>My {prettyMonth}</span><small>MONTH — {month.monthName}</small></div>
    <div className="notebook-calendar"><div className="notebook-calendar-heading"><strong>{month.monthName}</strong><span>{month.year}</span></div>
      <div className="notebook-calendar-grid notebook-calendar-weekdays">{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="notebook-calendar-grid notebook-calendar-days">{Array.from({ length: leading }, (_, index) => <span key={`empty-${index}`} />)}{Array.from({ length: days }, (_, index) => <span className={recordedDays.has(index + 1) ? 'is-recorded' : ''} key={index + 1}>{index + 1}{recordedDays.has(index + 1) && <i aria-label="这一天有记录">☾</i>}</span>)}</div>
    </div>
    <div className="notebook-month-summary"><p>这个月记录了 <strong>{recordedDays.size}</strong> 天</p><p>留下了 <strong>{month.stats.total}</strong> 个故事</p></div><div className="notebook-intro-mark">MOON DUST</div>
  </div>
}

export function NotebookPage({ page, theme, mode, onOpenRecord, paperRef }: NotebookPageProps) {
  const { month } = page
  return <article className="notebook-paper" data-notebook-mode={mode} data-notebook-page={page.kind} data-notebook-theme={theme} ref={paperRef}>
    <div className="notebook-binding" aria-hidden="true" /><header className="notebook-paper-header"><span>MOON DUST · MONTHLY NOTEBOOK</span><span>{month.year} / {String(month.month).padStart(2, '0')}</span></header>
    {page.kind === 'intro' ? <MonthIntro page={page} /> : <div className={`notebook-story-page ${page.continuation ? 'is-continuation' : ''}`}>
      {!page.continuation && <button className="notebook-story-heading" onClick={() => onOpenRecord(page.record)} type="button"><span className="notebook-story-poster-wrap">{page.record.poster ? <img alt="" className="notebook-story-poster" src={page.record.poster} /> : <span className="notebook-story-poster notebook-poster-empty">NO IMAGE</span>}</span><span className="notebook-story-meta"><h3>《{page.record.title}》</h3><span><Rating value={page.record.rating} /><time dateTime={page.record.date ?? undefined}>{formatDisplayDate(page.record.date)}</time></span></span></button>}
      {page.continuation && <div className="notebook-continuation-title">《{page.record.title}》 · 续</div>}<div className="notebook-story-copy">{page.lines.map((line, index) => line ? <span key={index}>{line}</span> : <span className="paragraph-space" key={index}>&nbsp;</span>)}</div>
    </div>}
    <span aria-hidden="true" className="notebook-text-measure">测量文字</span><footer className="notebook-paper-footer"><span>Moon Dust Notebook</span><span>{String(page.pageNumber).padStart(2, '0')}</span></footer>
  </article>
}
