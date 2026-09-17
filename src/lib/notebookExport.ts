import JSZip from 'jszip'
import type { MediaRecord } from '../types/media'
import { type NotebookMode, type NotebookPage, type NotebookTheme } from '../types/notebook'
import { buildNotebookMonth, buildNotebookPages } from './notebook'

const PAGE_WIDTH = 1200
const PAGE_HEIGHT = 1600
const PAGE_MARGIN = 92
const CONTENT_LEFT = 142
const CONTENT_RIGHT = PAGE_WIDTH - 108

const themes: Record<NotebookTheme, { paper: string; shade: string; ink: string; muted: string; accent: string; line: string }> = {
  forest: { paper: '#eee9db', shade: '#d9dfd3', ink: '#28332d', muted: '#6d756f', accent: '#607b68', line: '#a9b6a8' },
  stream: { paper: '#ececeb', shade: '#d8e2e5', ink: '#29363b', muted: '#69767b', accent: '#587987', line: '#a6b8bd' },
  desert: { paper: '#f0e7d8', shade: '#e1d1bb', ink: '#3d342d', muted: '#7e7064', accent: '#9a7657', line: '#c3ac91' },
  starry: { paper: '#e8e7e5', shade: '#d7d7df', ink: '#2e2e3c', muted: '#707080', accent: '#686b91', line: '#adaec1' },
}

const nightThemes: Record<NotebookTheme, { accent: string }> = {
  forest: { accent: '#93ad99' },
  stream: { accent: '#91b4c0' },
  desert: { accent: '#c6a27f' },
  starry: { accent: '#aaaed8' },
}

const typographyC = {
  font: '"Noto Sans SC", "Microsoft YaHei", sans-serif',
  size: 34,
  lineHeight: 68,
  letterSpacing: '0.85px',
  weight: 300,
  color: '#41423d',
}

function paletteFor(theme: NotebookTheme, mode: NotebookMode) {
  if (mode === 'day') return themes[theme]
  return { paper: '#202326', shade: '#141617', ink: '#e2ddd3', muted: '#aaa69f', line: '#55595a', accent: nightThemes[theme].accent }
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  let line = ''
  for (const character of [...text.replace(/\s+/g, ' ').trim()]) {
    const next = line + character
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line.trimEnd())
      line = character.trimStart()
    } else {
      line = next
    }
  }
  if (line) lines.push(line.trimEnd())
  return lines
}

function fitLines(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const lines = wrapText(context, text, maxWidth)
  if (lines.length <= maxLines) return lines
  const visible = lines.slice(0, maxLines)
  let last = visible[maxLines - 1]
  while (last && context.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1)
  visible[maxLines - 1] = `${last}…`
  return visible
}

function drawLines(context: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number) {
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight))
}

async function loadImage(source: string | null) {
  if (!source) return null
  try {
    const response = await fetch(source)
    if (!response.ok) return null
    const blob = await response.blob()
    return await createImageBitmap(blob)
  } catch {
    return null
  }
}

