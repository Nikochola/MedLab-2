import Link from "next/link"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { ArrowLeft, Users, Calendar, Hash } from "lucide-react"

import { supabaseAdmin, hasSupabaseServiceRole } from "@/server/supabaseAdmin"
import { requireMedlabTeamAccess } from "@/server/internal/medlabTeam"

export const dynamic = "force-dynamic"

async function getInstitution(id: string) {
  if (!hasSupabaseServiceRole) return null

  const { data, error } = await supabaseAdmin
    .from("institutions")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null
  return data
}

async function getMembers(institutionId: string) {
  if (!hasSupabaseServiceRole) return []

  const { data, error } = await supabaseAdmin
    .from("institution_memberships")
    .select("id, role, status, created_at, user_id")
    .eq("institution_id", institutionId)
    .order("created_at", { ascending: false })

  if (error) return []

  const userIds = (data || []).map((m: any) => m.user_id).filter(Boolean)
  if (!userIds.length) return data || []

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds)

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

  return (data || []).map((m: any) => ({
    ...m,
    profile: profileMap.get(m.user_id) || null
  }))
}

async function getSetupLinks(institutionId: string) {
  if (!hasSupabaseServiceRole) return []

  // Setup links are tied to access requests or direct links; match by institution name isn't ideal
  // but we return recently-claimed setup links for context
  const { data } = await supabaseAdmin
    .from("institution_setup_links")
    .select("id, full_name, work_email, institution_name, expires_at, claimed_at, created_at")
    .not("claimed_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(5)

  return data || []
}

async function getSuccessProfile(institutionId: string) {
  const { data, error } = await supabaseAdmin
    .from("institution_success_profiles")
    .select("account_manager_name,account_manager_email,account_manager_calendar_url,review_cadence,next_review_at,review_agenda,priority_support_email,sla_response_minutes")
    .eq("institution_id", institutionId)
    .maybeSingle()
  if (error) return null
  return data
}

export default async function InstitutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolvedParams = params instanceof Promise ? await params : params
  const institution = await getInstitution(resolvedParams.id)

  if (!institution) notFound()

  const members = await getMembers(institution.id)
  const successProfile = await getSuccessProfile(institution.id)
  const activeMembers = members.filter((m: any) => m.status === "ACTIVE")
  const inactiveMembers = members.filter((m: any) => m.status !== "ACTIVE")

  const statusColors =
    institution.status === "active"
      ? { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" }
      : { bg: "#FFF7ED", text: "#92400E", border: "#FED7AA" }

  function roleLabel(role: string) {
    if (role === "INSTITUTION_ADMIN") return "Admin"
    if (role === "EDUCATOR") return "Educator"
    return "Student"
  }

  function roleBadge(role: string) {
    if (role === "INSTITUTION_ADMIN")
      return { bg: "#EEF3FF", text: "#0047CC", border: "#C7D9FF" }
    if (role === "EDUCATOR")
      return { bg: "#F5F3FF", text: "#5B21B6", border: "#DDD6FE" }
    return { bg: "#F0FDF4", text: "#065F46", border: "#A7F3D0" }
  }

  async function updateGrowthOperationsAction(formData: FormData) {
    "use server"
    await requireMedlabTeamAccess("/admin/institutions")
    const institutionId = String(formData.get("institution_id") || "")
    const billingPlan = String(formData.get("billing_plan") || "STARTER").toUpperCase()
    if (!institutionId || !["STARTER", "GROWTH", "ENTERPRISE"].includes(billingPlan)) throw new Error("Invalid institution plan")
    const billingStatus = String(formData.get("billing_status") || "active").toLowerCase()
    if (!["active", "draft", "pending", "inactive"].includes(billingStatus)) throw new Error("Invalid billing status")
    const subdomainEnabled = formData.get("subdomain_enabled") === "on" && billingPlan !== "STARTER"
    const slaValue = String(formData.get("sla_response_minutes") || "").trim()
    const slaResponseMinutes = slaValue ? Number(slaValue) : null
    if (slaResponseMinutes !== null && (!Number.isFinite(slaResponseMinutes) || slaResponseMinutes < 1)) throw new Error("SLA response target must be a positive number of minutes")
    const { error: institutionError } = await supabaseAdmin.from("institutions").update({ billing_plan: billingPlan, billing_status: billingStatus, subdomain_enabled: subdomainEnabled }).eq("id", institutionId)
    if (institutionError) throw new Error(`Failed to update Growth access: ${institutionError.message}`)
    const { error: successError } = await supabaseAdmin.from("institution_success_profiles").upsert({
      institution_id: institutionId,
      account_manager_name: String(formData.get("account_manager_name") || "").trim() || null,
      account_manager_email: String(formData.get("account_manager_email") || "").trim().toLowerCase() || null,
      account_manager_calendar_url: String(formData.get("account_manager_calendar_url") || "").trim() || null,
      review_cadence: String(formData.get("review_cadence") || "QUARTERLY"),
      next_review_at: String(formData.get("next_review_at") || "").trim() || null,
      review_agenda: String(formData.get("review_agenda") || "").trim() || null,
      priority_support_email: String(formData.get("priority_support_email") || "").trim().toLowerCase() || null,
      sla_response_minutes: slaResponseMinutes === null ? null : Math.round(slaResponseMinutes),
      updated_at: new Date().toISOString()
    }, { onConflict: "institution_id" })
    if (successError) throw new Error(`Failed to update customer success profile: ${successError.message}`)
    revalidatePath(`/admin/institutions/${institutionId}`)
    redirect(`/admin/institutions/${institutionId}?updated=growth`)
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-8 space-y-6">
      {/* Back link */}
      <Link
        href="/admin/institutions"
        className="inline-flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: "#6B6A65" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All Institutions
      </Link>

      {/* Header */}
      <div
        className="rounded-[12px] p-6"
        style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold" style={{ color: "#0E0F12" }}>
                {institution.name}
              </h2>
              <span
                className="rounded-[6px] px-2 py-0.5 text-[10px] font-bold uppercase"
                style={{
                  letterSpacing: "0.12em",
                  backgroundColor: statusColors.bg,
                  color: statusColors.text,
                  border: `1px solid ${statusColors.border}`,
                }}
              >
                {institution.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: "#6B6A65" }}>
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {institution.slug}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {activeMembers.length} active member{activeMembers.length !== 1 ? "s" : ""}
                {institution.seat_limit ? ` of ${institution.seat_limit}` : ""}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created {new Date(institution.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Extra metadata */}
        {(institution.type || institution.country || institution.plan) && (
          <div
            className="mt-4 grid grid-cols-3 gap-4 rounded-[8px] p-4"
            style={{ backgroundColor: "#F8F7F2" }}
          >
            {institution.type && (
              <div>
                <p className="text-[10px] font-semibold uppercase" style={{ letterSpacing: "0.1em", color: "#9B9A94" }}>
                  Type
                </p>
                <p className="mt-0.5 text-sm font-medium" style={{ color: "#0E0F12" }}>
                  {institution.type}
                </p>
              </div>
            )}
            {institution.country && (
              <div>
                <p className="text-[10px] font-semibold uppercase" style={{ letterSpacing: "0.1em", color: "#9B9A94" }}>
                  Country
                </p>
                <p className="mt-0.5 text-sm font-medium" style={{ color: "#0E0F12" }}>
                  {institution.country}
                </p>
              </div>
            )}
            {institution.plan && (
              <div>
                <p className="text-[10px] font-semibold uppercase" style={{ letterSpacing: "0.1em", color: "#9B9A94" }}>
                  Plan
                </p>
                <p className="mt-0.5 text-sm font-medium" style={{ color: "#0E0F12" }}>
                  {institution.plan}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <form action={updateGrowthOperationsAction} className="rounded-[12px] p-6" style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}>
        <input type="hidden" name="institution_id" value={institution.id} />
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9B9A94]">Growth operations</p><h2 className="mt-2 text-lg font-bold text-[#0E0F12]">Plan, portal, and customer success</h2></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold text-[#6B6A65]">Plan<select name="billing_plan" defaultValue={institution.billing_plan || "STARTER"} className="mt-1.5 w-full rounded-[9px] border border-[#D8D5CC] bg-white px-3 py-2.5 text-sm text-[#0E0F12]"><option value="STARTER">Starter</option><option value="GROWTH">Growth</option><option value="ENTERPRISE">Enterprise</option></select></label>
          <label className="text-xs font-semibold text-[#6B6A65]">Access status<select name="billing_status" defaultValue={institution.billing_status || "draft"} className="mt-1.5 w-full rounded-[9px] border border-[#D8D5CC] bg-white px-3 py-2.5 text-sm text-[#0E0F12]"><option value="active">Active: members get Pro (paid or free contract)</option><option value="pending">Pending</option><option value="draft">Draft</option><option value="inactive">Inactive (access paused)</option></select></label>
          <label className="flex items-center gap-3 self-end rounded-[9px] border border-[#D8D5CC] px-3.5 py-2.5 text-sm font-semibold text-[#353431]"><input type="checkbox" name="subdomain_enabled" defaultChecked={Boolean(institution.subdomain_enabled)} className="h-4 w-4" /> Enable {institution.slug}.getmedlab.com</label>
          <label className="text-xs font-semibold text-[#6B6A65]">Account manager name<input name="account_manager_name" defaultValue={successProfile?.account_manager_name || ""} className="mt-1.5 w-full rounded-[9px] border border-[#D8D5CC] px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-[#6B6A65]">Account manager email<input name="account_manager_email" type="email" defaultValue={successProfile?.account_manager_email || ""} className="mt-1.5 w-full rounded-[9px] border border-[#D8D5CC] px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-[#6B6A65]">Manager calendar URL<input name="account_manager_calendar_url" type="url" defaultValue={successProfile?.account_manager_calendar_url || ""} className="mt-1.5 w-full rounded-[9px] border border-[#D8D5CC] px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-[#6B6A65]">Review cadence<select name="review_cadence" defaultValue={successProfile?.review_cadence || "QUARTERLY"} className="mt-1.5 w-full rounded-[9px] border border-[#D8D5CC] bg-white px-3 py-2.5 text-sm"><option value="QUARTERLY">Quarterly</option><option value="BIANNUAL">Biannual</option><option value="ANNUAL">Annual</option></select></label>
          <label className="text-xs font-semibold text-[#6B6A65]">Next review<input name="next_review_at" type="datetime-local" defaultValue={successProfile?.next_review_at ? String(successProfile.next_review_at).slice(0, 16) : ""} className="mt-1.5 w-full rounded-[9px] border border-[#D8D5CC] px-3 py-2.5 text-sm" /></label>
          <label className="text-xs font-semibold text-[#6B6A65]">Review agenda<input name="review_agenda" defaultValue={successProfile?.review_agenda || ""} className="mt-1.5 w-full rounded-[9px] border border-[#D8D5CC] px-3 py-2.5 text-sm" placeholder="Adoption, outcomes, next cohort" /></label>
          <label className="text-xs font-semibold text-[#6B6A65]">Priority support email<input name="priority_support_email" type="email" defaultValue={successProfile?.priority_support_email || ""} className="mt-1.5 w-full rounded-[9px] border border-[#D8D5CC] px-3 py-2.5 text-sm" placeholder="priority@getmedlab.com" /></label>
          <label className="text-xs font-semibold text-[#6B6A65]">SLA response target (minutes)<input name="sla_response_minutes" type="number" min={1} defaultValue={successProfile?.sla_response_minutes || ""} className="mt-1.5 w-full rounded-[9px] border border-[#D8D5CC] px-3 py-2.5 text-sm" /></label>
        </div>
        <button className="mt-5 rounded-[9px] bg-[#0066FF] px-4 py-2.5 text-sm font-semibold text-white">Save plan operations</button>
      </form>

      {/* Active members */}
      <div>
        <p
          className="mb-3 text-xs font-semibold uppercase"
          style={{ letterSpacing: "0.14em", color: "#9B9A94" }}
        >
          Active Members ({activeMembers.length})
        </p>
        {!activeMembers.length ? (
          <div
            className="rounded-[12px] p-6 text-center text-sm"
            style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF", color: "#6B6A65" }}
          >
            No active members yet.
          </div>
        ) : (
          <div className="space-y-2">
            {activeMembers.map((member: any) => {
              const rb = roleBadge(member.role)
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-[10px] px-4 py-3"
                  style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0E0F12" }}>
                      {member.profile?.full_name || member.profile?.email || member.user_id}
                    </p>
                    {member.profile?.full_name && member.profile?.email && (
                      <p className="text-xs" style={{ color: "#6B6A65" }}>
                        {member.profile.email}
                      </p>
                    )}
                  </div>
                  <span
                    className="rounded-[6px] px-2 py-0.5 text-[10px] font-bold uppercase"
                    style={{
                      letterSpacing: "0.1em",
                      backgroundColor: rb.bg,
                      color: rb.text,
                      border: `1px solid ${rb.border}`,
                    }}
                  >
                    {roleLabel(member.role)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Inactive members (collapsed) */}
      {inactiveMembers.length > 0 && (
        <details>
          <summary
            className="cursor-pointer text-xs font-semibold uppercase"
            style={{ letterSpacing: "0.14em", color: "#9B9A94" }}
          >
            Inactive / Invited ({inactiveMembers.length})
          </summary>
          <div className="mt-3 space-y-2">
            {inactiveMembers.map((member: any) => {
              const rb = roleBadge(member.role)
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-[10px] px-4 py-3 opacity-60"
                  style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0E0F12" }}>
                      {member.profile?.full_name || member.profile?.email || member.user_id}
                    </p>
                    {member.profile?.full_name && member.profile?.email && (
                      <p className="text-xs" style={{ color: "#6B6A65" }}>
                        {member.profile.email}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: "#9B9A94" }}>
                      {member.status}
                    </span>
                    <span
                      className="rounded-[6px] px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        letterSpacing: "0.1em",
                        backgroundColor: rb.bg,
                        color: rb.text,
                        border: `1px solid ${rb.border}`,
                      }}
                    >
                      {roleLabel(member.role)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
