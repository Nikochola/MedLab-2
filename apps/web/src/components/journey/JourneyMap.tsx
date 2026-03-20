"use client"

import Link from "next/link"
import type { ComponentType } from "react"
import { motion } from "framer-motion"
import { BadgeCheck, BookOpen, Lock, Play, Scan, Stethoscope, Target, Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useGating } from "@/contexts/GatingContext"
import { PulsePlant } from "@/components/illustrations/ConceptCharacters"
import { cn } from "@/lib/utils"

export type JourneyNodeType = "skill" | "practice" | "case" | "checkpoint" | "boss"
export type JourneyNodeState = "done" | "current" | "next"

export interface JourneyNode {
  id: string
  title: string
  subtitle: string
  href: string
  type: JourneyNodeType
  xp: number
  pro?: boolean
  state?: JourneyNodeState
}

interface JourneyMapProps {
  domain: "ecg" | "xray"
  trackTitle: string
  trackSubtitle: string
  nodes: JourneyNode[]
}

const PATH_OFFSETS = [0, 120, -104, 96, -86, 108, -116, 88, -78, 0]
const STEP_HEIGHT = 156
const TOP_PADDING = 118
const SVG_WIDTH = 760
const CENTER_X = SVG_WIDTH / 2

const TYPE_ICONS: Record<JourneyNodeType, ComponentType<{ className?: string }>> = {
  skill: BadgeCheck,
  practice: Play,
  case: BookOpen,
  checkpoint: Target,
  boss: Trophy,
}

function buildPricingHref(nextHref: string) {
  return {
    pathname: "/pricing",
    query: {
      next: nextHref,
    },
  }
}

function nodeOffsets(length: number) {
  return Array.from({ length }, (_, index) => PATH_OFFSETS[index % PATH_OFFSETS.length] ?? 0)
}

