import crypto from "crypto"

import { Resend } from "resend"

import { buildInstitutionUrl } from "@/lib/runtimeUrls"
import { provisionPasswordAuthUser } from "@/server/auth/provision"
import { supabaseAdmin } from "@/server/supabaseAdmin"

const resendApiKey = process.env.RESEND_API_KEY
const notificationFrom =
  process.env.INVITE_FROM_EMAIL ||
  process.env.NEXT_PUBLIC_INVITE_FROM_EMAIL ||
  process.env.NOTIFY_FROM_EMAIL ||
  "access@getmedlab.com"
const replyToEmail = process.env.INSTITUTION_REPLY_TO_EMAIL || "access@getmedlab.com"
const teamWebhookUrl = process.env.MEDLAB_INSTITUTION_REQUEST_WEBHOOK_URL
const teamNotificationEmail = process.env.MEDLAB_TEAM_NOTIFICATION_EMAIL
const calBookingUrl = process.env.NEXT_PUBLIC_CAL_BOOKING_URL || process.env.CAL_BOOKING_URL || "https://www.cal.eu/medlab"

const resend = resendApiKey ? new Resend(resendApiKey) : null

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "mail.com",
  "zoho.com"
])

export type InstitutionRequestStatus = "pending" | "approved" | "rejected"
export type InstitutionRequestType =
  | "University"
  | "Medical School"
  | "Hospital"
  | "Residency Program"
  | "Other"
export type InstitutionRequestEventType =
  | "created"
  | "slack_notified"
  | "approved"
  | "rejected"
  | "setup_link_sent"
  | "setup_link_resent"
  | "manual_reply_sent"
  | "verification_code_sent"

export type InstitutionRequestEventChannel = "system" | "slack" | "email" | "dashboard"

export type InstitutionRequestRow = {
  id: string
  full_name: string
  work_email: string
  institution_name: string
  institution_type: InstitutionRequestType
  estimated_students: number
  wants_meeting: boolean
  message: string | null
  status: InstitutionRequestStatus
  reviewed_at: string | null
  reviewed_by_user_id: string | null
  reviewed_by_email: string | null
  rejection_reason: string | null
  setup_link_sent_at: string | null
  created_at: string
  updated_at: string
}

export type InstitutionRequestEventRow = {
  id: string
  request_id: string
  event_type: InstitutionRequestEventType
  actor_email: string | null
  channel: InstitutionRequestEventChannel
  subject: string | null
  body_excerpt: string | null
  metadata: Record<string, unknown>
  created_at: string
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

function generateSetupToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomBytes(24).toString("hex")
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function emailDomain(email: string) {
  return normalizeEmail(email).split("@")[1] || ""
}

export function isPersonalEmailDomain(email: string) {
  return PERSONAL_EMAIL_DOMAINS.has(emailDomain(email))
}

async function detectInstitutionByEmailDomain(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const domain = normalizedEmail.split("@")[1]

  if (!domain) {
    return null
  }

  const { data: matchingProfiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,email")
    .ilike("email", `%@${domain}`)
    .limit(25)

  if (profileError) {
    throw new Error(`Failed to inspect email domain: ${profileError.message}`)
  }

  const profileIds = (matchingProfiles || []).map((profile) => profile.id).filter(Boolean)
  if (!profileIds.length) {
    return null
  }

  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from("institution_memberships")
    .select("institution_id")
    .in("user_id", profileIds)
    .eq("status", "ACTIVE")
    .limit(25)

  if (membershipError) {
    throw new Error(`Failed to inspect institution domain memberships: ${membershipError.message}`)
  }

  const institutionIds = Array.from(new Set((memberships || []).map((row) => row.institution_id).filter(Boolean)))
  if (!institutionIds.length) {
    return null
  }

  const { data: institutions, error: institutionError } = await supabaseAdmin
    .from("institutions")
    .select("id,name,slug")
    .in("id", institutionIds)
    .limit(5)

  if (institutionError) {
    throw new Error(`Failed to inspect institution domain matches: ${institutionError.message}`)
  }

  return institutions?.[0] || null
}

async function sendInternalInstitutionRequestNotification(payload: {
  requestId: string
  fullName: string
  workEmail: string
  institutionName: string
  institutionType: string
  estimatedStudents: number
  wantsMeeting: boolean
  message: string | null
}) {
  const dashboardUrl = buildInstitutionUrl("/internal/institution-requests")
  const notificationResults = await Promise.allSettled([
    teamWebhookUrl
      ? fetch(teamWebhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            type: "institution_access_request.created",
            request: payload,
            dashboardUrl
          })
        })
      : Promise.resolve(null),
    resend && notificationFrom && teamNotificationEmail
      ? resend.emails.send({
          from: notificationFrom,
          to: teamNotificationEmail,
          subject: `New institution request: ${payload.institutionName}`,
          replyTo: replyToEmail,
          html: `
            <h1>New institution request</h1>
            <p><strong>Institution:</strong> ${payload.institutionName}</p>
            <p><strong>Requester:</strong> ${payload.fullName}</p>
            <p><strong>Work email:</strong> ${payload.workEmail}</p>
            <p><strong>Type:</strong> ${payload.institutionType}</p>
            <p><strong>Estimated students:</strong> ${payload.estimatedStudents}</p>
            <p><strong>Meeting requested:</strong> ${payload.wantsMeeting ? "Yes" : "No"}</p>
            ${payload.wantsMeeting ? `<p><strong>Scheduling link:</strong> <a href="${calBookingUrl}">${calBookingUrl}</a></p>` : ""}
            <p><strong>Message:</strong> ${payload.message || "—"}</p>
            <p><strong>Request id:</strong> ${payload.requestId}</p>
            <p><a href="${dashboardUrl}">Review requests</a></p>
          `
        })
      : Promise.resolve(null)
  ])

  return {
    webhookSent: teamWebhookUrl ? notificationResults[0]?.status === "fulfilled" : false,
    backupEmailSent: resend && notificationFrom && teamNotificationEmail ? notificationResults[1]?.status === "fulfilled" : false
  }
}

