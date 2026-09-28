import crypto from "node:crypto"

import type { InstitutionContext } from "@/server/institution/types"
import { supabaseAdmin } from "@/server/supabaseAdmin"

export type EnterpriseCase = {
  id: string
  title: string
  modality: "ECG" | "X-Ray" | "Clinical"
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  durationMin: number
  patientSummary: string
  clinicalPrompt: string
  correctDiagnosis: string
  teachingPoints: string[]
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  version: number
  updatedAt: string
  href: string
}

function plan(context: InstitutionContext) {
  return String(context.institution.billing_plan || "STARTER").toUpperCase()
}

export function hasEnterpriseAccess(context: InstitutionContext) {
  return plan(context) === "ENTERPRISE"
}

function requireEnterpriseAdmin(context: InstitutionContext) {
  if (context.membership.role !== "INSTITUTION_ADMIN") throw new Error("Only institution administrators can manage Enterprise controls")
  if (!hasEnterpriseAccess(context)) throw new Error("This feature requires an Enterprise plan")
}

function schemaPending(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message || ""
  return error?.code === "PGRST205" || message.includes("does not exist") || message.includes("schema cache") || message.includes("Could not find")
}

function httpsUrl(value: string, label: string) {
  if (!value) return null
  const url = new URL(value)
  if (url.protocol !== "https:" || url.username || url.password) throw new Error(`${label} must be a public HTTPS URL`)
  return url.toString()
}

function audit(input: { context: InstitutionContext; action: string; targetType?: string; targetId?: string; metadata?: Record<string, unknown> }) {
  return supabaseAdmin.from("institution_audit_events").insert({
    institution_id: input.context.institution.id,
    actor_user_id: input.context.membership.user_id,
    actor_type: "USER",
    action: input.action,
    target_type: input.targetType || null,
    target_id: input.targetId || null,
    metadata: input.metadata || {}
  })
}

function mapCase(row: any): EnterpriseCase {
  return {
    id: String(row.id),
    title: String(row.title),
    modality: row.modality,
    difficulty: row.difficulty,
    durationMin: Number(row.duration_min),
    patientSummary: String(row.patient_summary),
    clinicalPrompt: String(row.clinical_prompt),
    correctDiagnosis: String(row.correct_diagnosis),
    teachingPoints: Array.isArray(row.teaching_points) ? row.teaching_points.map(String) : [],
    status: row.status,
    version: Number(row.version),
    updatedAt: String(row.updated_at),
    href: `/institution-cases/${row.id}`
  }
}

export async function listPublishedEnterpriseCases(institutionId: string) {
  const { data, error } = await supabaseAdmin
    .from("institution_cases")
    .select("id,title,modality,difficulty,duration_min,patient_summary,clinical_prompt,correct_diagnosis,teaching_points,status,version,updated_at")
    .eq("institution_id", institutionId)
    .eq("status", "PUBLISHED")
    .order("updated_at", { ascending: false })
  if (error && schemaPending(error)) return []
  if (error) throw new Error(`Failed to load institution cases: ${error.message}`)
  return (data || []).map(mapCase)
}

