import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { CalendarDays, CheckCircle2, ExternalLink, Link2, PlugZap, RefreshCw, ShieldCheck, Unplug, UserRoundCheck } from "lucide-react"

import {
  connectGrowthLms,
  disconnectGrowthLms,
  getGrowthWorkspace,
  listStarterCourses,
  requireStarterPortalContext,
  syncGrowthLmsRoster,
  type LmsProvider
} from "@/server/institution"

function statusUrl(status: string, detail?: string | number) {
  const params = new URLSearchParams({ status })
  if (detail !== undefined) params.set("detail", String(detail))
  return `/institution/integrations?${params.toString()}`
}

export default async function InstitutionIntegrationsPage({ searchParams }: { searchParams?: { status?: string; detail?: string } }) {
  const { context } = await requireStarterPortalContext("/institution/integrations")
  if (context.membership.role !== "INSTITUTION_ADMIN") redirect("/institution/overview")
  const [workspace, courses] = await Promise.all([getGrowthWorkspace(context), listStarterCourses(context)])

  async function connectAction(formData: FormData) {
    "use server"
    const { context: actionContext } = await requireStarterPortalContext("/institution/integrations")
    let count = 0
    try {
      count = await connectGrowthLms({
        context: actionContext,
        provider: String(formData.get("provider")) as LmsProvider,
        courseId: String(formData.get("course_id") || ""),
        baseUrl: String(formData.get("base_url") || "").trim(),
        externalCourseId: String(formData.get("external_course_id") || "").trim(),
        accessToken: String(formData.get("access_token") || "")
      })
    } catch (error) {
      redirect(statusUrl("error", error instanceof Error ? error.message.slice(0, 160) : "Connection failed"))
    }
    revalidatePath("/institution/integrations")
    redirect(statusUrl("connected", count))
  }

  async function syncAction(formData: FormData) {
    "use server"
    const { context: actionContext } = await requireStarterPortalContext("/institution/integrations")
    let imported = 0
    try {
      const result = await syncGrowthLmsRoster(actionContext, String(formData.get("integration_id") || ""))
      imported = result.imported
    } catch (error) {
      redirect(statusUrl("error", error instanceof Error ? error.message.slice(0, 160) : "Roster sync failed"))
    }
    revalidatePath("/institution/integrations")
    revalidatePath("/institution/students")
    redirect(statusUrl("synced", imported))
  }

  async function disconnectAction(formData: FormData) {
    "use server"
    const { context: actionContext } = await requireStarterPortalContext("/institution/integrations")
    await disconnectGrowthLms(actionContext, String(formData.get("integration_id") || ""))
    revalidatePath("/institution/integrations")
    redirect(statusUrl("disconnected"))
  }

  const notices: Record<string, string> = {
    connected: `Connection verified. ${searchParams?.detail || "0"} LMS users are available for sync.`,
    synced: `Roster sync complete. ${searchParams?.detail || "0"} new student invitation${searchParams?.detail === "1" ? " was" : "s were"} sent.`,
    disconnected: "LMS connection disconnected and its stored credential revoked.",
    error: searchParams?.detail || "The LMS request could not be completed."
  }

  return (
    <main>
      <header className="institution-page-header">
        <div><p className="institution-eyebrow">Growth workspace</p><h1 className="institution-title">Integrations & success</h1><p className="institution-subtitle">Connect your university domain, map LMS courses, and keep managed review contacts in one place.</p></div>
        <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${workspace.hasGrowth ? "bg-[#eaf8ed] text-[#24713a]" : "bg-[#f0eee8] text-[#65635d]"}`}>{workspace.plan}</span>
      </header>

      {searchParams?.status && notices[searchParams.status] ? <div className={`mb-6 rounded-[11px] border px-4 py-3 text-sm ${searchParams.status === "error" ? "border-[#fecaca] bg-[#fff1f2] text-[#991b1b]" : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]"}`}>{notices[searchParams.status]}</div> : null}

      {!workspace.hasGrowth ? (
        <section className="institution-panel overflow-hidden">
          <div className="border-b border-[#e8e6df] p-6"><div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#eef3ff] text-[#0066ff]"><PlugZap className="h-5 w-5" /></div><h2 className="mt-5 text-xl font-semibold text-[#0e0f12]">Growth capabilities</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b6a65]">Upgrade to connect Canvas or Moodle, publish {workspace.portalHost}, work with a dedicated account manager, and schedule quarterly outcome reviews.</p></div>
          <div className="grid gap-px bg-[#e8e6df] md:grid-cols-4">{["Custom subdomain", "Canvas + Moodle", "Account manager", "Quarterly reviews"].map((feature) => <div key={feature} className="flex items-center gap-2 bg-white px-5 py-4 text-xs font-semibold text-[#4f4d47]"><CheckCircle2 className="h-4 w-4 text-[#0066ff]" />{feature}</div>)}</div>
          <div className="p-6"><a href="mailto:sales@getmedlab.com?subject=MedLab%20Growth%20upgrade" className="institution-button-primary">Talk to MedLab</a></div>
        </section>
      ) : workspace.setupRequired ? (
        <section className="institution-panel p-6"><h2 className="text-lg font-semibold text-[#0e0f12]">Growth setup pending</h2><p className="mt-2 text-sm leading-6 text-[#6b6a65]">Your plan includes these features. The Growth database migration must be applied before connections can be configured.</p></section>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-5 lg:grid-cols-2">
            <article className="institution-panel p-5"><div className="flex items-start justify-between gap-4"><div><p className="institution-eyebrow">Custom portal</p><h2 className="mt-2 text-lg font-semibold text-[#0e0f12]">{workspace.portalHost}</h2></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${workspace.subdomainEnabled ? "bg-[#eaf8ed] text-[#24713a]" : "bg-[#fff3e3] text-[#a15c00]"}`}>{workspace.subdomainEnabled ? "Active" : "Provisioning"}</span></div><p className="mt-3 text-sm leading-6 text-[#6b6a65]">A branded university entry point that keeps administrator, educator, and student sign-in on your MedLab workspace.</p>{workspace.subdomainEnabled ? <a href={`https://${workspace.portalHost}`} className="institution-button-secondary mt-5" target="_blank" rel="noreferrer">Open portal <ExternalLink className="h-4 w-4" /></a> : <p className="mt-5 rounded-[9px] bg-[#f5f3ed] px-3.5 py-3 text-xs leading-5 text-[#65635d]">MedLab will enable the hostname after DNS and contract verification.</p>}</article>
            <article className="institution-panel p-5"><p className="institution-eyebrow">Customer success</p>{workspace.successProfile?.accountManagerName ? <><div className="mt-3 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef3ff] text-[#0066ff]"><UserRoundCheck className="h-5 w-5" /></div><div><h2 className="text-base font-semibold text-[#0e0f12]">{workspace.successProfile.accountManagerName}</h2><p className="text-xs text-[#8a8881]">Dedicated account manager</p></div></div><div className="mt-5 flex flex-wrap gap-2">{workspace.successProfile.accountManagerEmail ? <a className="institution-button-secondary" href={`mailto:${workspace.successProfile.accountManagerEmail}`}>Email manager</a> : null}{workspace.successProfile.accountManagerCalendarUrl ? <a className="institution-button-secondary" href={workspace.successProfile.accountManagerCalendarUrl} target="_blank" rel="noreferrer">Book a call</a> : null}</div></> : <p className="mt-3 text-sm leading-6 text-[#6b6a65]">Your named account manager will appear here when the Growth workspace is activated.</p>}<div className="mt-5 rounded-[10px] border border-[#e4e1d9] bg-[#fafaf8] p-3.5"><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#0066ff]" /><p className="text-xs font-semibold text-[#353431]">{workspace.successProfile?.reviewCadence || "Quarterly"} review</p></div><p className="mt-1.5 text-xs leading-5 text-[#77746d]">{workspace.successProfile?.nextReviewAt ? `Next review: ${new Date(workspace.successProfile.nextReviewAt).toLocaleString()}` : "Next review date is being coordinated."}</p>{workspace.successProfile?.reviewAgenda ? <p className="mt-2 text-xs leading-5 text-[#65635d]">{workspace.successProfile.reviewAgenda}</p> : null}</div></article>
          </section>

          <section className="institution-panel overflow-hidden"><div className="border-b border-[#e8e6df] px-5 py-4"><h2 className="text-base font-semibold text-[#0e0f12]">Connected LMS courses</h2><p className="mt-1 text-xs text-[#8a8881]">Roster sync is one-way: Canvas or Moodle students are invited into the mapped MedLab class.</p></div>{workspace.integrations.length ? <div className="divide-y divide-[#efede7]">{workspace.integrations.map((integration) => <div key={integration.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><span className="rounded-full bg-[#eef3ff] px-2.5 py-1 text-[10px] font-bold text-[#0047cc]">{integration.provider}</span><p className="text-sm font-semibold text-[#252521]">{integration.courseName}</p></div><p className="mt-1.5 text-xs text-[#77746d]">External course {integration.externalCourseId} · {integration.baseUrl}</p><p className="mt-1 text-[11px] text-[#9a978f]">{integration.lastSyncedAt ? `Last synced ${new Date(integration.lastSyncedAt).toLocaleString()}` : "Connected; not synced yet"}</p>{integration.lastError ? <p className="mt-1 text-xs text-[#b42318]">{integration.lastError}</p> : null}</div><div className="flex gap-2"><form action={syncAction}><input type="hidden" name="integration_id" value={integration.id} /><button className="institution-button-primary"><RefreshCw className="h-4 w-4" /> Sync roster</button></form><form action={disconnectAction}><input type="hidden" name="integration_id" value={integration.id} /><button className="institution-button-secondary"><Unplug className="h-4 w-4" /> Disconnect</button></form></div></div>)}</div> : <div className="px-5 py-9 text-center"><Link2 className="mx-auto h-6 w-6 text-[#aaa79f]" /><p className="mt-3 text-sm font-semibold text-[#4f4d47]">No LMS courses connected</p><p className="mt-1 text-xs text-[#8a8881]">Verify a course below, then run the first roster sync.</p></div>}</section>

          <form action={connectAction} className="institution-panel p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-[#0e0f12]">Connect an LMS course</h2><p className="mt-1 text-xs text-[#8a8881]">The token is validated server-side and stored with AES-256-GCM encryption.</p></div><ShieldCheck className="h-5 w-5 text-[#24713a]" /></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Provider</span><select name="provider" className="institution-input" required><option value="CANVAS">Canvas</option><option value="MOODLE">Moodle</option></select></label><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">MedLab class</span><select name="course_id" className="institution-input" required><option value="">Select a class</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">LMS base URL</span><input name="base_url" type="url" required className="institution-input" placeholder="https://school.instructure.com" /></label><label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">LMS course ID</span><input name="external_course_id" required className="institution-input" placeholder="12345" /></label><label className="block md:col-span-2"><span className="mb-1.5 block text-[11px] font-semibold text-[#65635d]">Access token</span><input name="access_token" type="password" autoComplete="new-password" required className="institution-input" placeholder="Stored encrypted; never displayed again" /></label></div><button className="institution-button-primary mt-5"><PlugZap className="h-4 w-4" /> Verify and connect</button></form>
        </div>
      )}
    </main>
  )
}