async function sendSetupLinkEmail(input: {
  email: string
  fullName: string
  institutionName: string
  token: string
}) {
  const setupUrl = buildInstitutionUrl(`/institution/setup/${input.token}`)

  if (!resend || !notificationFrom) {
    return { sent: false, error: "Resend is not configured", setupUrl }
  }

  try {
    await resend.emails.send({
      from: notificationFrom,
      to: input.email,
      replyTo: replyToEmail,
      subject: `Complete your MedLab administrator setup for ${input.institutionName}`,
      html: `
        <h1>Finish your MedLab workspace setup</h1>
        <p>Hello ${input.fullName},</p>
        <p>Your institution access request has been approved. Use the link below to create your administrator account and finish setup.</p>
        <p><a href="${setupUrl}">Complete administrator setup</a></p>
        <p>This setup link expires in 7 days and can only be used once.</p>
      `
    })

    return { sent: true, error: null, setupUrl }
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Failed to send setup link",
      setupUrl
    }
  }
}

async function sendSetupVerificationCodeEmail(input: {
  email: string
  fullName: string
  code: string
  institutionName: string
}) {
  if (!resend || !notificationFrom) {
    return { sent: false, error: "Resend is not configured" }
  }

  try {
    await resend.emails.send({
      from: notificationFrom,
      to: input.email,
      replyTo: replyToEmail,
      subject: `Your MedLab verification code for ${input.institutionName}`,
      html: `
        <h1>Email verification</h1>
        <p>Hello ${input.fullName},</p>
        <p>Enter this verification code to continue your MedLab administrator setup:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em;">${input.code}</p>
        <p>This code expires in 15 minutes.</p>
      `
    })

    return { sent: true, error: null }
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Failed to send verification code"
    }
  }
}

async function sendInstitutionRequestRejectionEmail(input: {
  email: string
  fullName: string
  institutionName: string
  reason?: string | null
}) {
  if (!resend || !notificationFrom) {
    return { sent: false, error: "Resend is not configured" }
  }

  try {
    await resend.emails.send({
      from: notificationFrom,
      to: input.email,
      replyTo: replyToEmail,
      subject: `Update on your MedLab request for ${input.institutionName}`,
      html: `
        <h1>Institution request update</h1>
        <p>Hello ${input.fullName},</p>
        <p>Thank you for your interest in MedLab. We are not able to approve this request right now.</p>
        ${input.reason ? `<p><strong>Reason:</strong> ${input.reason}</p>` : ""}
        <p>If you have additional context to share, reply to this email and our team will follow up.</p>
      `
    })

    return { sent: true, error: null }
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Failed to send rejection email"
    }
  }
}