export function JourneyMap({ domain, trackTitle, trackSubtitle, nodes }: JourneyMapProps) {
  const { plan } = useGating()
  const offsets = nodeOffsets(nodes.length)
  const points = offsets.map((offset, index) => ({
    x: CENTER_X + offset,
    y: TOP_PADDING + index * STEP_HEIGHT,
  }))

  const canvasHeight = points[points.length - 1] ? points[points.length - 1].y + 170 : 460
  const completedCount = nodes.filter((node) => node.state === "done").length
  const nextNode = nodes.find((node) => node.state === "current") ?? nodes.find((node) => node.state === "next") ?? nodes[0]
  const isEcg = domain === "ecg"
  const accentStroke = isEcg ? "#8f95cb" : "#87b8c8"

  return (
    <section className="min-h-full px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <Card variant="conceptShell">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className={cn(
                "mb-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em]",
                isEcg ? "border-[#b7bdde] bg-[#e7e8f7] text-[#39416f]" : "border-[#9bc5d2] bg-[#dceef4] text-[#355564]"
              )}>
                {isEcg ? <Stethoscope className="mr-1.5 h-3.5 w-3.5" /> : <Scan className="mr-1.5 h-3.5 w-3.5" />}
                {isEcg ? "ECG Sequence" : "X-Ray Sequence"}
              </div>
              <h2 className="font-display text-3xl font-black text-[#1f2533] dark:text-[#eff4fb]">{trackTitle}</h2>
              <p className="mt-2 text-sm font-semibold text-[#647083] dark:text-[#b9c3d3]">{trackSubtitle}</p>
            </div>

            <div className="flex items-center gap-3">
              <Card variant="conceptWidget">
                <p className="font-display text-[11px] font-black uppercase tracking-[0.12em] text-[#7f7b88] dark:text-[#aeb8c8]">Progress</p>
                <p className="font-display text-xl font-black text-[#252b39] dark:text-[#eaf0f8]">{completedCount}/{nodes.length}</p>
              </Card>
              {nextNode && (
                <Button asChild variant="default" size="lg">
                  <Link href={nextNode.pro && plan === "free" ? buildPricingHref(nextNode.href) : nextNode.href}>Continue</Link>
                </Button>
              )}
            </div>
          </div>
        </Card>

        <div className="relative mx-auto mt-6 w-full max-w-[760px]" style={{ height: canvasHeight }}>
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${SVG_WIDTH} ${canvasHeight}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {points.slice(0, -1).map((point, index) => {
              const next = points[index + 1]
              if (!next) return null

              const curvature = STEP_HEIGHT * 0.45
              const path = [
                `M ${point.x} ${point.y}`,
                `C ${point.x} ${point.y + curvature}, ${next.x} ${next.y - curvature}, ${next.x} ${next.y}`,
              ].join(" ")

              return (
                <g key={`${nodes[index]?.id}-to-${nodes[index + 1]?.id}`}>
                  <path
                    d={path}
                    stroke={accentStroke}
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.22}
                  />
                  <motion.path
                    d={path}
                    stroke={accentStroke}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="12 18"
                    fill="none"
                    animate={{ strokeDashoffset: [0, -30], opacity: [0.2, 0.58, 0.2] }}
                    transition={{ duration: 2.8 + index * 0.2, repeat: Infinity, ease: "linear" }}
                  />
                </g>
              )
            })}
          </svg>

          {nodes.map((node, index) => {
            const point = points[index]
            if (!point) return null
            const Icon = TYPE_ICONS[node.type]
            const isLocked = Boolean(node.pro && plan === "free")
            const isDone = node.state === "done" && !isLocked
            const isCurrent = node.state === "current" && !isLocked

            const nodeClassName = isLocked
              ? "border-[#d6dce4] bg-[#edf1f5] text-[#8f9aa9] shadow-[0_6px_0_#d0d8e2]"
              : isCurrent
                ? isEcg
                  ? "border-[#8f95cb] bg-[#b6bbe0] text-[#1f2235] shadow-[0_6px_0_#9da4ce]"
                  : "border-[#87b8c8] bg-[#bad9e4] text-[#1f2b33] shadow-[0_6px_0_#a6c9d6]"
                : isDone
                  ? "border-[#ddc887] bg-[#ecdba9] text-[#5f4922] shadow-[0_6px_0_#d8c189]"
                  : "border-[#d6d9df] bg-white text-[#5b6c7d] shadow-[0_6px_0_#dce0e8]"

            return (
              <motion.div
                key={node.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${(point.x / SVG_WIDTH) * 100}%`, top: point.y }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1, y: isCurrent ? [0, -6, 0] : [0, -2, 0] }}
                transition={{ delay: index * 0.05, duration: isCurrent ? 1.8 : 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Link href={isLocked ? buildPricingHref(node.href) : node.href} className="group block">
                  <div
                    className={cn(
                      "relative flex h-[92px] w-[92px] items-center justify-center rounded-[30px] border-2 transition-transform duration-150 group-hover:scale-[1.06]",
                      nodeClassName,
                    )}
                  >
                    {isLocked ? <Lock className="h-7 w-7" /> : <Icon className="h-7 w-7" />}
                    {isCurrent && (
                      <motion.div
                        className={cn("absolute -inset-4 rounded-[38px]", isEcg ? "bg-[#8f95cb]/18" : "bg-[#87b8c8]/18")}
                        animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.16, 0.34, 0.16] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </div>
                </Link>
                <div className="absolute left-1/2 top-[104px] w-[176px] -translate-x-1/2">
                  <Card variant="conceptWidget">
                    <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#83808a] dark:text-[#aab4c3]">
                      {isLocked ? "Pro lesson" : `${node.xp} XP`}
                    </p>
                    <p className="mt-1 text-sm font-extrabold leading-tight text-[#394357] dark:text-[#e2e8f0]">{node.title}</p>
                    <p className="mt-1 text-[11px] font-semibold leading-tight text-[#70808f] dark:text-[#b1bbc9]">{node.subtitle}</p>
                  </Card>
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-6 flex justify-center">
          <PulsePlant size={128} tone={isEcg ? "olive" : "sky"} />
        </div>
      </div>
    </section>
  )
}
