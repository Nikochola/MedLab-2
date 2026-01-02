import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getOrgContext, getEntitlementsForOrg } from "@/lib/orgs"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

interface OrgSettingsPageProps {
  params: { slug: string }
  searchParams?: { saved?: string }
}

async function requireOrgAdmin(slug: string) {
  const ctx = await getOrgContext()
  if (!ctx.userId) redirect("/login")
  const org = ctx.organizations.find((o) => o.slug === slug)
  if (!org) redirect("/org-admin")
  const membership = ctx.memberships.find((m) => m.orgId === org.id)
  if (!membership || membership.role !== "org_admin") redirect("/")
  return { org, membership }
}

async function updateOrgSettings(formData: FormData) {
  "use server"
  const supabase = createSupabaseServerClient()
  const slug = formData.get("slug") as string
  const { org } = await requireOrgAdmin(slug)

  const name = (formData.get("name") as string | null)?.trim() ?? ""
  const logoUrl = (formData.get("logo_url") as string | null)?.trim() || null
  const contactEmail = (formData.get("contact_email") as string | null)?.trim() || null
  const signupPolicy = (formData.get("signup_policy") as string) as "invite_only" | "domain_allow"
  const allowedDomain = (formData.get("allowed_domain") as string | null)?.trim() || null
  const cohortsEnabled = formData.get("cohorts_enabled") === "on"

  await supabase
    .from("organizations")
    .update({
      name,
      logo_url: logoUrl,
      contact_email: contactEmail,
      signup_policy: signupPolicy,
      allowed_domain: signupPolicy === "domain_allow" ? allowedDomain : null,
    })
    .eq("id", org.id)

  await supabase
    .from("entitlements")
    .upsert({ org_id: org.id, cohorts_enabled: cohortsEnabled }, { onConflict: "org_id" })

  revalidatePath(`/org/${slug}/admin/settings`)
  redirect(`/org/${slug}/admin/settings?saved=1`)
}

export default async function OrgSettingsPage({ params, searchParams }: OrgSettingsPageProps) {
  const { org } = await requireOrgAdmin(params.slug)
  const entitlements = await getEntitlementsForOrg(org.id)
  const saved = searchParams?.saved === "1"

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Org Admin</p>
          <h1 className="text-3xl font-bold">Organization settings</h1>
          <p className="text-muted-foreground mt-2">Control profile, signup policy, and contact details for {org.name}.</p>
        </div>

        {saved && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
            Settings saved.
          </div>
        )}

        <form action={updateOrgSettings} className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm">
          <input type="hidden" name="slug" value={params.slug} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Name
              <input
                name="name"
                defaultValue={org.name}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Logo URL
              <input
                name="logo_url"
                defaultValue={org.logoUrl ?? ""}
                placeholder="https://…/logo.png"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            Contact email
            <input
              name="contact_email"
              type="email"
              defaultValue={org.contactEmail ?? ""}
              placeholder="admin@university.edu"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Signup policy
              <select
                name="signup_policy"
                defaultValue={org.signupPolicy ?? "invite_only"}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="invite_only">Invite only</option>
                <option value="domain_allow">Allow email domain</option>
              </select>
              <p className="text-xs text-muted-foreground">Control who can join this university.</p>
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700">
              Allowed domain (if domain allow)
              <input
                name="allowed_domain"
                placeholder="uni.edu"
                defaultValue={org.allowedDomain ?? ""}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-muted-foreground">Only applied when signup policy is domain_allow.</p>
            </label>
          </div>

          <div className="rounded-lg border border-border bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">Cohorts feature</div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  name="cohorts_enabled"
                  defaultChecked={entitlements?.cohortsEnabled ?? true}
                  className="h-4 w-4 rounded border border-border text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 appearance-none checked:bg-blue-600 checked:border-blue-600"
                />
                Enable cohorts/classes
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Turn cohorts/classes on or off for this university. When off, cohort pages are hidden and students/teachers cannot use them.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <a href={`/org/${org.slug}/admin`} className="text-sm text-muted-foreground hover:text-slate-800">
              Cancel
            </a>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
              <input type="checkbox" name="confirm_settings" required className="h-4 w-4 rounded border border-border" />
              Confirm changes
            </label>
            <button
              type="submit"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Save settings
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