export async function getEnterpriseWorkspace(context: InstitutionContext) {
  const base = {
    plan: plan(context),
    hasEnterprise: hasEnterpriseAccess(context),
    setupRequired: false,
    branding: null as null | { enabled: boolean; productName: string | null; logoUrl: string | null; faviconUrl: string | null; primaryColor: string; accentColor: string; hideMedlabBranding: boolean },
    cases: [] as EnterpriseCase[],
    apiKeys: [] as Array<{ id: string; name: string; prefix: string; scopes: string[]; dailyLimit: number; expiresAt: string | null; lastUsedAt: string | null; revokedAt: string | null; createdAt: string }>,
    auditEvents: [] as Array<{ id: string; action: string; targetType: string | null; targetId: string | null; createdAt: string }>,
    prioritySupport: null as null | { email: string | null; responseMinutes: number | null }
  }
  if (!base.hasEnterprise) return base

  const [brandingResult, casesResult, keysResult, auditResult, successResult] = await Promise.all([
    supabaseAdmin.from("institution_branding").select("enabled,product_name,logo_url,favicon_url,primary_color,accent_color,hide_medlab_branding").eq("institution_id", context.institution.id).maybeSingle(),
    supabaseAdmin.from("institution_cases").select("id,title,modality,difficulty,duration_min,patient_summary,clinical_prompt,correct_diagnosis,teaching_points,status,version,updated_at").eq("institution_id", context.institution.id).neq("status", "ARCHIVED").order("updated_at", { ascending: false }),
    supabaseAdmin.from("institution_api_keys").select("id,name,key_prefix,scopes,daily_limit,expires_at,last_used_at,revoked_at,created_at").eq("institution_id", context.institution.id).order("created_at", { ascending: false }),
    supabaseAdmin.from("institution_audit_events").select("id,action,target_type,target_id,created_at").eq("institution_id", context.institution.id).order("created_at", { ascending: false }).limit(20),
    supabaseAdmin.from("institution_success_profiles").select("priority_support_email,sla_response_minutes").eq("institution_id", context.institution.id).maybeSingle()
  ])
  const results = [brandingResult, casesResult, keysResult, auditResult, successResult]
  if (results.some((result) => result.error && schemaPending(result.error))) return { ...base, setupRequired: true }
  const failure = results.find((result) => result.error)
  if (failure?.error) throw new Error(`Failed to load Enterprise workspace: ${failure.error.message}`)

  const branding = brandingResult.data
  const success = successResult.data
  return {
    ...base,
    branding: branding ? {
      enabled: Boolean(branding.enabled),
      productName: branding.product_name ? String(branding.product_name) : null,
      logoUrl: branding.logo_url ? String(branding.logo_url) : null,
      faviconUrl: branding.favicon_url ? String(branding.favicon_url) : null,
      primaryColor: String(branding.primary_color || "#0066FF"),
      accentColor: String(branding.accent_color || "#EEF3FF"),
      hideMedlabBranding: Boolean(branding.hide_medlab_branding)
    } : null,
    cases: (casesResult.data || []).map(mapCase),
    apiKeys: (keysResult.data || []).map((key) => ({
      id: String(key.id), name: String(key.name), prefix: String(key.key_prefix), scopes: Array.isArray(key.scopes) ? key.scopes.map(String) : [], dailyLimit: Number(key.daily_limit),
      expiresAt: key.expires_at ? String(key.expires_at) : null, lastUsedAt: key.last_used_at ? String(key.last_used_at) : null,
      revokedAt: key.revoked_at ? String(key.revoked_at) : null, createdAt: String(key.created_at)
    })),
    auditEvents: (auditResult.data || []).map((event) => ({ id: String(event.id), action: String(event.action), targetType: event.target_type ? String(event.target_type) : null, targetId: event.target_id ? String(event.target_id) : null, createdAt: String(event.created_at) })),
    prioritySupport: { email: success?.priority_support_email ? String(success.priority_support_email) : null, responseMinutes: typeof success?.sla_response_minutes === "number" ? Number(success.sla_response_minutes) : null }
  }
}

