import JSZip from 'jszip'
import type { LongReviewExportPage } from '../types/longReview'
import type { MediaRecord } from '../types/media'

const WIDTH = 1200
const HEIGHT = 1680
const PAPER_X = 72
const PAPER_Y = 58
const MARGIN_X = 154
const CONTENT_WIDTH = WIDTH - MARGIN_X * 2
const FIRST_TEXT_Y = 720
const CONTINUATION_TEXT_Y = 240
const TEXT_BOTTOM = HEIGHT - 160
const FONT = '"Noto Sans SC", "Microsoft YaHei", sans-serif'
const BODY_SIZE = 34
const LINE_HEIGHT = 68

function wrapParagraph(context: CanvasRenderingContext2D, paragraph: string, maxWidth: number) {
  if (!paragraph) return ['']
  const lines: string[] = []
  let line = ''
  for (const character of [...paragraph]) {
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

function layoutBody(context: CanvasRenderingContext2D, body: string) {
  context.font = `300 ${BODY_SIZE}px ${FONT}`
  context.letterSpacing = '0.85px'
  return body.replace(/\r\n/g, '\n').split('\n').flatMap((paragraph, index, paragraphs) => {
    const lines = wrapParagraph(context, paragraph, CONTENT_WIDTH)
    return index < paragraphs.length - 1 ? [...lines, ''] : lines
  })
}

function paginate(lines: string[]) {
  const pages: string[][] = []
  let offset = 0
  let first = true
  do {
    const top = first ? FIRST_TEXT_Y : CONTINUATION_TEXT_Y
    const capacity = Math.max(1, Math.floor((TEXT_BOTTOM - top) / LINE_HEIGHT) + 1)
    pages.push(lines.slice(offset, offset + capacity))
    offset += capacity
    first = false
  } while (offset < lines.length)
  return pages
}

async function loadPoster(source: string | null) {
  if (!source) return null
  try {
    const response = await fetch(source)
    if (!response.ok) return null
    return await createImageBitmap(await response.blob())
  } catch {
    return null
  }
}

function drawPaper(context: CanvasRenderingContext2D) {
  context.fillStyle = '#dfe2dc'
  context.fillRect(0, 0, WIDTH, HEIGHT)
  const gradient = context.createLinearGradient(PAPER_X, 0, WIDTH - PAPER_X, 0)
  gradient.addColorStop(0, '#eeeae2')
  gradient.addColorStop(0.5, '#f5f1e9')
  gradient.addColorStop(1, '#eeeae2')
  context.fillStyle = gradient
  context.shadowColor = 'rgba(35, 32, 28, .16)'
  context.shadowBlur = 34
  context.shadowOffsetY = 12
  context.fillRect(PAPER_X, PAPER_Y, WIDTH - PAPER_X * 2, HEIGHT - PAPER_Y * 2)
  context.shadowColor = 'transparent'
  context.fillStyle = 'rgba(255,255,255,.13)'
  for (let y = PAPER_Y + 8; y < HEIGHT - PAPER_Y; y += 19) context.fillRect(PAPER_X + 2, y, WIDTH - PAPER_X * 2 - 4, 1)
  context.strokeStyle = 'rgba(119,120,112,.28)'
  context.strokeRect(PAPER_X + 24, PAPER_Y + 24, WIDTH - (PAPER_X + 24) * 2, HEIGHT - (PAPER_Y + 24) * 2)
}

function drawFooter(context: CanvasRenderingContext2D, pageNumber: number, pageCount: number) {
  context.fillStyle = '#777870'
  context.font = '18px "PT Serif", Georgia, serif'
  context.letterSpacing = '2px'
  context.fillText('MOON DUST', MARGIN_X, HEIGHT - 102)
  context.textAlign = 'right'
  context.fillText(`${String(pageNumber).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`, WIDTH - MARGIN_X, HEIGHT - 102)
  context.textAlign = 'left'
  context.letterSpacing = '0px'
}

async function canvasBlob(canvas: HTMLCanvasElement) {
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('长评图片生成失败。')), 'image/png'))
}

