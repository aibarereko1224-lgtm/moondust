import { mediaTypeLabels, type NotebookPage as NotebookPageModel, type NotebookTheme } from '../types/notebook'
import type { MediaRecord } from '../types/media'

interface NotebookPageProps {
  page: NotebookPageModel
  theme: NotebookTheme
  onOpenRecord: (record: MediaRecord) => void
}

function Rating({ value }: { value: number | null }) {
  return <span className="notebook-rating" aria-label={value ? `${value} 星` : '未评分'}>{value ? '★'.repeat(value) : '—'}</span>
}

export function NotebookPage({ page, theme, onOpenRecord }: NotebookPageProps) {
  const { month } = page
  return (
    <article className="notebook-paper" data-notebook-theme={theme}>
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
          <p className="notebook-cover-count">{month.stats.total} {month.stats.total === 1 ? 'story' : 'stories'} this month</p>
          {month.stats.total > 0 && (
            <dl className="notebook-cover-stats">
              <div><dt>MOVIES</dt><dd>{month.stats.movie}</dd></div>
              <div><dt>TV</dt><dd>{month.stats.tv}</dd></div>
              <div><dt>BOOKS</dt><dd>{month.stats.book}</dd></div>
            </dl>
          )}
          {month.stats.total === 0 && <p className="notebook-empty-note">Nothing recorded yet.</p>}
          <span className="notebook-hand-mark" aria-hidden="true">⌁</span>
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
                  <span className="notebook-entry-type">{mediaTypeLabels[record.type]}</span>
                  <h3>{record.title}</h3>
                  <p>{record.date ?? 'UNDATED'} · <Rating value={record.rating} /></p>
                </div>
              </div>
              <div className="notebook-review">
                <span>我的感想</span>
                <p className={record.review ? '' : 'is-empty'}>{record.review}</p>
              </div>
            </button>
          ))}
          {page.records.length < 2 && <div className="notebook-entry-space" aria-hidden="true" />}
        </div>
      )}

      <footer className="notebook-paper-footer">
        <span>{month.monthName.toLocaleLowerCase()}, in stories</span>
        <span>{String(page.pageNumber).padStart(2, '0')}</span>
      </footer>
    </article>
  )
}
