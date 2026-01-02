import { redirect } from "next/navigation"
import { createSupabaseAdminClient } from "@/lib/supabaseServer"
import { generateInviteToken, sendInviteEmail } from "@/lib/emailInvites"

interface TeacherInvitePageProps {
  params: { slug: string }
  searchParams?: { success?: string }
}

async function sendTeacherInvite(slug: string, email: string) {
  "use server"
  const admin = createSupabaseAdminClient()

  // fetch org by slug using service role (bypass RLS for public invite page)
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle()
  if (orgError || !org) {
    throw new Error("Organization not found")
  }

  const token = generateInviteToken()
  const { error: inviteError } = await admin.from("invites").insert({
    org_id: org.id,
    email,
    role: "teacher",
    token,
  })
  if (inviteError) {
    console.error("teacher invite insert failed", inviteError)
    throw new Error("Invite insert failed")
  }

  await sendInviteEmail(email, token, org.name ?? org.slug, "teacher", slug)

  redirect(`/org/${slug}/teacher-invite?success=1`)
}

export default function TeacherInvitePage({ params, searchParams }: TeacherInvitePageProps) {
  const success = searchParams?.success === "1"

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
      <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Teacher onboarding</p>
          <h1 className="text-2xl font-bold">Join as a teacher</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to receive an invite link. You will set your password after opening the link.
          </p>
        </div>
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            Invite sent. Check your email to set your password.
          </div>
        )}
        <form
          action={async (formData) => {
            "use server"
            const email = (formData.get("email") as string | null)?.trim() ?? ""
            if (!email) return
            await sendTeacherInvite(params.slug, email)
          }}
          className="space-y-3"
        >
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Email
            <input
              name="email"
              type="email"
              required
              placeholder="professor@uni.edu"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Send magic link
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          This link is for teachers only. Students must be invited by the admin via email.
        </p>
      </div>
    </div>
  )
}
