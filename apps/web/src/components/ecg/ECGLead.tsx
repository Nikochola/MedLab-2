"use client"

import { useEffect, useRef } from "react"
import { generateECGWaveform, ECGWaveformParams } from "./ECGWaveformGenerator"

interface ECGLeadProps {
  lead: string
  params: ECGWaveformParams
  width: number
  height: number
}

export function ECGLead({ lead, params, width, height }: ECGLeadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = width
    canvas.height = height

    // Full pink paper
    ctx.fillStyle = "#fde2e4"
    ctx.fillRect(0, 0, width, height)

    // 1mm grid
    ctx.strokeStyle = "#f8cdd2"
    ctx.lineWidth = 0.5
    for (let x = 0; x < width; x += 5) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += 5) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // 5mm grid
    ctx.strokeStyle = "#f4a4b4"
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += 25) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += 25) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Waveform
    const waveform = generateECGWaveform(lead, params)
    const midY = height / 2
    const scaleY = height * 0.35
    const n = waveform.length

    ctx.strokeStyle = "#111"
    ctx.lineWidth = 0.9
    ctx.beginPath()

    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * width
      const y = midY - waveform[i].y * scaleY
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }

    ctx.stroke()
  }, [lead, params, width, height])

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width,
        height,
        background: "#fde2e4",
        padding: 0,
        margin: 0,
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div
        className="absolute top-2 left-2 z-10 text-sm font-semibold font-mono px-2 py-1 rounded"
        style={{
          background: "#fde2e4cc",
          color: "#111",
        }}
      >
        {lead}
      </div>
    </div>
  )
}
