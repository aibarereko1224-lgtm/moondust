import { useEffect, useMemo, useState } from 'react'
import { AuthPanel } from './components/AuthPanel'
import { ParticleCover } from './components/ParticleCover'
import { SceneBackgrounds } from './components/SceneBackgrounds'
import { getMonthName, getSeason, getSeasonName, legacyQuotes, scenes, type MediaKind, type Scene } from './data/legacyUi'
import { useAuth } from './hooks/useAuth'
import { createEntry, deleteEntry, getEntries, updateEntry } from './lib/entries'
import type { MediaRecord, MediaType } from './types/media'
import './App.css'

type Modal = 'auth' | 'search' | 'review' | 'library' | 'detail' | 'export' | null
type ViewMode = 'grid' | 'list'

interface RecordGroup {
  label: string
  season: ReturnType<typeof getSeason>
  records: MediaRecord[]
}

const emptyDraft = {
  title: '',
  poster: '',
  date: new Date().toISOString().slice(0, 10),
  rating: 3,
  review: '',
}

function Stars({ rating }: { rating: number | null }) {
  return <>{Array.from({ length: 5 }, (_, index) => <span className={index >= (rating ?? 0) ? 'empty' : ''} key={index}>★</span>)}</>
}

function groupRecords(records: MediaRecord[]): RecordGroup[] {
  const groups = new Map<string, RecordGroup>()
  records.forEach((record) => {
    const value = record.date ?? record.created_at.slice(0, 10)
    const date = new Date(`${value}T00:00:00`)
    const season = getSeason(value)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const current = groups.get(key)
    if (current) current.records.push(record)
    else groups.set(key, { label: `${getMonthName(date.getMonth())} ${date.getFullYear()}`, season, records: [record] })
  })
  return [...groups.values()]
}

