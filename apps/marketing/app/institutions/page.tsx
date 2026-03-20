import Link from "next/link"
import { Button } from "@/components/ui/button"
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

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="px-5 md:px-[80px]" style={{ background: "#0E0F12", paddingTop: 80, paddingBottom: 80 }}>
      <div className="flex flex-col items-center text-center" style={{ maxWidth: 860, margin: "0 auto" }}>
        <FadeUp delay={0}>
          <h1 style={{ fontWeight: 700, fontSize: "clamp(36px, 5.5vw, 72px)", color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.05, margin: "0 0 24px" }}>
            Give every student a clinical reasoning environment they&apos;ll actually use.
          </h1>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.55)", lineHeight: 1.65, maxWidth: 560, margin: "0 0 40px", letterSpacing: "-0.01em" }}>
            MedLab replaces passive case reviews with AI-guided simulations — measurably improving diagnostic reasoning while reducing the burden on your faculty.
          </p>
        </FadeUp>
        <FadeUp delay={0.18}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button asChild><Link href="https://cal.com/medlab" target="_blank">Book a Demo</Link></Button>
            <Button variant="ghost-dark" asChild><Link href="#pricing">See Pricing</Link></Button>
          </div>
        </FadeUp>
        <FadeUp delay={0.26}>
          <div className="flex flex-wrap items-center justify-center gap-8 mt-16" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 24 }}>
            {[{ val: "50+", label: "Students per cohort" }, { val: "3 hrs", label: "Average onboarding time" }, { val: "FERPA", label: "Compliance ready" }].map(({ val, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.03em" }}>{val}</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  )
}

// ─── The Problem ──────────────────────────────────────────────────────────────

function TheProblem() {
  const problems = [
    { icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 6h14M4 11h14M4 16h8" stroke="#EA580C" strokeWidth="1.7" strokeLinecap="round" /></svg>, iconBg: "#FFF7ED", title: "Passive learning doesn't build reasoning", body: "Lectures and textbooks teach facts. But diagnostic thinking — the core skill of clinical medicine — only develops through deliberate, iterative practice. Most curricula don't provide it." },
    { icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#9333EA" strokeWidth="1.7" /><path d="M11 7v4l3 3" stroke="#9333EA" strokeWidth="1.7" strokeLinecap="round" /></svg>, iconBg: "#FAF5FF", title: "Faculty can't give feedback at scale", body: "One instructor can't meaningfully debrief 120 students on their clinical reasoning. The result: students get grades, not insight. Faculty get burnout, not leverage." },
    { icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="5" width="16" height="12" rx="2" stroke="#DC2626" strokeWidth="1.7" /><path d="M8 5V4M14 5V4" stroke="#DC2626" strokeWidth="1.7" strokeLinecap="round" /><path d="M7 11h2l1.5-3 2 6 1.5-3H16" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>, iconBg: "#FEF2F2", title: "Simulation labs are expensive and scarce", body: "High-fidelity mannequin labs cost hundreds of thousands to build and run. Scheduling bottlenecks mean students get one or two exposures per semester — far below what builds real competence." },
  ]

  return (
    <section className="px-5 md:px-[80px]" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <InView>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="flex flex-col gap-3 mb-10 md:mb-14" style={{ maxWidth: 520 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", letterSpacing: "0.1em", textTransform: "uppercase" }}>The Problem</span>
          <h2 style={{ fontWeight: 700, fontSize: "clamp(28px, 3.5vw, 48px)", color: "#0E0F12", letterSpacing: "-0.04em", lineHeight: 1.1, margin: 0 }}>Current training leaves a critical gap.</h2>
          <p style={{ fontSize: 15, color: "#6B6A65", lineHeight: 1.65, margin: 0 }}>Medical schools invest heavily in knowledge delivery. Almost nothing in applied clinical reasoning — the skill that saves patients.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-5">
          {problems.map(({ icon, iconBg, title, body }) => (
            <div key={title} className="flex-1 flex flex-col gap-4" style={{ background: "#fff", border: "1.5px solid #E8E6DF", borderRadius: 20, padding: "28px 24px" }}>
              <div style={{ width: 44, height: 44, background: iconBg, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
              <div className="flex flex-col gap-2">
                <h3 style={{ fontWeight: 700, fontSize: 17, color: "#0E0F12", letterSpacing: "-0.02em", margin: 0, lineHeight: 1.3 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "#6B6A65", lineHeight: 1.65, margin: 0 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </InView>
    </section>
  )
}

// ─── What MedLab Does ─────────────────────────────────────────────────────────

function WhatMedLabDoes() {
  const outcomes = [
    { metric: "↑ Pass rates", body: "Students who practice active clinical reasoning outperform peers on OSCEs and licensing exams. MedLab integrates directly into your exam prep cycle." },
    { metric: "↑ Engagement", body: "Case-based learning with immediate AI feedback drives 3× more self-directed study time than passive materials. Students come prepared." },
    { metric: "↑ Instructor visibility", body: "See exactly where each student's reasoning breaks down — before the exam. Intervene early. Focus teaching time where it's needed most." },
    { metric: "↓ Faculty load", body: "The AI Attending handles first-pass feedback on every case attempt. Faculty review dashboards, not individual submissions." },
  ]

  return (
    <section className="px-5 md:px-[80px]" style={{ background: "#F0EDE6", paddingTop: 80, paddingBottom: 80 }}>
      <InView>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-14">
          <div className="flex flex-col gap-3" style={{ maxWidth: 460 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0066FF", letterSpacing: "0.1em", textTransform: "uppercase" }}>What MedLab Does</span>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(28px, 3.5vw, 48px)", color: "#0E0F12", letterSpacing: "-0.04em", lineHeight: 1.1, margin: 0 }}>Built for outcomes, not features.</h2>
          </div>
          <p style={{ fontSize: 15, color: "#6B6A65", lineHeight: 1.65, maxWidth: 320, margin: 0 }}>Every aspect of MedLab is designed around one question: does this improve how students reason about patients?</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outcomes.map(({ metric, body }) => (
            <div key={metric} className="flex gap-4 md:gap-5 items-start" style={{ background: "#fff", border: "1.5px solid #E8E6DF", borderRadius: 20, padding: "24px 24px" }}>
              <div style={{ flexShrink: 0, background: "#EEF3FF", border: "1px solid #C7D9FF", borderRadius: 10, padding: "6px 12px" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0047CC", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{metric}</span>
              </div>
              <p style={{ fontSize: 14, color: "#6B6A65", lineHeight: 1.65, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
      </InView>
    </section>
  )
}

// ─── Social Proof ─────────────────────────────────────────────────────────────

function SocialProof() {
  return (
    <section className="px-5 md:px-[80px]" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <InView>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#0066FF", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 48 }}>Trusted by leading medical programs</span>
        <div style={{ background: "#0E0F12", borderRadius: 20, padding: "40px 32px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
          <span style={{ position: "absolute", top: 24, right: 48, fontSize: 200, fontWeight: 700, color: "rgba(255,255,255,0.03)", lineHeight: 1, letterSpacing: "-0.05em", userSelect: "none" }}>"</span>
          <div className="flex flex-col md:flex-row items-start gap-8 md:gap-16">
            <div className="flex flex-row md:flex-col gap-4 items-center md:items-start" style={{ flexShrink: 0 }}>
              <div style={{ width: 60, height: 60, background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>TSMU</span>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>Tbilisi State Medical University</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>Pilot Program · 2024</p>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <p style={{ fontSize: "clamp(16px, 2vw, 22px)", fontWeight: 500, color: "#fff", lineHeight: 1.55, letterSpacing: "-0.02em", margin: 0, fontStyle: "italic" }}>
                "MedLab gave our students a structured space to practice clinical reasoning outside the ward — something we simply didn't have before. Faculty reported spending significantly less time on case debriefs while students arrived better prepared."
              </p>
              <div className="flex items-center gap-3">
                <div style={{ width: 36, height: 36, background: "rgba(0,102,255,0.2)", borderRadius: "50%", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>Faculty of Medicine</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "1px 0 0" }}>TSMU · Tbilisi, Georgia</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[{ val: "180+", label: "Students in pilot cohort" }, { val: "94%", label: "Completion rate on assigned cases" }, { val: "2.4×", label: "More practice attempts vs. baseline" }, { val: "< 1 wk", label: "Time to full cohort onboarding" }].map(({ val, label }) => (
            <div key={label} className="flex flex-col gap-1" style={{ background: "#fff", border: "1.5px solid #E8E6DF", borderRadius: 16, padding: "20px 20px" }}>
              <span style={{ fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, color: "#0066FF", letterSpacing: "-0.04em" }}>{val}</span>
              <span style={{ fontSize: 13, color: "#6B6A65" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
      </InView>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    { num: "01", title: "Onboard your cohort", body: "We set up your institution workspace, subdomain, and role structure. Invite students and educators by CSV or link. Most programs are live within a week.", detail: "Setup call included · CSV import · Custom subdomain" },
    { num: "02", title: "Assign cases", body: "Educators select from the full case library or request custom cases. Assign to specific cohorts with deadlines. Cases adapt to individual student performance.", detail: "Full case library · Custom case requests · Deadline management" },
    { num: "03", title: "Track progress", body: "The educator dashboard shows attempt history, reasoning quality scores, and cohort-wide weak spots. Export reports for accreditation or faculty review.", detail: "Cohort analytics · CSV exports · Accreditation-ready reports" },
  ]

  return (
    <section className="px-5 md:px-[80px]" style={{ background: "#0E0F12", paddingTop: 80, paddingBottom: 80 }}>
      <InView>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-14">
          <div className="flex flex-col gap-3">
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0066FF", letterSpacing: "0.1em", textTransform: "uppercase" }}>How It Works</span>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(28px, 3.5vw, 48px)", color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.1, margin: 0 }}>Three steps to a running program.</h2>
          </div>
          <Button asChild><Link href="https://cal.com/medlab" target="_blank">Book a Demo</Link></Button>
        </div>
        <div className="flex flex-col md:flex-row gap-[2px]">
          {steps.map(({ num, title, body, detail }, i) => (
            <div key={num} className="flex-1 flex flex-col gap-5" style={{ background: i === 1 ? "#0066FF" : "rgba(255,255,255,0.04)", border: i === 1 ? "none" : "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "28px 24px" }}>
              <span style={{ fontWeight: 700, fontSize: 52, color: i === 1 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)", letterSpacing: "-0.04em", lineHeight: 1 }}>{num}</span>
              <div className="flex flex-col gap-2">
                <h4 style={{ fontWeight: 700, fontSize: 18, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>{title}</h4>
                <p style={{ fontSize: 14, color: i === 1 ? "rgba(255,255,255,0.72)" : "#6B6A65", lineHeight: 1.65, margin: 0 }}>{body}</p>
              </div>
              <p style={{ fontSize: 11, fontWeight: 600, color: i === 1 ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)", letterSpacing: "0.06em", margin: 0, marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${i === 1 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}` }}>{detail}</p>
            </div>
          ))}
        </div>
      </div>
      </InView>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const instPlans = [
  { name: "Starter", price: "$30", unit: "per student / year", min: "Min. 50 students", badge: null, highlighted: false, dark: false, features: ["Full student case library", "Educator dashboard", "Class progress tracking", "CSV performance exports", "Email support"], cta: "Book a Demo", ctaHref: "https://cal.com/medlab" },
  { name: "Growth", price: "$50", unit: "per student / year", min: "Min. 200 students", badge: "RECOMMENDED", highlighted: true, dark: false, features: ["Everything in Starter", "Custom subdomain (school.getmedlab.com)", "LMS integration (Moodle, Canvas)", "Dedicated account manager", "Quarterly review calls"], cta: "Book a Demo", ctaHref: "https://cal.com/medlab" },
  { name: "Enterprise", price: "Custom", unit: "annual contract", min: "500+ students", badge: null, highlighted: false, dark: true, features: ["Everything in Growth", "White-label branding option", "Custom case authoring tools", "API access", "SLA + priority support"], cta: "Contact Us", ctaHref: "mailto:support@getmedlab.com" },
]

function InstitutionPricing() {
  return (
    <section id="pricing" className="px-5 md:px-[80px]" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <InView>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="flex flex-col gap-3 mb-10 md:mb-14">
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0066FF", letterSpacing: "0.1em", textTransform: "uppercase" }}>Pricing</span>
          <h2 style={{ fontWeight: 700, fontSize: "clamp(28px, 3.5vw, 48px)", color: "#0E0F12", letterSpacing: "-0.04em", lineHeight: 1.1, margin: 0 }}>Affordable at every scale.</h2>
          <p style={{ fontSize: 15, color: "#6B6A65", lineHeight: 1.65, margin: 0, maxWidth: 440 }}>Per-student pricing means costs grow with your program — not ahead of it. All plans billed annually.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-5 items-stretch">
          {instPlans.map((plan) => {
            const bg = plan.dark ? "#0E0F12" : "#fff"
            const border = plan.dark ? "1.5px solid rgba(255,255,255,0.08)" : plan.highlighted ? "1.5px solid #0066FF" : "1.5px solid #E8E6DF"
            const nameColor = plan.dark ? "#fff" : "#0E0F12"
            const priceColor = plan.dark ? "#fff" : plan.highlighted ? "#0066FF" : "#0E0F12"
            const unitColor = plan.dark ? "rgba(255,255,255,0.4)" : "#9B9A94"
            const featureColor = plan.dark ? "rgba(255,255,255,0.8)" : "#0E0F12"
            const checkColor = plan.dark ? "rgba(255,255,255,0.5)" : plan.highlighted ? "#0066FF" : "#9B9A94"
            const dividerColor = plan.dark ? "rgba(255,255,255,0.07)" : "#F0EDE6"

            return (
              <div key={plan.name} className="flex flex-col flex-1" style={{ background: bg, border, borderRadius: 20, padding: "28px 24px", ...(plan.highlighted ? { boxShadow: "0 8px 40px -8px rgba(0,102,255,0.18)" } : {}) }}>
                <div style={{ minHeight: 28, marginBottom: 20 }}>
                  {plan.badge && <span style={{ display: "inline-block", background: plan.highlighted ? "#EEF3FF" : "#F0EDE6", color: plan.highlighted ? "#0047CC" : "#6B6A65", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", padding: "5px 10px", borderRadius: 6 }}>{plan.badge}</span>}
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: nameColor, marginBottom: 8, letterSpacing: "-0.01em" }}>{plan.name}</p>
                <div className="flex items-end gap-1.5" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: plan.price === "Custom" ? 40 : 48, fontWeight: 700, color: priceColor, letterSpacing: "-0.04em", lineHeight: 1 }}>{plan.price}</span>
                </div>
                <p style={{ fontSize: 13, color: unitColor, marginBottom: 12 }}>{plan.unit}</p>
                <div style={{ background: plan.dark ? "rgba(255,255,255,0.06)" : plan.highlighted ? "#EEF3FF" : "#F5F3EE", border: `1px solid ${plan.dark ? "rgba(255,255,255,0.1)" : plan.highlighted ? "#C7D9FF" : "#E8E6DF"}`, borderRadius: 8, padding: "6px 12px", marginBottom: 24, display: "inline-block" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: plan.dark ? "rgba(255,255,255,0.5)" : plan.highlighted ? "#0047CC" : "#9B9A94" }}>{plan.min}</span>
                </div>
                <div style={{ height: 1, background: dividerColor, marginBottom: 24 }} />
                <ul className="flex flex-col gap-3 flex-1" style={{ marginBottom: 28 }}>
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: plan.dark ? "rgba(255,255,255,0.08)" : plan.highlighted ? "#EEF3FF" : "#F5F3EE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <CheckIcon color={checkColor} />
                      </div>
                      <span style={{ fontSize: 13, color: featureColor, lineHeight: 1.5 }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={plan.highlighted ? "default" : plan.dark ? "default" : "outline"} className="w-full" asChild>
                  <Link href={plan.ctaHref} target={plan.ctaHref.startsWith("http") ? "_blank" : undefined}>{plan.cta}</Link>
                </Button>
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: 13, color: "#9B9A94", marginTop: 20, textAlign: "center" }}>All institutional plans billed annually in USD. Volume discounts available for 1,000+ students.</p>
      </div>
      </InView>
    </section>
  )
}

// ─── Integration & Compliance ─────────────────────────────────────────────────

function IntegrationCompliance() {
  const items = [
    { icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2.5" stroke="#0066FF" strokeWidth="1.6" /><path d="M6 10h8M10 7v6" stroke="#0066FF" strokeWidth="1.6" strokeLinecap="round" /></svg>, title: "LMS Integration", body: "Native compatibility with Moodle and Canvas. Single sign-on, grade passback, and assignment sync. MedLab fits inside your existing infrastructure." },
    { icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L3 6v5c0 4 3.1 7.3 7 8 3.9-.7 7-4 7-8V6L10 2z" stroke="#0066FF" strokeWidth="1.6" strokeLinejoin="round" /><path d="M7 10l2 2 4-4" stroke="#0066FF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>, title: "FERPA-Ready", body: "Student data is never sold or used for third-party model training. Role-based access controls ensure educators only see their own cohorts." },
    { icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="#0066FF" strokeWidth="1.6" /><path d="M10 6v4l3 1.5" stroke="#0066FF" strokeWidth="1.6" strokeLinecap="round" /></svg>, title: "Custom Subdomain", body: "Growth and Enterprise plans include a dedicated subdomain — school.getmedlab.com. Keeps the experience on-brand and familiar for your students." },
    { icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM14 11v2m0 2v.01" stroke="#0066FF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>, title: "API Access", body: "Enterprise plans include full API access for custom integrations, automated cohort management, and data pipeline connections to your institutional analytics stack." },
  ]

  return (
    <section className="px-5 md:px-[80px]" style={{ background: "#F0EDE6", paddingTop: 80, paddingBottom: 80 }}>
      <InView>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="flex flex-col gap-3 mb-10 md:mb-14" style={{ maxWidth: 460 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0066FF", letterSpacing: "0.1em", textTransform: "uppercase" }}>Integration &amp; Compliance</span>
          <h2 style={{ fontWeight: 700, fontSize: "clamp(24px, 3vw, 40px)", color: "#0E0F12", letterSpacing: "-0.04em", lineHeight: 1.15, margin: 0 }}>Fits your infrastructure. Respects your data.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(({ icon, title, body }) => (
            <div key={title} className="flex gap-4 items-start" style={{ background: "#fff", border: "1.5px solid #E8E6DF", borderRadius: 20, padding: "24px 24px" }}>
              <div style={{ width: 44, height: 44, background: "#EEF3FF", border: "1px solid #C7D9FF", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
              <div className="flex flex-col gap-1.5">
                <h4 style={{ fontWeight: 700, fontSize: 15, color: "#0E0F12", letterSpacing: "-0.01em", margin: 0 }}>{title}</h4>
                <p style={{ fontSize: 13, color: "#6B6A65", lineHeight: 1.65, margin: 0 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </InView>
    </section>
  )
}

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const faqs = [
  { q: "How long does onboarding take?", a: "Most institutions are fully onboarded within one week. We run a setup call, configure your subdomain, and help you import your first cohort via CSV. Your account manager handles the technical setup." },
  { q: "Can we trial before committing?", a: "Yes. We offer a structured pilot program — typically 4–8 weeks with a small cohort — before any annual contract is signed. Book a demo to discuss pilot terms." },
  { q: "Do you support custom cases?", a: "Growth and Enterprise plans include custom case authoring. You can submit clinical scenarios specific to your curriculum and our team will build and validate them within the platform." },
  { q: "What does the educator dashboard show?", a: "Attempt history, time-on-task, reasoning quality scores by case and student, cohort-wide weak spots, and completion rates. All exportable as CSV for accreditation reporting." },
  { q: "Is student data used to train AI models?", a: "No. Student data is never used for third-party model training or sold. All data is processed under strict access controls and stored in compliance with applicable privacy regulations." },
  { q: "What LMS platforms are supported?", a: "We currently support Moodle and Canvas natively. Additional integrations are available on Enterprise. SSO (SAML 2.0, OAuth) is supported on Growth and above." },
]

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="px-5 md:px-[80px]" style={{ paddingBottom: 80 }}>
      <InView>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8" style={{ background: "#0066FF", borderRadius: 24, padding: "60px 40px" }}>
        <div className="flex flex-col gap-4" style={{ maxWidth: 520 }}>
          <h2 style={{ fontWeight: 700, fontSize: "clamp(28px, 3.5vw, 52px)", color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.1, margin: 0 }}>Ready to bring MedLab to your program?</h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.72)", lineHeight: 1.65, margin: 0 }}>Book a 30-minute demo. We'll walk through the platform, answer your procurement questions, and discuss pilot options — no commitment required.</p>
        </div>
        <div className="flex flex-col gap-3 items-start md:items-end" style={{ flexShrink: 0 }}>
          <Button variant="white" size="lg" asChild>
            <Link href="https://cal.com/medlab" target="_blank">Book a Demo</Link>
          </Button>
          <Link href="mailto:support@getmedlab.com" className="flex items-center gap-1.5 hover:text-white transition-colors" style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>
            Or email us directly <ArrowRight />
          </Link>
        </div>
      </div>
      </InView>
    </section>
  )
}

// ─── FAQ Section wrapper ──────────────────────────────────────────────────────

function FAQSection() {
  return (
    <section className="px-5 md:px-[80px]" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <InView>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FAQAccordion items={faqs} />
        </div>
      </InView>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InstitutionsPage() {
  return (
    <div style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", minHeight: "100vh" }} className="overflow-x-clip">
      <SharedNavbar active="For Institutions" />
      <Hero />
      <TheProblem />
      <WhatMedLabDoes />
      <SocialProof />
      <HowItWorks />
      <InstitutionPricing />
      <IntegrationCompliance />
      <FAQSection />
      <FinalCTA />
      <SharedFooter />
    </div>
  )
}
