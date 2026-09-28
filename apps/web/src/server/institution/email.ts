import { render } from "@react-email/render"
import { Resend } from "resend"

import { buildInstitutionUrl } from "@/lib/runtimeUrls"
import InviteEmail from "@/emails/InviteEmail"

const resendApiKey = process.env.RESEND_API_KEY
const inviteFrom = process.env.INVITE_FROM_EMAIL || process.env.NEXT_PUBLIC_INVITE_FROM_EMAIL || "access@getmedlab.com"
const replyToEmail = process.env.INSTITUTION_REPLY_TO_EMAIL || "access@getmedlab.com"

const resend = resendApiKey ? new Resend(resendApiKey) : null

function roleLabel(role: "INSTITUTION_ADMIN" | "EDUCATOR" | "STUDENT") {
  if (role === "INSTITUTION_ADMIN") {
    return "Institution Admin"
  }

  if (role === "EDUCATOR") {
    return "Educator"
  }

  return "Student"
}

const MAX_SEND_ATTEMPTS = 4
const RETRY_BASE_DELAY_MS = 1000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableSendError(error: { name?: string; statusCode?: number | null }) {
  return error.statusCode === 429 || (error.statusCode ?? 0) >= 500 || error.name === "rate_limit_exceeded"
}

export async function sendInviteEmail(input: {
  email: string
  token: string
  role: "INSTITUTION_ADMIN" | "EDUCATOR" | "STUDENT"
  institutionName: string
  courseName?: string | null
}) {
  const inviteUrl = buildInstitutionUrl(`/invite/${input.token}`)

  if (!resend || !inviteFrom) {
    return {
      sent: false,
      error: "Resend is not configured",
      inviteUrl
    }
  }

  const subject =
    input.role === "INSTITUTION_ADMIN"
      ? `You are invited to administer ${input.institutionName}`
      : input.role === "EDUCATOR"
        ? `You are invited to teach in ${input.institutionName}`
        : `You are invited to join ${input.institutionName}`

  const html = render(
    InviteEmail({
      institutionName: input.institutionName,
      courseName: input.courseName || null,
      roleLabel: roleLabel(input.role),
      inviteUrl
    })
  )

  const payload = {
    from: inviteFrom,
    to: input.email,
    replyTo: replyToEmail,
    subject,
    html
  }

  // Resend reports API failures (rate limits, unverified domains, bad
  // recipients) in the returned `error` rather than throwing.
  let lastError = "Email send failed"
  for (let attempt = 0; attempt < MAX_SEND_ATTEMPTS; attempt++) {
    try {
      const { error } = await resend.emails.send(payload)
      if (!error) {
        return { sent: true, error: null, inviteUrl }
      }

      lastError = error.message || lastError
      if (!isRetryableSendError(error)) break
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError
    }

    await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt)
  }

  return {
    sent: false,
    error: lastError,
    inviteUrl
  }
}
