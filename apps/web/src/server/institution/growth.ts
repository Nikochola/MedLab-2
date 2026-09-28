import crypto from "node:crypto"
import dns from "node:dns/promises"
import net from "node:net"

import { institutionPortalHost } from "@/lib/institutionDomains"
import { inviteMembers } from "@/server/institution/members"
import { listStarterCourses } from "@/server/institution/starter"
import type { InstitutionContext } from "@/server/institution/types"
import { supabaseAdmin } from "@/server/supabaseAdmin"

export type LmsProvider = "CANVAS" | "MOODLE"

type LmsRosterUser = { email: string; name: string | null; externalId: string }

function normalizedPlan(context: InstitutionContext) {
  return String(context.institution.billing_plan || "STARTER").toUpperCase()
}

export function hasGrowthAccess(context: InstitutionContext) {
  return normalizedPlan(context) === "GROWTH" || normalizedPlan(context) === "ENTERPRISE"
}

function requireGrowthAdmin(context: InstitutionContext) {
  if (context.membership.role !== "INSTITUTION_ADMIN") throw new Error("Only institution administrators can manage LMS connections")
  if (!hasGrowthAccess(context)) throw new Error("LMS integrations require a Growth or Enterprise plan")
}

function schemaPending(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message || ""
  return error?.code === "PGRST205" || message.includes("does not exist") || message.includes("schema cache") || message.includes("Could not find")
}

function credentialKey() {
  const secret = process.env.LMS_CREDENTIAL_ENCRYPTION_KEY
  if (!secret || secret.length < 24) {
    throw new Error("LMS credential encryption is not configured")
  }
  return crypto.createHash("sha256").update(secret).digest()
}

function encryptCredential(value: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", credentialKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".")
}

function decryptCredential(value: string) {
  const [version, iv, tag, encrypted] = value.split(".")
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Stored LMS credential is invalid")
  const decipher = crypto.createDecipheriv("aes-256-gcm", credentialKey(), Buffer.from(iv, "base64url"))
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8")
}

function isPrivateAddress(address: string) {
  if (net.isIPv4(address)) {
    const parts = address.split(".").map(Number)
    return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 ||
      (parts[0] === 169 && parts[1] === 254) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168)
  }
  const normalized = address.toLowerCase()
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab]/.test(normalized)
}

async function safeBaseUrl(rawUrl: string) {
  const url = new URL(rawUrl)
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("LMS URL must be a public HTTPS address")
  const addresses = await dns.lookup(url.hostname, { all: true })
  if (!addresses.length || addresses.some((result) => isPrivateAddress(result.address))) {
    throw new Error("LMS URL must resolve to a public internet address")
  }
  url.pathname = url.pathname.replace(/\/+$/, "")
  url.search = ""
  url.hash = ""
  return url
}

function validEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ""
}

async function lmsFetch(url: URL, init: RequestInit) {
  const response = await fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(15_000) })
  if (response.status >= 300 && response.status < 400) throw new Error("LMS returned an unexpected redirect; check the base URL")
  if (!response.ok) throw new Error(`LMS request failed with status ${response.status}`)
  return response
}

function canvasNextLink(linkHeader: string | null, baseOrigin: string) {
  if (!linkHeader) return null
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/)
    if (!match) continue
    const next = new URL(match[1])
    if (next.origin !== baseOrigin) throw new Error("Canvas returned an unsafe pagination URL")
    return next
  }
  return null
}

async function fetchCanvasRoster(baseUrl: URL, externalCourseId: string, token: string) {
  let nextUrl: URL | null = new URL(`/api/v1/courses/${encodeURIComponent(externalCourseId)}/users`, baseUrl.origin)
  nextUrl.searchParams.set("enrollment_type[]", "student")
  nextUrl.searchParams.set("per_page", "100")
  const users: LmsRosterUser[] = []

  for (let page = 0; nextUrl && page < 50; page += 1) {
    const response = await lmsFetch(nextUrl, { headers: { authorization: `Bearer ${token}`, accept: "application/json" } })
    const payload = await response.json()
    if (!Array.isArray(payload)) throw new Error("Canvas returned an invalid roster response")
    for (const row of payload) {
      const email = validEmail(row.email) || validEmail(row.login_id)
      users.push({ email, name: row.name ? String(row.name) : null, externalId: String(row.id || "") })
    }
    nextUrl = canvasNextLink(response.headers.get("link"), baseUrl.origin)
  }

  return users
}

