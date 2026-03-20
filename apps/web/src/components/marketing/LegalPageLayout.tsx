"use client"

import type { ReactNode } from "react"

type LegalPageLayoutProps = {
  label?: string
  title: string
  subtitle: string
  lastUpdated: string
  children: ReactNode
}

export function LegalPageLayout({
  label = "Legal",
  title,
  subtitle,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <main className="px-6 py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border-2 border-[#ddd7cf] bg-[rgba(251,249,246,0.94)] p-8 shadow-[0_12px_0_#d8d2ca] backdrop-blur dark:border-[#4f5668] dark:bg-[rgba(47,52,61,0.92)] dark:shadow-none md:p-10">
          <p className="font-display mb-3 text-sm font-black uppercase tracking-[0.22em] text-[#8a8592] dark:text-[#aeb8c8]">
            {label}
          </p>
          <h1 className="font-display text-4xl font-black tracking-tight text-[#1f2735] dark:text-[#ebf1fa] md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold text-[#677487] dark:text-[#b9c3d4] md:text-base">{subtitle}</p>

          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#8d8a95] dark:text-[#afbacb]">
            Last updated: <span className="font-black text-[#5a677c] dark:text-[#e3e9f3]">{lastUpdated}</span>
          </p>

          <div className="mt-8 space-y-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-black [&_h2]:text-[#2a3345] [&_h2]:dark:text-[#eaf0f8] [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-black [&_h3]:text-[#2a3345] [&_h3]:dark:text-[#eaf0f8] [&_p]:text-sm [&_p]:font-semibold [&_p]:leading-relaxed [&_p]:text-[#5e6b7f] [&_p]:dark:text-[#c0cadb] [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:font-semibold [&_ul]:text-[#5e6b7f] [&_ul]:dark:text-[#c0cadb] [&_section]:rounded-[1.2rem] [&_section]:border [&_section]:border-[#ddd7cf] [&_section]:bg-white/80 [&_section]:p-5 [&_section]:dark:border-[#4f5668] [&_section]:dark:bg-[#323844]/80">
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}
