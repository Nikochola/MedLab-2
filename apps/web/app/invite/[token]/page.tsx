"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2, Lock, Mail, User } from "lucide-react"
import { toast } from "sonner"

import { acceptInstitutionInvite, validateInstitutionInviteToken } from "@/server/actions/auth"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

    const formData = new FormData(event.currentTarget)
    const password = String(formData.get("password") || "")

    const result = await acceptInstitutionInvite(params.token, password)

    if ("error" in result && result.error) {
      toast.error(result.error)
      setIsAccepting(false)
      return
    }

    const signInResult = await supabase.auth.signInWithPassword({
      email: result.email,
      password
    })

    if (signInResult.error) {
      toast.error(signInResult.error.message)
      setIsAccepting(false)
      return
    }

    toast.success("Account activated. Redirecting...")
    router.push(result.destination ?? "/learn")
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc]">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc]">
        <Card className="max-w-md w-full rounded-3xl border-2 border-red-100 p-8 text-center shadow-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="mb-4 text-2xl font-black text-[#232a39]">Invite Invalid</h1>
          <p className="mb-8 text-sm font-bold text-[#6f7c8f]">{error}</p>
          <Button onClick={() => router.push("/institution/login")} className="h-12 w-full rounded-xl bg-[#232a39] text-white hover:bg-black">
            Go to Login
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 border-2 border-[#e5e5e5] rounded-3xl shadow-xl">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black text-[#232a39] mb-2">Join {invite?.institution_name}</h1>
          <p className="text-sm font-semibold text-[#6f7c8f]">
            Complete your account to access the {invite?.role === "STUDENT" ? "student" : invite?.role === "EDUCATOR" ? "educator" : "administrator"} portal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Full Name</Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#afafaf]" />
              <Input disabled value={invite?.full_name} className="pl-12 h-14 rounded-xl border-2 border-[#f7f9fc] bg-[#f7f9fc] font-bold text-[#232a39]" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#afafaf]" />
              <Input disabled value={invite?.email} className="pl-12 h-14 rounded-xl border-2 border-[#f7f9fc] bg-[#f7f9fc] font-bold text-[#232a39]" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-[#afafaf]">Set Your Password</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#afafaf]" />
              <Input id="password" name="password" type="password" placeholder="At least 8 characters" required className="pl-12 h-14 rounded-xl border-2 border-[#e5e5e5] focus:border-blue-500 transition-all font-bold" />
            </div>
          </div>

          <Button type="submit" disabled={isAccepting} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-200">
            {isAccepting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Activate Account"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
