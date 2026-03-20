"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { buildStudentAppUrl } from "@/app/lib/runtimeUrls"

const navLinks = [
  { label: "For Students", href: "/" },
  { label: "For Institutions", href: "/institutions" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
]

export function SharedNavbar({ active }: { active?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="sticky top-0 z-50" style={{ backgroundColor: "#F8F7F2", borderBottom: "1px solid #E8E6DF" }}>
      {/* Main bar */}
      <nav className="grid grid-cols-3 items-center px-5 md:px-[80px]" style={{ height: 68 }}>
        {/* Logo */}
        <Link href="/">
          <img src="/logo.svg" alt="MedLab" style={{ height: 20 }} />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center justify-center gap-9">
          {navLinks.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              style={{
                fontSize: 14,
                fontWeight: active === label ? 600 : 500,
                color: active === label ? "#0E0F12" : "#6B6A65",
                letterSpacing: "-0.01em",
              }}
              className="hover:text-[#0E0F12] transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right: desktop CTAs + mobile hamburger */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href={buildStudentAppUrl("/student/login")}
            style={{ fontSize: 14, fontWeight: 600, color: "#0E0F12", padding: "8px 16px" }}
            className="hidden md:block hover:text-[#0066FF] transition-colors"
          >
            Log in
          </Link>
          <Button size="sm" className="hidden md:inline-flex" asChild>
            <Link href={buildStudentAppUrl("/student/signup")}>Start Learning</Link>
          </Button>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col justify-center gap-[5px] p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ background: "none", border: "none", cursor: "pointer" }}
            aria-label="Menu"
          >
            <span style={{ display: "block", width: 22, height: 2, background: "#0E0F12", borderRadius: 2, transition: "all 0.2s", transform: mobileOpen ? "translateY(7px) rotate(45deg)" : "none" }} />
            <span style={{ display: "block", width: 22, height: 2, background: "#0E0F12", borderRadius: 2, transition: "all 0.2s", opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ display: "block", width: 22, height: 2, background: "#0E0F12", borderRadius: 2, transition: "all 0.2s", transform: mobileOpen ? "translateY(-7px) rotate(-45deg)" : "none" }} />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden flex flex-col px-5 pb-6 gap-1" style={{ borderTop: "1px solid #E8E6DF" }}>
          {navLinks.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMobileOpen(false)}
              style={{
                fontSize: 15,
                fontWeight: active === label ? 600 : 500,
                color: active === label ? "#0E0F12" : "#6B6A65",
                padding: "12px 0",
                borderBottom: "1px solid #F0EDE6",
                textDecoration: "none",
              }}
            >
              {label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 mt-4">
            <Button variant="outline" className="w-full" asChild>
              <Link href={buildStudentAppUrl("/student/login")} onClick={() => setMobileOpen(false)}>Log in</Link>
            </Button>
            <Button className="w-full" asChild>
              <Link href={buildStudentAppUrl("/student/signup")} onClick={() => setMobileOpen(false)}>Start Learning</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
