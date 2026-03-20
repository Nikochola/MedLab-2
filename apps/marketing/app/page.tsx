import Link from "next/link"
import { Button } from "@/components/ui/button"
import { buildStudentAppUrl } from "./lib/runtimeUrls"
import { SharedNavbar } from "@/components/sections/SharedNavbar"
import { SharedFooter } from "@/components/sections/SharedFooter"
import { FadeUp } from "@/components/motion/FadeUp"
import { InView } from "@/components/motion/InView"

// ─── Shared icons ─────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
      <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#0066FF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}


// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="flex flex-col items-center text-center px-5 md:px-[80px]"
      style={{ paddingTop: 100, paddingBottom: 80 }}
    >
      {/* Badge */}
      <FadeUp delay={0}>
        <div
          className="flex items-center gap-2 mb-12"
          style={{
            background: "#EEF3FF",
            border: "1px solid #C7D9FF",
            borderRadius: 100,
            padding: "6px 14px 6px 10px",
          }}
        >
          <div style={{ width: 7, height: 7, background: "#0066FF", borderRadius: "50%", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#0047CC", letterSpacing: "0.06em" }}>
            NOW AVAILABLE FOR STUDENTS
          </span>
        </div>
      </FadeUp>

      {/* Headline */}
      <FadeUp delay={0.08}>
        <div className="flex flex-col items-center mb-6" style={{ maxWidth: 820 }}>
          <h1
            style={{
              fontWeight: 700,
              fontSize: "clamp(52px, 6vw, 80px)",
              color: "#0E0F12",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Learn Medicine
          </h1>
          <h1
            style={{
              fontWeight: 700,
              fontSize: "clamp(52px, 6vw, 80px)",
              color: "#0066FF",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            by Solving Cases
          </h1>
        </div>
      </FadeUp>

      {/* Subtext */}
      <FadeUp delay={0.16}>
        <p
          className="mb-12"
          style={{ fontSize: 20, fontWeight: 400, color: "#6B6A65", lineHeight: 1.55, maxWidth: 520, letterSpacing: "-0.02em" }}
        >
          Train with interactive ECGs, X-rays, and patient scenarios designed to build real diagnostic confidence.
        </p>
      </FadeUp>

      {/* CTAs */}
      <FadeUp delay={0.24}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <Button>Start Learning Free</Button>
          <Button variant="outline">For Institutions</Button>
        </div>
      </FadeUp>

      {/* Disclaimer */}
      <FadeUp delay={0.3}>
        <p style={{ fontSize: 13, fontWeight: 400, color: "#9B9A94" }}>
          No credit card required · Free forever for students
        </p>
      </FadeUp>
    </section>
  )
}

// ─── Hero UI Preview ──────────────────────────────────────────────────────────

function HeroPreview() {
  return (
    <InView className="px-5 md:px-[80px]">
    <div
      className="mx-auto flex overflow-hidden"
      style={{
        maxWidth: 1280,
        background: "#EEF3FF",
        border: "1.5px solid #C7D9FF",
        borderRadius: 20,
      }}
    >
      {/* ECG Panel */}
      <div
        className="flex-1 flex flex-col gap-5"
        style={{ padding: "32px 36px", borderRight: "1px solid #C7D9FF" }}
      >
        {/* Patient header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ width: 9, height: 9, background: "#22C55E", borderRadius: "50%" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0E0F12" }}>Patient: Male, 58</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#6B6A65" }}>HR 88 · BP 142/90 · SpO₂ 96%</span>
        </div>

        {/* ECG dark display */}
        <div
          className="flex-1 flex flex-col justify-center gap-3"
          style={{ background: "#0E0F12", borderRadius: 12, padding: "20px 24px" }}
        >
          <svg width="100%" height="72" viewBox="0 0 680 72" preserveAspectRatio="none">
            <defs>
              <pattern id="ecg-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a3a2a" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="680" height="72" fill="url(#ecg-grid)" />
            <polyline
              points="0,36 30,36 40,34 50,38 60,8 70,64 80,36 110,36 140,36 150,34 160,38 170,8 180,64 190,36 220,36 250,36 260,34 270,38 280,8 290,64 300,36 330,36 360,36 370,34 380,38 390,8 400,64 410,36 440,36 470,36 480,34 490,38 500,8 510,64 520,36 550,36 580,36 590,34 600,38 610,8 620,64 630,36 680,36"
              fill="none"
              stroke="#0066FF"
              strokeWidth="1.5"
            />
          </svg>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 10, fontWeight: 600, color: "#3B82F6", letterSpacing: "0.08em" }}>LEAD II</span>
            <span style={{ fontSize: 10, fontWeight: 400, color: "#6B6A65" }}>25mm/s · 10mm/mV</span>
          </div>
        </div>
      </div>

      {/* AI Chat Panel */}
      <div className="hidden md:flex flex-col gap-4" style={{ width: 360, flexShrink: 0, padding: "28px 32px" }}>
        {/* Panel header */}
        <div className="flex items-center gap-2 mb-1">
          <div
            style={{
              width: 26, height: 26, background: "#0066FF", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="white" strokeWidth="1.4" />
              <path d="M6.5 4V6.5L8 8" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0E0F12" }}>AI Attending</span>
          <div
            className="ml-auto"
            style={{ background: "#DCFCE7", borderRadius: 100, padding: "3px 10px" }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: "#15803D" }}>Online</span>
          </div>
        </div>

        {/* Chat bubbles */}
        <div
          style={{
            background: "#0066FF",
            borderRadius: "14px 14px 14px 4px",
            padding: "12px 15px",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 400, color: "#fff", lineHeight: 1.55, margin: 0 }}>
            What do you notice about the PR interval here? Consider the AV node.
          </p>
        </div>
        <div
          style={{
            background: "#fff",
            border: "1px solid #E8E6DF",
            borderRadius: "14px 14px 4px 14px",
            padding: "12px 15px",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 400, color: "#0E0F12", lineHeight: 1.55, margin: 0 }}>
            The PR interval looks prolonged — first-degree AV block?
          </p>
        </div>
        <div
          style={{
            background: "#0066FF",
            borderRadius: "14px 14px 14px 4px",
            padding: "12px 15px",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 400, color: "#fff", lineHeight: 1.55, margin: 0 }}>
            Exactly. Now — what&apos;s the clinical significance given his current medications?
          </p>
        </div>
      </div>
    </div>
    </InView>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features() {
  return (
    <section className="px-5 md:px-[80px]" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <InView>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Header */}
        <div className="flex flex-col gap-4 mb-14">
          <span
            style={{ fontSize: 12, fontWeight: 700, color: "#0066FF", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            What you&apos;ll practice
          </span>
          <h2
            style={{ fontWeight: 700, fontSize: "clamp(36px, 4vw, 56px)", color: "#0E0F12", letterSpacing: "-0.04em", lineHeight: 1.08, margin: 0 }}
          >
            Stop Memorizing.<br />Start Diagnosing.
          </h2>
        </div>

        {/* Row 1 */}
        <div className="flex flex-col md:flex-row gap-4 mb-4" style={{ alignItems: "stretch" }}>
          {/* Dark ECG card */}
          <div
            className="flex flex-col gap-5"
            style={{
              flex: 2,
              background: "#0E0F12",
              borderRadius: 20,
              padding: "36px 40px",
              minHeight: 280,
            }}
          >
            <div
              style={{
                width: 40, height: 40, background: "rgba(0,102,255,0.2)",
                borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 10h3l2-6 3 12 2-9 2 5 2-2h2" stroke="#0066FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex flex-col gap-2">
              <h3 style={{ fontWeight: 700, fontSize: 22, color: "#fff", letterSpacing: "-0.03em", margin: 0 }}>Live ECGs &amp; Vitals</h3>
              <p style={{ fontSize: 14, fontWeight: 400, color: "#9B9A94", lineHeight: 1.6, margin: 0 }}>
                Interpret dynamic 12-lead ECGs and real-time telemetry just like you would on the wards.
              </p>
            </div>
            {/* Mini ECG */}
            <div
              className="mt-auto"
              style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "14px 18px", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <svg width="100%" height="40" viewBox="0 0 400 40" preserveAspectRatio="none">
                <polyline
                  points="0,20 20,20 28,18 36,22 44,2 52,38 60,20 90,20 120,20 128,18 136,22 144,2 152,38 160,20 190,20 220,20 228,18 236,22 244,2 252,38 260,20 290,20 320,20 328,18 336,22 344,2 352,38 360,20 400,20"
                  fill="none" stroke="#0066FF" strokeWidth="1.4"
                />
              </svg>
            </div>
          </div>

          {/* Light AI Tutor card */}
          <div
            className="flex flex-col gap-5"
            style={{
              flex: 1.3,
              background: "#EEF3FF",
              borderRadius: 20,
              padding: "36px 40px",
              minHeight: 280,
            }}
          >
            <div
              style={{
                width: 40, height: 40, background: "#fff",
                border: "1.5px solid #C7D9FF", borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="8" r="4.5" stroke="#0066FF" strokeWidth="1.6" />
                <path d="M10 12.5V14m-2 2h4" stroke="#0066FF" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M8.5 8h.01M11.5 8h.01" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-col gap-2">
              <h3 style={{ fontWeight: 700, fontSize: 22, color: "#0E0F12", letterSpacing: "-0.03em", margin: 0 }}>AI Socratic Tutor</h3>
              <p style={{ fontSize: 14, fontWeight: 400, color: "#6B6A65", lineHeight: 1.6, margin: 0 }}>
                Your AI Attending guides you with questions and hints — enforcing clinical reasoning, never just giving the answer.
              </p>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex flex-col md:flex-row gap-4">
          {[
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7 2v6l-3 5.5a1.8 1.8 0 001.6 2.5h8.8A1.8 1.8 0 0016 13.5L13 8V2" stroke="#EA580C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6.5 2h7" stroke="#EA580C" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              ),
              iconBg: "#FFF7ED",
              title: "Lab Panels",
              desc: "Order CBCs, BMPs, and specific assays. Results respond dynamically to your clinical decisions.",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2C6.13 2 3 5.13 3 9c0 2.5 1.4 4.7 3.5 5.85L10 18l3.5-3.15A6.5 6.5 0 0017 9c0-3.87-3.13-7-7-7z" stroke="#16A34A" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M10 7v4M8 9h4" stroke="#16A34A" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              ),
              iconBg: "#F0FDF4",
              title: "Physical Exams",
              desc: "Extract critical findings from simulated assessments — auscultation, percussion, palpation.",
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="2" width="16" height="16" rx="3" stroke="#9333EA" strokeWidth="1.6" />
                  <path d="M7 10h6M10 7v6" stroke="#9333EA" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              ),
              iconBg: "#FAF5FF",
              title: "Imaging & X-Rays",
              desc: "Read chest X-rays, CTs, and more. Build radiological confidence with guided image interpretation.",
            },
          ].map(({ icon, iconBg, title, desc }) => (
            <div
              key={title}
              className="flex flex-col gap-5"
              style={{
                flex: 1,
                background: "#fff",
                border: "1.5px solid #E8E6DF",
                borderRadius: 20,
                padding: "36px",
              }}
            >
              <div style={{ width: 40, height: 40, background: iconBg, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {icon}
              </div>
              <div className="flex flex-col gap-2">
                <h3 style={{ fontWeight: 700, fontSize: 20, color: "#0E0F12", letterSpacing: "-0.02em", margin: 0 }}>{title}</h3>
                <p style={{ fontSize: 14, fontWeight: 400, color: "#6B6A65", lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </InView>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────

const steps = [
  {
    num: "01",
    title: "Read the Case",
    desc: "A realistic patient with chief complaint, vitals, and history to get started.",
    highlight: false,
  },
  {
    num: "02",
    title: "Order Tests",
    desc: "Request labs, ECGs, and imaging. Results are generated dynamically for your case.",
    highlight: false,
  },
  {
    num: "03",
    title: "Discuss with AI",
    desc: "Your AI Attending pushes your reasoning — asking questions, never just giving the answer.",
    highlight: true,
  },
  {
    num: "04",
    title: "Confirm Diagnosis",
    desc: "Submit your final diagnosis and treatment plan. Receive personalised feedback.",
    highlight: false,
  },
]

function HowItWorks() {
  return (
    <section className="px-5 md:px-[80px]" style={{ background: "#0E0F12", paddingTop: 100, paddingBottom: 100 }}>
      <InView>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Header */}
        <div className="flex items-end justify-between mb-14">
          <div className="flex flex-col gap-4">
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0066FF", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              The Process
            </span>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(36px, 4vw, 56px)", color: "#fff", letterSpacing: "-0.04em", lineHeight: 1.08, margin: 0 }}>
              Four steps to<br />clinical mastery.
            </h2>
          </div>
          <p style={{ fontSize: 15, fontWeight: 400, color: "#6B6A65", lineHeight: 1.65, maxWidth: 300, margin: 0 }}>
            Every session mirrors real clinical decision-making — from chief complaint to confirmed diagnosis.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col md:flex-row gap-[2px]">
          {steps.map(({ num, title, desc, highlight }) => (
            <div
              key={num}
              className="flex-1 flex flex-col gap-5"
              style={{
                background: highlight ? "#0066FF" : "rgba(255,255,255,0.04)",
                border: highlight ? "none" : "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16,
                padding: "32px 28px",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 44,
                    color: highlight ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                  }}
                >
                  {num}
                </span>
                <div
                  style={{
                    width: 32, height: 32,
                    background: highlight ? "rgba(255,255,255,0.2)" : "rgba(0,102,255,0.15)",
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3.5 3.5 5.5-7" stroke={highlight ? "white" : "#0066FF"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h4 style={{ fontWeight: 700, fontSize: 17, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>{title}</h4>
                <p style={{ fontSize: 13, fontWeight: 400, color: highlight ? "rgba(255,255,255,0.72)" : "#6B6A65", lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </InView>
    </section>
  )
}

// ─── For Everyone ─────────────────────────────────────────────────────────────

const audiences = [
  {
    label: "Medical Students",
    title: "Build diagnostic confidence from day one.",
    desc: "Practice clinical reasoning with guided patient cases, interactive diagnostics, and an AI tutor that doesn't just tell you — it teaches you to think.",
    bullets: ["USMLE Step prep built in", "Free for students, always", "Progress tracking and performance insights"],
  },
  {
    label: "Educators",
    title: "Assign cases. Track reasoning. Give better feedback.",
    desc: "Create and assign clinical cases to your students. See where they struggled, what reasoning paths they took, and where to focus your teaching.",
    bullets: ["Analytics on student attempts and performance", "Roster and cohort management"],
  },
  {
    label: "For Institutions",
    title: "Deploy MedLab across your entire program.",
    desc: "Invite-only workspaces, role-based portals, and org-wide analytics. Integrate MedLab into your curriculum with full administrative control.",
    bullets: ["Invite-only, controlled access", "Custom pilot access — contact us"],
  },
]

function ForEveryone() {
  return (
    <section className="px-5 md:px-[80px]" style={{ paddingTop: 100, paddingBottom: 100 }}>
      <InView>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Header */}
        <div className="flex flex-col gap-4 mb-14" style={{ maxWidth: 500 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0066FF", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Built for every stage
          </span>
          <h2 style={{ fontWeight: 700, fontSize: "clamp(36px, 4vw, 52px)", color: "#0E0F12", letterSpacing: "-0.04em", lineHeight: 1.1, margin: 0 }}>
            The right tool at<br />every level of training.
          </h2>
        </div>

        {/* Audience cards */}
        <div className="flex flex-col md:flex-row gap-4">
          {audiences.map(({ label, title, desc, bullets }) => (
            <div
              key={label}
              className="flex-1 flex flex-col"
              style={{ border: "1.5px solid #E8E6DF", borderRadius: 20, overflow: "hidden" }}
            >
              {/* Card header */}
              <div style={{ background: "#F0EDE6", padding: "20px 28px", borderBottom: "1.5px solid #E8E6DF" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#0E0F12" }}>{label}</span>
              </div>
              {/* Card body */}
              <div className="flex flex-col gap-5 flex-1" style={{ padding: "28px 28px 32px" }}>
                <div className="flex flex-col gap-3">
                  <h3 style={{ fontWeight: 700, fontSize: 18, color: "#0E0F12", letterSpacing: "-0.02em", lineHeight: 1.35, margin: 0 }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: 14, fontWeight: 400, color: "#6B6A65", lineHeight: 1.65, margin: 0 }}>{desc}</p>
                </div>
                <ul className="flex flex-col gap-2 mt-auto">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <div
                        style={{
                          width: 18, height: 18, background: "#EEF3FF",
                          borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}
                      >
                        <CheckIcon />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#0E0F12" }}>{b}</span>
                    </li>
                  ))}
                </ul>
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
    <InView>
    <div className="px-5 md:px-[80px]" style={{ marginBottom: 80 }}>
    <div
      className="mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-8"
      style={{
        maxWidth: 1280,
        background: "#0066FF",
        borderRadius: 24,
        padding: "60px 40px",
      }}
    >
      <div className="flex flex-col gap-4" style={{ maxWidth: 540 }}>
        <h2
          style={{
            fontWeight: 700,
            fontSize: "clamp(32px, 4vw, 56px)",
            color: "#fff",
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          Ready to think like a doctor?
        </h2>
        <p style={{ fontSize: 17, fontWeight: 400, color: "rgba(255,255,255,0.72)", lineHeight: 1.6, margin: 0 }}>
          Join medical students building real diagnostic confidence with AI-guided patient cases.
        </p>
      </div>
      <div className="flex flex-col items-end gap-3" style={{ flexShrink: 0 }}>
        <Button variant="white" size="lg" asChild>
          <Link href={buildStudentAppUrl("/student/signup")}>Start Learning Free</Link>
        </Button>
        <Button variant="ghost-dark" size="lg" asChild>
          <Link href="/institutions">Request Institution Access</Link>
        </Button>
      </div>
    </div>
    </div>
    </InView>
  )
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: "#F8F7F2", color: "#0E0F12", minHeight: "100vh" }} className="overflow-x-clip">
      <SharedNavbar />
      <Hero />
      <HeroPreview />
      <Features />
      <HowItWorks />
      <ForEveryone />
      <CTA />
      <SharedFooter />
    </div>
  )
}