async function sendInstitutionRequestManualReplyEmail(input: {
  email: string
  subject: string
  body: string
}) {
  if (!resend || !notificationFrom) {
    return { sent: false, error: "Resend is not configured" }
  }

  try {
    await resend.emails.send({
      from: notificationFrom,
      to: input.email,
      replyTo: replyToEmail,
      subject: input.subject,
      html: `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap">${input.body}</div>`
    })

    return { sent: true, error: null }
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Failed to send manual reply"
    }
  }
}

function buildBodyExcerpt(body: string | null | undefined) {
  const value = (body || "").trim()
  if (!value) {
    return null
  }

  return value.length > 180 ? `${value.slice(0, 177)}...` : value
}

async function createInstitutionRequestEvent(input: {
  requestId: string
  eventType: InstitutionRequestEventType
  channel: InstitutionRequestEventChannel
  actorEmail?: string | null
  subject?: string | null
  bodyExcerpt?: string | null
  metadata?: Record<string, unknown>
}) {
  const { error } = await supabaseAdmin.from("institution_request_events").insert({
    request_id: input.requestId,
    event_type: input.eventType,
    actor_email: input.actorEmail || null,
    channel: input.channel,
    subject: input.subject || null,
    body_excerpt: input.bodyExcerpt || null,
    metadata: input.metadata || {}
  })

  if (error) {
    throw new Error(`Failed to create institution request event: ${error.message}`)
  }
}

async function issueInstitutionSetupLink(input: {
  request: InstitutionRequestRow
  reviewerEmail: string
  eventType: "setup_link_sent" | "setup_link_resent"
}) {
  const token = generateSetupToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  if (input.eventType === "setup_link_resent") {
    const { error: expireError } = await supabaseAdmin
      .from("institution_setup_links")
      .update({ expires_at: new Date().toISOString() })
      .eq("request_id", input.request.id)
      .is("claimed_at", null)
      .gt("expires_at", new Date().toISOString())

    if (expireError) {
      throw new Error(`Failed to expire previous setup links: ${expireError.message}`)
    }
  }

  const { error: setupError } = await supabaseAdmin.from("institution_setup_links").insert({
    request_id: input.request.id,
    full_name: input.request.full_name,
    work_email: input.request.work_email,
    institution_name: input.request.institution_name,
    institution_type: input.request.institution_type,
    estimated_students: input.request.estimated_students,
    token_hash: tokenHash,
    expires_at: expiresAt
  })

  if (setupError) {
    throw new Error(`Failed to create setup link: ${setupError.message}`)
  }

  const emailResult = await sendSetupLinkEmail({
    email: input.request.work_email,
    fullName: input.request.full_name,
    institutionName: input.request.institution_name,
    token
  })

  await createInstitutionRequestEvent({
    requestId: input.request.id,
    eventType: input.eventType,
    channel: emailResult.sent ? "email" : "system",
    actorEmail: input.reviewerEmail,
    subject: `Setup link for ${input.request.institution_name}`,
    metadata: {
      setupUrl: emailResult.setupUrl,
      emailSent: emailResult.sent,
      emailError: emailResult.error,
      expiresAt
    }
  })

  return {
    expiresAt,
    emailSent: emailResult.sent,
    emailError: emailResult.error,
    setupUrl: emailResult.setupUrl
  }
}

