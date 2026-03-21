"use client"

import { type ReactNode, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type Tone = "lilac" | "sand" | "sky" | "olive"

interface CharacterProps {
  size?: number
  tone?: Tone
  animated?: boolean
  className?: string
}

const toneMap: Record<Tone, { base: string; stroke: string; accent: string }> = {
  lilac: { base: "#C9CDEB", stroke: "#4D566E", accent: "#8F95CB" },
  sand: { base: "#E7D5C4", stroke: "#4D566E", accent: "#D4B48E" },
  sky: { base: "#BFDDE8", stroke: "#4D566E", accent: "#87B8C8" },
  olive: { base: "#BCC5A7", stroke: "#4D566E", accent: "#869269" },
}

function Wrapper({
  size = 180,
  animated = true,
  className,
  children,
}: {
  size?: number
  animated?: boolean
  className?: string
  children: ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!animated || !mounted) {
    return (
      <div className={cn("inline-flex", className)} style={{ width: size, height: size }}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={cn("inline-flex", className)}
      style={{ width: size, height: size }}
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  )
}

export function CalmBrain({ size = 180, tone = "lilac", animated = true, className }: CharacterProps) {
  const colors = toneMap[tone]
  return (
    <Wrapper size={size} animated={animated} className={className}>
      <svg viewBox="0 0 160 160" className="h-full w-full">
        <circle cx="80" cy="80" r="70" fill={colors.base} opacity="0.26" />
        <path
          d="M47 74c-8-10-2-26 12-28 2-14 19-21 31-12 11-8 29-2 31 12 14 2 20 18 12 28 5 8 1 21-9 24-3 11-16 18-28 14-8 8-21 8-29 0-12 4-25-3-28-14-10-3-14-16-9-24z"
          fill={colors.base}
          stroke={colors.stroke}
          strokeWidth="2"
        />
        <path d="M53 73h54M57 82h48M61 91h40" stroke={colors.accent} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="67" cy="103" r="3.2" fill={colors.stroke} />
        <circle cx="93" cy="103" r="3.2" fill={colors.stroke} />
        <path d="M70 116c4 3 14 3 18 0" stroke={colors.stroke} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </Wrapper>
  )
}

export function FocusFace({ size = 180, tone = "sand", animated = true, className }: CharacterProps) {
  const colors = toneMap[tone]
  return (
    <Wrapper size={size} animated={animated} className={className}>
      <svg viewBox="0 0 160 160" className="h-full w-full">
        <circle cx="80" cy="80" r="70" fill={colors.base} opacity="0.28" />
        <rect x="34" y="34" width="92" height="92" rx="42" fill={colors.base} stroke={colors.stroke} strokeWidth="2" />
        <circle cx="63" cy="73" r="4" fill={colors.stroke} />
        <circle cx="97" cy="73" r="4" fill={colors.stroke} />
        <path d="M60 98c6-5 34-5 40 0" stroke={colors.stroke} strokeWidth="2.3" strokeLinecap="round" />
        <path d="M44 52l17 8M116 52l-17 8" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </Wrapper>
  )
}

export function PulsePlant({ size = 180, tone = "olive", animated = true, className }: CharacterProps) {
  const colors = toneMap[tone]
  return (
    <Wrapper size={size} animated={animated} className={className}>
      <svg viewBox="0 0 160 160" className="h-full w-full">
        <circle cx="80" cy="80" r="70" fill={colors.base} opacity="0.24" />
        <rect x="57" y="102" width="46" height="22" rx="8" fill="#F9FAFC" stroke={colors.stroke} strokeWidth="2" />
        <path d="M80 102V62" stroke={colors.stroke} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M80 74c-14-12-28 2-21 12 6 8 18 7 21-1M80 66c15-10 28 6 20 15-7 8-18 5-20-2" fill="none" stroke={colors.accent} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M50 96c9 0 16-5 20-11M110 96c-9 0-16-5-20-11" stroke={colors.stroke} strokeWidth="2" strokeLinecap="round" />
      </svg>
    </Wrapper>
  )
}

export function RadiologyMascot({ size = 180, tone = "sky", animated = true, className }: CharacterProps) {
  const colors = toneMap[tone]
  return (
    <Wrapper size={size} animated={animated} className={className}>
      <svg viewBox="0 0 160 160" className="h-full w-full">
        <circle cx="80" cy="80" r="70" fill={colors.base} opacity="0.25" />
        <rect x="36" y="46" width="88" height="68" rx="24" fill={colors.base} stroke={colors.stroke} strokeWidth="2" />
        <circle cx="66" cy="72" r="4" fill={colors.stroke} />
        <circle cx="94" cy="72" r="4" fill={colors.stroke} />
        <path d="M66 93c7 5 21 5 28 0" stroke={colors.stroke} strokeWidth="2.3" strokeLinecap="round" />
        <rect x="54" y="110" width="52" height="12" rx="6" fill="#F9FAFC" stroke={colors.stroke} strokeWidth="2" />
        <circle cx="80" cy="116" r="2.8" fill={colors.accent} />
      </svg>
    </Wrapper>
  )
}

export function MoodDots({ size = 180, tone = "lilac", animated = true, className }: CharacterProps) {
  const colors = toneMap[tone]
  const Dot = animated ? motion.circle : "circle"
  return (
    <Wrapper size={size} animated={false} className={className}>
      <svg viewBox="0 0 160 160" className="h-full w-full">
        <circle cx="80" cy="80" r="70" fill={colors.base} opacity="0.2" />
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Dot
            key={index}
            cx={36 + (index % 3) * 42}
            cy={52 + Math.floor(index / 3) * 46}
            r={14}
            fill={index % 2 === 0 ? colors.base : colors.accent}
            opacity={0.9}
            {...(animated
              ? {
                  animate: { scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] },
                  transition: { duration: 2.2, repeat: Infinity, delay: index * 0.12, ease: "easeInOut" },
                }
              : {})}
          />
        ))}
      </svg>
    </Wrapper>
  )
}
