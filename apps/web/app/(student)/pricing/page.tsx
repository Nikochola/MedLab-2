import Link from "next/link"
import { ArrowLeft, BadgeCheck, BookOpen, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CalmBrain, RadiologyMascot } from "@/components/illustrations/ConceptCharacters"

interface PricingPageProps {
  searchParams?: {
    next?: string
  }
}

const proFeatures = [
  "Unlimited ECG practice loops",
  "Unlimited X-Ray practice sessions",
  "Full ECG and X-Ray case libraries",
  "Learning hub and premium progression tracks",
]

export default function PricingPage({ searchParams }: PricingPageProps) {
  const nextPath =
    searchParams?.next && searchParams.next.startsWith("/") ? searchParams.next : "/learn"

  return (
    <div className="min-h-full px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-xs font-black uppercase tracking-[0.16em] text-[#8a8592] dark:text-[#aeb8c8]">
              MedLab Pro
            </p>
            <h1 className="font-display mt-2 text-3xl font-black text-[#212734] dark:text-[#ecf1f8]">
              Unlock the full student workspace
            </h1>
            <p className="mt-2 text-sm font-semibold text-[#667286] dark:text-[#b8c2d2]">
              Billing is not self-serve yet. Use this page to see what Pro unlocks and contact us for access.
            </p>
          </div>

          <Button asChild variant="outline" size="sm">
            <Link href={nextPath}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card variant="conceptShell">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="inline-flex items-center rounded-full border border-[#d8dde7] bg-[#f7f9fc] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#516173] dark:border-[#4f5668] dark:bg-[#2f3540] dark:text-[#dce4ef]">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Upgrade Path
                </div>
                <h2 className="font-display mt-3 text-2xl font-black text-[#252b39] dark:text-[#eaf0f8]">
                  Everything you need for continuous practice
                </h2>
                <p className="mt-2 text-sm font-semibold text-[#6f7b8f] dark:text-[#b4bfd0]">
                  Pro is designed for students who want unlimited reps, structured cases, and a complete learning loop.
                </p>
                <div className="mt-5 grid gap-3">
                  {proFeatures.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3 rounded-2xl border-2 border-[#d8dde7] bg-[#f7f9fc] px-4 py-3 dark:border-[#4f5668] dark:bg-[#2f3540]"
                    >
                      <BadgeCheck className="h-5 w-5 text-[#6b76c6] dark:text-[#b2bbe7]" />
                      <p className="text-sm font-semibold text-[#415162] dark:text-[#dde6f1]">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="justify-self-center">
                <CalmBrain size={170} tone="lilac" />
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            <Card variant="conceptPanel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xs font-black uppercase tracking-[0.16em] text-[#8a8592] dark:text-[#aeb8c8]">
                    Current rollout
                  </p>
                  <p className="font-display mt-2 text-2xl font-black text-[#252b39] dark:text-[#eaf0f8]">
                    Manual activation
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#6f7b8f] dark:text-[#b4bfd0]">
                    Contact the MedLab team and we’ll enable Pro access for your account while billing is offline.
                  </p>
                </div>
                <RadiologyMascot size={112} tone="sky" />
              </div>
            </Card>

            <Card variant="conceptWidget">
              <div className="space-y-3">
                <p className="font-display text-lg font-black text-[#252b39] dark:text-[#eaf0f8]">
                  Need Pro access?
                </p>
                <p className="text-sm font-semibold text-[#6f7b8f] dark:text-[#b4bfd0]">
                  Email <a className="underline decoration-dotted underline-offset-4" href="mailto:support@medlab.com">support@medlab.com</a> with your MedLab account email and the program you are using.
                </p>
                <Button asChild variant="default" size="lg" className="w-full">
                  <a href="mailto:support@medlab.com?subject=MedLab%20Pro%20Access%20Request">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Contact support
                  </a>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
