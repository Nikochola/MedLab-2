import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { getSessionWithRole } from "@/server/auth/session"
import { requireInstitutionRole } from "@/server/institution"
import { supabaseAdmin } from "@/server/supabaseAdmin"

export default async function InstitutionSettingsPage() {
  const sessionWithRole = await getSessionWithRole()

  if (!sessionWithRole) {
    redirect("/institution/login?next=/institution/settings")
  }

  const context = await requireInstitutionRole(sessionWithRole.session.user.id, ["INSTITUTION_ADMIN"])

  async function updateSettingsAction(formData: FormData) {
    "use server"

    const serverSession = await getSessionWithRole()

    if (!serverSession) {
      redirect("/institution/login?next=/institution/settings")
    }

    const serverContext = await requireInstitutionRole(serverSession.session.user.id, ["INSTITUTION_ADMIN"])

    const { error } = await supabaseAdmin
      .from("institutions")
      .update({
        name: String(formData.get("name") || "").trim(),
        slug: String(formData.get("slug") || "").trim(),
        timezone: String(formData.get("timezone") || "").trim() || null,
        logo_url: String(formData.get("logo_url") || "").trim() || null
      })
      .eq("id", serverContext.institution.id)

    if (error) {
      throw new Error(`Failed to update institution settings: ${error.message}`)
    }

    revalidatePath("/institution/settings")
    redirect("/institution/settings")
  }

  return (
    <main className="space-y-6">
      <div className="surface-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Institution Settings</h1>
      </div>

      <form action={updateSettingsAction} className="surface-card space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Institution name
            <input
              name="name"
              defaultValue={context.institution.name}
              required
              className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            Slug
            <input
              name="slug"
              defaultValue={context.institution.slug}
              required
              className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Timezone
            <input
              name="timezone"
              defaultValue={context.institution.timezone || ""}
              placeholder="America/New_York"
              className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-slate-700">
            Logo URL
            <input
              name="logo_url"
              defaultValue={context.institution.logo_url || ""}
              placeholder="https://..."
              className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            />
          </label>
        </div>

        <button type="submit" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90">
          Save settings
        </button>
      </form>
    </main>
  )
}
