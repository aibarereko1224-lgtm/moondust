import { useEffect, useMemo, useState } from 'react'
import { ParticleCover } from './components/ParticleCover'
import { SceneBackgrounds } from './components/SceneBackgrounds'
import {
  getMonthName,
  getSeason,
  getSeasonName,
  legacyQuotes,
  previewRecords,
  scenes,
  type LegacyPreviewRecord,
  type MediaKind,
  type Scene,
} from './data/legacyUi'
import './App.css'

type Modal = 'search' | 'review' | 'library' | 'detail' | 'export' | null
type ViewMode = 'grid' | 'list'

interface RecordGroup {
  label: string
  season: ReturnType<typeof getSeason>
  records: LegacyPreviewRecord[]
}

function Stars({ rating }: { rating: number }) {
  return <>{Array.from({ length: 5 }, (_, index) => <span className={index >= rating ? 'empty' : ''} key={index}>★</span>)}</>
}

function groupRecords(records: LegacyPreviewRecord[]): RecordGroup[] {
  const groups = new Map<string, RecordGroup>()
  records.forEach((record) => {
    const date = new Date(`${record.date}T00:00:00`)
    const season = getSeason(record.date)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const current = groups.get(key)
    if (current) current.records.push(record)
    else groups.set(key, { label: `${getMonthName(date.getMonth())} ${date.getFullYear()}`, season, records: [record] })
  })
  return [...groups.values()]
}

