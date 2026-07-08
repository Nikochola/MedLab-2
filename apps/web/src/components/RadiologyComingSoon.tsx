"use client"

import Link from "next/link"
import { ArrowRight, Clock, ScanSearch } from "lucide-react"
import { Button } from "@/components/ui/button"

export function RadiologyComingSoon() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 px-6 py-24 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "#F5F5F3", border: "1.5px solid #E8E6DF", color: "#6B6A65" }}
      >
        <ScanSearch className="h-6 w-6" />
      </div>

      <div className="space-y-2">
        <div
          className="mx-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: "#FFF7ED", border: "1px solid #FDE8C8", color: "#D97706" }}
        >
          <Clock className="h-3.5 w-3.5" />
          Coming soon
        </div>
        <h2 className="font-display text-2xl font-black leading-tight tracking-tight text-[#232834]">
          Radiology is not available yet
        </h2>
        <p className="mx-auto max-w-[300px] text-sm leading-relaxed" style={{ color: "#6B6A65" }}>
          We are keeping this release focused on Cardiology ECG practice while Radiology is prepared for launch.
        </p>
      </div>

      <Button asChild size="lg" variant="default" className="gap-2">
        <Link href="/ecg">
          Go to ECG practice
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}