export async function saveEnterpriseBranding(context: InstitutionContext, input: {
  enabled: boolean; productName: string; logoUrl: string; faviconUrl: string; primaryColor: string; accentColor: string; hideMedlabBranding: boolean
}) {
  requireEnterpriseAdmin(context)
  const colorPattern = /^#[0-9a-f]{6}$/i
  if (!colorPattern.test(input.primaryColor) || !colorPattern.test(input.accentColor)) throw new Error("Brand colors must use six-digit hex values")
  const productName = input.productName.trim().slice(0, 60)
  const { error } = await supabaseAdmin.from("institution_branding").upsert({
    institution_id: context.institution.id,
    enabled: input.enabled,
    product_name: productName || null,
    logo_url: httpsUrl(input.logoUrl.trim(), "Logo URL"),
    favicon_url: httpsUrl(input.faviconUrl.trim(), "Favicon URL"),
    primary_color: input.primaryColor.toUpperCase(),
    accent_color: input.accentColor.toUpperCase(),
    hide_medlab_branding: input.hideMedlabBranding,
    updated_by_user_id: context.membership.user_id,
    updated_at: new Date().toISOString()
  }, { onConflict: "institution_id" })
  if (error) throw new Error(`Failed to save white-label branding: ${error.message}`)
  await audit({ context, action: "branding.updated", targetType: "institution", targetId: context.institution.id, metadata: { enabled: input.enabled } })
}

export async function saveEnterpriseCase(context: InstitutionContext, input: {
  id?: string | null; title: string; modality: EnterpriseCase["modality"]; difficulty: EnterpriseCase["difficulty"];
  durationMin: number; patientSummary: string; clinicalPrompt: string; correctDiagnosis: string; teachingPoints: string[]
}) {
  requireEnterpriseAdmin(context)
  const title = input.title.trim().slice(0, 160)
  const patientSummary = input.patientSummary.trim().slice(0, 4000)
  const clinicalPrompt = input.clinicalPrompt.trim().slice(0, 2000)
  const correctDiagnosis = input.correctDiagnosis.trim().slice(0, 500)
  if (!title || !patientSummary || !clinicalPrompt || !correctDiagnosis) throw new Error("Complete every required case field")
  if (!Number.isFinite(input.durationMin)) throw new Error("Case duration must be a number")
  if (!["ECG", "X-Ray", "Clinical"].includes(input.modality) || !["Beginner", "Intermediate", "Advanced"].includes(input.difficulty)) throw new Error("Invalid case classification")
  const teachingPoints = input.teachingPoints.map((point) => point.trim()).filter(Boolean).slice(0, 12).map((point) => point.slice(0, 500))
  const values = {
    institution_id: context.institution.id, title, modality: input.modality, difficulty: input.difficulty,
    duration_min: Math.max(1, Math.min(180, Math.round(input.durationMin))), patient_summary: patientSummary,
    clinical_prompt: clinicalPrompt, correct_diagnosis: correctDiagnosis, teaching_points: teachingPoints,
    updated_by_user_id: context.membership.user_id, updated_at: new Date().toISOString()
  }
  let caseId = input.id || null
  if (caseId) {
    const { data, error } = await supabaseAdmin.from("institution_cases").update(values).eq("id", caseId).eq("institution_id", context.institution.id).neq("status", "ARCHIVED").select("id,version").maybeSingle()
    if (error || !data) throw new Error("Case could not be updated")
    await supabaseAdmin.from("institution_cases").update({ version: Number(data.version) + 1 }).eq("id", caseId)
  } else {
    const { data, error } = await supabaseAdmin.from("institution_cases").insert({ ...values, created_by_user_id: context.membership.user_id }).select("id").single()
    if (error || !data) throw new Error(`Case could not be created: ${error?.message || "Unknown error"}`)
    caseId = String(data.id)
  }
  await audit({ context, action: input.id ? "case.updated" : "case.created", targetType: "institution_case", targetId: caseId })
  return caseId
}

export async function setEnterpriseCaseStatus(context: InstitutionContext, caseId: string, status: "PUBLISHED" | "DRAFT" | "ARCHIVED") {
  requireEnterpriseAdmin(context)
  const { error } = await supabaseAdmin.from("institution_cases").update({ status, published_at: status === "PUBLISHED" ? new Date().toISOString() : null, updated_by_user_id: context.membership.user_id, updated_at: new Date().toISOString() }).eq("id", caseId).eq("institution_id", context.institution.id)
  if (error) throw new Error(`Case status could not be updated: ${error.message}`)
  await audit({ context, action: `case.${status.toLowerCase()}`, targetType: "institution_case", targetId: caseId })
}

