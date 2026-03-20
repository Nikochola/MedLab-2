import { supabaseAdmin, hasSupabaseServiceRole } from "@/server/supabaseAdmin"

async function getInstitutions() {
  if (!hasSupabaseServiceRole) return []

  const { data, error } = await supabaseAdmin
    .from("institutions")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to list institutions:", error.message)
    return []
  }

  return data || []
}

async function getMemberCounts(institutionIds: string[]) {
  if (!hasSupabaseServiceRole || !institutionIds.length) return new Map<string, number>()

  const { data, error } = await supabaseAdmin
    .from("institution_memberships")
    .select("institution_id")
    .in("institution_id", institutionIds)
    .eq("status", "ACTIVE")

  if (error) return new Map<string, number>()

  const counts = new Map<string, number>()
  for (const row of data || []) {
    counts.set(row.institution_id, (counts.get(row.institution_id) || 0) + 1)
  }
  return counts
}

export default async function InstitutionsPage() {
  const institutions = await getInstitutions()
  const memberCounts = await getMemberCounts(institutions.map((i: any) => i.id))

  return (
    <div className="mx-auto max-w-5xl px-8 py-8 space-y-6">
      <div>
        <p
          className="text-xs font-semibold uppercase"
          style={{ letterSpacing: "0.16em", color: "#9B9A94" }}
        >
          Overview
        </p>
        <h2 className="mt-1 text-2xl font-bold" style={{ color: "#0E0F12" }}>
          Institutions
        </h2>
        <p className="mt-1 text-sm" style={{ color: "#6B6A65" }}>
          All institutions currently on MedLab.
        </p>
      </div>

      {!institutions.length ? (
        <div
          className="rounded-[12px] p-8 text-center text-sm"
          style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF", color: "#6B6A65" }}
        >
          No institutions yet.
        </div>
      ) : (
        <div className="space-y-3">
          {institutions.map((inst: any) => {
            const members = memberCounts.get(inst.id) || 0
            const statusColors = inst.status === "active"
              ? { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" }
              : { bg: "#FFF7ED", text: "#92400E", border: "#FED7AA" }

            return (
              <div
                key={inst.id}
                className="flex flex-col gap-4 rounded-[12px] p-5 sm:flex-row sm:items-center sm:justify-between"
                style={{ backgroundColor: "white", border: "1.5px solid #E8E6DF" }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold" style={{ color: "#0E0F12" }}>
                      {inst.name}
                    </p>
                    <span
                      className="rounded-[6px] px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        letterSpacing: "0.12em",
                        backgroundColor: statusColors.bg,
                        color: statusColors.text,
                        border: `1px solid ${statusColors.border}`,
                      }}
                    >
                      {inst.status}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "#6B6A65" }}>
                    Slug: {inst.slug} · {members} active member{members !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs" style={{ color: "#9B9A94" }}>
                    Created {new Date(inst.created_at).toLocaleDateString()}
                    {inst.seat_limit ? ` · ${inst.seat_limit} seat limit` : ""}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