async function fetchMoodleRoster(baseUrl: URL, externalCourseId: string, token: string) {
  const endpoint = new URL(`${baseUrl.pathname}/webservice/rest/server.php`.replace(/\/+/g, "/"), baseUrl.origin)
  const body = new URLSearchParams({
    wstoken: token,
    wsfunction: "core_enrol_get_enrolled_users",
    moodlewsrestformat: "json",
    courseid: externalCourseId
  })
  const response = await lmsFetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body
  })
  const payload = await response.json()
  if (!Array.isArray(payload)) {
    throw new Error(typeof payload?.message === "string" ? payload.message : "Moodle returned an invalid roster response")
  }
  return payload
    .filter((row) => !Array.isArray(row.roles) || row.roles.length === 0 || row.roles.some((role: { shortname?: string }) => role.shortname === "student"))
    .map((row) => ({
      email: validEmail(row.email),
      name: row.fullname ? String(row.fullname) : null,
      externalId: String(row.id || "")
    })) as LmsRosterUser[]
}

async function fetchLmsRoster(provider: LmsProvider, baseUrl: string, externalCourseId: string, token: string) {
  const safeUrl = await safeBaseUrl(baseUrl)
  return provider === "CANVAS"
    ? fetchCanvasRoster(safeUrl, externalCourseId, token)
    : fetchMoodleRoster(safeUrl, externalCourseId, token)
}

export async function getGrowthWorkspace(context: InstitutionContext) {
  const plan = normalizedPlan(context)
  const base = {
    plan,
    hasGrowth: hasGrowthAccess(context),
    portalHost: institutionPortalHost(context.institution.slug),
    subdomainEnabled: Boolean(context.institution.subdomain_enabled),
    integrations: [] as Array<{
      id: string; provider: LmsProvider; status: string; baseUrl: string; externalCourseId: string;
      courseId: string; courseName: string; lastSyncedAt: string | null; lastSyncSummary: Record<string, unknown>; lastError: string | null
    }>,
    successProfile: null as null | {
      accountManagerName: string | null; accountManagerEmail: string | null; accountManagerCalendarUrl: string | null;
      reviewCadence: string; nextReviewAt: string | null; reviewAgenda: string | null
    },
    setupRequired: false
  }
  if (!base.hasGrowth) return base

  const [{ data: integrations, error: integrationError }, { data: successProfile, error: successError }, courses] = await Promise.all([
    supabaseAdmin
      .from("institution_integrations")
      .select("id,provider,status,base_url,external_course_id,course_id,last_synced_at,last_sync_summary,last_error")
      .eq("institution_id", context.institution.id)
      .neq("status", "DISABLED")
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("institution_success_profiles")
      .select("account_manager_name,account_manager_email,account_manager_calendar_url,review_cadence,next_review_at,review_agenda")
      .eq("institution_id", context.institution.id)
      .maybeSingle(),
    listStarterCourses(context)
  ])

  if ((integrationError && schemaPending(integrationError)) || (successError && schemaPending(successError))) {
    return { ...base, setupRequired: true }
  }
  if (integrationError) throw new Error(`Failed to load LMS integrations: ${integrationError.message}`)
  if (successError) throw new Error(`Failed to load success profile: ${successError.message}`)

  const courseNames = new Map(courses.map((course) => [course.id, course.name]))
  return {
    ...base,
    integrations: (integrations || []).map((integration) => ({
      id: String(integration.id),
      provider: integration.provider as LmsProvider,
      status: String(integration.status),
      baseUrl: String(integration.base_url),
      externalCourseId: String(integration.external_course_id),
      courseId: String(integration.course_id),
      courseName: courseNames.get(String(integration.course_id)) || "Class",
      lastSyncedAt: integration.last_synced_at ? String(integration.last_synced_at) : null,
      lastSyncSummary: integration.last_sync_summary && typeof integration.last_sync_summary === "object" ? integration.last_sync_summary as Record<string, unknown> : {},
      lastError: integration.last_error ? String(integration.last_error) : null
    })),
    successProfile: successProfile ? {
      accountManagerName: successProfile.account_manager_name ? String(successProfile.account_manager_name) : null,
      accountManagerEmail: successProfile.account_manager_email ? String(successProfile.account_manager_email) : null,
      accountManagerCalendarUrl: successProfile.account_manager_calendar_url ? String(successProfile.account_manager_calendar_url) : null,
      reviewCadence: String(successProfile.review_cadence || "QUARTERLY"),
      nextReviewAt: successProfile.next_review_at ? String(successProfile.next_review_at) : null,
      reviewAgenda: successProfile.review_agenda ? String(successProfile.review_agenda) : null
    } : null
  }
}

