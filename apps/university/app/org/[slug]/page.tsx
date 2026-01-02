import Link from "next/link"
import { headers } from "next/headers"
import { createSupabaseAdminClient } from "@/lib/supabaseServer"

interface OrgLandingPageProps {
  params: { slug: string }
}

async function getOrgName(slug: string) {
  const admin = createSupabaseAdminClient()
  const { data } = await admin.from("organizations").select("name").eq("slug", slug).maybeSingle()
  return data?.name ?? null
}

export default async function OrgLandingPage({ params }: OrgLandingPageProps) {
  const baseDomain = process.env.INVITE_BASE_DOMAIN || "medlabinteractive.com"
  const host = headers().get("host") ?? ""
  const isSubdomain = host.endsWith(`.${baseDomain}`) && host !== baseDomain
  const basePath = isSubdomain ? "" : `/org/${params.slug}`
  const adminPath = `${basePath}/admin`
  const studentPath = `${basePath}/student`
  const teacherPath = isSubdomain ? "/teacher" : "/teacher/dashboard"
  const teacherSigninPath = isSubdomain ? "/teacher/signin" : `/org/${params.slug}/teacher-invite`
  const orgName = await getOrgName(params.slug)

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Medlab Interactive</p>
          <h1 className="text-3xl font-bold">{orgName ?? params.slug}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Choose where you want to go. Admins manage access, teachers review students, and students practice cases.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href={adminPath}
            className="rounded-xl border border-border bg-white p-5 shadow-sm transition hover:border-blue-500"
          >
            <h2 className="text-lg font-semibold">Admin Console</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage members, settings, and analytics.</p>
          </Link>

          <Link
            href={teacherPath}
            className="rounded-xl border border-border bg-white p-5 shadow-sm transition hover:border-blue-500"
          >
            <h2 className="text-lg font-semibold">Teacher Workspace</h2>
            <p className="text-sm text-muted-foreground mt-1">View your students and assessments.</p>
          </Link>

          <Link
            href={studentPath}
            className="rounded-xl border border-border bg-white p-5 shadow-sm transition hover:border-blue-500"
          >
            <h2 className="text-lg font-semibold">Student Workspace</h2>
            <p className="text-sm text-muted-foreground mt-1">Start practicing ECG cases and simulations.</p>
          </Link>

          <Link
            href={teacherSigninPath}
            className="rounded-xl border border-border bg-white p-5 shadow-sm transition hover:border-blue-500"
          >
            <h2 className="text-lg font-semibold">Teacher Sign In</h2>
            <p className="text-sm text-muted-foreground mt-1">Access the teacher invite link.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
