import { useEffect, useMemo, useState } from 'react'
import type { MediaRecord } from '../types/media'
import type { LongReviewMap } from '../types/longReview'
import type { NotebookMode, NotebookTheme } from '../types/notebook'
import { availableNotebookMonths, buildNotebookMonth, buildNotebookPages, shiftMonth } from '../lib/notebook'
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

export function MonthlyNotebook({ active, entries, initialMonth, theme, onClose, onOpenRecord, longReviews, longReviewRevision }: MonthlyNotebookProps) {
  const [monthKey, setMonthKey] = useState(initialMonth)
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set([initialMonth]))
  const [showBatch, setShowBatch] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [mode, setMode] = useState<NotebookMode>(() => localStorage.getItem('moon-dust-notebook-mode') === 'night' ? 'night' : 'day')

  useEffect(() => {
    localStorage.setItem('moon-dust-notebook-mode', mode)
  }, [mode])

  useEffect(() => {
    if (!active) return
    setMonthKey(initialMonth)
    setPageIndex(0)
    setSelectedMonths(new Set([initialMonth]))
  }, [active, initialMonth])

  const month = useMemo(() => buildNotebookMonth(entries, monthKey), [entries, monthKey])
  const pages = useMemo(() => buildNotebookPages(month), [month])
  const availableMonths = useMemo(() => {
    const keys = availableNotebookMonths(entries)
    return keys.includes(monthKey) ? keys : [monthKey, ...keys]
  }, [entries, monthKey])

  const moveMonth = (amount: number) => {
    const next = shiftMonth(monthKey, amount)
    setMonthKey(next)
    setPageIndex(0)
    setSelectedMonths(new Set([next]))
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

      <div className="notebook-stage">
        <div className="notebook-page-shell">
          <button aria-label="上一页" className="notebook-page-turn previous" disabled={pageIndex === 0} onClick={() => setPageIndex((value) => value - 1)} type="button">‹</button>
          <NotebookPage longReviewRevision={longReviewRevision} longReviews={longReviews} mode={mode} page={pages[pageIndex]} theme={theme} onOpenRecord={onOpenRecord} />
          <button aria-label="下一页" className="notebook-page-turn next" disabled={pageIndex === pages.length - 1} onClick={() => setPageIndex((value) => value + 1)} type="button">›</button>
        </div>
      </div>

      <div className="notebook-pagination" aria-label="笔记本页码">
        {pages.map((page, index) => <button aria-label={`第 ${page.pageNumber} 页`} className={index === pageIndex ? 'active' : ''} key={page.pageNumber} onClick={() => setPageIndex(index)} type="button" />)}
      </div>
      {exportError && <p className="notebook-export-error">{exportError}</p>}
    </section>
  )
}