export async function createEnterpriseApiKey(context: InstitutionContext, input: { name: string; scopes: string[]; dailyLimit: number; expiresAt?: string | null }) {
  requireEnterpriseAdmin(context)
  const allowedScopes = new Set(["analytics:read", "roster:read"])
  const scopes = Array.from(new Set(input.scopes.filter((scope) => allowedScopes.has(scope))))
  if (!scopes.length) throw new Error("Select at least one API scope")
  const name = input.name.trim().slice(0, 80)
  if (!name) throw new Error("API key name is required")
  if (!Number.isFinite(input.dailyLimit)) throw new Error("Daily request limit must be a number")
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null
  if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) throw new Error("API key expiry must be a valid future date")
  const secret = crypto.randomBytes(32).toString("base64url")
  const prefix = crypto.randomBytes(5).toString("hex")
  const apiKey = `ml_live_${prefix}_${secret}`
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex")
  const { data, error } = await supabaseAdmin.from("institution_api_keys").insert({
    institution_id: context.institution.id, name, key_prefix: `ml_live_${prefix}`, key_hash: keyHash, scopes,
    daily_limit: Math.max(1, Math.min(1_000_000, Math.round(input.dailyLimit))), expires_at: expiresAt?.toISOString() || null,
    created_by_user_id: context.membership.user_id
  }).select("id").single()
  if (error || !data) throw new Error(`API key could not be created: ${error?.message || "Unknown error"}`)
  await audit({ context, action: "api_key.created", targetType: "api_key", targetId: String(data.id), metadata: { scopes } })
  return { id: String(data.id), apiKey }
}

export async function revokeEnterpriseApiKey(context: InstitutionContext, keyId: string) {
  requireEnterpriseAdmin(context)
  const { error } = await supabaseAdmin.from("institution_api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", keyId).eq("institution_id", context.institution.id).is("revoked_at", null)
  if (error) throw new Error(`API key could not be revoked: ${error.message}`)
  await audit({ context, action: "api_key.revoked", targetType: "api_key", targetId: keyId })
}

export async function authenticateEnterpriseApiKey(request: Request, requiredScope: "analytics:read" | "roster:read") {
  const authorization = request.headers.get("authorization") || ""
  const apiKey = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : ""
  if (!apiKey.startsWith("ml_live_") || apiKey.length > 160) return { ok: false as const, status: 401, error: "Invalid API key" }
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex")
  const { data: key } = await supabaseAdmin.from("institution_api_keys").select("id,institution_id,scopes,revoked_at,expires_at,institutions(billing_plan)").eq("key_hash", keyHash).maybeSingle()
  const institution = (key as any)?.institutions
  if (!key || key.revoked_at || (key.expires_at && new Date(String(key.expires_at)) <= new Date()) || String(institution?.billing_plan).toUpperCase() !== "ENTERPRISE") {
    return { ok: false as const, status: 401, error: "Invalid API key" }
  }
  const scopes = Array.isArray(key.scopes) ? key.scopes.map(String) : []
  if (!scopes.includes(requiredScope)) return { ok: false as const, status: 403, error: "Insufficient scope" }
  const { data: quota } = await supabaseAdmin.rpc("consume_institution_api_quota", { p_api_key_id: key.id })
  const quotaRow = Array.isArray(quota) ? quota[0] : quota
  if (!quotaRow) return { ok: false as const, status: 429, error: "Daily API quota exceeded" }
  await supabaseAdmin.from("institution_audit_events").insert({ institution_id: key.institution_id, actor_type: "API_KEY", action: "api.request", target_type: "endpoint", target_id: new URL(request.url).pathname, metadata: { scope: requiredScope } })
  return { ok: true as const, institutionId: String(key.institution_id), keyId: String(key.id), requestCount: Number(quotaRow.request_count), dailyLimit: Number(quotaRow.daily_limit) }
}
