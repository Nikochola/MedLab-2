import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import Link from "next/link"
import { Building2, ExternalLink, Globe2, Save, ShieldCheck } from "lucide-react"

import { getSessionWithRole } from "@/server/auth/session"
import { checkInstitutionWorkspaceSlugAvailability, getGrowthWorkspace, requireInstitutionRole } from "@/server/institution"
import { supabaseAdmin } from "@/server/supabaseAdmin"

export default async function InstitutionSettingsPage({ searchParams }: { searchParams?: { saved?: string } }) {
  const sessionWithRole = await getSessionWithRole()

  if (!sessionWithRole) {
    redirect("/institution/login?next=/institution/settings")
  }

  const context = await requireInstitutionRole(sessionWithRole.session.user.id, ["INSTITUTION_ADMIN"])
  const growth = await getGrowthWorkspace(context)

  async function updateSettingsAction(formData: FormData) {
    "use server"

    const serverSession = await getSessionWithRole()

    if (!serverSession) {
      redirect("/institution/login?next=/institution/settings")
    }

    const serverContext = await requireInstitutionRole(serverSession.session.user.id, ["INSTITUTION_ADMIN"])

    const name = String(formData.get("name") || "").trim()
    if (!name) throw new Error("Institution name is required")
    const slugResult = await checkInstitutionWorkspaceSlugAvailability(String(formData.get("slug") || ""), serverContext.institution.id)
    if (!slugResult.available) throw new Error(slugResult.message)
    const timezone = String(formData.get("timezone") || "").trim()
    if (timezone) {
      try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format() } catch { throw new Error("Enter a valid IANA timezone, such as America/New_York") }
    }
    const logoUrl = String(formData.get("logo_url") || "").trim()
    if (logoUrl) {
      const parsed = new URL(logoUrl)
      if (parsed.protocol !== "https:") throw new Error("Logo URL must use HTTPS")
    }

    const { error } = await supabaseAdmin
      .from("institutions")
      .update({
        name,
        slug: slugResult.slug,
        timezone: timezone || null,
        logo_url: logoUrl || null
      })
      .eq("id", serverContext.institution.id)

    if (error) {
      throw new Error(`Failed to update institution settings: ${error.message}`)
    }

    revalidatePath("/institution/settings")
    redirect("/institution/settings?saved=1")
  }

  return (
    <main>
      <header className="institution-page-header"><div><p className="institution-eyebrow">Workspace</p><h1 className="institution-title">Settings</h1><p className="institution-subtitle">Keep your institution identity, workspace address, and regional defaults accurate.</p></div><span className="rounded-full bg-[#eef3ff] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#0047cc]">{growth.plan}</span></header>
      {searchParams?.saved ? <div className="mb-6 flex items-center gap-2 rounded-[11px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]"><ShieldCheck className="h-4 w-4" /> Settings saved.</div> : null}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form action={updateSettingsAction} className="institution-panel p-5">
        <div className="flex items-center gap-3 border-b border-[#e8e6df] pb-4"><div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#eef3ff] text-[#0066ff]"><Building2 className="h-5 w-5" /></div><div><h2 className="text-base font-semibold text-[#0e0f12]">Institution profile</h2><p className="mt-0.5 text-xs text-[#8a8881]">Shown to administrators, educators, and students.</p></div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Institution name</span>
            <input
              name="name"
              defaultValue={context.institution.name}
              required
              className="institution-input"
            />
          </label>

          <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Workspace slug</span>
            <input
              name="slug"
              defaultValue={context.institution.slug}
              required
              className="institution-input"
            />
            <span className="mt-1.5 block text-[11px] text-[#9a978f]">{growth.hasGrowth ? `${growth.portalHost}` : "Used internally; custom hostnames require Growth."}</span>
          </label>
          <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Timezone</span>
            <input
              name="timezone"
              defaultValue={context.institution.timezone || ""}
              placeholder="America/New_York"
              className="institution-input"
            />
          </label>

          <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Logo URL</span>
            <input
              name="logo_url"
              defaultValue={context.institution.logo_url || ""}
              placeholder="https://..."
              className="institution-input"
            />
          </label>
        </div>

        <button type="submit" className="institution-button-primary mt-5"><Save className="h-4 w-4" />
          Save changes
        </button>
      </form>
      <aside className="space-y-5"><article className="institution-panel p-5"><Globe2 className="h-5 w-5 text-[#0066ff]" /><p className="mt-4 institution-eyebrow">Portal address</p><h2 className="mt-2 break-all text-base font-semibold text-[#0e0f12]">{growth.portalHost}</h2><p className="mt-2 text-xs leading-5 text-[#77746d]">{growth.hasGrowth ? growth.subdomainEnabled ? "Your custom MedLab portal is active." : "DNS provisioning is in progress." : "Available with Growth and Enterprise."}</p>{growth.hasGrowth && growth.subdomainEnabled ? <a href={`https://${growth.portalHost}`} target="_blank" rel="noreferrer" className="institution-button-secondary mt-4">Open portal <ExternalLink className="h-4 w-4" /></a> : <Link href="/institution/integrations" className="institution-button-secondary mt-4">View plan features</Link>}</article><article className="institution-panel p-5"><p className="institution-eyebrow">Access policy</p><p className="mt-3 text-sm font-semibold text-[#353431]">Invite only</p><p className="mt-1 text-xs leading-5 text-[#77746d]">Students and educators must be invited by an administrator. Public self-enrollment is disabled.</p></article></aside>
      </section>
    </main>
  )
}
