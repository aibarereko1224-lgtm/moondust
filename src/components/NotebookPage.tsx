import { type NotebookMode, type NotebookPage as NotebookPageModel, type NotebookTheme } from '../types/notebook'
import type { MediaRecord } from '../types/media'

interface NotebookPageProps {
  page: NotebookPageModel
  theme: NotebookTheme
  mode: NotebookMode
  onOpenRecord: (record: MediaRecord) => void
}

function Rating({ value }: { value: number | null }) {
  return (
    <span className="notebook-rating" aria-label={value ? `${value} 星` : '未评分'}>
      {Array.from({ length: 5 }, (_, index) => <span className={value && index < value ? 'is-filled' : ''} key={index}>☆</span>)}
    </span>
  )
}

function formatNotebookDate(value: string | null) {
  return value ? value.replaceAll('-', '.') : '日期未记'
}

export function NotebookPage({ page, theme, mode, onOpenRecord }: NotebookPageProps) {
  const { month } = page
  return (
    <article className="notebook-paper" data-notebook-mode={mode} data-notebook-theme={theme}>
      <div className="notebook-binding" aria-hidden="true" />
      <header className="notebook-paper-header">
        <span>MOON DUST · MONTHLY NOTEBOOK</span>
        <span>{month.year} / {String(month.month).padStart(2, '0')}</span>
      </header>

      {page.kind === 'cover' ? (
        <div className="notebook-cover-page">
          <div className="notebook-cover-date">
            <strong>{String(month.month).padStart(2, '0')}</strong>
            <span>{month.monthName}</span>
            <small>{month.year}</small>
          </div>
          <p className="notebook-cover-note">记录你靠近的宇宙。</p>
        </div>
      ) : (
        <div className="notebook-record-page">
          {page.records.map((record) => (
            <button className="notebook-entry" key={record.id} onClick={() => onOpenRecord(record)} type="button">
              <div className="notebook-entry-main">
                <div className="notebook-poster-wrap">
                  {record.poster ? <img alt="" className="notebook-poster" src={record.poster} /> : <span className="notebook-poster notebook-poster-empty">NO IMAGE</span>}
                </div>
                <div className="notebook-entry-meta">
                  <h3>《{record.title}》</h3>
                  <div className="notebook-entry-annotation">
                    <Rating value={record.rating} />
                    <time dateTime={record.date ?? undefined}>{formatNotebookDate(record.date)}</time>
                  </div>
                </div>
              </div>
              <div className="notebook-review">
                <p className={record.review ? '' : 'is-empty'}>{record.review}</p>
              </div>
            </button>
          ))}
          {page.records.length < 2 && <div className="notebook-entry-space" aria-hidden="true" />}
        </div>
      )}

      <footer className="notebook-paper-footer">
        <span>Moon Dust Notebook</span>
        <span>{String(page.pageNumber).padStart(2, '0')}</span>
      </footer>
    </article>
  )
}