export async function connectGrowthLms(input: {
  context: InstitutionContext
  provider: LmsProvider
  courseId: string
  baseUrl: string
  externalCourseId: string
  accessToken: string
}) {
  requireGrowthAdmin(input.context)
  if (!input.externalCourseId.trim() || !input.accessToken.trim()) throw new Error("LMS course ID and access token are required")
  const courses = await listStarterCourses(input.context)
  if (!courses.some((course) => course.id === input.courseId)) throw new Error("Class not found")

  const roster = await fetchLmsRoster(input.provider, input.baseUrl, input.externalCourseId.trim(), input.accessToken.trim())
  const safeUrl = await safeBaseUrl(input.baseUrl)
  const { error } = await supabaseAdmin.from("institution_integrations").upsert({
    institution_id: input.context.institution.id,
    course_id: input.courseId,
    provider: input.provider,
    status: "CONNECTED",
    base_url: safeUrl.toString().replace(/\/$/, ""),
    external_course_id: input.externalCourseId.trim(),
    encrypted_access_token: encryptCredential(input.accessToken.trim()),
    last_sync_summary: { availableUsers: roster.length, connectedAt: new Date().toISOString() },
    last_error: null,
    created_by_user_id: input.context.membership.user_id,
    updated_at: new Date().toISOString()
  }, { onConflict: "institution_id,provider,course_id" })
  if (error) throw new Error(`Failed to save LMS integration: ${error.message}`)
  return roster.length
}

export async function syncGrowthLmsRoster(context: InstitutionContext, integrationId: string) {
  requireGrowthAdmin(context)
  const { data: integration, error } = await supabaseAdmin
    .from("institution_integrations")
    .select("id,provider,base_url,external_course_id,course_id,encrypted_access_token")
    .eq("id", integrationId)
    .eq("institution_id", context.institution.id)
    .neq("status", "DISABLED")
    .maybeSingle()
  if (error || !integration) throw new Error("LMS integration not found")

  try {
    const roster = await fetchLmsRoster(
      integration.provider as LmsProvider,
      String(integration.base_url),
      String(integration.external_course_id),
      decryptCredential(String(integration.encrypted_access_token))
    )
    const importable = roster.filter((user) => user.email)
    const missingEmail = roster.length - importable.length
    const summary = importable.length ? await inviteMembers({
      institutionId: context.institution.id,
      courseId: String(integration.course_id),
      invitedByUserId: context.membership.user_id,
      role: "STUDENT",
      rows: importable.map((user) => ({
        email: user.email,
        name: user.name,
        metadata: { lms_provider: integration.provider, lms_user_id: user.externalId }
      }))
    }) : null
    const result = {
      imported: summary?.invited_count || 0,
      skipped: (summary?.skipped_count || 0) + missingEmail,
      errors: summary?.error_count || 0,
      discovered: roster.length
    }
    const now = new Date().toISOString()
    await Promise.all([
      supabaseAdmin.from("institution_integrations").update({ status: "CONNECTED", last_synced_at: now, last_sync_summary: result, last_error: null, updated_at: now }).eq("id", integrationId),
      supabaseAdmin.from("institution_integration_syncs").insert({
        institution_id: context.institution.id,
        integration_id: integrationId,
        status: "SUCCESS",
        imported_count: result.imported,
        skipped_count: result.skipped,
        error_count: result.errors,
        summary: result,
        initiated_by_user_id: context.membership.user_id
      })
    ])
    return result
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "Roster sync failed"
    await Promise.all([
      supabaseAdmin.from("institution_integrations").update({ status: "ERROR", last_error: message, updated_at: new Date().toISOString() }).eq("id", integrationId),
      supabaseAdmin.from("institution_integration_syncs").insert({
        institution_id: context.institution.id,
        integration_id: integrationId,
        status: "ERROR",
        summary: { error: message },
        initiated_by_user_id: context.membership.user_id
      })
    ])
    throw syncError
  }
}

export async function disconnectGrowthLms(context: InstitutionContext, integrationId: string) {
  requireGrowthAdmin(context)
  const { error } = await supabaseAdmin
    .from("institution_integrations")
    .update({ status: "DISABLED", encrypted_access_token: "revoked", updated_at: new Date().toISOString() })
    .eq("id", integrationId)
    .eq("institution_id", context.institution.id)
  if (error) throw new Error(`Failed to disconnect LMS integration: ${error.message}`)
}
