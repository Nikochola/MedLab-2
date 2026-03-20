"use client"

import { useEffect, useRef } from "react"

interface ECGGridProps {
  width: number
  height: number
  pixelsPerSmallSquare?: number // Default: 1mm = 10 pixels
}

export function ECGGrid({ width, height, pixelsPerSmallSquare = 10 }: ECGGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = width
    canvas.height = height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)" // Dark color for light theme
    ctx.lineWidth = 0.5

    // Draw small squares (1mm) - thin lines
    ctx.strokeStyle = "rgba(0, 0, 0, 0.15)"
    for (let x = 0; x < width; x += pixelsPerSmallSquare) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    for (let y = 0; y < height; y += pixelsPerSmallSquare) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Draw large squares (5mm) - thicker lines
    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)"
    ctx.lineWidth = 1
    const largeSquare = pixelsPerSmallSquare * 5

    for (let x = 0; x < width; x += largeSquare) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    for (let y = 0; y < height; y += largeSquare) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }, [width, height, pixelsPerSmallSquare])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  )
}

