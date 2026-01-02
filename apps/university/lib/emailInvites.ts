import crypto from "crypto"

const resendKey = process.env.RESEND_API_KEY
const inviteFromEmail = process.env.INVITE_FROM_EMAIL || process.env.NEXT_PUBLIC_INVITE_FROM_EMAIL
const baseUrl = process.env.INVITE_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
const baseDomain = process.env.INVITE_BASE_DOMAIN

export function generateInviteToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomBytes(8).toString("hex")
}

export async function sendInviteEmail(
  email: string,
  token: string,
  orgName: string,
  role: "student" | "teacher",
  orgSlug: string
) {
  if (!resendKey || !inviteFromEmail) {
    // No email provider configured; surface link to caller
    const fallback = baseDomain
      ? `https://${orgSlug}.${baseDomain}/invite/accept?token=${token}`
      : `${baseUrl}/invite/accept?token=${token}`
    return { sent: false, link: fallback }
  }

  const link = baseDomain
    ? `https://${orgSlug}.${baseDomain}/invite/accept?token=${token}`
    : `${baseUrl}/invite/accept?token=${token}`
  const subject =
    role === "teacher"
      ? `You're invited to teach at ${orgName}`
      : `You're invited to join ${orgName}`
  const html = `<p>You have been invited to ${orgName} as a ${role}. Click the link below to set your password and join.</p><p><a href="${link}">${link}</a></p>`

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
