import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PageFlip } from 'page-flip/dist/js/page-flip.module.js'
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

const NotebookFlipBook = memo(function NotebookFlipBook({ getCurrentPage, mode, onFlip, onFlipState, onMetrics, onOpenRecord, pages, setInstance, theme }: { getCurrentPage: () => number; mode: NotebookMode; onFlip: (page: number) => void; onFlipState: (flipping: boolean) => void; onMetrics: (metrics: NotebookTextMetrics) => void; onOpenRecord: (record: MediaRecord) => void; pages: NotebookReadingPage[]; setInstance: (instance: PageFlip | null) => void; theme: NotebookTheme }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const flipRef = useRef<PageFlip | null>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const elements = root.querySelectorAll<HTMLElement>('.notebook-flip-page')
    const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches
    const flip = new PageFlip(root, {
      width: 760,
      height: 1013,
      size: 'stretch',
      minWidth: 760,
      maxWidth: 760,
      minHeight: 280,
      maxHeight: 1013,
      drawShadow: true,
      flippingTime: 680,
      usePortrait: true,
      startPage: Math.min(getCurrentPage(), Math.max(0, elements.length - 1)),
      autoSize: false,
      maxShadowOpacity: 0.18,
      showCover: false,
      mobileScrollSupport: true,
      clickEventForward: true,
      useMouseEvents: !coarsePointer,
      swipeDistance: 42,
      showPageCorners: false,
      disableFlipByClick: true,
    })
    flip.on('flip', (event) => onFlip(event.data))
    flip.on('changeState', (event) => onFlipState(event.data !== 'read'))
    flip.loadFromHTML(elements)
    flipRef.current = flip
    setInstance(flip)
    const measure = () => {
      const paper = root.querySelector<HTMLElement>('.notebook-paper')
      const sample = root.querySelector<HTMLElement>('.notebook-text-measure')
      const firstCopy = root.querySelector<HTMLElement>('.notebook-story-page:not(.is-continuation) .notebook-story-copy')
      const continuationCopy = root.querySelector<HTMLElement>('.notebook-story-page.is-continuation .notebook-story-copy')
      if (!paper || !sample) return
      const style = getComputedStyle(sample)
      const fontSize = Number.parseFloat(style.fontSize) || 17
      const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 2
      const letterSpacing = Number.parseFloat(style.letterSpacing) || 0
      const width = firstCopy?.clientWidth || paper.clientWidth * 0.83
      const firstPageHeight = firstCopy?.clientHeight || paper.clientHeight * 0.47
      const continuationHeight = continuationCopy?.clientHeight || paper.clientHeight * 0.75
      onMetrics({
        width: Math.max(1, Math.floor(width - Math.max(8, fontSize * 0.65))),
        firstPageHeight: Math.max(lineHeight, Math.floor(firstPageHeight - lineHeight * 0.8)),
        continuationHeight: Math.max(lineHeight, Math.floor(continuationHeight - lineHeight * 0.8)),
        font: `${style.fontWeight} ${fontSize}px ${style.fontFamily}`,
        fontSize,
        lineHeight,
        letterSpacing,
      })
    }
    const frame = requestAnimationFrame(measure)
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    void document.fonts?.ready.then(measure)
    document.fonts?.addEventListener('loadingdone', measure)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.fonts?.removeEventListener('loadingdone', measure)
      flipRef.current = null
      setInstance(null)
      flip.clear()
      root.querySelector('.stf__wrapper')?.remove()
      root.classList.remove('stf__parent')
      root.removeAttribute('style')
    }
  }, [getCurrentPage, onFlip, onFlipState, onMetrics, setInstance])

  return <div className="notebook-flipbook-frame"><div className="notebook-flipbook" ref={rootRef}>
      {pages.map((page) => <div className="notebook-flip-page" data-density="soft" key={`${page.pageNumber}-${page.kind}`}>
        <NotebookPage mode={mode} onOpenRecord={onOpenRecord} page={page} theme={theme} />
      </div>)}
    </div></div>
})

