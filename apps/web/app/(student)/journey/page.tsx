"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Activity, ScanSearch } from "lucide-react"
import { JourneyMap } from "@/components/journey/JourneyMap"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CalmBrain, MoodDots, RadiologyMascot } from "@/components/illustrations/ConceptCharacters"
import { ECG_JOURNEY, XRAY_JOURNEY } from "@/lib/journey/tracks"

type JourneyTrack = "ecg" | "xray"

export default function JourneyPage() {
  const [activeTrack, setActiveTrack] = useState<JourneyTrack>("ecg")
  const activeCount = activeTrack === "ecg" ? ECG_JOURNEY.length : XRAY_JOURNEY.length

  return (
    <>
      <section className="relative px-4 pt-6 md:px-8 md:pt-8">
        <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <Card variant="conceptShell">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="font-display text-xs font-black uppercase tracking-[0.18em] text-[#7f7b88] dark:text-[#a9b2c2]">
                  Daily Reflection
                </p>
                <h2 className="font-display mt-2 text-3xl font-black leading-tight text-[#20242f] dark:text-[#eff4fb]">
                  How do you feel about your current training focus?
                </h2>
                <p className="mt-3 text-sm font-semibold text-[#636d7f] dark:text-[#b7c1d1]">
                  Build confidence with short ECG and X-ray loops. Keep one calm routine, daily.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant={activeTrack === "ecg" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTrack("ecg")}
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    ECG Track
                  </Button>
                  <Button
                    variant={activeTrack === "xray" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTrack("xray")}
                  >
                    <ScanSearch className="mr-2 h-4 w-4" />
                    X-Ray Track
                  </Button>
                </div>
              </div>

              <div className="justify-self-center lg:justify-self-end">
                {activeTrack === "ecg" ? (
                  <CalmBrain size={170} tone="lilac" />
                ) : (
                  <RadiologyMascot size={170} tone="sky" />
                )}
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            <Card variant="conceptPanel">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-xs font-black uppercase tracking-[0.14em] text-[#83808a] dark:text-[#aeb8c8]">
                    Active Track
                  </p>
                  <p className="font-display mt-1 text-2xl font-black text-[#252b39] dark:text-[#eaf0f8]">
                    {activeTrack === "ecg" ? "ECG" : "X-Ray"}
                  </p>
                </div>
                <MoodDots size={96} tone="sky" />
              </div>
            </Card>

            <Card variant="conceptPanel">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="font-display text-xs font-black uppercase tracking-[0.14em] text-[#83808a] dark:text-[#aeb8c8]">
                    Lessons
                  </p>
                  <p className="font-display mt-1 text-3xl font-black text-[#252b39] dark:text-[#eaf0f8]">{activeCount}</p>
                </div>
                <motion.div
                  className="h-2 w-40 overflow-hidden rounded-full border border-[#d8dce5] bg-[#eceff4] dark:border-[#4f5668] dark:bg-[#2f3540]"
                  animate={{ opacity: [0.85, 1, 0.85] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <motion.div
                    className={activeTrack === "ecg" ? "h-full rounded-full bg-[#8f95cb]" : "h-full rounded-full bg-[#87b8c8]"}
                    key={activeTrack}
                    initial={{ width: "32%" }}
                    animate={{ width: activeTrack === "ecg" ? "68%" : "61%" }}
                    transition={{ type: "spring", stiffness: 120, damping: 22 }}
                  />
                </motion.div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <motion.div
        key={activeTrack}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <JourneyMap
          domain={activeTrack}
          trackTitle={activeTrack === "ecg" ? "ECG Practice Journey" : "X-Ray Practice Journey"}
          trackSubtitle={
            activeTrack === "ecg"
              ? "Exercises based on your needs, with case rounds when you are ready."
              : "Structured imaging drills with progression cards and case checkpoints."
          }
          nodes={activeTrack === "ecg" ? ECG_JOURNEY : XRAY_JOURNEY}
        />
      </motion.div>
    </>
  )
}
