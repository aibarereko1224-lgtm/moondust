import { useEffect, useRef } from 'react'

interface ParticleCoverProps {
  enabled: boolean
  revealed: boolean
  onReveal: () => void
}

interface Particle {
  x: number
  y: number
  opacity: number
  radius: number
}

export function ParticleCover({ enabled, revealed, onReveal }: ParticleCoverProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !enabled || revealed) return

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width * window.devicePixelRatio))
      canvas.height = Math.max(1, Math.floor(rect.height * window.devicePixelRatio))
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
    }

    resize()
    const particles: Particle[] = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      opacity: 0.12 + Math.random() * 0.35,
      radius: 0.4 + Math.random() * 1.2,
    }))

    let animation = 0
    const draw = () => {
      context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
      particles.forEach((particle) => {
        particle.opacity += (Math.random() - 0.5) * 0.02
        particle.opacity = Math.max(0.08, Math.min(0.55, particle.opacity))
        context.beginPath()
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        context.fillStyle = `rgba(232, 232, 232, ${particle.opacity})`
        context.fill()
      })
      animation = window.requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => {
      window.cancelAnimationFrame(animation)
      window.removeEventListener('resize', resize)
    }
  }, [enabled, revealed])

  if (!enabled || revealed) return null

  return (
    <>
      <div className="record-particle-bg" />
      <canvas
        aria-label="点击揭开感想"
        className="record-particle-canvas"
        onClick={(event) => {
          event.stopPropagation()
          onReveal()
        }}
        ref={canvasRef}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onReveal()
        }}
      />
    </>
  )
}
