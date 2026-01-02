import { cookies } from "next/headers"
import { createSupabaseAdminClient, createSupabaseServerClient } from "./supabaseServer"
import { Cohort, Entitlements, OrgMember, Organization, Subscription, Invite } from "./types"

const SELECTED_ORG_COOKIE = "medlab_org"

function mapOrganization(row: Record<string, any>): Organization {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    status: row.status as Organization["status"],
    seatLimit: (row.seat_limit as number | null) ?? null,
    ownerUserId: (row.owner_user_id as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
    subdomain: (row.subdomain as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
    contactEmail: (row.contact_email as string | null) ?? null,
    signupPolicy: (row.signup_policy as "invite_only" | "domain_allow" | null) ?? "invite_only",
    allowedDomain: (row.allowed_domain as string | null) ?? null,
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

function mapCohort(row: Record<string, any>): Cohort {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    name: row.name as string,
    term: (row.term as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}

function defaultEntitlements(orgId: string): Entitlements {
  return {
    orgId,
    ecgPractice: true,
    cases: true,
    analytics: false,
    aiFeedback: true,
    cohortsEnabled: true,
    attemptsPerDay: null,
    betaAccess: false,
    seats: null,
    createdAt: new Date().toISOString(),
  }
}

function mapEntitlements(row: Record<string, any>): Entitlements {
  const defaults = defaultEntitlements(row.org_id as string)
  return {
    orgId: row.org_id as string,
    ecgPractice: row.ecg_practice === undefined || row.ecg_practice === null ? defaults.ecgPractice : Boolean(row.ecg_practice),
    cases: row.cases === undefined || row.cases === null ? defaults.cases : Boolean(row.cases),
    analytics: row.analytics === undefined || row.analytics === null ? defaults.analytics : Boolean(row.analytics),
    aiFeedback: row.ai_feedback === undefined || row.ai_feedback === null ? defaults.aiFeedback : Boolean(row.ai_feedback),
    cohortsEnabled:
      row.cohorts_enabled === undefined || row.cohorts_enabled === null ? defaults.cohortsEnabled : Boolean(row.cohorts_enabled),
    attemptsPerDay: (row.attempts_per_day as number | null) ?? defaults.attemptsPerDay,
    betaAccess: row.beta_access === undefined || row.beta_access === null ? defaults.betaAccess : Boolean(row.beta_access),
    seats: (row.seats as number | null) ?? defaults.seats,
    createdAt: (row.created_at as string | null) ?? defaults.createdAt,
  }
}

function mapSubscription(row: Record<string, any>): Subscription {
  return {
    id: row.id as string,
    orgId: (row.org_id as string | null) ?? null,
    userId: (row.user_id as string | null) ?? null,
    status: row.status as Subscription["status"],
    plan: (row.plan as string | null) ?? null,
    seatLimit: (row.seat_limit as number | null) ?? null,
    isLifetime: Boolean(row.is_lifetime),
    compUntil: (row.comp_until as string | null) ?? null,
    periodStart: (row.period_start as string | null) ?? null,
    periodEnd: (row.period_end as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}

function mapInvite(row: Record<string, any>): Invite {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    cohortId: (row.cohort_id as string | null) ?? null,
    teacherId: (row.teacher_id as string | null) ?? null,
    email: row.email as string,
    fullName: (row.full_name as string | null) ?? null,
    role: row.role as Invite["role"],
    token: row.token as string,
    expiresAt: row.expires_at as string,
    acceptedAt: (row.accepted_at as string | null) ?? null,
    createdAt: row.created_at as string,
  }
}

export interface OrgContext {
  userId: string | null
  memberships: OrgMember[]
  organizations: Organization[]
  selectedOrg: Organization | null
}

/**
 * Resolve the organizations a signed-in user belongs to and return
 * a selected org based on the medlab_org cookie (or the first membership).
 * Always uses the authenticated (cookie-based) server client; no service role.
 */
export async function getOrgContext(): Promise<OrgContext> {
  const supabase = createSupabaseServerClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user

  if (!user) {
    return { userId: null, memberships: [], organizations: [], selectedOrg: null }
  }

  const { data: membershipsRows, error: membershipsError } = await supabase
    .from("org_members")
    .select("*")
    .eq("user_id", user.id)

  if (membershipsError) {
    console.error("getOrgContext memberships error:", membershipsError)
    return { userId: user.id, memberships: [], organizations: [], selectedOrg: null }
  }

  const memberships = (membershipsRows ?? []).map(mapOrgMember)
  const orgIds = memberships.map((m) => m.orgId)

  const { data: orgRows, error: orgError } = orgIds.length
    ? await supabase.from("organizations").select("*").in("id", orgIds)
    : { data: [] }

  if (orgError) {
    console.error("getOrgContext orgs error:", orgError)
    return { userId: user.id, memberships, organizations: [], selectedOrg: null }
  }

  const organizations = (orgRows ?? []).map(mapOrganization)
  const selectedSlug = cookies().get(SELECTED_ORG_COOKIE)?.value ?? null
  const selectedOrg =
    (selectedSlug && organizations.find((org) => org.slug === selectedSlug)) ||
    organizations.find((org) => org.status === "active") ||
    organizations[0] ||
    null

  return { userId: user.id, memberships, organizations, selectedOrg }
}

export function setSelectedOrgCookie(slug: string) {
  const store = cookies()
  store.set(SELECTED_ORG_COOKIE, slug, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  })
}

export async function getCohortsForOrg(orgId: string): Promise<Cohort[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("cohorts")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getCohortsForOrg error:", error)
    return []
  }

  return (data ?? []).map(mapCohort)
}

export async function getEntitlementsForOrg(orgId: string): Promise<Entitlements | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("entitlements")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle()

  if (error) {
    console.error("getEntitlementsForOrg error:", error)
    return defaultEntitlements(orgId)
  }

  return data ? mapEntitlements(data) : defaultEntitlements(orgId)
}

export async function getSubscriptionsForOrg(orgId: string): Promise<Subscription[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getSubscriptionsForOrg error:", error)
    return []
  }

  return (data ?? []).map(mapSubscription)
}

export async function getInviteByToken(token: string): Promise<Invite | null> {
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from("invites")
    .select("*")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .is("accepted_at", null)
    .maybeSingle()
  if (error) {
    console.error("getInviteByToken error:", error)
    return null
  }
  return data ? mapInvite(data) : null
}

export interface OrganizationSummary extends Organization {
  entitlements?: Entitlements | null
  memberCount?: number
}

export async function listOrganizations(): Promise<OrganizationSummary[]> {
  const supabase = createSupabaseServerClient()
  const { data: orgRows, error: orgError } = await supabase.from("organizations").select("*").order("created_at", { ascending: false })
  if (orgError) {
    console.error("listOrganizations org error:", orgError)
    return []
  }

  const orgs = (orgRows ?? []).map(mapOrganization)
  const orgIds = orgs.map((o) => o.id)
  if (!orgIds.length) return orgs

  const { data: entRows } = await supabase.from("entitlements").select("*").in("org_id", orgIds)
  const { data: membersRows } = await supabase.from("org_members").select("org_id").in("org_id", orgIds)

  const entMap = new Map((entRows ?? []).map((e) => [e.org_id as string, mapEntitlements(e)]))
  const countMap = new Map<string, number>()
  for (const row of membersRows ?? []) {
    const orgId = row.org_id as string
    countMap.set(orgId, (countMap.get(orgId) ?? 0) + 1)
  }

  return orgs.map((org) => ({
    ...org,
    entitlements: entMap.get(org.id) ?? null,
    memberCount: countMap.get(org.id) ?? 0,
  }))
}

export async function getOrganizationById(orgId: string) {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle()
  if (error || !data) {
    console.error("getOrganizationById error:", error)
    return null
  }
  return mapOrganization(data)
}
