"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const CONSENT_COOKIE = "medlab_cookie_consent"
const CONSENT_VERSION = "1"

type CookieConsentState = {
  version: string
  essential: true
  analytics: boolean
  marketing: boolean
  updatedAt: string
}

const defaultConsent: CookieConsentState = {
  version: CONSENT_VERSION,
  essential: true,
  analytics: false,
  marketing: false,
  updatedAt: "",
}

function readConsentCookie(): CookieConsentState | null {
  if (typeof document === "undefined") return null
  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))
  if (!match) return null

  try {
    const rawValue = match.substring(CONSENT_COOKIE.length + 1)
    const parsed = JSON.parse(decodeURIComponent(rawValue)) as Partial<CookieConsentState>
    if (parsed.version !== CONSENT_VERSION) return null
    if (typeof parsed.analytics !== "boolean" || typeof parsed.marketing !== "boolean") return null
    return {
      version: CONSENT_VERSION,
      essential: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: parsed.updatedAt ?? "",
    }
  } catch {
    return null
  }
}

function writeConsentCookie(consent: CookieConsentState) {
  const value = encodeURIComponent(JSON.stringify(consent))
  const secureFlag = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secureFlag}`
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-[10px] transition-colors",
        checked ? "bg-[#0066FF]" : "bg-[#E8E6DF]"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        )}
      />
    </button>
  )
}

export function CookieConsent() {
  const [consent, setConsent] = useState<CookieConsentState>(defaultConsent)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const stored = readConsentCookie()
    if (stored) {
      setConsent(stored)
      setIsOpen(false)
    } else {
      setIsOpen(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handleOpen = () => {
      setIsOpen(true)
    }
    window.addEventListener("medlab:open-cookie-settings", handleOpen)
    return () => window.removeEventListener("medlab:open-cookie-settings", handleOpen)
  }, [])

  const handleSave = (next: Omit<CookieConsentState, "updatedAt" | "version" | "essential">) => {
    const updated: CookieConsentState = {
      version: CONSENT_VERSION,
      essential: true,
      analytics: next.analytics,
      marketing: next.marketing,
      updatedAt: new Date().toISOString(),
    }
    setConsent(updated)
    writeConsentCookie(updated)
    setIsOpen(false)
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-6 sm:px-6">
      <div
        className="mx-auto max-w-[860px] rounded-[20px] border border-[#E8E6DF] bg-white"
        style={{ boxShadow: "0 20px 60px rgba(14,15,18,0.12), 0 4px 16px rgba(14,15,18,0.06)" }}
      >
        <div className="flex flex-col gap-5 px-8 pb-6 pt-7">
          {/* Header */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#0066FF" strokeWidth="1.5" />
                <circle cx="5" cy="6" r="1.2" fill="#0066FF" />
                <circle cx="10" cy="5" r="1" fill="#0066FF" opacity="0.5" />
                <circle cx="7" cy="10" r="1.4" fill="#0066FF" opacity="0.7" />
                <circle cx="11" cy="9" r="0.8" fill="#0066FF" opacity="0.4" />
              </svg>
              <span className="text-[13px] font-semibold text-[#0E0F12]">Cookie preferences</span>
            </div>
            <p className="text-[13px] leading-[19px] text-[#6B6A65]">
              We use cookies to keep MedLab secure and improve your learning experience. Essential cookies are always active.
            </p>
          </div>

          {/* Toggle categories */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Essential */}
            <div className="flex items-center gap-3 rounded-[12px] bg-[#F5F5F3] px-4 py-3">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-[#0E0F12]">Essential</span>
                <span className="text-[11px] text-[#9B9A94]">Auth &amp; security</span>
              </div>
              <Toggle checked={true} onChange={() => {}} />
            </div>

            {/* Analytics */}
            <div className="flex items-center gap-3 rounded-[12px] border border-[#E8E6DF] bg-white px-4 py-3">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-[#0E0F12]">Analytics</span>
                <span className="text-[11px] text-[#9B9A94]">Improve content</span>
              </div>
              <Toggle
                checked={consent.analytics}
                onChange={(v) => setConsent((prev) => ({ ...prev, analytics: v }))}
              />
            </div>

            {/* Marketing */}
            <div className="flex items-center gap-3 rounded-[12px] border border-[#E8E6DF] bg-white px-4 py-3">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold text-[#0E0F12]">Marketing</span>
                <span className="text-[11px] text-[#9B9A94]">Relevant outreach</span>
              </div>
              <Toggle
                checked={consent.marketing}
                onChange={(v) => setConsent((prev) => ({ ...prev, marketing: v }))}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[#9B9A94]">
              Read our{" "}
              <Link href="/privacy" className="font-medium text-[#0066FF] hover:underline">
                Privacy Policy
              </Link>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSave({ analytics: false, marketing: false })}
                className="rounded-[9px] border-[1.5px] border-[#D8D5CC] bg-[#F8F7F2] px-5 py-2.5 text-[13px] font-medium text-[#6B6A65] shadow-[0_3px_0_#D8D5CC] transition-all active:translate-y-[3px] active:shadow-none"
              >
                Reject all
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSave({
                    analytics: consent.analytics,
                    marketing: consent.marketing,
                  })
                }
                className="rounded-[9px] border-[1.5px] border-[#D8D5CC] bg-[#F8F7F2] px-5 py-2.5 text-[13px] font-medium text-[#0E0F12] shadow-[0_3px_0_#D8D5CC] transition-all active:translate-y-[3px] active:shadow-none"
              >
                Save preferences
              </button>
              <button
                type="button"
                onClick={() => handleSave({ analytics: true, marketing: true })}
                className="rounded-[9px] border-[1.5px] border-[#0047CC] bg-[#0066FF] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_3px_0_#0047CC] transition-all active:translate-y-[3px] active:shadow-none"
              >
                Accept all
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
