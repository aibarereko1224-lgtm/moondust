import JSZip from 'jszip'
import type { MediaRecord } from '../types/media'
import type { LongReviewMap } from '../types/longReview'
import type { NotebookMode, NotebookReadingPage, NotebookTheme } from '../types/notebook'
import { buildNotebookMonth, recordDate } from './notebook'
import { buildNotebookReadingPages, type NotebookTextMetrics } from './notebookPagination'

const WIDTH = 1200
const HEIGHT = 1600
const PAPER_X = 72
const PAPER_Y = 48
const CONTENT_LEFT = 142
const CONTENT_RIGHT = 1092
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT
const BODY_FONT = '"LXGW WenKai", "Noto Sans SC", "Microsoft YaHei", sans-serif'
const DISPLAY_FONT = '"Playfair Display", Georgia, serif'
const SERIF_FONT = '"Noto Serif SC", "PT Serif", Georgia, serif'

const exportMetrics: NotebookTextMetrics = {
  width: CONTENT_WIDTH,
  firstPageHeight: 620,
  continuationHeight: 1080,
  font: `300 28px ${BODY_FONT}`,
  fontSize: 28,
  lineHeight: 56,
  letterSpacing: 0.7,
}

const dayThemes: Record<NotebookTheme, { paper: string; light: string; ink: string; muted: string; accent: string; line: string; stage: string }> = {
  forest: { paper: '#eeeae2', light: '#f4f0e8', ink: '#41423d', muted: '#777870', accent: '#607b68', line: '#b9b8ae', stage: '#c9cac4' },
  stream: { paper: '#ececeb', light: '#f5f3ed', ink: '#29363b', muted: '#69767b', accent: '#587987', line: '#a6b8bd', stage: '#c8cccd' },
  desert: { paper: '#f0e7d8', light: '#f7efe3', ink: '#3d342d', muted: '#7e7064', accent: '#9a7657', line: '#c3ac91', stage: '#d0c9bd' },
  starry: { paper: '#e8e7e5', light: '#f2f0ec', ink: '#2e2e3c', muted: '#707080', accent: '#686b91', line: '#adaec1', stage: '#c8c8cc' },
}

const nightAccents: Record<NotebookTheme, string> = { forest: '#93ad99', stream: '#91b4c0', desert: '#c6a27f', starry: '#aaaed8' }

function paletteFor(theme: NotebookTheme, mode: NotebookMode) {
  if (mode === 'day') return dayThemes[theme]
  return { paper: '#282a2d', light: '#303236', ink: '#d2cfc8', muted: '#92918e', accent: nightAccents[theme], line: '#4c4e50', stage: '#1b1e22' }
}

function setFont(context: CanvasRenderingContext2D, font: string, color: string, align: CanvasTextAlign = 'left') {
  context.font = font
  context.fillStyle = color
  context.textAlign = align
  context.textBaseline = 'alphabetic'
}

function drawTextLines(context: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number) {
  lines.forEach((line, index) => context.fillText(line || ' ', x, y + index * lineHeight))
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  let line = ''
  for (const character of [...text]) {
    if (character === '\n') { lines.push(line); line = ''; continue }
    if (line && context.measureText(line + character).width > maxWidth) { lines.push(line); line = character }
    else line += character
  }
  if (line || !lines.length) lines.push(line)
  return lines
}

function proxyUrl(source: string) {
  return `/.netlify/functions/poster-image?url=${encodeURIComponent(source)}`
}

async function fetchBitmap(source: string) {
  const response = await fetch(source, { headers: { Accept: 'image/*' } })
  if (!response.ok) throw new Error('image fetch failed')
  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) throw new Error('invalid image')
  return createImageBitmap(blob)
}

async function loadImage(source: string | null) {
  if (!source) return null
  try {
    return await fetchBitmap(source)
  } catch {
    try {
      return await fetchBitmap(proxyUrl(source))
    } catch {
      return null
    }
  }
}

function drawImageCover(context: CanvasRenderingContext2D, image: ImageBitmap, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  context.save()
  context.beginPath()
  context.rect(x, y, width, height)
  context.clip()
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
  context.restore()
}

