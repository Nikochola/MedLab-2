"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type NavItem = {
  id: "students" | "universities" | "educators"
  label: string
  href: string
  menuItems?: { label: string; href: string }[]
}

const navItems: NavItem[] = [
  {
    id: "students",
    label: "Students",
    href: "#test-takers",
    menuItems: [
      { label: "Overview", href: "#students-overview" },
      { label: "Accepting institutions", href: "#students-accepting-institutions" },
      { label: "Test scoring", href: "#students-test-scoring" },
      { label: "Getting ready", href: "#students-getting-ready" },
    ],
  },
  { id: "universities", label: "Universities", href: "#institutions" },
  { id: "educators", label: "Educators", href: "#researchers" },
]

export function MarketingHeader() {
  const [activeMenu, setActiveMenu] = useState<NavItem["id"] | null>(null)
  const closeTimeoutRef = useRef<number | null>(null)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-[60px] w-full max-w-5xl items-center justify-between px-4 md:h-[72px] md:max-w-6xl md:px-8">
        <div className="flex items-center">
          <Link href="/" className="inline-flex items-center" aria-label="MedLab Home">
          <Image
            src="/images/logo_black.svg"
            alt="MedLab Logo"
            width={62}
            height={15}
            priority
            className="h-4 w-auto md:h-6"
          />
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <nav className="hidden items-center gap-1 text-sm text-slate-700 md:flex">
            {navItems.map((item) => {
              const isOpen = activeMenu === item.id && item.menuItems

              return (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => {
                    if (!item.menuItems) return
                    if (closeTimeoutRef.current !== null) {
                      window.clearTimeout(closeTimeoutRef.current)
                      closeTimeoutRef.current = null
                    }
                    setActiveMenu(item.id)
                  }}
                  onMouseLeave={() => {
                    if (!item.menuItems) return
                    if (closeTimeoutRef.current !== null) {
                      window.clearTimeout(closeTimeoutRef.current)
                    }
                    closeTimeoutRef.current = window.setTimeout(() => {
                      setActiveMenu(null)
                      closeTimeoutRef.current = null
                    }, 120)
                  }}
                >
                  {item.menuItems ? (
                    <Button variant="ghost" size="lg" className="px-2">
                      <span className="inline-flex items-center gap-0.5">
                        <span>{item.label}</span>
                        <ChevronDown
                          className={`h-6 w-6 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </span>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="lg"
                      asChild
                      className="px-2"
                    >
                      <Link href={item.href} className="inline-flex items-center gap-0.5">
                        <span>{item.label}</span>
                      </Link>
                    </Button>
                  )}

                  {isOpen && (
                    <div className="absolute left-1/2 top-full z-40 mt-1 -translate-x-1/2">
                      <Card variant="navDropdown" className="w-80 overflow-hidden">
                        <ul className="divide-y divide-slate-100">
                          {item.menuItems!.map((menuItem) => (
                            <li key={menuItem.label}>
                              <Link
                                href={menuItem.href}
                                className="block px-6 py-3 text-base font-semibold tracking-[0.15em] text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                              >
                                {menuItem.label.toUpperCase()}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="default" size="lg" className="px-4">
              Log in
            </Button>
            <Button variant="secondary" size="lg" className="px-4">
              Sign up
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
