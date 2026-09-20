import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { MediaRecord } from '../types/media'
import type { LongReviewMap } from '../types/longReview'
import type { NotebookMode, NotebookReadingPage, NotebookTheme } from '../types/notebook'
import { availableNotebookMonths, buildNotebookMonth, shiftMonth } from '../lib/notebook'
import { buildNotebookReadingPages, type NotebookTextMetrics } from '../lib/notebookPagination'
import { exportNotebookZip } from '../lib/notebookExport'
import { NotebookPage } from './NotebookPage'

interface MonthlyNotebookProps {
  active: boolean
  entries: MediaRecord[]
  initialMonth: string
  theme: NotebookTheme
  onClose: () => void
  onOpenRecord: (record: MediaRecord) => void
  longReviews: LongReviewMap
  longReviewRevision: number
}

const PAGE_CURL_SEGMENTS = 9

function SoftPageTurn({ direction, mode, page, theme, onOpenRecord }: { direction: 'next' | 'previous'; mode: NotebookMode; page: NotebookReadingPage; theme: NotebookTheme; onOpenRecord: (record: MediaRecord) => void }) {
  return <div aria-hidden="true" className={`notebook-page-curl notebook-page-curl-${direction}`} inert>
    <span className="notebook-curl-cast-shadow" />
    {Array.from({ length: PAGE_CURL_SEGMENTS }, (_, index) => {
      const order = direction === 'next' ? PAGE_CURL_SEGMENTS - 1 - index : index
      const settle = direction === 'next' ? -(2 * index + 1) * 100 : (2 * (PAGE_CURL_SEGMENTS - 1 - index)) * 100
      const style = {
        '--curl-index': index,
        '--curl-order': order,
        '--curl-left': `${(index / PAGE_CURL_SEGMENTS) * 100}%`,
        '--curl-delay': `${order * 18}ms`,
        '--curl-depth-in': `${(order + 1) * 1.5}px`,
        '--curl-depth-out': `${(PAGE_CURL_SEGMENTS - order) * 2}px`,
        '--curl-mid': `${settle * 0.42}%`,
        '--curl-settle': `${settle}%`,
      } as CSSProperties
      return <span className="notebook-curl-segment" key={index} style={style}>
        <span className="notebook-curl-face">
          <span className="notebook-curl-page" style={{ left: `${-index * 100}%`, width: `${PAGE_CURL_SEGMENTS * 100}%` }}>
            <NotebookPage mode={mode} page={page} theme={theme} onOpenRecord={onOpenRecord} />
          </span>
          <span className="notebook-curl-light" />
        </span>
        <span className="notebook-curl-back" />
      </span>
    })}
  </div>
}