function drawImagePlaceholder(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, muted: string, line: string) {
  context.fillStyle = line
  context.globalAlpha = 0.22
  context.fillRect(x, y, width, height)
  context.globalAlpha = 1
  setFont(context, `16px ${DISPLAY_FONT}`, muted, 'center')
  context.fillText('NO IMAGE', x + width / 2, y + height / 2)
}

function drawPaper(context: CanvasRenderingContext2D, page: NotebookReadingPage, theme: NotebookTheme, mode: NotebookMode) {
  const palette = paletteFor(theme, mode)
  context.fillStyle = palette.stage
  context.fillRect(0, 0, WIDTH, HEIGHT)
  const gradient = context.createLinearGradient(PAPER_X, 0, WIDTH - PAPER_X, 0)
  gradient.addColorStop(0, palette.paper)
  gradient.addColorStop(0.52, palette.light)
  gradient.addColorStop(1, palette.paper)
  context.shadowColor = 'rgba(0,0,0,.25)'
  context.shadowBlur = 36
  context.shadowOffsetY = 16
  context.fillStyle = gradient
  context.fillRect(PAPER_X, PAPER_Y, WIDTH - PAPER_X * 2, HEIGHT - PAPER_Y * 2)
  context.shadowColor = 'transparent'
  context.strokeStyle = palette.accent
  context.globalAlpha = 0.17
  context.strokeRect(PAPER_X + 25, PAPER_Y + 25, WIDTH - (PAPER_X + 25) * 2, HEIGHT - (PAPER_Y + 25) * 2)
  context.globalAlpha = 1
  if (page.kind === 'cover') return
  setFont(context, `18px ${DISPLAY_FONT}`, palette.muted)
  context.fillText('MOON DUST · MONTHLY NOTEBOOK', CONTENT_LEFT, 118)
  context.textAlign = 'right'
  context.fillText(`${page.month.year} / ${String(page.month.month).padStart(2, '0')}`, CONTENT_RIGHT, 118)
  context.strokeStyle = palette.line
  context.globalAlpha = 0.55
  context.beginPath(); context.moveTo(CONTENT_LEFT, 142); context.lineTo(CONTENT_RIGHT, 142); context.stroke()
  context.globalAlpha = 1
  setFont(context, `17px ${DISPLAY_FONT}`, palette.muted)
  context.fillText('Moon Dust Notebook', CONTENT_LEFT, 1510)
  context.textAlign = 'right'
  context.fillText(String(page.pageNumber).padStart(2, '0'), CONTENT_RIGHT, 1510)
}

function drawCover(context: CanvasRenderingContext2D, page: Extract<NotebookReadingPage, { kind: 'cover' }>, theme: NotebookTheme, mode: NotebookMode) {
  const palette = paletteFor(theme, mode)
  setFont(context, `400 25px ${DISPLAY_FONT}`, palette.ink)
  context.fillText('MOON DUST', 190, 650)
  setFont(context, `300 68px ${SERIF_FONT}`, palette.muted)
  const monthName = page.month.monthName.slice(0, 1) + page.month.monthName.slice(1).toLowerCase()
  context.fillText(`${monthName} ${page.month.year}`, 190, 740)
  setFont(context, `300 27px ${SERIF_FONT}`, palette.ink)
  context.globalAlpha = 0.68
  context.fillText('记录你靠近的宇宙。', 190, 825)
  context.globalAlpha = 1
}

