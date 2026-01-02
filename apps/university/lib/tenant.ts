import { cookies } from "next/headers"
import { createSupabaseServerClient } from "./supabaseServer"
import { Organization, OrgMember } from "./types"

const SELECTED_ORG_COOKIE = "medlab_org"

interface TenantContext {
  userId: string | null
  organization: Organization | null
  membership: OrgMember | null
}

function mapOrganization(row: Record<string, any>): Organization {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    status: row.status as Organization["status"],
    seatLimit: (row.seat_limit as number | null) ?? null,
    createdAt: row.created_at as string,
  }
}

function mapOrgMember(row: Record<string, any>): OrgMember {
  return {
    orgId: row.org_id as string,
    userId: row.user_id as string,
    role: row.role as OrgMember["role"],
    createdAt: row.created_at as string,
  }
}

/**
 * Resolve the current tenant (single org) for the signed-in user.
 * Picks the org based on the medlab_org cookie or the first active membership.
 */
export async function resolveTenant(): Promise<TenantContext> {
  const supabase = createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user

  if (!user) {
    return { userId: null, organization: null, membership: null }
  }

  const { data: membershipRows, error: membershipError } = await supabase
    .from("org_members")
    .select("*")
    .eq("user_id", user.id)

  if (membershipError) {
    console.error("resolveTenant membership error:", membershipError)
    return { userId: user.id, organization: null, membership: null }
  }

  const memberships = (membershipRows ?? []).map(mapOrgMember)
  const orgIds = memberships.map((m) => m.orgId)

  const { data: orgRows, error: orgError } = orgIds.length
    ? await supabase.from("organizations").select("*").in("id", orgIds)
    : { data: [] }

  if (orgError) {
    console.error("resolveTenant org error:", orgError)
    return { userId: user.id, organization: null, membership: null }
  }

  const organizations = (orgRows ?? []).map(mapOrganization)
  const selectedSlug = cookies().get(SELECTED_ORG_COOKIE)?.value ?? null

  const organization =
    (selectedSlug && organizations.find((o) => o.slug === selectedSlug)) ||
    organizations.find((o) => o.status === "active") ||
    organizations[0] ||
    null

  const membership = organization
    ? memberships.find((m) => m.orgId === organization.id) ?? null
    : null

  return { userId: user.id, organization, membership }
}

export function setTenantCookie(slug: string) {
  cookies().set(SELECTED_ORG_COOKIE, slug, { path: "/", sameSite: "lax", httpOnly: false })
}
