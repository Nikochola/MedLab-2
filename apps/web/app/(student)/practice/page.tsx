"use client"

import Link from "next/link"
import { Activity, ScanSearch, HeartPulse, ClipboardCheck, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalmBrain, FocusFace, RadiologyMascot, MoodDots } from "@/components/illustrations/ConceptCharacters"

export default function PracticePage() {
  return (
    <main className="h-full overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-12 pb-12">
        {/* ECG Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 pl-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff4b4b] text-white shadow-[0_4px_0_#ea2b2b]">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#20242f]">1. ECG</h2>
              <p className="text-sm font-semibold text-[#636d7f]">Master heart rhythm and electrical conduction diagnostics.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* 1.2 ECG Simulation */}
            <Card variant="conceptPanel" className="group relative flex flex-col justify-between overflow-hidden transition-all hover:translate-y-[-2px] hover:shadow-[0_12px_0_#ddd5cc]">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <HeartPulse className="h-5 w-5 text-[#ff4b4b]" />
                    <h3 className="text-lg font-black text-[#20242f]">1.2. ECG Simulation</h3>
                  </div>
                  <CalmBrain size={56} tone="lilac" />
                </div>
                <p className="text-sm font-semibold text-[#636d7f]">
                  Interactive 12-lead workbench with real-time waveform generation and clinical controls.
                </p>
              </div>
              <Button asChild variant="default" size="lg" className="mt-6 w-full">
                <Link href="/ecg/practice">Launch Simulation</Link>
              </Button>
            </Card>

            {/* 1.3 ECG Case */}
            <Card variant="conceptPanel" className="group relative flex flex-col justify-between overflow-hidden transition-all hover:translate-y-[-2px] hover:shadow-[0_12px_0_#ddd5cc]">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-5 w-5 text-[#ff4b4b]" />
                    <h3 className="text-lg font-black text-[#20242f]">1.3. ECG Case</h3>
                  </div>
                  <FocusFace size={56} tone="sand" />
                </div>
                <p className="text-sm font-semibold text-[#636d7f]">
                  Step-by-step clinical scenarios focusing on differential diagnosis and interpretation logic.
                </p>
              </div>
              <Button asChild variant="outline" size="lg" className="mt-6 w-full">
                <Link href="/ecg/cases">Review Cases</Link>
              </Button>
            </Card>
          </div>
        </div>

        {/* X-Ray Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 pl-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#58cc02] text-white shadow-[0_4px_0_#46a302]">
              <ScanSearch className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#20242f]">2. X-Ray</h2>
              <p className="text-sm font-semibold text-[#636d7f]">Develop radiographic pattern recognition and anatomical interpretation.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* 2.1 X-Ray Simulation */}
            <Card variant="conceptPanel" className="relative flex flex-col justify-between overflow-hidden opacity-75">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ScanSearch className="h-5 w-5 text-[#58cc02]" />
                    <h3 className="text-lg font-black text-[#20242f]">2.1. X-Ray Simulation</h3>
                  </div>
                  <RadiologyMascot size={56} tone="sky" />
                </div>
                <p className="text-sm font-semibold text-[#636d7f]">
                  Clinical radiology viewer with density manipulation, measurements, and orientation drills.
                </p>
              </div>
              <Button variant="outline" size="lg" className="mt-6 w-full cursor-not-allowed" disabled>
                <Clock className="mr-2 h-4 w-4" />
                Coming Soon
              </Button>
            </Card>

            {/* 2.2 X-Ray Case */}
            <Card variant="conceptPanel" className="relative flex flex-col justify-between overflow-hidden opacity-75">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-5 w-5 text-[#58cc02]" />
                    <h3 className="text-lg font-black text-[#20242f]">2.2. X-Ray Case</h3>
                  </div>
                  <MoodDots size={56} tone="lilac" />
                </div>
                <p className="text-sm font-semibold text-[#636d7f]">
                  Guided case reviews with specific focus on finding localization and quality assessment.
                </p>
              </div>
              <Button variant="outline" size="lg" className="mt-6 w-full cursor-not-allowed" disabled>
                <Clock className="mr-2 h-4 w-4" />
                Coming Soon
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
