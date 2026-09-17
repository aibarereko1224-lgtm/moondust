import { useEffect, useRef, useState } from 'react'
import { exportLongReviewImages } from '../lib/longReviewExport'
import { getLongReview, saveLongReview } from '../lib/longReviews'
import type { MediaRecord } from '../types/media'

interface LongReviewWritingSpaceProps {
  active: boolean
  record: MediaRecord | null
  userId: string | null
  onClose: () => void
}

function ratingLabel(rating: number | null) {
  return Array.from({ length: 5 }, (_, index) => rating && index < rating ? '★' : '☆').join(' ')
}

export function LongReviewWritingSpace({ active, record, userId, onClose }: LongReviewWritingSpaceProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState('')
  const [exporting, setExporting] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const loadedRecordRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active || !record || !userId) return
    const draft = getLongReview(userId, record.id)
    setTitle(draft.title)
    setBody(draft.body)
    setStatus(draft.updatedAt ? '已恢复上次保存的文字' : '')
    loadedRecordRef.current = record.id
  }, [active, record, userId])

  useEffect(() => {
    if (!active || !record || !userId || loadedRecordRef.current !== record.id) return
    const timer = window.setTimeout(() => {
      saveLongReview(userId, record.id, { title, body })
      setStatus('已自动保存')
    }, 700)
    return () => window.clearTimeout(timer)
  }, [active, body, record, title, userId])

  useEffect(() => {
    const textarea = bodyRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(420, textarea.scrollHeight)}px`
  }, [body])

  if (!record || !userId) return null

  const save = () => {
    const saved = saveLongReview(userId, record.id, { title, body })
    setStatus(`已保存 · ${new Date(saved.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`)
  }

  const close = () => {
    saveLongReview(userId, record.id, { title, body })
    onClose()
  }

  const exportImages = async () => {
    if (!body.trim()) {
      setStatus('写下一些文字后再导出。')
      bodyRef.current?.focus()
      return
    }
    setExporting(true)
    setStatus('正在排版图片…')
    try {
      saveLongReview(userId, record.id, { title, body })
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
        <button className="long-review-back" onClick={close} type="button">返回</button>
        <span>MOON DUST</span>
        <div className="long-review-actions">
          <button onClick={save} type="button">保存</button>
          <button disabled={exporting} onClick={() => void exportImages()} type="button">{exporting ? '生成中…' : '导出图片'}</button>
        </div>
      </header>

      <main className="long-review-paper">
        <header className="long-review-record">
          {record.poster && <img alt="" className="long-review-poster" src={record.poster} />}
          <div>
            <p className="long-review-kicker">LONG REVIEW</p>
            <h1>《{record.title}》</h1>
            <p className="long-review-meta"><span>{ratingLabel(record.rating)}</span><time dateTime={record.date ?? undefined}>{record.date?.replaceAll('-', '.') ?? '日期未记'}</time></p>
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