export function MonthlyNotebook({ active, entries, initialMonth, theme, onClose, onOpenRecord, longReviews, longReviewRevision }: MonthlyNotebookProps) {
  void longReviewRevision
  const [monthKey, setMonthKey] = useState(initialMonth)
  const [pageIndex, setPageIndex] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set([initialMonth]))
  const [showBatch, setShowBatch] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [mode, setMode] = useState<NotebookMode>(() => localStorage.getItem('moon-dust-notebook-mode') === 'night' ? 'night' : 'day')
  const flipBookRef = useRef<PageFlip | null>(null)
  const pageIndexRef = useRef(0)
  const isFlippingRef = useRef(false)
  const [metrics, setMetrics] = useState<NotebookTextMetrics>({ width: 500, firstPageHeight: 330, continuationHeight: 570, font: '300 17px "Noto Sans SC", sans-serif', fontSize: 17, lineHeight: 34, letterSpacing: 0.425 })

  useEffect(() => {
    localStorage.setItem('moon-dust-notebook-mode', mode)
  }, [mode])

  useEffect(() => {
    if (!active) return
    setMonthKey(initialMonth)
    pageIndexRef.current = 0
    isFlippingRef.current = false
    setPageIndex(0)
    setIsFlipping(false)
    setSelectedMonths(new Set([initialMonth]))
  }, [active, initialMonth])

  const month = useMemo(() => buildNotebookMonth(entries, monthKey), [entries, monthKey])
  const pages = useMemo(() => buildNotebookReadingPages(month, longReviews, metrics), [longReviews, metrics, month])
  const availableMonths = useMemo(() => {
    const keys = availableNotebookMonths(entries)
    return keys.includes(monthKey) ? keys : [monthKey, ...keys]
  }, [entries, monthKey])

  const handleMetrics = useCallback((next: NotebookTextMetrics) => {
    setMetrics((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next)
  }, [])

  useEffect(() => {
    if (pageIndex >= pages.length) {
      const nextIndex = Math.max(0, pages.length - 1)
      pageIndexRef.current = nextIndex
      setPageIndex(nextIndex)
    }
  }, [pageIndex, pages.length])

  const handleFlip = useCallback((index: number) => {
    pageIndexRef.current = index
    setPageIndex((current) => current === index ? current : index)
  }, [])
  const handleFlipState = useCallback((flipping: boolean) => {
    isFlippingRef.current = flipping
    setIsFlipping((current) => current === flipping ? current : flipping)
  }, [])
  const getCurrentPage = useCallback(() => pageIndexRef.current, [])

  const moveMonth = (amount: number) => {
    const next = shiftMonth(monthKey, amount)
    pageIndexRef.current = 0
    isFlippingRef.current = false
    setMonthKey(next)
    setPageIndex(0)
    setIsFlipping(false)
    setSelectedMonths(new Set([next]))
  }

  const turnTo = (nextIndex: number) => {
    const flip = flipBookRef.current
    const currentIndex = pageIndexRef.current
    if (!flip || isFlippingRef.current || flip.getState() !== 'read' || nextIndex === currentIndex || nextIndex < 0 || nextIndex >= pages.length) return
    isFlippingRef.current = true
    setIsFlipping(true)
    if (nextIndex === currentIndex - 1) flip.flipPrev('bottom')
    else if (nextIndex === currentIndex + 1) flip.flipNext('bottom')
    else flip.flip(nextIndex, 'bottom')
    if (flip.getState() === 'read') {
      isFlippingRef.current = false
      setIsFlipping(false)
    }
  }

  const setFlipBook = useCallback((instance: PageFlip | null) => { flipBookRef.current = instance }, [])
  const flipBookKey = useMemo(() => `${monthKey}-${mode}-${theme}-${JSON.stringify(pages)}`, [mode, monthKey, pages, theme])

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
      await exportNotebookZip(entries, keys, longReviews, theme, mode)
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
          <button aria-label="上一页" className="notebook-page-turn previous" disabled={isFlipping || pageIndex === 0} onClick={() => turnTo(pageIndex - 1)} type="button">‹</button>
          <div className="notebook-book">
            {active && <NotebookFlipBook getCurrentPage={getCurrentPage} key={flipBookKey} mode={mode} onFlip={handleFlip} onFlipState={handleFlipState} onMetrics={handleMetrics} onOpenRecord={onOpenRecord} pages={pages} setInstance={setFlipBook} theme={theme} />}
          </div>
          <button aria-label="下一页" className="notebook-page-turn next" disabled={isFlipping || pageIndex === pages.length - 1} onClick={() => turnTo(pageIndex + 1)} type="button">›</button>
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
