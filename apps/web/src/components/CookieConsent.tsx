"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
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

export function CookieConsent() {
  const [consent, setConsent] = useState<CookieConsentState>(defaultConsent)
  const [isOpen, setIsOpen] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)

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
      setShowPreferences(true)
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
    setShowPreferences(false)
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-500">
              Cookie preferences
            </p>
            <h2 className="text-2xl font-black text-slate-900">
              We use cookies to keep MedLab secure and improve learning.
            </h2>
            <p className="text-sm text-slate-600">
              Essential cookies support sign-in, security, and core features. Optional analytics or
              marketing cookies are used only if you opt in. You can update your choices anytime in
              Cookie settings.
            </p>
            <p className="text-sm text-slate-500">
              Read our{" "}
              <Link href="/privacy" className="font-semibold text-blue-600 hover:underline">
                Privacy Policy
              </Link>{" "}
              for details.
            </p>
          </div>

          <div className={cn("mt-6 grid gap-4", showPreferences ? "md:grid-cols-3" : "md:grid-cols-2")}>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Essential</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Required for authentication and security.
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-600">Always on</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Analytics</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Helps us improve content and learning flows.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={consent.analytics}
                  onChange={(event) =>
                    setConsent((prev) => ({
                      ...prev,
                      analytics: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>

            {showPreferences && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Marketing</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Used for relevant updates and outreach.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={consent.marketing}
                    onChange={(event) =>
                      setConsent((prev) => ({
                        ...prev,
                        marketing: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleSave({ analytics: true, marketing: true })}
              >
                Accept all
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleSave({ analytics: false, marketing: false })}
              >
                Reject non-essential
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {!showPreferences && (
                <button
                  type="button"
                  onClick={() => setShowPreferences(true)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Manage preferences
                </button>
              )}
              {showPreferences && (
                <button
                  type="button"
                  onClick={() =>
                    handleSave({
                      analytics: consent.analytics,
                      marketing: consent.marketing,
                    })
                  }
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Save preferences
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
