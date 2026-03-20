"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { generateECGWaveform, ECGWaveformParams } from "./ECGWaveformGenerator"

interface ECGDisplayProps {
  params: ECGWaveformParams
  zoom?: number
  onZoomChange?: (zoom: number) => void
  fitToContainer?: boolean
}

export function ECGDisplay({ params, zoom = 1, onZoomChange, fitToContainer = false }: ECGDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [containerWidth, setContainerWidth] = useState<number | null>(null)

  // Pan state
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const panStart = useRef({ x: 0, y: 0 })

  // Reset pan when zoom resets to 1
  useEffect(() => {
    if (zoom <= 1) setPan({ x: 0, y: 0 })
  }, [zoom])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (zoom <= 1) return
    isDragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    panStart.current = { ...pan }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [zoom, pan])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy })
  }, [])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const RHYTHM_LEAD = "II"

  useEffect(() => {
    if (!fitToContainer || !containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const nextWidth = Math.floor(entry.contentRect.width)
      if (nextWidth > 0) {
        setContainerWidth(nextWidth)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [fitToContainer])

  useEffect(() => {
    const GRID = [
      ["I", "aVR", "V1", "V4"],
      ["II", "aVL", "V2", "V5"],
      ["III", "aVF", "V3", "V6"],
    ] as const

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (fitToContainer && !containerWidth) return

    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1

    /* ------------------------------
       CANVAS SIZING
    ------------------------------ */
    const viewportWidth =
      fitToContainer && containerWidth
        ? containerWidth
        : typeof window !== "undefined"
          ? window.innerWidth - 60
          : 0
    const totalWidth = Math.min(1200, viewportWidth)
    const colWidth = Math.floor(totalWidth / 4)
    const rowHeight = 140
    const rhythmHeight = 160
    const marginTop = 15

    const totalHeight = rowHeight * 3 + rhythmHeight + marginTop * 2 + 20

    canvas.width = totalWidth * dpr
    canvas.height = totalHeight * dpr
    canvas.style.width = `${totalWidth}px`
    canvas.style.height = `${totalHeight}px`
    ctx.scale(dpr, dpr)
    setCanvasSize({ width: totalWidth, height: totalHeight })

    /* ------------------------------
       ECG PAPER BACKGROUND
    ------------------------------ */

    // Full pink background
    ctx.fillStyle = "#fde2e4"
    ctx.fillRect(0, 0, totalWidth, totalHeight)

    // 1 mm grid — small lines (5 px)
    ctx.strokeStyle = "#f8cdd2"
    ctx.lineWidth = 0.5
    for (let x = 0; x < totalWidth; x += 5) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, totalHeight)
      ctx.stroke()
    }
    for (let y = 0; y < totalHeight; y += 5) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(totalWidth, y)
      ctx.stroke()
    }

    // 5 mm grid — heavier lines (25 px)
    ctx.strokeStyle = "#f4a4b4"
    ctx.lineWidth = 1
    for (let x = 0; x < totalWidth; x += 25) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, totalHeight)
      ctx.stroke()
    }
    for (let y = 0; y < totalHeight; y += 25) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(totalWidth, y)
      ctx.stroke()
    }

    /* ------------------------------
       DRAW 12 SHORT LEADS (2.5 sec)
    ------------------------------ */

    const shortParams = { ...params, duration: 2.5 }

    GRID.forEach((row, rowIndex) => {
      row.forEach((lead, colIndex) => {
        const waveform = generateECGWaveform(lead, shortParams)
        const x0 = colIndex * colWidth
        const y0 = marginTop + rowIndex * rowHeight

        drawLeadStrip(ctx, waveform, x0, y0, colWidth, rowHeight, lead)
      })
    })

    /* ------------------------------
       LONG RHYTHM STRIP (10 sec)
    ------------------------------ */

    const longParams = { ...params, duration: 10 }
    const rhythmWaveform = generateECGWaveform(RHYTHM_LEAD, longParams)

    const rhythmY = marginTop + rowHeight * 3 + 20

    drawLeadStrip(
      ctx,
      rhythmWaveform,
      0,
      rhythmY,
      totalWidth,
      rhythmHeight,
      RHYTHM_LEAD
    )

    /* ------------------------------
       MEDLAB WATERMARK
    ------------------------------ */
    const logo = new Image()
    logo.src = "/images/logo_black.svg"
    logo.onload = () => {
      ctx.save()
      ctx.globalAlpha = 0.08
      const logoH = 18
      const logoW = (logo.naturalWidth / logo.naturalHeight) * logoH
      ctx.drawImage(logo, totalWidth - logoW - 12, totalHeight - logoH - 10, logoW, logoH)
      ctx.restore()
    }
  }, [params, fitToContainer, containerWidth])

  return (
    <div
      ref={containerRef}
      className={`relative w-full flex justify-center mt-4 overflow-hidden`}
      style={{ cursor: zoom > 1 ? (isDragging.current ? "grabbing" : "grab") : "default" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: canvasSize.width ? `${canvasSize.width * zoom}px` : undefined,
          height: canvasSize.height ? `${canvasSize.height * zoom}px` : undefined,
          transform: zoom > 1 ? `translate(${pan.x}px, ${pan.y}px)` : undefined,
          transition: isDragging.current ? "none" : "transform 0.1s ease-out",
        }}
      />
    </div>
  )
}

/* ---------------------------------------------------------------
   DRAW A SINGLE LEAD STRIP IN A RECTANGLE
---------------------------------------------------------------- */

function drawLeadStrip(
  ctx: CanvasRenderingContext2D,
  waveform: { x: number; y: number }[],
  x0: number,
  y0: number,
  width: number,
  height: number,
  label: string
) {
  const midY = y0 + height / 2
  const scaleY = height * 0.33 // waveform amplitude scaling
  const n = waveform.length

  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, width, height)
  ctx.clip()

  ctx.strokeStyle = "#111"
  ctx.lineWidth = 1.2
  ctx.beginPath()

  const startTime = waveform[0].x
  const endTime = waveform[waveform.length - 1].x
  const duration = endTime - startTime

  for (let i = 0; i < n; i++) {
    const t = waveform[i].x - startTime
    const x = x0 + (t / duration) * width
    const y = midY - waveform[i].y * scaleY

    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }

  ctx.stroke()
  ctx.restore()

  // Label for the lead
  ctx.fillStyle = "#111"
  ctx.font = "bold 16px monospace"
  ctx.fillText(label, x0 + 10, y0 + 18)
}