function drawIntro(context: CanvasRenderingContext2D, page: Extract<NotebookReadingPage, { kind: 'intro' }>, theme: NotebookTheme, mode: NotebookMode) {
  const palette = paletteFor(theme, mode)
  const { month } = page
  const days = new Date(month.year, month.month, 0).getDate()
  const leading = (new Date(month.year, month.month - 1, 1).getDay() + 6) % 7
  const recordedDays = new Set(month.records.map((record) => Number(recordDate(record).slice(8, 10))))
  const prettyMonth = month.monthName.slice(0, 1) + month.monthName.slice(1).toLowerCase()
  setFont(context, `italic 400 52px ${SERIF_FONT}`, palette.ink)
  context.fillText(`My ${prettyMonth}`, CONTENT_LEFT, 245)
  setFont(context, `18px ${DISPLAY_FONT}`, palette.muted)
  context.fillText(`MONTH — ${month.monthName}`, CONTENT_LEFT, 282)
  const boxY = 340
  context.strokeStyle = palette.accent
  context.globalAlpha = 0.2
  context.strokeRect(CONTENT_LEFT, boxY, CONTENT_WIDTH, 710)
  context.globalAlpha = 1
  setFont(context, `22px ${DISPLAY_FONT}`, palette.ink)
  context.fillText(month.monthName, CONTENT_LEFT + 55, boxY + 70)
  setFont(context, `19px ${DISPLAY_FONT}`, palette.muted, 'right')
  context.fillText(String(month.year), CONTENT_RIGHT - 55, boxY + 70)
  const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  const cellWidth = (CONTENT_WIDTH - 100) / 7
  setFont(context, `14px ${DISPLAY_FONT}`, palette.muted, 'center')
  weekdays.forEach((day, index) => context.fillText(day, CONTENT_LEFT + 50 + cellWidth * (index + 0.5), boxY + 145))
  setFont(context, `23px ${BODY_FONT}`, palette.ink, 'center')
  for (let day = 1; day <= days; day += 1) {
    const position = leading + day - 1
    const column = position % 7
    const row = Math.floor(position / 7)
    const x = CONTENT_LEFT + 50 + cellWidth * (column + 0.5)
    const y = boxY + 225 + row * 82
    context.fillText(String(day), x, y)
    if (recordedDays.has(day)) {
      setFont(context, `18px ${SERIF_FONT}`, palette.accent, 'center')
      context.fillText('☾', x, y + 26)
      setFont(context, `23px ${BODY_FONT}`, palette.ink, 'center')
    }
  }
  setFont(context, `22px ${BODY_FONT}`, palette.muted)
  context.fillText(`这个月记录了 ${recordedDays.size} 天`, CONTENT_LEFT, 1175)
  context.fillText(`留下了 ${month.stats.total} 个故事`, CONTENT_LEFT + 330, 1175)
  setFont(context, `24px ${SERIF_FONT}`, palette.accent, 'center')
  context.strokeStyle = palette.accent
  context.globalAlpha = 0.42
  context.beginPath(); context.arc(WIDTH / 2, 1290, 42, 0, Math.PI * 2); context.stroke()
  context.fillText('◐', WIDTH / 2, 1298)
  context.globalAlpha = 1
}

async function drawGallery(context: CanvasRenderingContext2D, page: Extract<NotebookReadingPage, { kind: 'gallery' }>, theme: NotebookTheme, mode: NotebookMode) {
  const palette = paletteFor(theme, mode)
  setFont(context, `300 31px ${SERIF_FONT}`, palette.ink)
  context.fillText('本月看过的电影', CONTENT_LEFT, 235)
  setFont(context, `16px ${DISPLAY_FONT}`, palette.muted, 'right')
  context.fillText(`${page.month.monthName} · ${page.records.length} stories`, CONTENT_RIGHT, 235)
  context.strokeStyle = palette.accent
  context.globalAlpha = 0.2
  context.beginPath(); context.moveTo(CONTENT_LEFT, 270); context.lineTo(CONTENT_RIGHT, 270); context.stroke()
  context.globalAlpha = 1
  if (!page.records.length) {
    setFont(context, `24px ${BODY_FONT}`, palette.muted, 'center')
    context.fillText('这个月还没有留下电影。', WIDTH / 2, 720)
    return
  }
  const columns = Math.min(7, Math.max(3, Math.ceil(Math.sqrt(page.records.length * 1.6))))
  const rows = Math.ceil(page.records.length / columns)
  const gapX = 28
  const gapY = 34
  const posterWidth = (CONTENT_WIDTH - gapX * (columns - 1)) / columns
  const availableHeight = 1125
  const posterHeight = Math.min(posterWidth * 1.5, (availableHeight - gapY * (rows - 1)) / rows)
  const images = await Promise.all(page.records.map((record) => loadImage(record.poster)))
  page.records.forEach((_, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const x = CONTENT_LEFT + column * (posterWidth + gapX)
    const offset = column === 1 || column === 4 ? 22 : column === 2 ? -8 : 0
    const y = 320 + row * (posterHeight + gapY) + offset
    const image = images[index]
    if (image) drawImageCover(context, image, x, y, posterWidth, posterHeight)
    else drawImagePlaceholder(context, x, y, posterWidth, posterHeight, palette.muted, palette.line)
  })
  images.forEach((image) => image?.close())
}

