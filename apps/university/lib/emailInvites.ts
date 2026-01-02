import crypto from "crypto"
import { render } from "@react-email/render"
import InviteEmail from "@/emails/InviteEmail"

const resendKey = process.env.RESEND_API_KEY
const inviteFromEmail = process.env.INVITE_FROM_EMAIL || process.env.NEXT_PUBLIC_INVITE_FROM_EMAIL
const explicitBaseUrl = process.env.INVITE_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL
const baseUrl = explicitBaseUrl || "http://localhost:3000"
const baseDomain = process.env.INVITE_BASE_DOMAIN
const inviteHost = process.env.INVITE_HOST

const normalizeBaseUrl = (value?: string) => (value ? value.replace(/\/+$/, "") : "")
const normalizeDomain = (value?: string) => (value ? value.replace(/^https?:\/\//i, "").replace(/\/+$/, "") : "")

const buildSubdomainHost = (orgSlug: string, domain?: string | null) => {
  const normalized = normalizeDomain(domain || undefined)
  if (!normalized) return ""
  if (normalized === orgSlug || normalized.startsWith(`${orgSlug}.`)) {
    return normalized
  }
  return `${orgSlug}.${normalized}`
}

const buildInviteLink = (token: string, orgSlug: string) => {
  if (inviteHost) {
    return `https://${inviteHost}/invite/accept?token=${token}`
  }

  if (explicitBaseUrl) {
    const normalized = normalizeBaseUrl(explicitBaseUrl)
    if (normalized) {
      return `${normalized}/invite/accept?token=${token}`
    }
  }

  if (baseDomain) {
    const host = buildSubdomainHost(orgSlug, baseDomain)
    if (host) {
      return `https://${host}/invite/accept?token=${token}`
    }
  }

  const normalized = normalizeBaseUrl(baseUrl)
  return `${normalized}/invite/accept?token=${token}`
}

const buildAssetBaseUrl = (orgSlug: string) => {
  if (explicitBaseUrl) {
    return normalizeBaseUrl(explicitBaseUrl)
  }
  if (inviteHost) {
    return `https://${inviteHost}`
  }
  if (baseDomain) {
    const host = buildSubdomainHost(orgSlug, baseDomain)
    if (host) return `https://${host}`
  }
  return normalizeBaseUrl(baseUrl)
}

export function generateInviteToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomBytes(8).toString("hex")
}

export async function sendInviteEmail(
  email: string,
  token: string,
  orgName: string,
  role: "student" | "teacher" | "org_admin",
  orgSlug: string
) {
  if (!resendKey || !inviteFromEmail) {
    // No email provider configured; surface link to caller
    return { sent: false, link: buildInviteLink(token, orgSlug) }
  }

  const link = buildInviteLink(token, orgSlug)
  const roleLabel = role === "org_admin" ? "org admin" : role
  const logoUrl = `${buildAssetBaseUrl(orgSlug)}/images/logo_black.svg`
  const subject =
    role === "teacher"
      ? `You're invited to teach at ${orgName}`
      : role === "org_admin"
        ? `You're invited to administer ${orgName}`
        : `You're invited to join ${orgName}`
  const html = render(
    InviteEmail({ orgName, roleLabel, inviteUrl: link, logoUrl })
  )

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: inviteFromEmail,
      to: email,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error("sendInviteEmail failed", {
      status: res.status,
      statusText: res.statusText,
      body: errText,
      to: email,
      from: inviteFromEmail,
    })
    return { sent: false, link }
  }

  return { sent: true, link }
}
