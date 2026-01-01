"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ECGDisplay } from "@/components/ecg/ECGDisplay"
import { generateRandomECGParams } from "@/components/ecg/ECGWaveformGenerator"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/Logo"

export default function DemoPage() {
  const ecgParams = generateRandomECGParams()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">
      <header className="border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Logo width={110} height={32} />
          </Link>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.18 }}>
            <Button asChild variant="tritary" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 backdrop-blur">
              Read-only demo
            </div>
            <h1 className="text-3xl font-semibold md:text-4xl">ECG workbench preview</h1>
            <p className="text-sm text-slate-600 md:text-base">
              Explore the visual clarity of the ECG sheet and workstation layout. Sign in to unlock guided interpretation,
              case assessments, and feedback.
            </p>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.18 }}>
              <Button asChild variant="tritary" size="lg">
                <Link href="/login">Unlock full experience</Link>
              </Button>
            </motion.div>
          </div>

          <div className="rounded-[28px] border border-rose-200/70 bg-white/70 p-4 shadow-xl backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">12-lead ECG</p>
                <p className="text-lg font-semibold text-slate-900">Demo tracing</p>
              </div>
              <div className="rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-500">
                Preview mode
              </div>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100 p-3">
              <ECGDisplay params={ecgParams} zoom={1} onZoomChange={() => undefined} />
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
