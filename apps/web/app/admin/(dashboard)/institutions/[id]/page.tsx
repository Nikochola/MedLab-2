import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Users, Calendar, Hash } from "lucide-react"

import { supabaseAdmin, hasSupabaseServiceRole } from "@/server/supabaseAdmin"

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

export default async function InstitutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolvedParams = params instanceof Promise ? await params : params
  const institution = await getInstitution(resolvedParams.id)

  if (!institution) notFound()

  const members = await getMembers(institution.id)
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