function App() {
  const [scene, setScene] = useState<Scene>('forest')
  const [mediaType, setMediaType] = useState<MediaKind>('movie')
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * legacyQuotes.length))
  const [quoteVisible, setQuoteVisible] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [particlesEnabled, setParticlesEnabled] = useState(true)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [selectedRecord, setSelectedRecord] = useState<LegacyPreviewRecord>(previewRecords[0])
  const [filterType, setFilterType] = useState<'all' | MediaKind>('all')
  const [filterQuery, setFilterQuery] = useState('')
  const [ratingFilter, setRatingFilter] = useState(0)
  const [draftRating, setDraftRating] = useState(3)

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

  const visibleRecords = useMemo(() => previewRecords.filter((record) => {
    const term = filterQuery.trim().toLocaleLowerCase()
    return (filterType === 'all' || record.type === filterType)
      && record.rating >= ratingFilter
      && (!term || `${record.title} ${record.review}`.toLocaleLowerCase().includes(term))
  }), [filterQuery, filterType, ratingFilter])

  const groups = useMemo(() => groupRecords(visibleRecords), [visibleRecords])
  const currentQuote = legacyQuotes[quoteIndex]
  const closeModal = () => setModal(null)
  const openDetail = (record: LegacyPreviewRecord) => { setSelectedRecord(record); setModal('detail') }
  const exportRecord = (record: LegacyPreviewRecord) => { setSelectedRecord(record); setModal('export') }

  const downloadExport = () => {
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
    context.fillText(`${selectedRecord.date}  ·  ${'★'.repeat(selectedRecord.rating)}`, 120, 360)
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
          <div className="header-right" aria-label="主题切换">
            {scenes.map((item) => <button className={`scene-btn ${scene === item.id ? 'active' : ''}`} data-scene={item.id} key={item.id} onClick={() => setScene(item.id)} type="button">{item.label}</button>)}
          </div>
        </header>
        <section className="quote-section" id="quoteSection">
          <div className={`quote-content ${quoteVisible ? 'quote-visible' : 'quote-hidden'}`}>
            <blockquote className="main-quote">“{currentQuote.text}”</blockquote>
            <p className="quote-author">— {currentQuote.author}</p>
            <div className="quote-divider" />
          </div>
          <div className="entry-container"><div className="glass-card">
            <div className="type-toggle">
              {(['movie', 'tv', 'book'] as MediaKind[]).map((type) => <button className={`type-btn ${mediaType === type ? 'active' : ''}`} data-type={type} key={type} onClick={() => setMediaType(type)} type="button">{type === 'movie' ? 'Movie' : type === 'tv' ? 'TV' : 'Book'}</button>)}
            </div>
            <form className="search-wrapper" onSubmit={(event) => { event.preventDefault(); setModal('search') }}>
              <input className="search-input" onChange={(event) => setQuery(event.target.value)} placeholder="记录今天的观看或阅读..." value={query} />
              <button className="search-btn" type="submit">Search</button>
            </form>
          </div></div>
        </section>
        <section className="library-entrance">
          <button className="library-btn" onClick={() => setModal('library')} type="button"><span className="library-btn-icon">◇</span><span className="library-btn-text">我的库</span><span className="library-btn-count">{previewRecords.length}</span></button>
        </section>
      </div>

      <div className={`modal-layer ${modal ? 'active' : ''}`} aria-hidden={!modal}>
        <button aria-label="关闭弹层" className="modal-overlay" onClick={closeModal} type="button" />
        <div className={`poster-modal glass-panel ${modal === 'search' ? 'active' : ''}`}>
          <div className="poster-modal-header"><h3 className="poster-modal-title">选择作品</h3><button className="modal-close-btn" onClick={closeModal} type="button">×</button></div>
          <div className="poster-modal-body">
            <p className="migration-note">V2 的真实搜索将在 Netlify Function 接入 TMDB 后启用。</p>
            <div className="poster-grid">
              {previewRecords.filter((record) => mediaType === 'tv' || record.type === mediaType).map((record) => <button className="poster-item" key={record.id} onClick={() => { setSelectedRecord(record); setModal('review') }} type="button"><img alt={record.title} className="poster-item-img" src={record.poster} /><span className="poster-item-info"><span className="poster-item-title">{record.title}</span></span></button>)}
            </div>
            <div className="poster-upload-option"><button className="upload-own-btn" onClick={() => setModal('review')} type="button"><span className="upload-own-icon">+</span><span>没找到？自己上传</span></button></div>
          </div>
        </div>

        <div className={`review-modal glass-panel ${modal === 'review' ? 'active' : ''}`}>
          <button className="modal-close-btn review-close-btn" onClick={closeModal} type="button">×</button>
          <div className="review-modal-content">
            <div className="review-poster-section"><img alt={selectedRecord.title} className="review-poster-img" src={selectedRecord.poster} /><button className="upload-poster-btn" type="button"><span className="upload-icon">+</span><span className="upload-text">上传封面</span></button></div>
            <div className="review-form-section">
              <input className="review-title-input" defaultValue={selectedRecord.title} placeholder="作品名称" /><input className="review-year-input" defaultValue={selectedRecord.year} placeholder="年份 (选填)" />
              <div className="review-rating-section"><div className="star-rating">{Array.from({ length: 5 }, (_, index) => <button className={`star ${index < draftRating ? 'active' : ''}`} key={index} onClick={() => setDraftRating(index + 1)} type="button">★</button>)}</div></div>
              <div className="review-textarea-section"><textarea className="review-textarea" defaultValue={selectedRecord.review} placeholder="记录你靠近的宇宙..." /></div>
              <div className="review-actions"><button className="review-action-btn abandon" onClick={closeModal} type="button">放弃</button><button className="review-action-btn save-later" onClick={closeModal} type="button">先入库稍后写</button><button className="review-action-btn root-btn" onClick={closeModal} type="button">Root</button></div>
            </div>
          </div>
        </div>

        <div className={`library-modal glass-panel ${modal === 'library' ? 'active' : ''}`}>
          <div className="library-modal-header"><div className="library-header-left"><h3 className="library-modal-title">我的库</h3><span className="library-record-count">{previewRecords.length} 条记录</span></div><div className="library-header-right"><button className={`library-action-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode((mode) => mode === 'grid' ? 'list' : 'grid')} title="切换视图" type="button">⊞</button><button className={`library-action-btn ${particlesEnabled ? 'active' : ''}`} onClick={() => setParticlesEnabled((value) => !value)} title="粒子开关" type="button">◆</button><button className="library-action-btn" onClick={() => exportRecord(visibleRecords[0] ?? previewRecords[0])} title="导出卡片" type="button">✧</button><button className="modal-close-btn modal-close-inline" onClick={closeModal} type="button">×</button></div></div>
          <div className="library-filters"><div className="library-filters-inner">
            <div className="filter-search-wrapper"><input className="filter-search-input" onChange={(event) => setFilterQuery(event.target.value)} placeholder="搜索标题或评论..." value={filterQuery} />{filterQuery && <button className="filter-clear-btn" onClick={() => setFilterQuery('')} type="button">×</button>}</div>
            <div className="filter-type-btns">{(['all', 'movie', 'tv', 'book'] as const).map((type) => <button className={`filter-type-btn ${filterType === type ? 'active' : ''}`} key={type} onClick={() => setFilterType(type)} type="button">{type === 'all' ? '全部' : type === 'movie' ? '电影' : type === 'tv' ? '剧集' : '书籍'}</button>)}</div>
            <div className="filter-rating-wrapper"><span className="filter-rating-label">星级</span>{[0, 4, 5].map((rating) => <button className={`filter-type-btn ${ratingFilter === rating ? 'active' : ''}`} key={rating} onClick={() => setRatingFilter(rating)} type="button">{rating === 0 ? '全部' : `≥${rating}`}</button>)}</div><span className="filter-result-count"><span>{visibleRecords.length}</span> 条</span>
          </div></div>
          <div className="library-modal-body">
            {groups.length ? groups.map((group) => <section className="library-group" data-season={group.season} key={group.label}><h4 className="library-group-title">{group.label} · {getSeasonName(group.season)}</h4><div className={viewMode === 'grid' ? 'library-records-grid' : 'library-records-list'}>{group.records.map((record) => <article className={`library-record library-record-${viewMode}`} key={record.id} onClick={() => openDetail(record)}>{viewMode === 'grid' ? <img alt={record.title} className="library-record-poster" src={record.poster} /> : <><img alt={record.title} className="library-record-poster" src={record.poster} /><div className="library-record-info"><h5 className="library-record-title">{record.title}</h5><p className="library-record-meta">{record.date} · {record.type}</p><div className="library-record-rating"><Stars rating={record.rating} /></div><div className="record-particle-wrapper"><p className="record-comment">{record.review}</p><ParticleCover enabled={particlesEnabled} onReveal={() => setRevealed((items) => new Set(items).add(record.id))} revealed={revealed.has(record.id)} /></div></div></>}</article>)}</div></section>) : <div className="library-empty"><div className="library-empty-icon">◇</div><p className="library-empty-text">没有找到记录</p></div>}
          </div>
        </div>

        <div className={`detail-modal glass-panel ${modal === 'detail' ? 'active' : ''}`}><button className="modal-close-btn detail-close-btn" onClick={closeModal} type="button">×</button><div className="detail-modal-content"><div className="detail-poster-section"><img alt={selectedRecord.title} className="detail-poster-img" src={selectedRecord.poster} /></div><div className="detail-info-section"><h3 className="detail-title">{selectedRecord.title}</h3><p className="detail-meta">{selectedRecord.date} · {selectedRecord.type} · {selectedRecord.year}</p><div className="detail-rating"><Stars rating={selectedRecord.rating} /></div><div className="detail-comment-section"><p className="detail-comment">{selectedRecord.review}</p></div><div className="detail-actions"><button className="detail-action-btn" onClick={() => setModal('review')} type="button">编辑</button><button className="detail-action-btn" onClick={() => exportRecord(selectedRecord)} type="button">导出</button><button className="detail-action-btn delete" type="button">删除</button></div></div></div></div>

        <div className={`export-panel glass-panel ${modal === 'export' ? 'active' : ''}`}><button className="modal-close-btn" onClick={closeModal} type="button">×</button><div className="export-card-preview"><span>MOON DUST</span><h3>{selectedRecord.title}</h3><p>{selectedRecord.date} · {'★'.repeat(selectedRecord.rating)}</p><blockquote>{selectedRecord.review}</blockquote></div><div className="export-actions-row"><button className="detail-action-btn" onClick={closeModal} type="button">取消</button><button className="review-action-btn root-btn" onClick={downloadExport} type="button">下载图片</button></div></div>
      </div>
    </div>
  )
}

export default App