function drawPaper(context: CanvasRenderingContext2D, theme: NotebookTheme, mode: NotebookMode, page: NotebookPage) {
  const palette = paletteFor(theme, mode)
  context.fillStyle = palette.shade
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)

  const paperGradient = context.createLinearGradient(PAGE_MARGIN, 0, PAGE_WIDTH - PAGE_MARGIN, 0)
  paperGradient.addColorStop(0, palette.paper)
  paperGradient.addColorStop(0.5, mode === 'night' ? '#292d30' : '#f7f2e8')
  paperGradient.addColorStop(1, palette.paper)
  context.fillStyle = paperGradient
  context.shadowColor = 'rgba(26, 24, 21, .18)'
  context.shadowBlur = 32
  context.shadowOffsetY = 14
  context.fillRect(PAGE_MARGIN, 58, PAGE_WIDTH - PAGE_MARGIN * 2, PAGE_HEIGHT - 116)
  context.shadowColor = 'transparent'

  context.fillStyle = 'rgba(255,255,255,.16)'
  for (let y = 72; y < PAGE_HEIGHT - 72; y += 19) context.fillRect(PAGE_MARGIN + 2, y, PAGE_WIDTH - PAGE_MARGIN * 2 - 4, 1)

  context.strokeStyle = palette.line
  context.globalAlpha = 0.58
  context.lineWidth = 1.5
  context.strokeRect(PAGE_MARGIN + 24, 82, PAGE_WIDTH - (PAGE_MARGIN + 24) * 2, PAGE_HEIGHT - 164)
  context.globalAlpha = 1

  context.fillStyle = 'rgba(40,35,30,.09)'
  context.fillRect(112, 82, 2, PAGE_HEIGHT - 164)
  context.fillRect(121, 82, 1, PAGE_HEIGHT - 164)

  context.fillStyle = palette.muted
  context.font = '19px "PT Serif", Georgia, serif'
  context.letterSpacing = '2px'
  context.fillText('MOON DUST · MONTHLY NOTEBOOK', CONTENT_LEFT, 132)
  context.textAlign = 'right'
  context.fillText(`${page.month.year} / ${String(page.month.month).padStart(2, '0')}`, CONTENT_RIGHT, 132)
  context.textAlign = 'left'
  context.letterSpacing = '0px'

  context.strokeStyle = palette.line
  context.globalAlpha = 0.55
  context.beginPath()
  context.moveTo(CONTENT_LEFT, 154)
  context.lineTo(CONTENT_RIGHT, 154)
  context.stroke()
  context.globalAlpha = 1

  context.fillStyle = palette.muted
  context.font = '18px "PT Serif", Georgia, serif'
  context.fillText('Moon Dust Notebook', CONTENT_LEFT, 1510)
  context.textAlign = 'right'
  context.fillText(String(page.pageNumber).padStart(2, '0'), CONTENT_RIGHT, 1510)
  context.textAlign = 'left'
}

function drawCover(context: CanvasRenderingContext2D, page: Extract<NotebookPage, { kind: 'cover' }>, theme: NotebookTheme, mode: NotebookMode) {
  const palette = paletteFor(theme, mode)
  const { month } = page
  context.fillStyle = palette.accent
  context.font = `300 220px ${typographyC.font}`
  context.fillText(String(month.month).padStart(2, '0'), CONTENT_LEFT, 520)

  context.fillStyle = palette.ink
  context.font = '46px "PT Serif", Georgia, serif'
  context.letterSpacing = '7px'
  context.fillText(month.monthName, CONTENT_LEFT + 12, 600)
  context.letterSpacing = '0px'
  context.font = '31px "PT Serif", Georgia, serif'
  context.fillStyle = palette.muted
  context.fillText(String(month.year), CONTENT_LEFT + 12, 650)

  context.font = `${typographyC.weight} 28px ${typographyC.font}`
  context.letterSpacing = typographyC.letterSpacing
  context.fillStyle = mode === 'day' ? typographyC.color : palette.ink
  context.fillText('记录你靠近的宇宙。', CONTENT_LEFT + 12, 850)
  context.letterSpacing = '0px'
}