function App() {
  const auth = useAuth()
  const [scene, setScene] = useState<Scene>('forest')
  const [mediaType, setMediaType] = useState<MediaKind>('movie')
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * legacyQuotes.length))
  const [quoteVisible, setQuoteVisible] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [particlesEnabled, setParticlesEnabled] = useState(true)
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const [entries, setEntries] = useState<MediaRecord[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<MediaRecord | null>(null)
  const [filterType, setFilterType] = useState<'all' | MediaType>('all')
  const [filterQuery, setFilterQuery] = useState('')
  const [ratingFilter, setRatingFilter] = useState(0)
  const [draft, setDraft] = useState(emptyDraft)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteVisible(false)
      window.setTimeout(() => {
        setQuoteIndex((current) => (current + 1) % legacyQuotes.length)
        setQuoteVisible(true)
      }, 650)
    }, 7200)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    document.body.dataset.scene = scene
    document.body.dataset.type = mediaType
    document.body.dataset.view = viewMode
    document.body.dataset.particle = String(particlesEnabled)
  }, [scene, mediaType, viewMode, particlesEnabled])

  const refreshEntries = async () => {
    if (!auth.session) {
      setEntries([])
      return
    }
    setEntriesLoading(true)
    setDataError(null)
    try {
      setEntries(await getEntries())
    } catch (error) {
      setDataError(error instanceof Error ? error.message : '读取记录失败。')
    } finally {
      setEntriesLoading(false)
    }
  }

  useEffect(() => {
    void refreshEntries()
  }, [auth.session?.user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleRecords = useMemo(() => entries.filter((record) => {
    const term = filterQuery.trim().toLocaleLowerCase()
    return (filterType === 'all' || record.type === filterType)
      && (record.rating ?? 0) >= ratingFilter
      && (!term || `${record.title} ${record.review}`.toLocaleLowerCase().includes(term))
  }), [entries, filterQuery, filterType, ratingFilter])

  const groups = useMemo(() => groupRecords(visibleRecords), [visibleRecords])
  const currentQuote = legacyQuotes[quoteIndex]
  const closeModal = () => { setModal(null); setDataError(null) }

  const requireLogin = (next: Exclude<Modal, null | 'auth'>) => {
    if (!auth.session) setModal('auth')
    else setModal(next)
  }

  const startCreate = () => {
    if (mediaType === 'tv') {
      setDataError('当前数据库 entries_type_check 不允许 tv。TV 入口保留，但暂时无法保存。')
      setModal('search')
      return
    }
    setSelectedRecord(null)
    setDraft({ ...emptyDraft, title: query })
    requireLogin('review')
  }

  const startEdit = (record: MediaRecord) => {
    setSelectedRecord(record)
    setDraft({
      title: record.title,
      poster: record.poster ?? '',
      date: record.date ?? '',
      rating: record.rating ?? 3,
      review: record.review,
    })
    setModal('review')
  }

  const saveDraft = async (pending: boolean) => {
    if (!auth.session) return
    setSaving(true)
    setDataError(null)
    try {
      const input = {
        type: (selectedRecord?.type ?? mediaType) as MediaType,
        title: draft.title.trim(),
        poster: draft.poster.trim() || null,
        date: draft.date || null,
        rating: draft.rating,
        review: draft.review.trim(),
        pending,
      }
      if (!input.title) throw new Error('请填写作品名称。')
      if (selectedRecord) await updateEntry(selectedRecord.id, input)
      else await createEntry(input)
      await refreshEntries()
      setModal('library')
    } catch (error) {
      setDataError(error instanceof Error ? error.message : '保存记录失败。')
    } finally {
      setSaving(false)
    }
  }

  const removeSelected = async () => {
    if (!selectedRecord || !window.confirm(`删除「${selectedRecord.title}」？`)) return
    setDataError(null)
    try {
      await deleteEntry(selectedRecord.id)
      await refreshEntries()
      setSelectedRecord(null)
      setModal('library')
    } catch (error) {
      setDataError(error instanceof Error ? error.message : '删除记录失败。')
    }
  }

  const downloadExport = () => {
    if (!selectedRecord) return
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1440
    const context = canvas.getContext('2d')
    if (!context) return
    const gradient = context.createLinearGradient(0, 0, 1080, 1440)
    gradient.addColorStop(0, '#18201d')
    gradient.addColorStop(1, '#0c0d10')
    context.fillStyle = gradient
    context.fillRect(0, 0, 1080, 1440)
    context.strokeStyle = 'rgba(201,168,124,.55)'
    context.lineWidth = 2
    context.strokeRect(76, 76, 928, 1288)
    context.fillStyle = '#c9a87c'
    context.font = '28px Georgia'
    context.fillText('MOON DUST', 120, 150)
    context.fillStyle = '#ffffff'
    context.font = '54px Georgia'
    context.fillText(selectedRecord.title, 120, 300)
    context.fillStyle = 'rgba(255,255,255,.55)'
    context.font = '26px Georgia'
    context.fillText(`${selectedRecord.date ?? ''}  ·  ${'★'.repeat(selectedRecord.rating ?? 0)}`, 120, 360)
    context.fillStyle = 'rgba(255,255,255,.82)'
    context.font = '30px serif'
    const lines = selectedRecord.review.match(/.{1,22}/g) ?? []
    lines.forEach((line, index) => context.fillText(line, 120, 510 + index * 58))
    const link = document.createElement('a')
    link.download = `moon-dust-${selectedRecord.id}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="legacy-app">
      <SceneBackgrounds scene={scene} />
      <div className="noise-overlay" aria-hidden="true" />
      <div className="main-container">
        <header className="app-header">
          <div className="header-left"><span className="app-title">MOON DUST</span></div>
          <div className="header-actions">
            <div className="header-right" aria-label="主题切换">{scenes.map((item) => <button className={`scene-btn ${scene === item.id ? 'active' : ''}`} key={item.id} onClick={() => setScene(item.id)} type="button">{item.label}</button>)}</div>
            {auth.loading ? <span className="session-label">···</span> : auth.session ? <div className="session-controls"><span className="session-label">{auth.profile?.username || auth.session.user.email}</span><button className="session-btn" onClick={() => void auth.logout()} type="button">登出</button></div> : <button className="session-btn" onClick={() => setModal('auth')} type="button">登录</button>}
          </div>
        </header>
        <section className="quote-section">
          <div className={`quote-content ${quoteVisible ? 'quote-visible' : 'quote-hidden'}`}><blockquote className="main-quote">“{currentQuote.text}”</blockquote><p className="quote-author">— {currentQuote.author}</p><div className="quote-divider" /></div>
          <div className="entry-container"><div className="glass-card"><div className="type-toggle">{(['movie', 'tv', 'book'] as MediaKind[]).map((type) => <button className={`type-btn ${mediaType === type ? 'active' : ''}`} key={type} onClick={() => setMediaType(type)} type="button">{type === 'movie' ? 'Movie' : type === 'tv' ? 'TV' : 'Book'}</button>)}</div><form className="search-wrapper" onSubmit={(event) => { event.preventDefault(); startCreate() }}><input className="search-input" onChange={(event) => setQuery(event.target.value)} placeholder="记录今天的观看或阅读..." value={query} /><button className="search-btn" type="submit">Root</button></form></div></div>
        </section>
        <section className="library-entrance"><button className="library-btn" onClick={() => requireLogin('library')} type="button"><span className="library-btn-icon">◇</span><span className="library-btn-text">我的库</span><span className="library-btn-count">{auth.session ? entries.length : '—'}</span></button></section>
      </div>

      <div className={`modal-layer ${modal ? 'active' : ''}`} aria-hidden={!modal}>
        <button aria-label="关闭弹层" className="modal-overlay" onClick={closeModal} type="button" />
        <AuthPanel active={modal === 'auth'} configured={auth.configured} error={auth.error} onClose={closeModal} onLogin={auth.login} onRegister={auth.register} />

        <div className={`poster-modal glass-panel ${modal === 'search' ? 'active' : ''}`}><div className="poster-modal-header"><h3 className="poster-modal-title">选择作品</h3><button className="modal-close-btn" onClick={closeModal} type="button">×</button></div><div className="poster-modal-body"><p className="migration-note">{dataError || '搜索将在后续通过 Netlify Function 接入 TMDB。本阶段可以直接填写记录。'}</p><div className="poster-upload-option"><button className="upload-own-btn" disabled={mediaType === 'tv'} onClick={startCreate} type="button"><span className="upload-own-icon">+</span><span>手动填写记录</span></button></div></div></div>

        <div className={`review-modal glass-panel ${modal === 'review' ? 'active' : ''}`}><button className="modal-close-btn review-close-btn" onClick={closeModal} type="button">×</button><div className="review-modal-content"><div className="review-poster-section">{draft.poster ? <img alt={draft.title} className="review-poster-img" src={draft.poster} /> : <div className="review-poster-img poster-placeholder">无封面</div>}</div><div className="review-form-section"><input className="review-title-input" onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} placeholder="作品名称" value={draft.title} /><input className="review-year-input" onChange={(event) => setDraft((value) => ({ ...value, poster: event.target.value }))} placeholder="封面图片 URL (选填)" value={draft.poster} /><input className="review-year-input" onChange={(event) => setDraft((value) => ({ ...value, date: event.target.value }))} type="date" value={draft.date} /><div className="review-rating-section"><div className="star-rating">{Array.from({ length: 5 }, (_, index) => <button className={`star ${index < draft.rating ? 'active' : ''}`} key={index} onClick={() => setDraft((value) => ({ ...value, rating: index + 1 }))} type="button">★</button>)}</div></div><div className="review-textarea-section"><textarea className="review-textarea" onChange={(event) => setDraft((value) => ({ ...value, review: event.target.value }))} placeholder="记录你靠近的宇宙..." value={draft.review} /></div>{dataError && <p className="data-status-error">{dataError}</p>}<div className="review-actions"><button className="review-action-btn abandon" onClick={closeModal} type="button">放弃</button><button className="review-action-btn save-later" disabled={saving} onClick={() => void saveDraft(true)} type="button">先入库稍后写</button><button className="review-action-btn root-btn" disabled={saving} onClick={() => void saveDraft(false)} type="button">{saving ? '保存中…' : 'Root'}</button></div></div></div></div>

        <div className={`library-modal glass-panel ${modal === 'library' ? 'active' : ''}`}><div className="library-modal-header"><div className="library-header-left"><h3 className="library-modal-title">我的库</h3><span className="library-record-count">{entries.length} 条记录</span></div><div className="library-header-right"><button className={`library-action-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode((mode) => mode === 'grid' ? 'list' : 'grid')} title="切换视图" type="button">⊞</button><button className={`library-action-btn ${particlesEnabled ? 'active' : ''}`} onClick={() => setParticlesEnabled((value) => !value)} title="粒子开关" type="button">◆</button><button className="modal-close-btn modal-close-inline" onClick={closeModal} type="button">×</button></div></div><div className="library-filters"><div className="library-filters-inner"><div className="filter-search-wrapper"><input className="filter-search-input" onChange={(event) => setFilterQuery(event.target.value)} placeholder="搜索标题或评论..." value={filterQuery} />{filterQuery && <button className="filter-clear-btn" onClick={() => setFilterQuery('')} type="button">×</button>}</div><div className="filter-type-btns">{(['all', 'movie', 'book'] as const).map((type) => <button className={`filter-type-btn ${filterType === type ? 'active' : ''}`} key={type} onClick={() => setFilterType(type)} type="button">{type === 'all' ? '全部' : type === 'movie' ? '电影' : '书籍'}</button>)}</div><div className="filter-rating-wrapper"><span className="filter-rating-label">星级</span>{[0, 4, 5].map((rating) => <button className={`filter-type-btn ${ratingFilter === rating ? 'active' : ''}`} key={rating} onClick={() => setRatingFilter(rating)} type="button">{rating === 0 ? '全部' : `≥${rating}`}</button>)}</div><span className="filter-result-count"><span>{visibleRecords.length}</span> 条</span></div></div><div className="library-modal-body">{entriesLoading ? <div className="library-empty"><div className="loading-spinner" /><p className="library-empty-text">正在读取记录…</p></div> : dataError ? <div className="library-empty"><p className="library-empty-text">{dataError}</p></div> : groups.length ? groups.map((group) => <section className="library-group" data-season={group.season} key={group.label}><h4 className="library-group-title">{group.label} · {getSeasonName(group.season)}</h4><div className={viewMode === 'grid' ? 'library-records-grid' : 'library-records-list'}>{group.records.map((record) => <article className={`library-record library-record-${viewMode}`} key={record.id} onClick={() => { setSelectedRecord(record); setModal('detail') }}>{viewMode === 'grid' ? record.poster ? <img alt={record.title} className="library-record-poster" src={record.poster} /> : <div className="library-record-poster poster-placeholder">无封面</div> : <>{record.poster ? <img alt={record.title} className="library-record-poster" src={record.poster} /> : <div className="library-record-poster poster-placeholder">无封面</div>}<div className="library-record-info"><h5 className="library-record-title">{record.title}{record.pending ? ' · 待写' : ''}</h5><p className="library-record-meta">{record.date ?? '未设置日期'} · {record.type}</p><div className="library-record-rating"><Stars rating={record.rating} /></div><div className="record-particle-wrapper"><p className="record-comment">{record.review || '（暂无记录）'}</p><ParticleCover enabled={particlesEnabled} onReveal={() => setRevealed((items) => new Set(items).add(record.id))} revealed={revealed.has(record.id)} /></div></div></>}</article>)}</div></section>) : <div className="library-empty"><div className="library-empty-icon">◇</div><p className="library-empty-text">还没有记录</p></div>}</div></div>

        {selectedRecord && <><div className={`detail-modal glass-panel ${modal === 'detail' ? 'active' : ''}`}><button className="modal-close-btn detail-close-btn" onClick={closeModal} type="button">×</button><div className="detail-modal-content"><div className="detail-poster-section">{selectedRecord.poster ? <img alt={selectedRecord.title} className="detail-poster-img" src={selectedRecord.poster} /> : <div className="detail-poster-img poster-placeholder">无封面</div>}</div><div className="detail-info-section"><h3 className="detail-title">{selectedRecord.title}</h3><p className="detail-meta">{selectedRecord.date ?? '未设置日期'} · {selectedRecord.type}</p><div className="detail-rating"><Stars rating={selectedRecord.rating} /></div><div className="detail-comment-section"><p className="detail-comment">{selectedRecord.review || '（暂无记录）'}</p></div>{dataError && <p className="data-status-error">{dataError}</p>}<div className="detail-actions"><button className="detail-action-btn" onClick={() => startEdit(selectedRecord)} type="button">编辑</button><button className="detail-action-btn" onClick={() => setModal('export')} type="button">导出</button><button className="detail-action-btn delete" onClick={() => void removeSelected()} type="button">删除</button></div></div></div></div><div className={`export-panel glass-panel ${modal === 'export' ? 'active' : ''}`}><button className="modal-close-btn" onClick={closeModal} type="button">×</button><div className="export-card-preview"><span>MOON DUST</span><h3>{selectedRecord.title}</h3><p>{selectedRecord.date ?? ''} · {'★'.repeat(selectedRecord.rating ?? 0)}</p><blockquote>{selectedRecord.review}</blockquote></div><div className="export-actions-row"><button className="detail-action-btn" onClick={closeModal} type="button">取消</button><button className="review-action-btn root-btn" onClick={downloadExport} type="button">下载图片</button></div></div></>}
      </div>
    </div>
  )
}

export default App