export async function createInstitutionAccessRequest(input: {
  fullName: string
  workEmail: string
  institutionName: string
  institutionType: InstitutionRequestType
  estimatedStudents: number
  wantsMeeting?: boolean
  message?: string | null
}) {
  const fullName = input.fullName.trim()
  const workEmail = normalizeEmail(input.workEmail)
  const institutionName = input.institutionName.trim()
  const institutionType = input.institutionType
  const estimatedStudents = Number(input.estimatedStudents)
  const wantsMeeting = Boolean(input.wantsMeeting)
  const message = input.message?.trim() || null

  if (!fullName || !workEmail || !institutionName || !institutionType || !Number.isFinite(estimatedStudents)) {
    throw new Error("Please complete all required fields.")
  }

  if (isPersonalEmailDomain(workEmail)) {
    throw new Error("Please use your institutional work email.")
  }

  if (estimatedStudents <= 0) {
    throw new Error("Estimated number of students must be greater than zero.")
  }

  const { data: existingPending, error: existingPendingError } = await supabaseAdmin
    .from("institution_access_requests")
    .select("id")
    .eq("work_email", workEmail)
    .eq("institution_name", institutionName)
    .eq("status", "pending")
    .limit(1)

  if (existingPendingError) {
    throw new Error(`Failed to inspect existing requests: ${existingPendingError.message}`)
  }

  if (existingPending?.length) {
    throw new Error("A pending request already exists for this work email and institution.")
  }

  const { data, error } = await supabaseAdmin
    .from("institution_access_requests")
    .insert({
      full_name: fullName,
      work_email: workEmail,
      institution_name: institutionName,
      institution_type: institutionType,
      estimated_students: estimatedStudents,
      wants_meeting: wantsMeeting,
      message,
      status: "pending"
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(`Failed to create request: ${error?.message || "Unknown error"}`)
  }

  await createInstitutionRequestEvent({
    requestId: data.id,
    eventType: "created",
    channel: "system",
    subject: `Institution request from ${fullName}`,
    bodyExcerpt: buildBodyExcerpt(message),
    metadata: {
      workEmail,
      institutionName,
      institutionType,
      estimatedStudents,
      wantsMeeting
    }
  })

  const notificationResult = await sendInternalInstitutionRequestNotification({
    requestId: data.id,
    fullName,
    workEmail,
    institutionName,
    institutionType,
    estimatedStudents,
    wantsMeeting,
    message
  })

  await createInstitutionRequestEvent({
    requestId: data.id,
    eventType: "slack_notified",
    channel: notificationResult.webhookSent ? "slack" : "system",
    subject: `Internal notification for ${institutionName}`,
    metadata: notificationResult
  })

  return data as InstitutionRequestRow
}

export async function listInstitutionAccessRequests(status?: InstitutionRequestStatus | "all") {
  let query = supabaseAdmin
    .from("institution_access_requests")
    .select("*")
    .order("created_at", { ascending: false })

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to list institution access requests: ${error.message}`)
  }

  return (data || []) as InstitutionRequestRow[]
}

export async function listInstitutionRequestEvents(requestIds?: string[]) {
  let query = supabaseAdmin
    .from("institution_request_events")
    .select("*")
    .order("created_at", { ascending: false })

  if (requestIds?.length) {
    query = query.in("request_id", requestIds)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to list institution request events: ${error.message}`)
  }

  return (data || []) as InstitutionRequestEventRow[]
}

