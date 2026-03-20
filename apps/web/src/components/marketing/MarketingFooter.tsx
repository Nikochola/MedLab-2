"use client"

import Link from "next/link"
import { Logo } from "@/components/ui/Logo"

const footerLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Refund Policy", href: "/refund-policy" },
]

export function MarketingFooter() {
  return (
    <footer className="border-t-4 border-slate-900 bg-[#fafaf9] py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-4">
          <Logo width={96} height={28} className="opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0" />
          <div className="h-6 w-1 rounded-full bg-slate-300" />
          <p className="font-display text-xs font-black uppercase tracking-widest text-slate-400">
            © {new Date().getFullYear()} MedLab
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="font-display text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-indigo-600"
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              if (typeof window === "undefined") return
              window.dispatchEvent(new Event("medlab:open-cookie-settings"))
            }}
            className="font-display text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-indigo-600"
          >
            Cookie Settings
          </button>
        </div>
      </div>
    </footer>
  )
}
