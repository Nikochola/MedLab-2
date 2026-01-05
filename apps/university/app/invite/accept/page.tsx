import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getInviteByToken } from "@/lib/orgs"
import { createSupabaseAdminClient } from "@/lib/supabaseServer"

interface InviteAcceptProps {
  searchParams: { token?: string; error?: string }
}

const explicitBaseUrl = process.env.INVITE_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL
const baseDomain = process.env.INVITE_BASE_DOMAIN
const inviteHost = process.env.INVITE_HOST

const normalizeBaseUrl = (value?: string) => (value ? value.replace(/\/+$/, "") : "")
const normalizeDomain = (value?: string) => (value ? value.replace(/^https?:\/\//i, "").replace(/\/+$/, "") : "")

const buildSubdomainHost = (orgSlug: string, domain?: string | null) => {
  const normalized = normalizeDomain(domain || undefined)
  if (!normalized) return ""
  if (normalized === orgSlug || normalized.startsWith(`${orgSlug}.`)) {
    return normalized
  }
  return `${orgSlug}.${normalized}`
}

const buildPostInviteRedirect = (orgSlug: string | null | undefined, role: string) => {
  const normalizedBase = normalizeBaseUrl(explicitBaseUrl)
  const isStudent = role === "student"
  const isAdmin = role === "org_admin"
  const subdomainPath = isAdmin ? "/admin" : isStudent ? "/ecg" : "/teacher/dashboard"
  const pathWithSlug = isAdmin
    ? `/org/${orgSlug ?? ""}/admin`
    : isStudent
      ? "/ecg"
      : "/teacher/dashboard"

  if (normalizedBase) {
    return `${normalizedBase}${pathWithSlug}`
  }
  if (inviteHost) {
    return `https://${inviteHost}${subdomainPath}`
  }
  if (baseDomain && orgSlug) {
    const host = buildSubdomainHost(orgSlug, baseDomain)
    if (host) {
      return `https://${host}${subdomainPath}`
    }
  }
  return pathWithSlug
}

async function generateClassroomCode(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const length = 6
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = ""
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    const { data } = await admin.from("classrooms").select("id").eq("code", code).maybeSingle()
    if (!data) return code
  }
  return `CLS-${Date.now().toString(36).toUpperCase()}`
}

async function ensureTeacherClassroom(admin: ReturnType<typeof createSupabaseAdminClient>, teacherId: string) {
  const { data: existing } = await admin
    .from("classrooms")
    .select("id, name")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (existing) return existing

  const { data: teacher } = await admin.from("users").select("name, email").eq("id", teacherId).maybeSingle()
  const labelBase = (teacher?.name ?? teacher?.email ?? "Teacher").split(" ")[0] || "Teacher"
  const code = await generateClassroomCode(admin)

  const { data: created, error } = await admin
    .from("classrooms")
    .insert({ name: `${labelBase}'s Classroom`, teacher_id: teacherId, code, is_active: true })
    .select("id, name")
    .single()

  if (error) {
    console.error("ensureTeacherClassroom insert error:", error)
    throw error
  }

  return created
}

async function acceptInvite(formData: FormData) {
  "use server"
  const token = (formData.get("token") as string | null) ?? ""
  const email = (formData.get("email") as string | null)?.trim() ?? ""
  const name = (formData.get("name") as string | null)?.trim() ?? ""
  const password = (formData.get("password") as string | null) ?? ""

  const invite = await getInviteByToken(token)
  if (!invite || !email) {
    redirect(`/invite/accept?token=${encodeURIComponent(token)}&error=invalid`)
  }

  const effectiveUserRole = invite.role === "org_admin" ? "teacher" : invite.role
  const userMetadata = {
    name,
    full_name: name,
    role: effectiveUserRole,
    org_role: invite.role,
  }

  const admin = createSupabaseAdminClient()
  const { data: org } = await admin
    .from("organizations")
    .select("slug")
    .eq("id", invite.orgId)
    .maybeSingle()

  const normalizedEmail = email.toLowerCase()

  const { data: signUpData, error: signUpError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  })

  let userId = signUpData.user?.id ?? null

  if (!userId) {
    if (signUpError) {
      console.error("invite signup error:", signUpError)
    }

    const { data: existingProfile, error: profileError } = await admin
      .from("users")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle()
    if (profileError) {
      console.error("invite lookup profile error:", profileError)
    }

    if (existingProfile?.id) {
      userId = existingProfile.id
    } else {
      let existingUser: { id: string } | undefined
      let page = 1
      while (!existingUser && page <= 5) {
        const { data: existingLookup, error: existingError } = await admin.auth.admin.listUsers({
          page,
          perPage: 200,
        })
        if (existingError) {
          console.error("invite lookup existing user error:", existingError)
          break
        }
        existingUser = existingLookup?.users?.find(
          (candidate) => candidate.email?.toLowerCase() === normalizedEmail
        )
        if (existingLookup?.users?.length) {
          page += 1
        } else {
          break
        }
      }
      if (!existingUser) {
        redirect(`/invite/accept?token=${encodeURIComponent(token)}&error=signup`)
      }
      userId = existingUser.id
    }

    if (userId) {
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: userMetadata,
        email: normalizedEmail,
      })
      if (updateError) {
        console.error("invite update user error:", updateError)
      }
    }
  }

  if (!userId) {
    redirect(`/invite/accept?token=${encodeURIComponent(token)}&error=signup`)
  }

  let classroomId: string | null = null
  if (invite.role === "student" && invite.teacherId) {
    const classroom = await ensureTeacherClassroom(admin, invite.teacherId)
    classroomId = classroom.id
  }

  await admin.from("users").upsert({
    id: userId,
    email: normalizedEmail,
    name,
    role: effectiveUserRole,
    classroom_id: classroomId,
  })
  await admin.from("org_members").upsert({ org_id: invite.orgId, user_id: userId, role: invite.role })
  await admin
    .from("invites")
    .update({ accepted_at: new Date().toISOString(), email: normalizedEmail })
    .eq("id", invite.id)

  if (invite.role === "teacher" || invite.role === "org_admin") {
    await ensureTeacherClassroom(admin, userId)
  }

  revalidatePath("/")
  redirect(buildPostInviteRedirect(org?.slug ?? null, invite.role))
}

export default async function InviteAcceptPage({ searchParams }: InviteAcceptProps) {
  const token = searchParams.token || ""
  const invite = token ? await getInviteByToken(token) : null
  const error = searchParams.error

  if (!token || !invite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
        <div className="mx-auto max-w-lg rounded-xl border border-border bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">Invalid or expired link</h1>
          <p className="text-sm text-muted-foreground mt-2">Request a new invite from your administrator.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Account setup</p>
          <h1 className="text-2xl font-bold">Join {invite.email}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your name and password to activate your account and join your class.
          </p>
        </div>
        {error === "signup" && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Could not create account. Try again.</div>
        )}
        {error === "invalid" && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Invite link is invalid.</div>
        )}
        <form action={acceptInvite} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Email
            <input
              name="email"
              type="email"
              defaultValue={invite.email}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-sm"
              required
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Full name
            <input
              name="name"
              type="text"
              placeholder="Student Name"
              defaultValue={invite.fullName ?? ""}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-sm"
              required
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Password
            <input
              name="password"
              type="password"
              minLength={8}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-sm"
              required
            />
          </label>
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create account
          </button>
        </form>
      </div>
    </div>
  )
}