async function drawRecord(context: CanvasRenderingContext2D, record: MediaRecord, index: number, theme: NotebookTheme, mode: NotebookMode) {
  const palette = paletteFor(theme, mode)
  const top = 214 + index * 620
  const height = 548
  context.strokeStyle = palette.line
  context.globalAlpha = 0.56
  context.beginPath()
  context.moveTo(CONTENT_LEFT, top + height)
  context.lineTo(CONTENT_RIGHT, top + height)
  context.stroke()
  context.globalAlpha = 1

  const posterX = CONTENT_LEFT
  const posterY = top + 14
  const posterWidth = 208
  const posterHeight = 302
  const image = await loadImage(record.poster)
  context.save()
  roundedRect(context, posterX, posterY, posterWidth, posterHeight, 0)
  context.clip()
  if (image) {
    const scale = Math.max(posterWidth / image.width, posterHeight / image.height)
    const width = image.width * scale
    const heightValue = image.height * scale
    context.drawImage(image, posterX + (posterWidth - width) / 2, posterY + (posterHeight - heightValue) / 2, width, heightValue)
    image.close()
  } else {
    context.fillStyle = palette.shade
    context.fillRect(posterX, posterY, posterWidth, posterHeight)
    context.fillStyle = palette.muted
    context.font = '16px "PT Serif", Georgia, serif'
    context.textAlign = 'center'
    context.fillText('NO IMAGE', posterX + posterWidth / 2, posterY + posterHeight / 2)
    context.textAlign = 'left'
  }
  context.restore()

  const metaX = posterX + posterWidth + 48
  const metaWidth = CONTENT_RIGHT - metaX
  context.fillStyle = palette.ink
  context.font = `300 35px ${typographyC.font}`
  context.letterSpacing = typographyC.letterSpacing
  drawLines(context, fitLines(context, `《${record.title}》`, metaWidth, 3), metaX, top + 78, 56)
  context.letterSpacing = '0px'

  context.fillStyle = palette.muted
  context.font = '23px Georgia, "Times New Roman", serif'
  const rating = Array.from({ length: 5 }, (_, ratingIndex) => record.rating && ratingIndex < record.rating ? '★' : '☆').join(' ')
  context.fillText(rating, metaX, top + 245)
  context.font = `300 19px ${typographyC.font}`
  context.letterSpacing = '1.1px'
  context.fillText(record.date?.replaceAll('-', '.') ?? '日期未记', metaX, top + 288)
  context.letterSpacing = '0px'

  const reviewTop = top + 374

  if (record.review) {
    context.fillStyle = mode === 'day' ? typographyC.color : palette.ink
    context.font = `${typographyC.weight} ${typographyC.size}px ${typographyC.font}`
    context.letterSpacing = typographyC.letterSpacing
    drawLines(context, fitLines(context, record.review, CONTENT_RIGHT - CONTENT_LEFT, 3), CONTENT_LEFT, reviewTop, typographyC.lineHeight)
    context.letterSpacing = '0px'
  }
}

async function renderPage(page: NotebookPage, theme: NotebookTheme, mode: NotebookMode) {
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_WIDTH
  canvas.height = PAGE_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法生成 Notebook 图片。')
  drawPaper(context, theme, mode, page)
  if (page.kind === 'cover') drawCover(context, page, theme, mode)
  else for (let index = 0; index < page.records.length; index += 1) await drawRecord(context, page.records[index], index, theme, mode)
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Notebook 图片生成失败。')), 'image/png'))
}

export async function createNotebookZip(entries: MediaRecord[], monthKeys: string[], theme: NotebookTheme, mode: NotebookMode = 'day') {
  if ('fonts' in document) {
    await Promise.allSettled([
      document.fonts.load('29px "Ma Shan Zheng"'),
      document.fonts.load('38px "Noto Sans SC"'),
      document.fonts.load('38px "Noto Serif SC"'),
      document.fonts.load('46px "PT Serif"'),
    ])
  }

  const zip = new JSZip()
  for (const key of monthKeys) {
    const pages = buildNotebookPages(buildNotebookMonth(entries, key))
    for (const page of pages) {
      const blob = await renderPage(page, theme, mode)
      zip.file(`MoonDust_${key}_${String(page.pageNumber).padStart(2, '0')}.png`, blob)
    }
  }

  const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  const years = [...new Set(monthKeys.map((key) => key.slice(0, 4)))]
  const name = monthKeys.length === 1 ? `MoonDust_${monthKeys[0]}.zip` : `MoonDust_Notebooks_${years.length === 1 ? years[0] : 'Archive'}.zip`
  return { archive, name }
}

export async function exportNotebookZip(entries: MediaRecord[], monthKeys: string[], theme: NotebookTheme, mode: NotebookMode = 'day') {
  const { archive, name } = await createNotebookZip(entries, monthKeys, theme, mode)
  const link = document.createElement('a')
  link.download = name
  link.href = URL.createObjectURL(archive)
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