export async function renderLongReviewPages(record: MediaRecord, title: string, body: string): Promise<LongReviewExportPage[]> {
  if ('fonts' in document) await Promise.allSettled([document.fonts.load(`300 ${BODY_SIZE}px "Noto Sans SC"`), document.fonts.load('30px "PT Serif"')])
  const measuringCanvas = document.createElement('canvas')
  const measuringContext = measuringCanvas.getContext('2d')
  if (!measuringContext) throw new Error('当前浏览器无法生成长评图片。')
  const pages = paginate(layoutBody(measuringContext, body.trim() || ' '))
  const poster = await loadPoster(record.poster)
  const result: LongReviewExportPage[] = []

  for (let index = 0; index < pages.length; index += 1) {
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器无法生成长评图片。')
    drawPaper(context)

    if (index === 0) {
      const posterWidth = 190
      const posterHeight = 285
      context.save()
      context.beginPath()
      context.rect(MARGIN_X, 154, posterWidth, posterHeight)
      context.clip()
      if (poster) {
        const scale = Math.max(posterWidth / poster.width, posterHeight / poster.height)
        const width = poster.width * scale
        const height = poster.height * scale
        context.drawImage(poster, MARGIN_X + (posterWidth - width) / 2, 154 + (posterHeight - height) / 2, width, height)
      } else {
        context.fillStyle = '#d9ddd5'
        context.fillRect(MARGIN_X, 154, posterWidth, posterHeight)
      }
      context.restore()

      const metaX = MARGIN_X + posterWidth + 54
      context.fillStyle = '#41423d'
      context.font = `300 42px ${FONT}`
      context.letterSpacing = '1px'
      context.fillText(`《${record.title}》`, metaX, 218, WIDTH - MARGIN_X - metaX)
      if (title.trim()) {
        context.font = `300 29px ${FONT}`
        context.fillStyle = '#656760'
        context.fillText(title.trim(), metaX, 286, WIDTH - MARGIN_X - metaX)
      }
      context.fillStyle = '#777870'
      context.font = '27px Georgia, "Times New Roman", serif'
      context.fillText(Array.from({ length: 5 }, (_, ratingIndex) => record.rating && ratingIndex < record.rating ? '★' : '☆').join(' '), metaX, 360)
      context.font = `300 20px ${FONT}`
      context.letterSpacing = '1px'
      context.fillText(record.date?.replaceAll('-', '.') ?? '日期未记', metaX, 408)
      context.strokeStyle = 'rgba(119,120,112,.35)'
      context.beginPath()
      context.moveTo(MARGIN_X, 520)
      context.lineTo(WIDTH - MARGIN_X, 520)
      context.stroke()
    }

    context.fillStyle = '#41423d'
    context.font = `300 ${BODY_SIZE}px ${FONT}`
    context.letterSpacing = '0.85px'
    const top = index === 0 ? FIRST_TEXT_Y : CONTINUATION_TEXT_Y
    pages[index].forEach((line, lineIndex) => context.fillText(line, MARGIN_X, top + lineIndex * LINE_HEIGHT))
    drawFooter(context, index + 1, pages.length)
    result.push({ blob: await canvasBlob(canvas), pageNumber: index + 1, pageCount: pages.length })
  }
  poster?.close()
  return result
}

export async function exportLongReviewImages(record: MediaRecord, title: string, body: string) {
  const pages = await renderLongReviewPages(record, title, body)
  const safeTitle = record.title.replace(/[\\/:*?"<>|]/g, '').trim() || 'LongReview'
  if (pages.length === 1) {
    const link = document.createElement('a')
    link.download = `MoonDust_${safeTitle}.png`
    link.href = URL.createObjectURL(pages[0].blob)
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    return pages.length
  }
  const zip = new JSZip()
  pages.forEach((page) => zip.file(`MoonDust_${safeTitle}_${String(page.pageNumber).padStart(2, '0')}.png`, page.blob))
  const archive = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  const link = document.createElement('a')
  link.download = `MoonDust_${safeTitle}.zip`
  link.href = URL.createObjectURL(archive)
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  return pages.length
}
