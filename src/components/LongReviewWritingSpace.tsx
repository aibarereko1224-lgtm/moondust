import { useEffect, useRef, useState } from 'react'
import { exportLongReviewImages } from '../lib/longReviewExport'
import { formatDisplayDate } from '../lib/date'
import { getCachedLongReview, getLongReview, saveLongReview } from '../lib/longReviews'
import type { LongReviewDraft } from '../types/longReview'
import type { MediaRecord } from '../types/media'

interface LongReviewWritingSpaceProps {
  active: boolean
  record: MediaRecord | null
  userId: string | null
  onClose: () => void
  onSaved: (entryId: number, review: LongReviewDraft) => void
}

function ratingLabel(rating: number | null) {
  return Array.from({ length: 5 }, (_, index) => rating && index < rating ? '★' : '☆').join(' ')
}

export function LongReviewWritingSpace({ active, record, userId, onClose, onSaved }: LongReviewWritingSpaceProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')
  const [exporting, setExporting] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const loadedRecordRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || !record || !userId) return
    let current = true
    loadedRecordRef.current = null
    setTitle('')
    setBody('')
    setStatus('正在读取云端长评…')
    getLongReview(userId, record.id)
      .then((draft) => {
        if (!current) return
        setTitle(draft.title)
        setBody(draft.body)
        setStatus(draft.updatedAt ? '已从云端恢复上次保存的文字' : '')
        loadedRecordRef.current = record.id
      })
      .catch(() => {
        if (!current) return
        const cached = getCachedLongReview(userId, record.id)
        setTitle(cached.title)
        setBody(cached.body)
        setStatus('云端读取失败，已恢复本地草稿')
        loadedRecordRef.current = record.id
      })
    return () => { current = false }
  }, [active, record, userId])

  useEffect(() => {
    if (!active || !record || !userId || loadedRecordRef.current !== record.id) return
    const timer = window.setTimeout(() => {
      saveLongReview(userId, record.id, { title, body })
        .then((saved) => {
          setStatus('已自动保存到云端')
          onSaved(record.id, saved)
        })
        .catch(() => setStatus('网络异常，已保留本地草稿'))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [active, body, onSaved, record, title, userId])

  useEffect(() => {
    const textarea = bodyRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(420, textarea.scrollHeight)}px`
  }, [body])

  if (!record || !userId) return null

  const save = async () => {
    if (loadedRecordRef.current !== record.id) return
    try {
      const saved = await saveLongReview(userId, record.id, { title, body })
      setStatus(`已保存到云端 · ${new Date(saved.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`)
      onSaved(record.id, saved)
    } catch {
      setStatus('云端保存失败，已保留本地草稿')
    }
  }

  const close = async () => {
    if (loadedRecordRef.current !== record.id) {
      onClose()
      return
    }
    try {
      const saved = await saveLongReview(userId, record.id, { title, body })
      onSaved(record.id, saved)
    } catch {
      // saveLongReview caches the draft locally before attempting the network request.
    }
    onClose()
  }

  const exportImages = async () => {
    if (loadedRecordRef.current !== record.id) return
    if (!body.trim()) {
      setStatus('写下一些文字后再导出。')
      bodyRef.current?.focus()
      return
    }
    setExporting(true)
    setStatus('正在排版图片…')
    try {
      try {
        const saved = await saveLongReview(userId, record.id, { title, body })
        onSaved(record.id, saved)
      } catch {
        // The current draft is cached locally before the cloud request runs.
      }
      const pageCount = await exportLongReviewImages(record, title, body)
      setStatus(pageCount > 1 ? `已导出 ${pageCount} 页图片` : '图片已导出')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '导出失败，请稍后再试。')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className={`long-review-space ${active ? 'active' : ''}`} aria-label="长评写作空间">
      <header className="long-review-topbar">
        <button className="long-review-back" onClick={() => void close()} type="button">返回</button>
        <span>MOON DUST</span>
        <div className="long-review-actions">
          <button onClick={() => void save()} type="button">保存</button>
          <button disabled={exporting} onClick={() => void exportImages()} type="button">{exporting ? '生成中…' : '导出图片'}</button>
        </div>
      </header>

      <main className="long-review-paper">
        <header className="long-review-record">
          <div className="long-review-film">
            <div className="long-review-poster-column">
              {record.poster ? <img alt={`${record.title} 海报`} className="long-review-poster" referrerPolicy="no-referrer" src={record.poster} /> : <div className="long-review-poster long-review-poster-empty">NO IMAGE</div>}
              <time className="long-review-date" dateTime={record.date ?? undefined}>{formatDisplayDate(record.date)}</time>
            </div>
            <div className="long-review-film-info">
              <p className="long-review-kicker">LONG REVIEW</p>
              <h1>《{record.title}》</h1>
              <p className="long-review-rating">{ratingLabel(record.rating)}</p>
            </div>
          </div>
        </header>

        <div className="long-review-editor">
          <input aria-label="长评标题" className="long-review-title" onChange={(event) => setTitle(event.target.value)} placeholder="一个不必写下的标题" value={title} />
          <textarea aria-label="长评正文" className="long-review-body" onChange={(event) => setBody(event.target.value)} placeholder="在这里写下你想留下的东西。" ref={bodyRef} value={body} />
        </div>
        <footer className="long-review-paper-footer"><span>{status}</span><span>Moon Dust</span></footer>
      </main>
    </section>
  )
}