function ratingText(rating: number | null) {
  return Array.from({ length: 5 }, (_, index) => rating && index < rating ? '★' : '☆').join(' ')
}

async function drawStory(context: CanvasRenderingContext2D, page: Extract<NotebookReadingPage, { kind: 'story' }>, theme: NotebookTheme, mode: NotebookMode) {
  const palette = paletteFor(theme, mode)
  let copyY = 255
  if (!page.continuation) {
    const posterX = CONTENT_LEFT
    const posterY = 215
    const posterWidth = 190
    const posterHeight = 285
    const image = await loadImage(page.record.poster)
    if (image) { drawImageCover(context, image, posterX, posterY, posterWidth, posterHeight); image.close() }
    else drawImagePlaceholder(context, posterX, posterY, posterWidth, posterHeight, palette.muted, palette.line)
    const metaX = posterX + posterWidth + 55
    setFont(context, `300 31px ${BODY_FONT}`, palette.ink)
    drawTextLines(context, wrapText(context, `《${page.record.title}》`, CONTENT_RIGHT - metaX).slice(0, 3), metaX, 270, 52)
    setFont(context, `23px Georgia, serif`, palette.accent)
    context.fillText(ratingText(page.record.rating), metaX, 430)
    setFont(context, `18px ${BODY_FONT}`, palette.muted)
    context.fillText(recordDate(page.record).replaceAll('-', '.'), metaX, 475)
    context.strokeStyle = palette.accent
    context.globalAlpha = 0.18
    context.beginPath(); context.moveTo(CONTENT_LEFT, 540); context.lineTo(CONTENT_RIGHT, 540); context.stroke()
    context.globalAlpha = 1
    copyY = 610
  } else {
    setFont(context, `18px ${BODY_FONT}`, palette.muted)
    context.fillText(`《${page.record.title}》 · 续`, CONTENT_LEFT, 220)
    copyY = 285
  }
  setFont(context, exportMetrics.font, palette.ink)
  drawTextLines(context, page.lines, CONTENT_LEFT, copyY, exportMetrics.lineHeight)
}

async function renderPage(page: NotebookReadingPage, theme: NotebookTheme, mode: NotebookMode) {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法生成 Notebook 图片。')
  drawPaper(context, page, theme, mode)
  if (page.kind === 'cover') drawCover(context, page, theme, mode)
  else if (page.kind === 'intro') drawIntro(context, page, theme, mode)
  else if (page.kind === 'gallery') await drawGallery(context, page, theme, mode)
  else await drawStory(context, page, theme, mode)
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Notebook 图片生成失败。')), 'image/png'))
}

export async function createNotebookZip(entries: MediaRecord[], monthKeys: string[], longReviews: LongReviewMap, theme: NotebookTheme, mode: NotebookMode = 'day') {
  await Promise.allSettled([
    document.fonts?.load(`28px ${BODY_FONT}`),
    document.fonts?.load(`31px ${SERIF_FONT}`),
    document.fonts?.load(`25px ${DISPLAY_FONT}`),
  ])
  const zip = new JSZip()
  for (const key of monthKeys) {
    const pages = buildNotebookReadingPages(buildNotebookMonth(entries, key), longReviews, exportMetrics)
    for (const page of pages) {
      zip.file(`MoonDust_${key}_${String(page.pageNumber).padStart(2, '0')}.png`, await renderPage(page, theme, mode))
    }
  }
  const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  const years = [...new Set(monthKeys.map((key) => key.slice(0, 4)))]
  const name = monthKeys.length === 1 ? `MoonDust_${monthKeys[0]}.zip` : `MoonDust_Notebooks_${years.length === 1 ? years[0] : 'Archive'}.zip`
  return { archive, name }
}

export async function exportNotebookZip(entries: MediaRecord[], monthKeys: string[], longReviews: LongReviewMap, theme: NotebookTheme, mode: NotebookMode = 'day') {
  const { archive, name } = await createNotebookZip(entries, monthKeys, longReviews, theme, mode)
  const link = document.createElement('a')
  link.download = name
  link.href = URL.createObjectURL(archive)
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
