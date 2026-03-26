"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { buildStudentAppUrl } from "../lib/runtimeUrls"
import { SharedNavbar } from "@/components/sections/SharedNavbar"
import { SharedFooter } from "@/components/sections/SharedFooter"
import { FAQAccordion } from "@/components/sections/FAQAccordion"
import { FadeUp } from "@/components/motion/FadeUp"
import { InView } from "@/components/motion/InView"

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon({ color = "#0066FF" }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2.5 7l3.5 3.5 5.5-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Billing Toggle ───────────────────────────────────────────────────────────

function BillingToggle({ yearly, onChange }: { yearly: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => onChange(false)} style={{ fontSize: 14, fontWeight: 500, color: !yearly ? "#0E0F12" : "#9B9A94", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.15s" }}>Monthly</button>
      <button onClick={() => onChange(!yearly)} style={{ width: 44, height: 24, borderRadius: 100, background: yearly ? "#0066FF" : "#E8E6DF", border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 3, left: yearly ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
      </button>
      <button onClick={() => onChange(true)} style={{ fontSize: 14, fontWeight: 500, color: yearly ? "#0E0F12" : "#9B9A94", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 0.15s" }}>Yearly</button>
      <span style={{ fontSize: 11, fontWeight: 700, color: yearly ? "#0047CC" : "#9B9A94", background: yearly ? "#EEF3FF" : "#F0EDE6", border: `1px solid ${yearly ? "#C7D9FF" : "#E8E6DF"}`, borderRadius: 100, padding: "3px 10px", transition: "all 0.2s", letterSpacing: "0.04em" }}>SAVE 31%</span>
    </div>
  )
}

// ─── Pricing Cards ────────────────────────────────────────────────────────────

function PricingCards({ yearly }: { yearly: boolean }) {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      subline: null as string | null,
      badge: null as string | null,
      description: "Start building clinical reasoning with guided cases.",
      features: ["5 ECG & radiology cases / month", "Basic clinical reasoning feedback", "Community leaderboard", "Limited case library"],
      cta: "Get Started Free",
      highlighted: false,
    },
    {
      name: "Pro",
      price: yearly ? "$9" : "$12",
      period: "/ month",
      subline: yearly ? "billed as $99 / year" : null,
      badge: "MOST POPULAR",
      description: "Unlimited practice with full AI-powered patient simulations.",
      features: ["Unlimited cases", "Full AI patient simulations", "Detailed performance analytics", "All specialties unlocked", "Early access to new modules", "Downloadable progress reports", "Priority support"],
      cta: yearly ? "Start Pro — Yearly" : "Start Pro",
      highlighted: true,
    },
  ]

  return (
    <div className="flex flex-col md:flex-row gap-5" style={{ maxWidth: 720, margin: "0 auto" }}>
      {plans.map((plan) => {
        const border = plan.highlighted ? "1.5px solid #0066FF" : "1.5px solid #E8E6DF"
        const priceColor = plan.highlighted ? "#0066FF" : "#0E0F12"
        const checkColor = plan.highlighted ? "#0066FF" : "#9B9A94"

        return (
          <div key={plan.name} className="flex flex-col flex-1" style={{ background: "#fff", border, borderRadius: 20, padding: "32px 28px 28px", ...(plan.highlighted ? { boxShadow: "0 8px 40px -8px rgba(0,102,255,0.18)" } : {}) }}>
            <div style={{ minHeight: 28, marginBottom: 20 }}>
              {plan.badge && (
                <span style={{ display: "inline-block", background: "#EEF3FF", color: "#0047CC", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", padding: "5px 10px", borderRadius: 6 }}>{plan.badge}</span>
              )}
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#0E0F12", marginBottom: 8, letterSpacing: "-0.01em" }}>{plan.name}</p>
            <div className="flex items-end gap-1.5" style={{ marginBottom: plan.subline ? 4 : 6 }}>
              <span style={{ fontSize: 52, fontWeight: 700, color: priceColor, letterSpacing: "-0.04em", lineHeight: 1 }}>{plan.price}</span>
              <span style={{ fontSize: 14, fontWeight: 400, color: "#9B9A94", paddingBottom: 6 }}>{plan.period}</span>
            </div>
            <div style={{ minHeight: 20, marginBottom: 10 }}>
              {plan.subline && <span style={{ fontSize: 12, color: "#9B9A94" }}>{plan.subline}</span>}
            </div>
            <p style={{ fontSize: 13, color: "#6B6A65", lineHeight: 1.6, marginBottom: 24 }}>{plan.description}</p>
            <div style={{ height: 1, background: "#F0EDE6", marginBottom: 24 }} />
            <ul className="flex flex-col gap-3 flex-1" style={{ marginBottom: 28 }}>
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: plan.highlighted ? "#EEF3FF" : "#F5F3EE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CheckIcon color={checkColor} />
                  </div>
                  <span style={{ fontSize: 13, color: "#0E0F12", lineHeight: 1.4 }}>{f}</span>
                </li>
              ))}
            </ul>
            {plan.highlighted ? (
              <Button className="w-full" asChild><Link href={buildStudentAppUrl("/student/signup")}>{plan.cta}</Link></Button>
            ) : (
              <Button variant="outline" className="w-full" asChild><Link href={buildStudentAppUrl("/student/signup")}>{plan.cta}</Link></Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Institution CTA ──────────────────────────────────────────────────────────

function InstitutionBanner() {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6" style={{ background: "#0E0F12", borderRadius: 20, padding: "40px 40px", marginTop: 80 }}>
      <div className="flex flex-col gap-3">
        <span style={{ fontSize: 11, fontWeight: 700, color: "#0066FF", letterSpacing: "0.1em", textTransform: "uppercase" }}>For Universities &amp; Medical Schools</span>
        <h2 style={{ fontWeight: 700, fontSize: "clamp(22px, 3vw, 28px)", color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2, margin: 0 }}>Institutional pricing for cohorts of 50+</h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, margin: 0 }}>From $30/student/year. Includes educator dashboards, cohort analytics, LMS integration, and a dedicated account manager.</p>
      </div>
      <div className="flex flex-col gap-3" style={{ flexShrink: 0 }}>
        <Button variant="white" asChild>
          <Link href="/institutions" className="flex items-center gap-2">See Institution Plans <ArrowRight /></Link>
        </Button>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Book a demo · No commitment required</span>
      </div>
    </div>
  )
}

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const faqs = [
  { q: "Can I cancel anytime?", a: "Yes. Pro plans can be cancelled at any time. You'll retain access until the end of your billing period." },
  { q: "Is the Free plan really free?", a: "Yes — free forever with no credit card required. You get 5 cases per month and access to core features." },
  { q: "What's included in AI patient simulations?", a: "Full interactive cases with dynamic labs, ECGs, imaging, and an AI Attending that guides your reasoning using Socratic questioning." },
  { q: "Do you offer student discounts?", a: "The Free tier is already designed for students. Pro Yearly at $9/month is our best value — that's $99/year billed upfront." },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [yearly, setYearly] = useState(true)

  return (
    <div style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", minHeight: "100vh" }} className="overflow-x-clip">
      <SharedNavbar active="Pricing" />

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-5 md:px-[80px]" style={{ paddingTop: 72, paddingBottom: 48 }}>

        <FadeUp delay={0.08}>
          <h1 style={{ fontWeight: 700, fontSize: "clamp(36px, 5vw, 64px)", color: "#0E0F12", letterSpacing: "-0.04em", lineHeight: 1.05, margin: 0, marginBottom: 16 }}>Simple, transparent pricing</h1>
        </FadeUp>
        <FadeUp delay={0.16}>
          <p style={{ fontSize: 18, color: "#6B6A65", lineHeight: 1.6, maxWidth: 440, margin: "0 0 36px", letterSpacing: "-0.01em" }}>Start free. Upgrade when you&apos;re ready. No hidden fees.</p>
        </FadeUp>
        <FadeUp delay={0.22}>
          <BillingToggle yearly={yearly} onChange={setYearly} />
        </FadeUp>
      </section>

      {/* Plans */}
      <section className="px-5 md:px-[80px]" style={{ paddingBottom: 0 }}>
        <InView>
          <PricingCards yearly={yearly} />
        </InView>
        <InView>
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <p style={{ fontSize: 13, color: "#9B9A94", marginTop: 20, textAlign: "center" }}>All plans include access to the MedLab web platform. Pro upgrades can be cancelled anytime.</p>
            <InstitutionBanner />
            <FAQAccordion items={faqs} />
          </div>
        </InView>
      </section>

      <div style={{ paddingBottom: 80 }} />
      <SharedFooter />
    </div>
  )
}