export async function approveInstitutionAccessRequest(input: {
  requestId: string
  reviewerUserId: string | null
  reviewerEmail: string
}) {
  const { data: request, error: requestError } = await supabaseAdmin
    .from("institution_access_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle()

  if (requestError || !request) {
    throw new Error(`Failed to load request: ${requestError?.message || "Not found"}`)
  }
  const reviewedAt = new Date().toISOString()

  const { error: updateError } = await supabaseAdmin
    .from("institution_access_requests")
    .update({
      status: "approved",
      reviewed_at: reviewedAt,
      reviewed_by_user_id: input.reviewerUserId,
      reviewed_by_email: input.reviewerEmail,
      rejection_reason: null,
      setup_link_sent_at: reviewedAt,
      updated_at: reviewedAt
    })
    .eq("id", request.id)

  if (updateError) {
    throw new Error(`Failed to update request status: ${updateError.message}`)
  }

  await createInstitutionRequestEvent({
    requestId: request.id,
    eventType: "approved",
    channel: "dashboard",
    actorEmail: input.reviewerEmail,
    subject: `Approved ${request.institution_name}`
  })

  const emailResult = await issueInstitutionSetupLink({
    request: request as InstitutionRequestRow,
    reviewerEmail: input.reviewerEmail,
    eventType: "setup_link_sent"
  })

  return {
    request: request as InstitutionRequestRow,
    setupUrl: emailResult.setupUrl,
    emailSent: emailResult.emailSent,
    emailError: emailResult.emailError
  }
}

export async function rejectInstitutionAccessRequest(input: {
  requestId: string
  reviewerUserId: string | null
  reviewerEmail: string
  reason?: string | null
}) {
  const { data: request, error: requestError } = await supabaseAdmin
    .from("institution_access_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle()

  if (requestError || !request) {
    throw new Error(`Failed to load request: ${requestError?.message || "Not found"}`)
  }

  const reviewedAt = new Date().toISOString()
  const rejectionReason = input.reason?.trim() || null

  const { error } = await supabaseAdmin
    .from("institution_access_requests")
    .update({
      status: "rejected",
      reviewed_at: reviewedAt,
      reviewed_by_user_id: input.reviewerUserId,
      reviewed_by_email: input.reviewerEmail,
      rejection_reason: rejectionReason,
      updated_at: reviewedAt
    })
    .eq("id", input.requestId)

  if (error) {
    throw new Error(`Failed to reject request: ${error.message}`)
  }

  await createInstitutionRequestEvent({
    requestId: request.id,
    eventType: "rejected",
    channel: "dashboard",
    actorEmail: input.reviewerEmail,
    subject: `Rejected ${request.institution_name}`,
    bodyExcerpt: buildBodyExcerpt(rejectionReason)
  })

  const emailResult = await sendInstitutionRequestRejectionEmail({
    email: request.work_email,
    fullName: request.full_name,
    institutionName: request.institution_name,
    reason: rejectionReason
  })

  await createInstitutionRequestEvent({
    requestId: request.id,
    eventType: "manual_reply_sent",
    channel: emailResult.sent ? "email" : "system",
    actorEmail: input.reviewerEmail,
    subject: `Rejection email for ${request.institution_name}`,
    bodyExcerpt: buildBodyExcerpt(rejectionReason),
    metadata: {
      emailSent: emailResult.sent,
      emailError: emailResult.error,
      kind: "rejection"
    }
  })

  return emailResult
}

export async function resendInstitutionSetupLink(input: {
  requestId: string
  reviewerEmail: string
}) {
  const { data: request, error: requestError } = await supabaseAdmin
    .from("institution_access_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle()

  if (requestError || !request) {
    throw new Error(`Failed to load request: ${requestError?.message || "Not found"}`)
  }

  if (request.status !== "approved") {
    throw new Error("Only approved requests can receive a setup-link resend.")
  }

  const sentAt = new Date().toISOString()
  const { error: updateError } = await supabaseAdmin
    .from("institution_access_requests")
    .update({
      setup_link_sent_at: sentAt,
      updated_at: sentAt
    })
    .eq("id", request.id)

  if (updateError) {
    throw new Error(`Failed to update setup link timestamp: ${updateError.message}`)
  }

  return issueInstitutionSetupLink({
    request: request as InstitutionRequestRow,
    reviewerEmail: input.reviewerEmail,
    eventType: "setup_link_resent"
  })
}

export async function sendInstitutionRequestManualReply(input: {
  requestId: string
  reviewerEmail: string
  subject: string
  body: string
}) {
  const subject = input.subject.trim()
  const body = input.body.trim()

  if (!subject || !body) {
    throw new Error("Subject and message are required.")
  }

  const { data: request, error: requestError } = await supabaseAdmin
    .from("institution_access_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle()

  if (requestError || !request) {
    throw new Error(`Failed to load request: ${requestError?.message || "Not found"}`)
  }

  const emailResult = await sendInstitutionRequestManualReplyEmail({
    email: request.work_email,
    subject,
    body
  })

  await createInstitutionRequestEvent({
    requestId: request.id,
    eventType: "manual_reply_sent",
    channel: emailResult.sent ? "email" : "system",
    actorEmail: input.reviewerEmail,
    subject,
    bodyExcerpt: buildBodyExcerpt(body),
    metadata: {
      emailSent: emailResult.sent,
      emailError: emailResult.error
    }
  })

  return emailResult
}

export async function getInstitutionSetupContextByToken(token: string) {
  const tokenHash = hashToken(token)

  const { data: setupLink, error } = await supabaseAdmin
    .from("institution_setup_links")
    .select("id,request_id,full_name,work_email,institution_name,institution_type,estimated_students,expires_at,verification_code_hash,verification_code_sent_at,email_verified_at,claimed_at,created_at")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to load setup link: ${error.message}`)
  }

  if (!setupLink) {
    return null
  }

  const isExpired = new Date(setupLink.expires_at).getTime() <= Date.now()
  const existingInstitution = await detectInstitutionByEmailDomain(setupLink.work_email)

  return {
    ...setupLink,
    isExpired,
    existingInstitution
  }
}

export async function sendInstitutionSetupVerificationCode(token: string) {
  const setupLink = await getInstitutionSetupContextByToken(token)

  if (!setupLink || setupLink.isExpired || setupLink.claimed_at) {
    throw new Error("This setup link is invalid or expired.")
  }

  const code = generateVerificationCode()
  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from("institution_setup_links")
    .update({
      verification_code_hash: hashToken(code),
      verification_code_sent_at: now
    })
    .eq("id", setupLink.id)

  if (error) {
    throw new Error(`Failed to create verification code: ${error.message}`)
  }

  const emailResult = await sendSetupVerificationCodeEmail({
    email: setupLink.work_email,
    fullName: setupLink.full_name,
    code,
    institutionName: setupLink.institution_name
  })

  if (!emailResult.sent) {
    throw new Error(emailResult.error || "Failed to send verification code.")
  }

  await createInstitutionRequestEvent({
    requestId: setupLink.request_id,
    eventType: "verification_code_sent",
    channel: "email",
    actorEmail: null,
    subject: `Verification code for ${setupLink.institution_name}`,
    metadata: {
      emailSent: emailResult.sent
    }
  })

  return { success: true }
}

export async function validateInstitutionBillingCode(code: string, plan: string) {
  const normalizedCode = code.trim().toUpperCase()
  if (!normalizedCode) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from("institution_billing_codes")
    .select("code,kind,allowed_plan,waives_card,is_active,expires_at,metadata")
    .eq("code", normalizedCode)
    .eq("is_active", true)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to validate billing code: ${error.message}`)
  }

  if (!data) {
    return null
  }

  if (data.allowed_plan && data.allowed_plan !== plan) {
    return null
  }

  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
    return null
  }

  return data
}

export async function activateInstitutionSetupAccount(input: {
  token: string
  fullName: string
  password: string
  verificationCode: string
}) {
  const setupLink = await getInstitutionSetupContextByToken(input.token)

  if (!setupLink || setupLink.isExpired || setupLink.claimed_at) {
    throw new Error("This setup link is invalid or expired.")
  }

  if (!setupLink.verification_code_sent_at) {
    throw new Error("Please request a verification code first.")
  }

  const codeAgeMs = Date.now() - new Date(setupLink.verification_code_sent_at).getTime()
  if (codeAgeMs > 15 * 60 * 1000) {
    throw new Error("Your verification code has expired. Request a new code and try again.")
  }

  if (hashToken(input.verificationCode.trim()) !== setupLink.verification_code_hash) {
    throw new Error("The verification code is incorrect.")
  }

  if (input.password.length < 8) {
    throw new Error("Password must be at least 8 characters.")
  }

  const { userId } = await provisionPasswordAuthUser({
    email: setupLink.work_email,
    password: input.password,
    name: input.fullName.trim() || setupLink.full_name,
    primaryRole: "institution",
    allowExisting: true
  })

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from("institution_setup_links")
    .update({
      email_verified_at: now,
      claimed_at: now,
      claimed_user_id: userId
    })
    .eq("id", setupLink.id)

  if (error) {
    throw new Error(`Failed to finalize setup link: ${error.message}`)
  }

  return {
    success: true,
    email: setupLink.work_email,
    userId
  }
}

/**
 * Create a direct setup link for an institution — used by platform admins
 * after a Cal.com call, without requiring an access request first.
 */
export async function createDirectSetupLink(input: {
  fullName: string
  workEmail: string
  institutionName: string
  institutionType: InstitutionRequestType
  estimatedStudents: number
  adminEmail: string
}) {
  const token = generateSetupToken()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabaseAdmin.from("institution_setup_links").insert({
    full_name: input.fullName.trim(),
    work_email: normalizeEmail(input.workEmail),
    institution_name: input.institutionName.trim(),
    institution_type: input.institutionType,
    estimated_students: Number(input.estimatedStudents),
    token_hash: tokenHash,
    expires_at: expiresAt,
  })

  if (error) {
    throw new Error(`Failed to create direct setup link: ${error.message}`)
  }

  const setupUrl = buildInstitutionUrl(`/institution/setup/${token}`)

  return {
    setupUrl,
    expiresAt,
  }
}

/**
 * List all setup links for the admin dashboard.
 */
export async function listSetupLinks() {
  const { data, error } = await supabaseAdmin
    .from("institution_setup_links")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    throw new Error(`Failed to list setup links: ${error.message}`)
  }

  return data || []
}
