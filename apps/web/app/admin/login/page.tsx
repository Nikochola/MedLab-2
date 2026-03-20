"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push("/admin")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#0E0F12" }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}
      >
        <img src="/images/logo_black.svg" alt="MedLab" style={{ height: 20, filter: "brightness(0) invert(1)" }} />
        <div>
          <p
            className="text-xs font-semibold uppercase"
            style={{ letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)" }}
          >
            Platform Admin
          </p>
          <h2 className="mt-3 text-4xl font-bold leading-tight" style={{ color: "white" }}>
            Manage institutions,<br />send setup links.
          </h2>
          <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Internal tool for the MedLab team.
          </p>
        </div>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          © {new Date().getFullYear()} MedLab
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <img src="/images/logo_black.svg" alt="MedLab" style={{ height: 20, filter: "brightness(0) invert(1)" }} />
          </div>

          <p
            className="text-xs font-semibold uppercase"
            style={{ letterSpacing: "0.16em", color: "rgba(255,255,255,0.4)" }}
          >
            Sign in
          </p>
          <h1 className="mt-2 text-2xl font-bold" style={{ color: "white" }}>
            Admin Access
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Restricted to MedLab team members.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold uppercase"
                style={{ letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@getmedlab.com"
                className="h-11 w-full rounded-[9px] px-3.5 text-sm outline-none"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  color: "white",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-semibold uppercase"
                style={{ letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="h-11 w-full rounded-[9px] px-3.5 text-sm outline-none"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  color: "white",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0066FF")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            {error && (
              <p
                className="rounded-[9px] px-3.5 py-2.5 text-sm"
                style={{ backgroundColor: "rgba(185,28,28,0.2)", color: "#FCA5A5", border: "1px solid rgba(185,28,28,0.4)" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center rounded-[9px] text-sm font-semibold text-white transition-transform active:translate-y-[3px] active:shadow-none disabled:opacity-50"
              style={{
                backgroundColor: "#0066FF",
                border: "1.5px solid #0047CC",
                boxShadow: "0 3px 0 #0047CC",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
