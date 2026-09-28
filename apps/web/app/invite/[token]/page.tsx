"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import { acceptInstitutionInvite, validateInstitutionInviteToken } from "@/server/actions/auth"

export default function GenericInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [invite, setInvite] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verify() {
      const result = await validateInstitutionInviteToken(params.token)
      if ("error" in result && result.error) {
        setError(result.error)
      } else {
        setInvite(result.invite)
      }
      setIsLoading(false)
    }

    verify()
  }, [params.token])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsAccepting(true)

    const result = await acceptInstitutionInvite(params.token)

    if ("error" in result && result.error) {
      toast.error(result.error)
      setIsAccepting(false)
      return
    }

    if (!result.confirmationUrl) {
      toast.error("Could not create a secure sign-in link.")
      setIsAccepting(false)
      return
    }

    toast.success("Access confirmed. Signing you in securely...")
    window.location.assign(result.confirmationUrl)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f3ed]">
        <div className="flex items-center gap-3 text-sm font-medium text-[#65635d]"><Loader2 className="h-5 w-5 animate-spin text-[#0066ff]" /> Checking your invitation…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f3ed] p-5">
        <div className="w-full max-w-md rounded-2xl border border-[#e1ded6] bg-white p-7 text-center shadow-[0_18px_45px_rgba(21,20,17,0.08)] sm:p-9">
          <Image src="/images/logo_black.svg" alt="MedLab" width={112} height={24} className="mx-auto h-5 w-auto" priority />
          <div className="mx-auto mt-8 flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff1ef]">
            <AlertCircle className="h-5 w-5 text-[#b42318]" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#0e0f12]">This invitation is unavailable</h1>
          <p className="mt-2 text-sm leading-6 text-[#77746d]">{error}</p>
          <button onClick={() => router.push("/institution/login")} className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-[9px] bg-[#0e0f12] px-4 text-sm font-semibold text-white transition hover:bg-black">Go to institution login</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f3ed] p-5">
      <div className="w-full max-w-md rounded-2xl border border-[#e1ded6] bg-white p-7 shadow-[0_18px_45px_rgba(21,20,17,0.08)] sm:p-9">
        <Image src="/images/logo_black.svg" alt="MedLab" width={112} height={24} className="h-5 w-auto" priority />
        <div className="mt-9">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf8ef]">
            <CheckCircle2 className="h-5 w-5 text-[#24713a]" />
          </div>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.13em] text-[#0066ff]">Secure invitation</p>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.04em] text-[#0e0f12]">Join {invite?.institution_name}</h1>
          <p className="mt-3 text-sm leading-6 text-[#6b6a65]">Confirm your {invite?.role === "STUDENT" ? "student" : invite?.role === "EDUCATOR" ? "educator" : "administrator"} access. We’ll sign you in securely—no password setup is needed.</p>
        </div>

        <div className="mt-7 rounded-xl border border-[#e8e6df] bg-[#faf9f5] px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a8881]">Invited account</p>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#353431]"><Mail className="h-4 w-4 text-[#77746d]" /> {invite?.email}</div>
          {invite?.course_name ? <p className="mt-1.5 pl-6 text-xs text-[#77746d]">Class: {invite.course_name}</p> : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          <button type="submit" disabled={isAccepting} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0066ff] px-4 text-sm font-semibold text-white transition hover:bg-[#0057d9] disabled:cursor-wait disabled:opacity-70">
            {isAccepting ? <><Loader2 className="h-4 w-4 animate-spin" /> Confirming access…</> : "Accept and sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-[11px] leading-5 text-[#9a978f]">Only accept if you recognize this institution and email address.</p>
      </div>
    </div>
  )
}