export function MonthlyNotebook({ active, entries, initialMonth, theme, onClose, onOpenRecord, longReviews, longReviewRevision }: MonthlyNotebookProps) {
  void longReviewRevision
  const [monthKey, setMonthKey] = useState(initialMonth)
  const [pageIndex, setPageIndex] = useState(0)
  const [turningPage, setTurningPage] = useState<{ page: NotebookReadingPage; direction: 'next' | 'previous'; id: number } | null>(null)
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set([initialMonth]))
  const [showBatch, setShowBatch] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [mode, setMode] = useState<NotebookMode>(() => localStorage.getItem('moon-dust-notebook-mode') === 'night' ? 'night' : 'day')
  const paperRef = useRef<HTMLElement>(null)
  const turnTimerRef = useRef<number | null>(null)
  const [metrics, setMetrics] = useState<NotebookTextMetrics>({ width: 500, firstPageHeight: 330, continuationHeight: 570, font: '300 17px "Noto Sans SC", sans-serif', fontSize: 17, lineHeight: 34, letterSpacing: 0.425 })

  useEffect(() => {
    localStorage.setItem('moon-dust-notebook-mode', mode)
  }, [mode])

  useEffect(() => {
    if (!active) return
    setMonthKey(initialMonth)
    setPageIndex(0)
    setSelectedMonths(new Set([initialMonth]))
  }, [active, initialMonth])

  useEffect(() => () => { if (turnTimerRef.current) window.clearTimeout(turnTimerRef.current) }, [])

  const month = useMemo(() => buildNotebookMonth(entries, monthKey), [entries, monthKey])
  const pages = useMemo(() => buildNotebookReadingPages(month, longReviews, metrics), [longReviews, metrics, month])
  const availableMonths = useMemo(() => {
    const keys = availableNotebookMonths(entries)
    return keys.includes(monthKey) ? keys : [monthKey, ...keys]
  }, [entries, monthKey])

  useLayoutEffect(() => {
    if (!active || !paperRef.current) return
    const paper = paperRef.current
    const update = () => {
      const sample = paper.querySelector<HTMLElement>('.notebook-text-measure')
      if (!sample) return
      const style = getComputedStyle(sample)
      const fontSize = Number.parseFloat(style.fontSize)
      const lineHeight = Number.parseFloat(style.lineHeight)
      const next = {
        width: paper.clientWidth * 0.83,
        firstPageHeight: paper.clientHeight * 0.47,
        continuationHeight: paper.clientHeight * 0.75,
        font: `${style.fontWeight} ${fontSize}px ${style.fontFamily}`,
        fontSize,
        lineHeight,
        letterSpacing: Number.parseFloat(style.letterSpacing) || 0,
      }
      setMetrics((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(paper)
    void document.fonts?.ready.then(update)
    document.fonts?.addEventListener('loadingdone', update)
    return () => {
      observer.disconnect()
      document.fonts?.removeEventListener('loadingdone', update)
    }
  }, [active, mode, monthKey, pageIndex])

  useEffect(() => {
    if (pageIndex >= pages.length) setPageIndex(Math.max(0, pages.length - 1))
  }, [pageIndex, pages.length])

  const moveMonth = (amount: number) => {
    const next = shiftMonth(monthKey, amount)
    setMonthKey(next)
    setPageIndex(0)
    setSelectedMonths(new Set([next]))
  }

  const turnTo = (nextIndex: number) => {
    if (turningPage || nextIndex === pageIndex || nextIndex < 0 || nextIndex >= pages.length) return
    const direction = nextIndex > pageIndex ? 'next' : 'previous'
    if (turnTimerRef.current) window.clearTimeout(turnTimerRef.current)
    setTurningPage({ page: pages[pageIndex], direction, id: Date.now() })
    setPageIndex(nextIndex)
    turnTimerRef.current = window.setTimeout(() => setTurningPage(null), 920)
  }

  const toggleMonth = (key: string) => {
    setSelectedMonths((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const runExport = async (keys: string[]) => {
    if (!keys.length) return
    setExporting(true)
    setExportError(null)
    try {
      await exportNotebookZip(entries, keys, theme, mode)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : '导出失败，请稍后再试。')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className={`notebook-panel glass-panel ${active ? 'active' : ''}`} aria-label="月度笔记本">
      <header className="notebook-toolbar">
        <div className="notebook-month-nav">
          <button aria-label="上个月" onClick={() => moveMonth(-1)} type="button">‹</button>
          <strong>{month.year} / {String(month.month).padStart(2, '0')}</strong>
          <button aria-label="下个月" onClick={() => moveMonth(1)} type="button">›</button>
        </div>
        <div className="notebook-toolbar-actions">
          <div className="notebook-preferences" aria-label="笔记本显示设置">
            <button aria-label={`切换到${mode === 'day' ? '夜间' : '白天'}模式`} className="notebook-mode-toggle" onClick={() => setMode((value) => value === 'day' ? 'night' : 'day')} title={`切换到${mode === 'day' ? '夜间' : '白天'}模式`} type="button">
              <span aria-hidden="true">{mode === 'day' ? '☾' : '☀'}</span>{mode === 'day' ? '夜间' : '白天'}
            </button>
          </div>
          <button onClick={() => setShowBatch((value) => !value)} type="button">选择月份</button>
          <button disabled={exporting} onClick={() => void runExport([monthKey])} type="button">{exporting ? '生成中…' : '保存这一月'}</button>
          <button aria-label="关闭月度笔记本" className="modal-close-btn modal-close-inline" onClick={onClose} type="button">×</button>
        </div>
      </header>

      {showBatch && (
        <div className="notebook-batch-picker">
          <div className="notebook-month-checks">
            {availableMonths.map((key) => <label key={key}><input checked={selectedMonths.has(key)} onChange={() => toggleMonth(key)} type="checkbox" />{key.replace('-', ' / ')}</label>)}
          </div>
          <button disabled={exporting || selectedMonths.size === 0} onClick={() => void runExport([...selectedMonths].sort())} type="button">导出选中的月份</button>
        </div>
      )}

      <div className="notebook-stage" data-notebook-mode={mode}>
        <div className="notebook-page-shell">
          <button aria-label="上一页" className="notebook-page-turn previous" disabled={pageIndex === 0} onClick={() => turnTo(pageIndex - 1)} type="button">‹</button>
          <div className="notebook-book">
            <NotebookPage mode={mode} page={pages[Math.min(pageIndex, pages.length - 1)]} paperRef={paperRef} theme={theme} onOpenRecord={onOpenRecord} />
            {turningPage && <SoftPageTurn direction={turningPage.direction} key={turningPage.id} mode={mode} page={turningPage.page} theme={theme} onOpenRecord={onOpenRecord} />}
          </div>
          <button aria-label="下一页" className="notebook-page-turn next" disabled={pageIndex === pages.length - 1} onClick={() => turnTo(pageIndex + 1)} type="button">›</button>
        </div>
      </div>

      <div className="notebook-pagination" aria-label="笔记本页码">
        <span>{Math.min(pageIndex + 1, pages.length)} / {pages.length}</span>
        {pages.map((page, index) => <button aria-label={`第 ${page.pageNumber} 页`} className={index === pageIndex ? 'active' : ''} key={page.pageNumber} onClick={() => turnTo(index)} type="button" />)}
      </div>
      {exportError && <p className="notebook-export-error">{exportError}</p>}
    </section>
  )
}
