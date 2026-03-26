import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SharedNavbar } from "@/components/sections/SharedNavbar"
import { SharedFooter } from "@/components/sections/SharedFooter"
import { FadeUp } from "@/components/motion/FadeUp"
import { InView } from "@/components/motion/InView"

// ─── Mission ──────────────────────────────────────────────────────────────────

function Mission() {
  return (
    <section className="px-5 md:px-[80px]" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        <FadeUp delay={0.08}>
          <h1 style={{ fontWeight: 700, fontSize: "clamp(32px, 4.5vw, 60px)", color: "#0E0F12", letterSpacing: "-0.04em", lineHeight: 1.08, margin: "0 0 28px" }}>
            Medical education has a reasoning gap. We&apos;re closing&nbsp;it.
          </h1>
        </FadeUp>
        <FadeUp delay={0.16}>
          <p style={{ fontSize: 18, color: "#6B6A65", lineHeight: 1.7, margin: 0, letterSpacing: "-0.01em", maxWidth: 640 }}>
            Medicine is taught as a knowledge problem. But knowledge alone doesn&apos;t save patients — clinical reasoning does. MedLab exists to give every medical student the deliberate practice environment that turns what they know into how they think.
          </p>
        </FadeUp>
      </div>
    </section>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="px-5 md:px-[80px]"><div style={{ height: 1, background: "#E8E6DF", maxWidth: 760, margin: "0 auto" }} /></div>
}

// ─── Story ────────────────────────────────────────────────────────────────────

function Story() {
  return (
    <section className="px-5 md:px-[80px]" style={{ paddingTop: 72, paddingBottom: 72 }}>
      <InView>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9B9A94", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 24 }}>The Story</span>
          <div className="flex flex-col gap-5" style={{ fontSize: 16, color: "#3D3C38", lineHeight: 1.8, letterSpacing: "-0.01em" }}>
            <p style={{ margin: 0 }}>
              MedLab started in a hospital corridor, not a boardroom. As a medical student, the gap was impossible to ignore: hours of lectures on pathophysiology, followed by a two-minute ward encounter where you were expected to reason out loud — with no real training in between. The knowledge was there. The clinical thinking wasn&apos;t.
            </p>
            <p style={{ margin: 0 }}>
              The existing tools weren&apos;t the answer. Question banks test recall. Simulations cost a faculty member&apos;s afternoon. Neither scales, and neither builds the mental models that matter when a patient is in front of you. We built MedLab because the problem is real and the cost of not solving it is real — measured in diagnostic errors, burnout, and students who graduate technically competent but clinically underprepared.
            </p>
            <p style={{ margin: 0 }}>
              The AI Attending at the core of MedLab is built around the Socratic model that the best clinical teachers use instinctively — asking the right question at the right moment rather than giving the answer. The goal is students who can reason, not students who can remember.
            </p>
          </div>
        </div>
      </InView>
    </section>
  )
}

// ─── TSMU ─────────────────────────────────────────────────────────────────────

function InstitutionalCredential() {
  return (
    <section className="px-5 md:px-[80px]" style={{ paddingTop: 0, paddingBottom: 80 }}>
      <InView>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ background: "#0E0F12", borderRadius: 20, padding: "36px 32px", position: "relative", overflow: "hidden" }}>
            <span style={{ position: "absolute", top: 16, right: 40, fontSize: 160, fontWeight: 700, color: "rgba(255,255,255,0.03)", lineHeight: 1, letterSpacing: "-0.05em", userSelect: "none" }}>&ldquo;</span>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div style={{ width: 48, height: 48, background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>TSMU</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>Tbilisi State Medical University</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>First institutional partner · 2024</p>
                </div>
              </div>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
                &ldquo;MedLab brought a level of clinical case interactivity we couldn&apos;t provide at scale ourselves. Students engage with it independently, and it shows in their reasoning on rounds.&rdquo;
              </p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: 0 }}>
                MedLab launched with TSMU — one of Georgia&apos;s largest medical institutions — as its first institutional partner. That relationship shapes how we build: closely, with real feedback from real medical educators.
              </p>
            </div>
          </div>
        </div>
      </InView>
    </section>
  )
}

// ─── Values ───────────────────────────────────────────────────────────────────

function Values() {
  const principles = [
    {
      number: "01",
      title: "Reasoning over recall",
      body: "Knowing a diagnosis is not the same as reaching one. Every feature we build is evaluated by one question: does this develop clinical thinking, or just reinforce memorization?",
    },
    {
      number: "02",
      title: "Honest over impressive",
      body: "AI that sounds confident but reasons poorly is worse than no AI at all. Our AI Attending is designed to guide and question — never to perform. If it doesn't know, it says so.",
    },
    {
      number: "03",
      title: "Access over exclusivity",
      body: "The best clinical reasoning training shouldn't depend on which school you attend or whether your institution can afford a simulation lab. The free tier exists because we mean it.",
    },
  ]

  return (
    <section className="px-5 md:px-[80px]" style={{ background: "#F0EDE6", paddingTop: 80, paddingBottom: 80 }}>
      <InView>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9B9A94", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 12 }}>What We Believe</span>
          <h2 style={{ fontWeight: 700, fontSize: "clamp(26px, 3vw, 40px)", color: "#0E0F12", letterSpacing: "-0.04em", lineHeight: 1.1, margin: "0 0 48px" }}>
            Three principles that guide every decision.
          </h2>
          <div className="flex flex-col gap-0">
            {principles.map(({ number, title, body }, i) => (
              <div key={number} className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-start" style={{ paddingTop: i === 0 ? 0 : 32, paddingBottom: 32, borderBottom: i < principles.length - 1 ? "1px solid #E0DDD6" : "none" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#C5C2BB", letterSpacing: "0.05em", flexShrink: 0, paddingTop: 3 }}>{number}</span>
                <div className="flex flex-col gap-2">
                  <h3 style={{ fontWeight: 700, fontSize: 17, color: "#0E0F12", letterSpacing: "-0.02em", margin: 0 }}>{title}</h3>
                  <p style={{ fontSize: 14, color: "#6B6A65", lineHeight: 1.7, margin: 0 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </InView>
    </section>
  )
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="px-5 md:px-[80px]" style={{ paddingTop: 80, paddingBottom: 80 }}>
      <InView>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8" style={{ background: "#0E0F12", borderRadius: 20, padding: "48px 40px" }}>
            <div className="flex flex-col gap-3">
              <h2 style={{ fontWeight: 700, fontSize: "clamp(22px, 3vw, 32px)", color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2, margin: 0 }}>
                Ready to bring this to your institution?
              </h2>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, margin: 0, maxWidth: 360 }}>
                We work directly with medical schools and universities to roll out MedLab for cohorts of 50 or more.
              </p>
            </div>
            <div className="flex flex-col gap-3" style={{ flexShrink: 0 }}>
              <Button variant="white" size="lg" asChild>
                <Link href="https://cal.com/medlab" target="_blank">Book a Demo</Link>
              </Button>
              <Button variant="ghost-dark" asChild>
                <Link href="/">Start Learning Free</Link>
              </Button>
            </div>
          </div>
        </div>
      </InView>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", minHeight: "100vh" }} className="overflow-x-clip">
      <SharedNavbar active="About" />
      <Mission />
      <Divider />
      <Story />
      <InstitutionalCredential />
      <Values />
      <CTA />
      <SharedFooter />
    </div>
  )
}
