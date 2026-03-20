"use client"

import Link from "next/link"
import { HeartPulse, ScanSearch, Activity, Stethoscope, ClipboardCheck, ArrowRight } from "lucide-react"

const sections = [
  {
    title: "ECG",
    icon: HeartPulse,
    accent: "#0066FF",
    accentLight: "#EEF3FF",
    items: [
      {
        title: "Simulation",
        description: "Interactive ECG rhythm interpretation with AI feedback.",
        href: "/ecg/practice",
        icon: Stethoscope,
      },
      {
        title: "Cases",
        description: "Clinical case sets with full 12-lead ECG workups.",
        href: "/ecg/cases",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    title: "X-Ray",
    icon: ScanSearch,
    accent: "#0E0F12",
    accentLight: "#F5F5F3",
    items: [
      {
        title: "Simulation",
        description: "Systematic chest X-ray review and pattern recognition.",
        href: "/xray/practice",
        icon: Stethoscope,
      },
      {
        title: "Cases",
        description: "Real-world radiograph cases with guided interpretation.",
        href: "/xray/cases",
        icon: ClipboardCheck,
      },
    ],
  },
  {
    title: "CT Scan",
    icon: Activity,
    accent: "#0E0F12",
    accentLight: "#F5F5F3",
    items: [
      {
        title: "Simulation",
        description: "Axial thoracic CT slices. Nodule detection, mass classification, and screening patterns.",
        href: "/ct/practice",
        icon: Stethoscope,
      },
      {
        title: "Cases",
        description: "CT case studies with clinical history and guided reporting.",
        href: "/ct/cases",
        icon: ClipboardCheck,
      },
    ],
  },
]

export default function SimulationsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="space-y-10">
        {sections.map((section) => (
          <div key={section.title}>
            {/* Section header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: section.accentLight }}
              >
                <section.icon className="h-[18px] w-[18px]" style={{ color: section.accent }} />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: "#0E0F12" }}>{section.title}</h2>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-4 rounded-2xl px-5 py-4 transition-colors"
                  style={{ border: "1px solid #E8E6DF" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C7D9FF"; e.currentTarget.style.backgroundColor = "#FAFAFA" }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8E6DF"; e.currentTarget.style.backgroundColor = "transparent" }}
                >
                  <item.icon className="h-5 w-5 shrink-0" style={{ color: "#9B9A94" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold" style={{ color: "#0E0F12" }}>{item.title}</p>
                    <p className="text-sm mt-0.5" style={{ color: "#9B9A94" }}>{item.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: "#9B9A94" }} />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
